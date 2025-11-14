import './style.css';
import { db, auth, signOut, firebaseConfig } from './firebase.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  getIdTokenResult,
} from 'firebase/auth';
import { showNotification, showConfirmationModal } from './ui-utils.js';
import {
  addProjectToFirebase,
  updateProjectInFirebase,
  loadProjectsForAdmin,
  loadMessagesForAdmin,
  deleteMessageFromFirebase,
} from './admin-data.js';

const CONFIG = {
  loaderMinMs: 500,
  maxProjectDescriptionLength: 150,
  messageReadStorageKey: 'statyba:lastMessageReadTs',
  notifPromptStorageKey: 'statyba:notificationsPrompted',
  languageStorageKey: 'statyba:adminLanguage',
  allowlistDocPath: `artifacts/${firebaseConfig.projectId}/private/adminAllowlist`,
  maxNotifications: 3,
};

const STATE = {
  loaderShownAt: 0,
  preAuthState: 'loading',
  selectedImageFiles: [],
  lastReadMessageTimestamp: Number(localStorage.getItem(CONFIG.messageReadStorageKey) || 0),
  messageRealtimeUnsubscribe: null,
  unreadMessageCount: 0,
  deliveredNotificationIds: new Set(),
  allowlistedEmails: new Set(),
  allowlistPromise: null,
  activeTab: 'live-editor',
  latestMessages: [],
  latestMessagesMaxTimestamp: 0,
  notificationPromptOpen: false,
  language: localStorage.getItem(CONFIG.languageStorageKey) || 'lt',
  loginErrorKey: null,
  activeMessage: null,
  editingProjectId: null,
  editingProjectImageUrls: [],
  editingProjectRemovedImageUrls: [],
  messagesInitialized: false,
};

const TRANSLATIONS = {
  lt: {
    'login.badge': 'Administratoriaus prieiga',
    'login.heading': 'Prisijunkite, kad tęstumėte',
    'login.googleButton': 'Tęsti su Google',
    'login.googleAria': 'Prisijungti per Google',
    'login.spinnerAria': 'Prisijungiama…',
    'header.title': 'Administratoriaus skydelis',
    'tabs.liveEditor': 'Tiesioginis redaktorius',
    'tabs.projects': 'Projektai',
    'tabs.messages': 'Žinutės',
    'liveEditor.quickActionsBadge': 'Greiti veiksmai',
    'liveEditor.quickActionsTitle': 'Tiesioginis svetainės redaktorius',
    'liveEditor.quickActionsDescription': 'Perkraukite peržiūrą, grąžinkite numatytuosius nustatymus arba tvarkykite šablonus.',
    'liveEditor.resetWarning': 'Atstatymas pakeis visą tekstą, spalvas, mediją ir maketą į numatytą šabloną. Pirmiausia išsaugokite šabloną, jei norite išlaikyti dabartinį vaizdą.',
    'liveEditor.loading': 'Kraunamas tiesioginis redaktorius…',
    'buttons.reloadPreview': 'Perkrauti peržiūrą',
    'buttons.resetDefaults': 'Atstatyti numatytuosius',
    'buttons.managePresets': 'Tvarkyti šablonus',
    'status.loading': 'Kraunama…',
    'projects.formTitle': 'Pridėti naują projektą',
    'projects.formDescription': 'Sukurkite portfolio įrašą ir įkelkite nuotraukas.',
    'projects.titlePlaceholder': 'Projekto pavadinimas',
    'projects.descriptionPlaceholder': 'Projekto aprašymas',
    'projects.imageLabel': 'Įkelkite projekto nuotraukas',
    'projects.submit': 'Paskelbti projektą',
    'projects.update': 'Atnaujinti projektą',
    'projects.listTitle': 'Esami projektai',
    'projects.listDescription': 'Spustelėkite kortelę, kad peržiūrėtumėte ar ištrintumėte.',
    'projects.error': 'Nepavyko įkelti projektų.',
    'messages.title': 'Naujausios žinutės',
    'messages.description': 'Atsakykite tiesiogiai el. pašto programoje.',
    'messages.error': 'Nepavyko įkelti žinučių.',
    'messages.errorGeneric': 'Nepavyko įkelti žinučių. Patikrinkite Firestore taisykles ir bandykite dar kartą.',
    'messages.emptyState': 'Dar nėra žinučių.',
    'messages.unreadBadge': 'Neskaityta žinutė',
    'messages.readBadge': 'Žinutė',
    'messages.defaultTitle': 'Nauja užklausa',
    'messages.unknownName': 'Anoniminis lankytojas',
    'messages.unknownEmail': 'El. paštas nenurodytas',
    'messages.messageFallback': 'Žinutės tekstas nenurodytas.',
    'messages.replySubject': 'Per: {title}',
    'messages.replyGreeting': 'Sveiki, {name},',
    'messages.replyIntro': 'Ačiū, kad susisiekėte dėl „{title}“. Mielai atsakysime į jūsų klausimus.',
    'messages.replyClosing': 'Praneškite, jei galime kuo nors daugiau padėti.',
    'messages.replySignature': 'Pagarbiai,\nStatyba komanda',
    'messages.deleteConfirmTitle': 'Ištrinti žinutę',
    'messages.deleteConfirmBody': 'Žinutė bus pašalinta visam laikui. Tęsti?',
    'messages.deleteConfirmConfirm': 'Ištrinti',
    'messages.deleteConfirmCancel': 'Atšaukti',
    'messageModal.badge': 'Žinutės detalės',
    'messageModal.dateLabel': 'Gauta',
    'messageModal.senderLabel': 'Siuntėjas',
    'messageModal.emailLabel': 'El. paštas',
    'messageModal.phoneLabel': 'Telefonas',
    'messageModal.messageLabel': 'Žinutė',
    'messageModal.closeAria': 'Uždaryti žinutės informaciją',
    'messageModal.emailFallback': 'El. paštas nepateiktas',
    'messageModal.phoneFallback': 'Telefonas nepateiktas',
    'messageModal.emptyBody': 'Žinutės tekstas nepateiktas.',
    'editModal.badge': 'Redaguoti elementą',
    'editModal.title': 'Redaguoti elementą',
    'editModal.textContentLabel': 'Teksto turinys',
    'editModal.textColorLabel': 'Teksto spalva',
    'editModal.textOutlineLabel': 'Teksto kontūras',
    'editModal.textOutlineToggle': 'Rodyti kontūrą',
    'editModal.textOutlineWidthLabel': 'Kontūro storis',
    'editModal.linkLabel': 'Nuorodos adresas',
    'editModal.linkPlaceholder': 'https://pavyzdys.lt',
    'editModal.backgroundColorLabel': 'Fono spalva',
    'editModal.backgroundTypeLabel': 'Fono tipas',
    'editModal.gradientOption': 'Gradientas',
    'editModal.imageOption': 'Paveikslėlis',
    'editModal.color1Label': 'Spalva 1',
    'editModal.color2Label': 'Spalva 2',
    'editModal.directionLabel': 'Kryptis',
    'editModal.directionHorizontal': 'Iš kairės į dešinę',
    'editModal.directionVertical': 'Iš viršaus į apačią',
    'editModal.directionDiagonal': 'Įstrižai',
    'editModal.imageUrlPlaceholder': 'Paveikslėlio nuoroda',
    'editModal.imagePreviewAlt': 'Paveikslėlio peržiūra',
    'editModal.closeAria': 'Uždaryti redagavimo langą',
    'editModal.savingAria': 'Išsaugoma',
    'buttons.cancel': 'Atšaukti',
    'buttons.save': 'Išsaugoti',
    'buttons.refresh': 'Atnaujinti',
    'buttons.load': 'Įkelti',
    'buttons.delete': 'Ištrinti',
    'buttons.reply': 'Atsakyti',
    'buttons.logout': 'Atsijungti',
    'presets.badge': 'Išdėstymai',
    'presets.title': 'Tvarkyti šablonus',
    'presets.description': 'Išsaugokite iki penkių maketų ir greitai tarp jų perjunkite.',
    'presets.info': 'Kiekvienas langelis saugo tekstą, spalvas, mediją ir maketo pakeitimus.',
    'presets.closeAria': 'Uždaryti šablonų tvarkyklę',
    'presets.slot1': 'Šablonas 1',
    'presets.slot2': 'Šablonas 2',
    'presets.slot3': 'Šablonas 3',
    'presets.slot4': 'Šablonas 4',
    'presets.slot5': 'Šablonas 5',
    'presets.emptyStatus': 'Tuščia',
    'presets.namePlaceholder': 'Šablono pavadinimas',
    'presets.neverSaved': 'Niekada neišsaugota',
    'presets.deleteConfirmTitle': 'Ištrinti šabloną?',
    'presets.deleteConfirmBody': 'Ši vieta bus išvalyta visam laikui.',
    'presets.deleteConfirmConfirm': 'Ištrinti',
    'presets.deleteConfirmCancel': 'Atšaukti',
    'language.toggleAria': 'Keisti kalbą',
    'language.menuLabel': 'Pasirinkite kalbą',
    'language.optionLtAria': 'Perjungti į lietuvių kalbą',
    'language.optionEnAria': 'Perjungti į anglų kalbą',
    'errors.accessDeniedTitle': 'Prieiga uždrausta',
    'errors.accessDeniedMessage': 'Neturite leidimo naudoti šio administratoriaus skydelio.',
    'errors.apiKeyExpired': 'Pasibaigė Firebase API raktas. Atnaujinkite konfigūraciją ir vėl įdiekite.',
    'errors.popupClosed': 'Prisijungimas nutrauktas. Bandykite dar kartą.',
    'errors.popupPending': 'Kita prisijungimo užklausa jau vykdoma.',
    'errors.network': 'Tinklo klaida. Patikrinkite ryšį ir bandykite iš naujo.',
    'errors.genericSignIn': 'Šiuo metu nepavyksta prisijungti per Google.',
    'notifications.signInFailedTitle': 'Prisijungti nepavyko',
    'notifications.logoutTitle': 'Atsijungėte',
    'notifications.logoutMessage': 'Sėkmingai atsijungėte.',
    'notifications.logoutFailedTitle': 'Atsijungti nepavyko',
    'notifications.logoutFailedMessage': 'Nepavyko atsijungti. Bandykite dar kartą.',
    'notifications.messageDeletedTitle': 'Ištrinta',
    'notifications.messageDeletedBody': 'Žinutė pašalinta.',
    'notifications.messageDeleteFailedTitle': 'Ištrinti nepavyko',
    'notifications.messageDeleteFailedBody': 'Nepavyko ištrinti šios žinutės.',
    'notifications.newMessageTitle': 'Nauja žinutė',
  },
  en: {
    'login.badge': 'Admin access',
    'login.heading': 'Sign in to continue',
    'login.googleButton': 'Continue with Google',
    'login.googleAria': 'Sign in with Google',
    'login.spinnerAria': 'Signing in…',
    'header.title': 'Admin Panel',
    'tabs.liveEditor': 'Live Editor',
    'tabs.projects': 'Projects',
    'tabs.messages': 'Messages',
    'liveEditor.quickActionsBadge': 'Quick actions',
    'liveEditor.quickActionsTitle': 'Live Website Editor',
    'liveEditor.quickActionsDescription': 'Reload preview, reset to defaults, or manage presets.',
    'liveEditor.resetWarning': 'Reset replaces all editable text, colors, media, and layout overrides with the default template. Save a preset first if you want to keep the current layout.',
    'liveEditor.loading': 'Loading live editor…',
    'buttons.reloadPreview': 'Reload Preview',
    'buttons.resetDefaults': 'Reset To Default',
    'buttons.managePresets': 'Manage Presets',
    'status.loading': 'Loading…',
    'projects.formTitle': 'Add new project',
    'projects.formDescription': 'Create a portfolio entry and upload images.',
    'projects.titlePlaceholder': 'Project title',
    'projects.descriptionPlaceholder': 'Project description',
    'projects.imageLabel': 'Upload project images',
    'projects.submit': 'Publish project',
    'projects.update': 'Update project',
    'projects.listTitle': 'Existing projects',
    'projects.listDescription': 'Click a card to view or delete.',
    'projects.error': 'Failed to load projects.',
    'messages.title': 'Newest messages',
    'messages.description': 'Respond directly from your mail client.',
    'messages.error': 'Failed to load messages.',
    'messages.errorGeneric': 'Failed to load messages. Check Firestore rules and try again.',
    'messages.emptyState': 'No messages yet.',
    'messages.unreadBadge': 'Unread message',
    'messages.readBadge': 'Message',
    'messages.defaultTitle': 'New inquiry',
    'messages.unknownName': 'Anonymous visitor',
    'messages.unknownEmail': 'Email unavailable',
    'messages.messageFallback': 'No message content provided.',
    'messages.replySubject': 'Re: {title}',
    'messages.replyGreeting': 'Hi {name},',
    'messages.replyIntro': 'Thank you for reaching out about “{title}”. I’m happy to help with any questions.',
    'messages.replyClosing': 'Let me know if there’s anything else I can do.',
    'messages.replySignature': 'Best regards,\nStatyba team',
    'messages.deleteConfirmTitle': 'Delete message',
    'messages.deleteConfirmBody': 'This will permanently remove the message. Continue?',
    'messages.deleteConfirmConfirm': 'Delete',
    'messages.deleteConfirmCancel': 'Cancel',
    'messageModal.badge': 'Message details',
    'messageModal.dateLabel': 'Received',
    'messageModal.senderLabel': 'Sender',
    'messageModal.emailLabel': 'Email',
    'messageModal.phoneLabel': 'Phone',
    'messageModal.messageLabel': 'Message',
    'messageModal.closeAria': 'Close message details',
    'messageModal.emailFallback': 'Email not provided',
    'messageModal.phoneFallback': 'Phone not provided',
    'messageModal.emptyBody': 'No message content provided.',
    'editModal.badge': 'Edit element',
    'editModal.title': 'Edit Element',
    'editModal.textContentLabel': 'Text content',
    'editModal.textColorLabel': 'Text color',
    'editModal.textOutlineLabel': 'Text outline',
    'editModal.textOutlineToggle': 'Enable outline',
    'editModal.textOutlineWidthLabel': 'Thickness',
    'editModal.linkLabel': 'Link URL',
    'editModal.linkPlaceholder': 'https://example.com',
    'editModal.backgroundColorLabel': 'Background color',
    'editModal.backgroundTypeLabel': 'Background type',
    'editModal.gradientOption': 'Gradient',
    'editModal.imageOption': 'Image',
    'editModal.color1Label': 'Color 1',
    'editModal.color2Label': 'Color 2',
    'editModal.directionLabel': 'Direction',
    'editModal.directionHorizontal': 'Left → Right',
    'editModal.directionVertical': 'Top → Bottom',
    'editModal.directionDiagonal': 'Diagonal',
    'editModal.imageUrlPlaceholder': 'Image URL',
    'editModal.imagePreviewAlt': 'Image preview',
    'editModal.closeAria': 'Close edit modal',
    'editModal.savingAria': 'Saving edit',
    'buttons.cancel': 'Cancel',
    'buttons.save': 'Save',
    'buttons.refresh': 'Refresh',
    'buttons.load': 'Load',
    'buttons.delete': 'Delete',
    'buttons.reply': 'Reply',
    'buttons.logout': 'Logout',
    'presets.badge': 'Layouts',
    'presets.title': 'Manage Presets',
    'presets.description': 'Save up to five layouts and switch between them instantly.',
    'presets.info': 'Each slot stores text, colors, media, and layout overrides.',
    'presets.closeAria': 'Close preset manager',
    'presets.slot1': 'Preset 1',
    'presets.slot2': 'Preset 2',
    'presets.slot3': 'Preset 3',
    'presets.slot4': 'Preset 4',
    'presets.slot5': 'Preset 5',
    'presets.emptyStatus': 'Empty',
    'presets.namePlaceholder': 'Preset name',
    'presets.neverSaved': 'Never saved',
    'presets.deleteConfirmTitle': 'Delete preset?',
    'presets.deleteConfirmBody': 'This preset slot will be cleared permanently.',
    'presets.deleteConfirmConfirm': 'Delete',
    'presets.deleteConfirmCancel': 'Cancel',
    'language.toggleAria': 'Change language',
    'language.menuLabel': 'Select language',
    'language.optionLtAria': 'Switch to Lithuanian',
    'language.optionEnAria': 'Switch to English',
    'errors.accessDeniedTitle': 'Access Denied',
    'errors.accessDeniedMessage': 'You do not have permission to use this admin console.',
    'errors.apiKeyExpired': 'Firebase API key expired. Update config and redeploy.',
    'errors.popupClosed': 'Sign-in was cancelled. Please try again.',
    'errors.popupPending': 'Another sign-in attempt is already pending.',
    'errors.network': 'Network error. Check your connection and retry.',
    'errors.genericSignIn': 'Unable to sign in with Google right now.',
    'notifications.signInFailedTitle': 'Sign-in Failed',
    'notifications.logoutTitle': 'Logged Out',
    'notifications.logoutMessage': 'You have been logged out.',
    'notifications.logoutFailedTitle': 'Logout Failed',
    'notifications.logoutFailedMessage': 'Failed to log out. Please try again.',
    'notifications.messageDeletedTitle': 'Deleted',
    'notifications.messageDeletedBody': 'Message removed.',
    'notifications.messageDeleteFailedTitle': 'Delete failed',
    'notifications.messageDeleteFailedBody': 'Unable to delete this message.',
    'notifications.newMessageTitle': 'New message',
  },
};

const DOM = {
  adminLoginSection: null,
  adminDashboard: null,
  languageToggle: null,
  languageToggleLabel: null,
  languageMenu: null,
  languageOptions: [],
  logoutBtn: null,
  userDisplay: null,
  googleLoginButton: null,
  googleLoginSpinner: null,
  googleLoginText: null,
  loginErrorMessage: null,
  adminLoading: null,
  addProjectForm: null,
  projectTitleInput: null,
  projectDescriptionInput: null,
  projectImageInput: null,
  projectImageFilename: null,
  imagePreviewContainer: null,
  existingImagesSection: null,
  existingImagesContainer: null,
  existingImagesEmptyState: null,
  existingImagesHint: null,
  addProjectBtn: null,
  addProjectSpinner: null,
  addProjectText: null,
  addProjectError: null,
  projectsListDiv: null,
  projectsError: null,
  projectsLoadingLabel: null,
  messagesListDiv: null,
  messagesError: null,
  messagesLoadingLabel: null,
  messagesTabButton: null,
  messagesUnreadBadge: null,
  messageModalOverlay: null,
  messageModal: null,
  messageModalTitle: null,
  messageModalDate: null,
  messageModalName: null,
  messageModalEmail: null,
  messageModalPhone: null,
  messageModalBody: null,
  messageModalReplyBtn: null,
  messageModalDeleteBtn: null,
  messageModalCloseBtn: null,
};

const COLLECTION_PATHS = {
  base: `artifacts/${firebaseConfig.projectId}/public/data`,
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

document.addEventListener('DOMContentLoaded', () => {
  removeAuthGateStyles();
  cacheDom();
  initializeLanguageFeatures();
  attachBaseState();
  bindUiEvents();
  initializeAuthFlow();
});

// ---------------------------------------------------------------------------
// DOM bootstrap helpers
// ---------------------------------------------------------------------------

function removeAuthGateStyles() {
  ['admin-login-section', 'admin-dashboard'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.removeAttribute('hidden');
      el.style.display = 'none';
    }
  });
}

function cacheDom() {
  DOM.adminLoginSection = document.getElementById('admin-login-section');
  DOM.adminDashboard = document.getElementById('admin-dashboard');
  DOM.languageToggle = document.getElementById('language-toggle');
  DOM.languageToggleLabel = document.getElementById('language-toggle-label');
  DOM.languageMenu = document.getElementById('language-menu');
  DOM.languageOptions = Array.from(document.querySelectorAll('[data-language-option]'));
  DOM.logoutBtn = document.getElementById('main-logout-btn');
  DOM.userDisplay = document.getElementById('user-display');
  DOM.googleLoginButton = document.getElementById('google-login-button');
  DOM.googleLoginSpinner = document.getElementById('google-login-spinner');
  DOM.googleLoginText = document.getElementById('google-login-text');
  DOM.loginErrorMessage = document.getElementById('login-error-message');
  DOM.adminLoading = document.getElementById('admin-loading');
  DOM.addProjectForm = document.getElementById('add-project-form');
  DOM.projectTitleInput = document.getElementById('project-title');
  DOM.projectDescriptionInput = document.getElementById('project-description');
  DOM.projectImageInput = document.getElementById('project-image');
  DOM.projectImageFilename = document.getElementById('project-image-filename');
  DOM.imagePreviewContainer = document.getElementById('image-preview-container');
  DOM.existingImagesSection = document.getElementById('existing-project-images');
  DOM.existingImagesContainer = document.getElementById('existing-project-images-container');
  DOM.existingImagesEmptyState = document.getElementById('existing-project-images-empty');
  DOM.existingImagesHint = document.getElementById('existing-project-images-hint');
  DOM.addProjectBtn = document.getElementById('add-project-btn');
  DOM.addProjectSpinner = document.getElementById('add-project-spinner');
  DOM.addProjectText = document.getElementById('add-project-btn-text');
  DOM.addProjectError = document.getElementById('add-project-error');
  DOM.projectsListDiv = document.getElementById('projects-list');
  DOM.projectsError = document.getElementById('projects-error');
  DOM.projectsLoadingLabel = document.getElementById('loading-projects');
  DOM.messagesListDiv = document.getElementById('messages-list');
  DOM.messagesError = document.getElementById('messages-error');
  DOM.messagesLoadingLabel = document.getElementById('loading-messages');
  DOM.messagesTabButton = document.getElementById('messages-tab-btn');
  DOM.messagesUnreadBadge = document.getElementById('messages-unread-badge');
  DOM.messageModalOverlay = document.getElementById('message-detail-modal-overlay');
  DOM.messageModal = document.getElementById('message-detail-modal');
  DOM.messageModalTitle = document.getElementById('message-detail-title');
  DOM.messageModalDate = document.getElementById('message-detail-date');
  DOM.messageModalName = document.getElementById('message-detail-name');
  DOM.messageModalEmail = document.getElementById('message-detail-email');
  DOM.messageModalPhone = document.getElementById('message-detail-phone');
  DOM.messageModalBody = document.getElementById('message-detail-body');
  DOM.messageModalReplyBtn = document.getElementById('message-detail-reply-btn');
  DOM.messageModalDeleteBtn = document.getElementById('message-detail-delete-btn');
  DOM.messageModalCloseBtn = document.getElementById('message-detail-close-btn');
  updateProjectImageFilename();
}

function initializeLanguageFeatures() {
  applyLanguage(STATE.language);
  DOM.languageToggle?.addEventListener('click', toggleLanguageMenu);
  DOM.languageOptions.forEach((button) => {
    button.addEventListener('click', handleLanguageOptionClick);
  });
  document.addEventListener('click', handleDocumentClickForLanguageMenu);
}

function handleLanguageOptionClick(event) {
  event.stopPropagation();
  const lang = event.currentTarget.dataset.languageOption;
  if (!lang) return;
  setLanguage(lang);
  closeLanguageMenu();
}

function setLanguage(lang) {
  const resolvedLang = TRANSLATIONS[lang] ? lang : 'en';
  STATE.language = resolvedLang;
  localStorage.setItem(CONFIG.languageStorageKey, resolvedLang);
  applyLanguage(resolvedLang);
}

function applyLanguage(lang) {
  if (DOM.languageToggleLabel) DOM.languageToggleLabel.textContent = lang.toUpperCase();
  updateLanguageMenuSelection(lang);
  applyDocumentTranslations(lang);
  renderMessages(STATE.latestMessages || []);
  if (STATE.loginErrorKey === 'accessDenied') {
    showLoginError(t('errors.accessDeniedMessage', lang), 'accessDenied');
  }
  if (isMessageModalOpen() && STATE.activeMessage) {
    populateMessageDetailModal(STATE.activeMessage);
  }
}

function applyDocumentTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key, lang);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.setAttribute('placeholder', t(key, lang));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    if (key) el.setAttribute('aria-label', t(key, lang));
  });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const key = el.dataset.i18nAlt;
    if (key) el.setAttribute('alt', t(key, lang));
  });
}

function t(key, lang = STATE.language) {
  const fallback = TRANSLATIONS.en || {};
  const dictionary = TRANSLATIONS[lang] || fallback;
  return dictionary[key] ?? fallback[key] ?? key;
}

function toggleLanguageMenu(event) {
  event.stopPropagation();
  if (!DOM.languageMenu || !DOM.languageToggle) return;
  const isHidden = DOM.languageMenu.classList.contains('hidden');
  if (isHidden) {
    DOM.languageMenu.classList.remove('hidden');
    DOM.languageToggle.setAttribute('aria-expanded', 'true');
  } else {
    DOM.languageMenu.classList.add('hidden');
    DOM.languageToggle.setAttribute('aria-expanded', 'false');
  }
}

function closeLanguageMenu() {
  if (!DOM.languageMenu || !DOM.languageToggle) return;
  if (!DOM.languageMenu.classList.contains('hidden')) {
    DOM.languageMenu.classList.add('hidden');
    DOM.languageToggle.setAttribute('aria-expanded', 'false');
  }
}

function handleDocumentClickForLanguageMenu(event) {
  if (event.target.closest('#language-selector')) return;
  closeLanguageMenu();
}

function updateLanguageMenuSelection(lang) {
  DOM.languageOptions.forEach((button) => {
    if (button.dataset.languageOption === lang) {
      button.classList.add('bg-slate-100', 'text-slate-900');
      button.classList.remove('text-slate-600');
    } else {
      button.classList.remove('bg-slate-100', 'text-slate-900');
      button.classList.add('text-slate-600');
    }
  });
}

function attachBaseState() {
  updateMessagesBadge();
  showLoader();
  hideElement(DOM.adminLoginSection);
  hideElement(DOM.adminDashboard);
}

function bindUiEvents() {
  DOM.googleLoginButton?.addEventListener('click', handleGoogleLogin);
  DOM.logoutBtn?.addEventListener('click', handleLogout);
  DOM.addProjectForm?.addEventListener('submit', handleAddProject);
  DOM.projectImageInput?.addEventListener('change', handleImageSelection);
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => handleTabClick(button));
  });

  DOM.messageModalCloseBtn?.addEventListener('click', closeMessageDetailModal);
  DOM.messageModalOverlay?.addEventListener('click', handleMessageModalOverlayClick);
  DOM.messageModalReplyBtn?.addEventListener('click', handleMessageReplyViaGmail);
  DOM.messageModalDeleteBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    if (STATE.activeMessage?.id) {
      handleMessageDelete(STATE.activeMessage.id);
    }
  });
  document.addEventListener('keydown', handleGlobalKeydown);
}

// ---------------------------------------------------------------------------
// Auth flow
// ---------------------------------------------------------------------------

function initializeAuthFlow() {
  handleRedirectResult();
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      await finishLoaderDelay();
      showLoginOnly();
      return;
    }

    try {
      const authorized = await verifyAdminClaim(user);
      if (!authorized) return;
      await finishLoaderDelay();
      initializeAdminDashboard(user);
    } catch (error) {
      console.error('admin-dashboard.js: auth flow error', error);
      showNotification('Authentication Error', error.message || 'Failed to verify admin access.', 'error');
      await finishLoaderDelay();
      await handleLogout();
      showLoginOnly();
    }
  });
}

async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      setGoogleButtonLoading(false);
      return;
    }
    setGoogleButtonLoading(false);
  } catch (error) {
    handleGoogleError(error);
  }
}

async function handleGoogleLogin() {
  setGoogleButtonLoading(true);
  clearLoginError();

  const usePopup = shouldUsePopupAuth();
  const attemptRedirect = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      handleGoogleError(error);
    }
  };

  if (usePopup) {
    try {
      await signInWithPopup(auth, googleProvider);
      setGoogleButtonLoading(false);
      return;
    } catch (error) {
      if (!shouldFallbackToRedirect(error)) {
        handleGoogleError(error);
        return;
      }
    }
  }

  await attemptRedirect();
}

function shouldUsePopupAuth() {
  const isMobile = /iphone|ipad|android/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return !isMobile && !isStandalone;
}

function clearLoginError() {
  if (!DOM.loginErrorMessage) return;
  DOM.loginErrorMessage.textContent = '';
  DOM.loginErrorMessage.classList.add('hidden');
  STATE.loginErrorKey = null;
}

function showLoginError(message, key = null) {
  if (!DOM.loginErrorMessage) return;
  DOM.loginErrorMessage.textContent = message;
  DOM.loginErrorMessage.classList.remove('hidden');
  STATE.loginErrorKey = key;
}

function setGoogleButtonLoading(isLoading) {
  if (!DOM.googleLoginButton || !DOM.googleLoginSpinner || !DOM.googleLoginText) return;
  DOM.googleLoginButton.disabled = isLoading;
  DOM.googleLoginSpinner.classList.toggle('hidden', !isLoading);
  DOM.googleLoginText.classList.toggle('hidden', isLoading);
}

function shouldFallbackToRedirect(error) {
  if (!error || !error.code) return false;
  return ['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/popup-closed-by-user'].includes(error.code);
}

function mapAuthErrorToMessage(error) {
  switch (error?.code) {
    case 'auth/api-key-expired':
      return t('errors.apiKeyExpired');
    case 'auth/popup-closed-by-user':
      return t('errors.popupClosed');
    case 'auth/cancelled-popup-request':
      return t('errors.popupPending');
    case 'auth/network-request-failed':
      return t('errors.network');
    default:
      return t('errors.genericSignIn');
  }
}

function handleGoogleError(error) {
  const message = mapAuthErrorToMessage(error);
  showLoginError(message);
  showNotification(t('notifications.signInFailedTitle'), message, 'error');
  setGoogleButtonLoading(false);
}

async function verifyAdminClaim(user) {
  await ensureAllowlistLoaded();
  const tokenResult = await getIdTokenResult(user, true);
  const hasAdminClaim = Boolean(tokenResult.claims?.admin);
  const allowlisted = isEmailAllowlisted(user?.email || '');
  if (hasAdminClaim || allowlisted) return true;

  const title = t('errors.accessDeniedTitle');
  const message = t('errors.accessDeniedMessage');
  showNotification(title, message, 'error');
  showLoginError(message, 'accessDenied');
  await handleLogout();
  return false;
}

async function handleLogout() {
  try {
    stopMessagesRealtimeListener();
    await signOut(auth);
    showNotification(t('notifications.logoutTitle'), t('notifications.logoutMessage'), 'info');
  } catch (error) {
    console.error('Logout error:', error);
    showNotification(t('notifications.logoutFailedTitle'), t('notifications.logoutFailedMessage'), 'error');
  }
}

// ---------------------------------------------------------------------------
// Allowlist utilities
// ---------------------------------------------------------------------------

function startAllowlistPrefetch() {
  if (STATE.allowlistPromise) return STATE.allowlistPromise;
  STATE.allowlistPromise = fetchAllowlist().catch((error) => {
    console.warn('admin-dashboard.js: unable to load remote allowlist', error);
  });
  return STATE.allowlistPromise;
}

function ensureAllowlistLoaded() {
  if (!STATE.allowlistPromise) {
    startAllowlistPrefetch();
  }
  return STATE.allowlistPromise || Promise.resolve();
}

async function fetchAllowlist() {
  const emails = new Set();
  const envEmails = (import.meta.env?.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
  envEmails.forEach((email) => emails.add(email));

  if (db && CONFIG.allowlistDocPath) {
    try {
      const allowlistDocPath = normalizeAllowlistDocPath(CONFIG.allowlistDocPath);
      const docRef = doc(db, allowlistDocPath);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() || {};
        const docEmails = Array.isArray(data.emails) ? data.emails : [];
        docEmails.map(normalizeEmail).filter(Boolean).forEach((email) => emails.add(email));
      } else {
        console.warn('admin-dashboard.js: allowlist document missing; skipping auto-create to avoid permission errors.');
      }
    } catch (error) {
      if (error?.code === 'permission-denied') {
        console.warn('admin-dashboard.js: allowlist Firestore permission warning; falling back to env allowlist only.');
      } else {
        console.warn('admin-dashboard.js: allowlist Firestore warning', error);
      }
    }
  }

  STATE.allowlistedEmails = emails;
  return emails;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isEmailAllowlisted(email) {
  const normalized = normalizeEmail(email);
  return normalized && STATE.allowlistedEmails.has(normalized);
}

function normalizeAllowlistDocPath(path) {
  if (!path) return `artifacts/${firebaseConfig.projectId}/private/adminAllowlist`;
  const segments = path.split('/').filter(Boolean);
  if (segments.length % 2 !== 0) {
    console.warn('admin-dashboard: allowlist path had odd segment count; falling back to default path.');
    return `artifacts/${firebaseConfig.projectId}/private/adminAllowlist`;
  }
  return segments.join('/');
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function showLoader() {
  if (DOM.adminLoading) {
    STATE.loaderShownAt = performance.now();
    DOM.adminLoading.style.display = 'flex';
  }
}

function hideLoader() {
  if (DOM.adminLoading) {
    DOM.adminLoading.style.display = 'none';
  }
}

async function finishLoaderDelay() {
  const elapsed = performance.now() - STATE.loaderShownAt;
  const remaining = Math.max(0, CONFIG.loaderMinMs - elapsed);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

function hideElement(element) {
  if (!element) return;
  element.classList.add('hidden');
  element.setAttribute('hidden', '');
  element.style.display = 'none';
}

function showElement(element) {
  if (!element) return;
  element.classList.remove('hidden');
  element.removeAttribute('hidden');
  element.style.display = '';
}

function showLoginOnly() {
  stopMessagesRealtimeListener();
  STATE.unreadMessageCount = 0;
  updateMessagesBadge();

  if (STATE.preAuthState === 'login') {
    hideLoader();
    return;
  }

  STATE.preAuthState = 'login';
  hideElement(DOM.adminDashboard);
  showElement(DOM.adminLoginSection);
  hideLoader();
}

function initializeAdminDashboard(user) {
  STATE.preAuthState = 'dashboard';
  hideElement(DOM.adminLoginSection);
  showElement(DOM.adminDashboard);
  hideLoader();

  if (DOM.userDisplay) {
    DOM.userDisplay.textContent = user?.email ? `Logged in as ${user.email}` : '';
  }

  setupTabsForSignedInState();
  loadAndRenderProjects();
  loadAndRenderMessages();
  startMessagesRealtimeListener();
}

function setupTabsForSignedInState() {
  const activeButton = document.querySelector('.tab-btn.active');
  if (activeButton) {
    handleTabClick(activeButton);
  }
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

async function handleTabClick(clickedButton) {
  const targetTab = clickedButton.dataset.tab;
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('tabindex', '-1');
  });
  clickedButton.classList.add('active');
  clickedButton.setAttribute('aria-selected', 'true');
  clickedButton.setAttribute('tabindex', '0');

  tabContents.forEach((content) => {
    content.classList.add('hidden');
    content.setAttribute('aria-hidden', 'true');
  });

  const activeTabContent = document.getElementById(`${targetTab}-tab`);
  activeTabContent?.classList.remove('hidden');
  activeTabContent?.setAttribute('aria-hidden', 'false');

  STATE.activeTab = targetTab;

  if (!auth.currentUser) {
    showNotification('Access Denied', 'Please log in to manage content.', 'info');
    return;
  }

  switch (targetTab) {
    case 'project-management':
      await loadAndRenderProjects();
      break;
    case 'messages':
      await loadAndRenderMessages();
      break;
    case 'live-editor':
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Projects management
// ---------------------------------------------------------------------------

function handleImageSelection(event) {
  STATE.selectedImageFiles.push(...Array.from(event.target.files));
  event.target.value = '';
  renderImagePreviews();
}

function renderImagePreviews() {
  if (!DOM.imagePreviewContainer) return;
  DOM.imagePreviewContainer.innerHTML = '';

  STATE.selectedImageFiles.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className =
      'relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 bg-white';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.className = 'w-full h-full object-cover';
    img.onload = () => URL.revokeObjectURL(img.src);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className =
      'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition';
    deleteButton.innerText = '×';
    deleteButton.addEventListener('click', () => {
      STATE.selectedImageFiles.splice(index, 1);
      renderImagePreviews();
    });

    wrapper.append(img, deleteButton);
    DOM.imagePreviewContainer.appendChild(wrapper);
  });
  updateProjectImageFilename();
}

function renderExistingProjectImages() {
  if (!DOM.existingImagesSection || !DOM.existingImagesContainer || !DOM.existingImagesEmptyState) return;
  const isEditing = Boolean(STATE.editingProjectId);
  DOM.existingImagesSection.classList.toggle('hidden', !isEditing);
  DOM.existingImagesContainer.innerHTML = '';

  if (!isEditing) {
    DOM.existingImagesEmptyState.classList.add('hidden');
    DOM.existingImagesHint?.classList.remove('text-red-600');
    return;
  }

  const imageUrls = STATE.editingProjectImageUrls || [];
  if (!imageUrls.length) {
    DOM.existingImagesEmptyState.classList.remove('hidden');
    DOM.existingImagesHint?.classList.add('hidden');
    return;
  }

  DOM.existingImagesEmptyState.classList.add('hidden');
  DOM.existingImagesHint?.classList.remove('hidden');

  imageUrls.forEach((url) => {
    const isMarkedForRemoval = STATE.editingProjectRemovedImageUrls.includes(url);
    const wrapper = document.createElement('div');
    wrapper.className = `relative w-24 h-24 rounded-xl overflow-hidden border flex-shrink-0 bg-white shadow-sm ${
      isMarkedForRemoval ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200'
    }`;

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Projekto nuotrauka';
    img.className = 'w-full h-full object-cover';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = `absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
      isMarkedForRemoval
        ? 'bg-green-600 text-white hover:bg-green-700'
        : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
    }`;
    toggleButton.textContent = isMarkedForRemoval ? '↺' : '×';
    toggleButton.setAttribute(
      'aria-label',
      isMarkedForRemoval ? 'Atkurti šią nuotrauką' : 'Pašalinti šią nuotrauką'
    );
    toggleButton.addEventListener('click', () => toggleExistingImageRemoval(url));

    const statusBadge = document.createElement('span');
    statusBadge.className = `absolute bottom-1 left-1 right-1 text-[10px] font-semibold text-center rounded-full px-1 py-0.5 ${
      isMarkedForRemoval ? 'bg-red-600 text-white' : 'bg-slate-900/80 text-white'
    }`;
    statusBadge.textContent = isMarkedForRemoval ? 'Bus pašalinta' : 'Paliekama';

    wrapper.append(img, toggleButton, statusBadge);
    DOM.existingImagesContainer.appendChild(wrapper);
  });
}

function toggleExistingImageRemoval(url) {
  if (!url) return;
  const idx = STATE.editingProjectRemovedImageUrls.indexOf(url);
  if (idx >= 0) {
    STATE.editingProjectRemovedImageUrls.splice(idx, 1);
  } else {
    STATE.editingProjectRemovedImageUrls.push(url);
  }
  renderExistingProjectImages();
}

function getRemainingExistingImageUrls() {
  if (!STATE.editingProjectImageUrls?.length) return [];
  if (!STATE.editingProjectRemovedImageUrls.length) return [...STATE.editingProjectImageUrls];
  return STATE.editingProjectImageUrls.filter((url) => !STATE.editingProjectRemovedImageUrls.includes(url));
}

function updateProjectImageFilename() {
  if (!DOM.projectImageFilename) return;
  const count = STATE.selectedImageFiles.length;
  if (!count) {
    DOM.projectImageFilename.textContent = 'Failai nepasirinkti';
    return;
  }
  const suffix = count === 1 ? 'failas pasirinktas' : 'failai pasirinkti';
  DOM.projectImageFilename.textContent = `${count} ${suffix}`;
}

function enterProjectEditMode(project) {
  STATE.editingProjectId = project.id;
  STATE.editingProjectImageUrls = project.imageUrls || [];
  STATE.editingProjectRemovedImageUrls = [];
  if (DOM.projectTitleInput) DOM.projectTitleInput.value = project.title || '';
  if (DOM.projectDescriptionInput) DOM.projectDescriptionInput.value = project.description || '';
  STATE.selectedImageFiles = [];
  renderImagePreviews();
  updateProjectImageFilename();
  renderExistingProjectImages();
  if (DOM.addProjectText) DOM.addProjectText.textContent = t('projects.update');
  DOM.addProjectForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitProjectEditMode() {
  STATE.editingProjectId = null;
  STATE.editingProjectImageUrls = [];
  STATE.editingProjectRemovedImageUrls = [];
  DOM.addProjectForm?.reset();
  STATE.selectedImageFiles = [];
  renderImagePreviews();
  updateProjectImageFilename();
  renderExistingProjectImages();
  if (DOM.addProjectText) DOM.addProjectText.textContent = t('projects.submit');
}

async function handleAddProject(event) {
  event.preventDefault();
  if (!DOM.projectTitleInput || !DOM.projectDescriptionInput || !DOM.addProjectBtn) return;

  const title = DOM.projectTitleInput.value.trim();
  const description = DOM.projectDescriptionInput.value.trim();
  const imageFiles = STATE.selectedImageFiles;
  const isEditing = Boolean(STATE.editingProjectId);
  const remainingExistingImageUrls = getRemainingExistingImageUrls();
  const totalImagesCount = remainingExistingImageUrls.length + imageFiles.length;

  if (!title || !description || (!isEditing && imageFiles.length === 0) || (isEditing && totalImagesCount === 0)) {
    showNotification('Warning', 'Užpildykite visus laukus ir įkelkite bent vieną nuotrauką.', 'warning');
    return;
  }

  toggleProjectSubmitState(true);

  try {
    let success = false;
    if (isEditing) {
      success = await updateProjectInFirebase(
        STATE.editingProjectId,
        { title, description },
        imageFiles,
        remainingExistingImageUrls,
        STATE.editingProjectRemovedImageUrls
      );
      if (success) {
        showNotification('Success', 'Projektas atnaujintas sėkmingai.', 'success');
      }
    } else {
      success = await addProjectToFirebase({ title, description }, imageFiles);
      if (success) {
        showNotification('Success', 'Projektas pridėtas sėkmingai.', 'success');
      }
    }
    if (success) {
      exitProjectEditMode();
      await loadAndRenderProjects();
    }
  } catch (error) {
    console.error('Error adding project:', error);
    showNotification('Error', `Nepavyko išsaugoti projekto: ${error.message}`, 'error');
  } finally {
    toggleProjectSubmitState(false);
  }
}

function toggleProjectSubmitState(isLoading) {
  if (!DOM.addProjectBtn || !DOM.addProjectSpinner || !DOM.addProjectText) return;
  DOM.addProjectBtn.disabled = isLoading;
  DOM.addProjectSpinner.classList.toggle('hidden', !isLoading);
  DOM.addProjectText.classList.toggle('hidden', isLoading);
  if (DOM.addProjectError) {
    DOM.addProjectError.classList.add('hidden');
  }
}

async function loadAndRenderProjects() {
  if (!DOM.projectsListDiv) return;
  setProjectsLoading(true);

  try {
    const projects = await loadProjectsForAdmin();
    if (!projects.length) {
      DOM.projectsListDiv.innerHTML = '<p class="text-slate-500 text-sm">No projects added yet.</p>';
      setProjectsError(null);
      return;
    }

    DOM.projectsListDiv.innerHTML = '';
    projects
      .sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
      .forEach((project) => DOM.projectsListDiv.appendChild(createProjectRow(project)));
    setProjectsError(null);
  } catch (error) {
    console.error('Error loading projects:', error);
    setProjectsError('Failed to load projects. Check Firestore rules and try again.');
  } finally {
    setProjectsLoading(false);
  }
}

function setProjectsLoading(isLoading) {
  if (!DOM.projectsLoadingLabel) return;
  DOM.projectsLoadingLabel.textContent = isLoading ? 'Loading…' : '';
}

function setProjectsError(message) {
  if (!DOM.projectsError) return;
  if (!message) {
    DOM.projectsError.classList.add('hidden');
    DOM.projectsError.textContent = '';
    return;
  }
  DOM.projectsError.textContent = message;
  DOM.projectsError.classList.remove('hidden');
}

function createProjectRow(project) {
  const container = document.createElement('button');
  container.type = 'button';
  container.className =
    'w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition';

  const imageUrl = project.imageUrls?.[0] || 'https://placehold.co/120x90?text=No+Image';
  const description = (project.description || '').slice(0, CONFIG.maxProjectDescriptionLength);

  container.innerHTML = `
    <img src="${imageUrl}" alt="${project.title}" class="w-24 h-18 rounded-xl object-cover flex-shrink-0" />
    <div>
      <h4 class="font-semibold text-slate-900">${project.title}</h4>
      <p class="text-sm text-slate-600 mt-1">${description}${
        project.description?.length > CONFIG.maxProjectDescriptionLength ? '…' : ''
      }</p>
    </div>
  `;

  container.addEventListener('click', () => {
    window.location.href = `admin-project.html?id=${project.id}`;
  });

  return container;
}

// ---------------------------------------------------------------------------
// Messages management
// ---------------------------------------------------------------------------

async function loadAndRenderMessages() {
  if (!DOM.messagesListDiv) return;
  setMessagesLoading(true);

  try {
    const messages = await loadMessagesForAdmin();
    STATE.latestMessages = messages;
    renderMessages(messages);
    refreshActiveMessageReference(messages);
    updateUnreadTracking(messages);
    setMessagesError(null);
  } catch (error) {
    console.error('Error loading messages:', error);
    setMessagesError(t('messages.errorGeneric'));
  } finally {
    setMessagesLoading(false);
  }
}

function renderMessages(messages = []) {
  if (!DOM.messagesListDiv) return;
  if (!Array.isArray(messages) || !messages.length) {
    DOM.messagesListDiv.innerHTML = `<p class="text-sm text-slate-500 text-center py-6 rounded-2xl border border-dashed border-slate-200">${t(
      'messages.emptyState'
    )}</p>`;
    return;
  }

  DOM.messagesListDiv.innerHTML = '';
  messages
    .slice()
    .sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
    .forEach((message) => DOM.messagesListDiv.appendChild(createMessageCard(message)));

  updateCardStylesForReadState();
}

function getMessageBadgeText(isUnread, lang = STATE.language) {
  return t(isUnread ? 'messages.unreadBadge' : 'messages.readBadge', lang);
}

function setMessagesLoading(isLoading) {
  if (!DOM.messagesLoadingLabel) return;
  DOM.messagesLoadingLabel.textContent = isLoading ? t('status.loading') : '';
}

function setMessagesError(message) {
  if (!DOM.messagesError) return;
  if (!message) {
    DOM.messagesError.classList.add('hidden');
    DOM.messagesError.textContent = '';
    return;
  }
  DOM.messagesError.textContent = message;
  DOM.messagesError.classList.remove('hidden');
}

function createMessageCard(message) {
  const timestampMillis = toMillis(message.timestamp);
  const isUnread = timestampMillis > STATE.lastReadMessageTimestamp;
  const displayTitle = message.title || t('messages.defaultTitle');
  const displayName = message.name || t('messages.unknownName');
  const formattedDate = formatTimestamp(timestampMillis);
  const badgeText = getMessageBadgeText(isUnread);

  const card = document.createElement('article');
  card.className = [
    'rounded-2xl border p-4 transition relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500',
    isUnread ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white',
  ].join(' ');

  card.dataset.messageId = message.id;
  card.dataset.timestamp = String(timestampMillis);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${displayTitle} — ${displayName}`);

  card.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide font-semibold ${
            isUnread ? 'text-red-600' : 'text-slate-400'
          }">${badgeText}</p>
          <h4 class="text-lg font-semibold text-slate-900">${displayTitle}</h4>
        </div>
        <span class="text-xs text-slate-500 whitespace-nowrap">${formattedDate}</span>
      </div>
      <p class="text-sm text-slate-500">${displayName}</p>
    </div>
  `;

  const openDetails = () => {
    markSingleMessageAsRead(timestampMillis, card);
    openMessageDetailModal(message);
  };

  card.addEventListener('click', openDetails);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails();
    }
  });

  return card;
}

function openMessageDetailModal(message) {
  if (!DOM.messageModalOverlay || !DOM.messageModal) return;
  STATE.activeMessage = message;
  populateMessageDetailModal(message);
  DOM.messageModalOverlay.classList.remove('hidden');
  DOM.messageModalOverlay.classList.add('flex');
  requestAnimationFrame(() => {
    DOM.messageModalCloseBtn?.focus();
  });
}

function populateMessageDetailModal(message) {
  if (!DOM.messageModalOverlay) return;
  const timestampMillis = toMillis(message.timestamp);
  const title = message.title || t('messages.defaultTitle');
  const name = message.name || t('messages.unknownName');
  const email = message.email || '';
  const phone = message.phone || message.phoneNumber || message.number || '';
  const body = message.message || t('messageModal.emptyBody');
  const dateLabel = `${t('messageModal.dateLabel')}: ${formatTimestamp(timestampMillis)}`;

  if (DOM.messageModalTitle) DOM.messageModalTitle.textContent = title;
  if (DOM.messageModalDate) DOM.messageModalDate.textContent = dateLabel;
  if (DOM.messageModalName) DOM.messageModalName.textContent = name;
  if (DOM.messageModalBody) DOM.messageModalBody.textContent = body;
  if (DOM.messageModalPhone) {
    DOM.messageModalPhone.textContent = phone || t('messageModal.phoneFallback');
  }
  if (DOM.messageModalEmail) {
    if (email) {
      DOM.messageModalEmail.textContent = email;
      DOM.messageModalEmail.href = `mailto:${email}`;
      DOM.messageModalEmail.classList.remove('pointer-events-none', 'text-slate-400');
    } else {
      DOM.messageModalEmail.textContent = t('messageModal.emailFallback');
      DOM.messageModalEmail.removeAttribute('href');
      DOM.messageModalEmail.classList.add('pointer-events-none', 'text-slate-400');
    }
  }
  if (DOM.messageModalDeleteBtn) {
    DOM.messageModalDeleteBtn.dataset.messageId = message.id || '';
  }
  if (DOM.messageModalReplyBtn) {
    const canReply = Boolean(email);
    DOM.messageModalReplyBtn.disabled = !canReply;
    DOM.messageModalReplyBtn.setAttribute('aria-disabled', String(!canReply));
    DOM.messageModalReplyBtn.classList.toggle('opacity-50', !canReply);
    DOM.messageModalReplyBtn.classList.toggle('cursor-not-allowed', !canReply);
    DOM.messageModalReplyBtn.classList.toggle('pointer-events-none', !canReply);
  }
}

function closeMessageDetailModal() {
  if (!DOM.messageModalOverlay) return;
  DOM.messageModalOverlay.classList.add('hidden');
  DOM.messageModalOverlay.classList.remove('flex');
  STATE.activeMessage = null;
}

function isMessageModalOpen() {
  return Boolean(DOM.messageModalOverlay && !DOM.messageModalOverlay.classList.contains('hidden'));
}

function handleMessageModalOverlayClick(event) {
  if (event.target === DOM.messageModalOverlay) {
    closeMessageDetailModal();
  }
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && isMessageModalOpen()) {
    closeMessageDetailModal();
  }
}

function handleMessageReplyViaGmail(event) {
  event.preventDefault();
  if (!STATE.activeMessage?.email) return;
  openGmailCompose(STATE.activeMessage);
}

function buildReplyTemplate(message, lang = STATE.language) {
  const safeTitle = message.title || t('messages.defaultTitle', lang);
  const safeName = message.name || t('messages.unknownName', lang);
  const subject = formatWithPlaceholders(t('messages.replySubject', lang), { title: safeTitle });
  const greeting = formatWithPlaceholders(t('messages.replyGreeting', lang), { name: safeName });
  const intro = formatWithPlaceholders(t('messages.replyIntro', lang), { title: safeTitle });
  const closing = t('messages.replyClosing', lang);
  const signature = t('messages.replySignature', lang);
  const body = `${greeting}\n\n${intro}\n\n${closing}\n\n${signature}`;
  return { subject, body };
}

function openGmailCompose(message) {
  const { subject, body } = buildReplyTemplate(message);
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    tf: '1',
    to: message.email || '',
    su: subject,
    body,
  });
  const composeUrl = `https://mail.google.com/mail/?${params.toString()}`;
  const anchor = document.createElement('a');
  anchor.href = composeUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
  });
}

function formatWithPlaceholders(template, replacements = {}) {
  if (!template) return '';
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    const safeValue = value ?? '';
    return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }, template);
}

async function handleMessageDelete(messageId) {
  if (!messageId) return;
  const confirmed = await showConfirmationModal(
    t('messages.deleteConfirmTitle'),
    t('messages.deleteConfirmBody'),
    t('messages.deleteConfirmConfirm'),
    t('messages.deleteConfirmCancel')
  );
  if (!confirmed) return;

  try {
    await deleteMessageFromFirebase(messageId);
    showNotification(t('notifications.messageDeletedTitle'), t('notifications.messageDeletedBody'), 'success');
    if (STATE.activeMessage?.id === messageId) {
      closeMessageDetailModal();
    }
    await loadAndRenderMessages();
  } catch (error) {
    console.error('Error deleting message:', error);
    showNotification(
      t('notifications.messageDeleteFailedTitle'),
      t('notifications.messageDeleteFailedBody'),
      'error'
    );
  }
}

function formatTimestamp(milliseconds) {
  if (!milliseconds) return 'Just now';
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return formatter.format(new Date(milliseconds));
  } catch {
    return new Date(milliseconds).toLocaleString();
  }
}

function toMillis(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (timestamp.seconds) return timestamp.seconds * 1000 + Math.round(timestamp.nanoseconds / 1e6);
  return 0;
}

// ---------------------------------------------------------------------------
// Realtime messages + notifications
// ---------------------------------------------------------------------------

function startMessagesRealtimeListener() {
  if (STATE.messageRealtimeUnsubscribe || !db) return;

  try {
    const messagesRef = collection(db, `${COLLECTION_PATHS.base}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    STATE.messageRealtimeUnsubscribe = onSnapshot(
      q,
      (snapshot) => handleMessagesSnapshot(snapshot),
      (error) => {
        console.error('Messages realtime listener error:', error);
        showNotification(
          'Realtime disabled',
          'Unable to subscribe to live messages. Refresh after checking Firestore rules.',
          'error'
        );
        stopMessagesRealtimeListener();
      }
    );
  } catch (error) {
    console.error('Failed to start messages listener:', error);
  }
}

function handleMessagesSnapshot(snapshot) {
  const messages = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const wasInitialized = STATE.messagesInitialized;
  const previousMaxTimestamp = wasInitialized ? STATE.latestMessagesMaxTimestamp || 0 : 0;

  STATE.latestMessages = messages;
  renderMessages(messages);
  refreshActiveMessageReference(messages);
  updateUnreadTracking(messages);
  STATE.messagesInitialized = true;

  if (STATE.activeTab !== 'messages') {
    maybePromptForNotifications(messages);
    if (wasInitialized) {
      const newMessages = messages
        .filter((message) => toMillis(message.timestamp) > previousMaxTimestamp)
        .slice(0, CONFIG.maxNotifications);
      newMessages.forEach((message) => maybeDeliverNotification(message));
    }
  }
}

function stopMessagesRealtimeListener() {
  if (STATE.messageRealtimeUnsubscribe) {
    STATE.messageRealtimeUnsubscribe();
    STATE.messageRealtimeUnsubscribe = null;
  }
}

function updateUnreadTracking(messages) {
  const latestTimestamp = Math.max(0, ...messages.map((msg) => toMillis(msg.timestamp)));
  const unreadCount = messages.filter((msg) => toMillis(msg.timestamp) > STATE.lastReadMessageTimestamp).length;
  STATE.unreadMessageCount = unreadCount;
  STATE.latestMessagesMaxTimestamp = latestTimestamp;
  updateMessagesBadge();
}

function markSingleMessageAsRead(timestampMillis, card) {
  if (!timestampMillis) return;
  const wasUnread = timestampMillis > STATE.lastReadMessageTimestamp;
  if (wasUnread) {
    STATE.lastReadMessageTimestamp = timestampMillis;
    persistLastReadTimestamp();
    STATE.unreadMessageCount = Math.max(0, STATE.unreadMessageCount - 1);
  }
  updateMessagesBadge();
  if (card) {
    card.classList.remove('border-red-400', 'bg-red-50');
    card.classList.add('border-slate-200', 'bg-white');
    const badge = card.querySelector('p.text-xs');
    if (badge) {
      badge.textContent = getMessageBadgeText(false);
      badge.classList.remove('text-red-600');
      badge.classList.add('text-slate-400');
    }
  }
}

function updateCardStylesForReadState() {
  if (!DOM.messagesListDiv) return;
  DOM.messagesListDiv.querySelectorAll('article[data-timestamp]').forEach((card) => {
    const timestamp = Number(card.dataset.timestamp || '0');
    const unread = timestamp > STATE.lastReadMessageTimestamp;
    card.classList.toggle('border-red-400', unread);
    card.classList.toggle('bg-red-50', unread);
    card.classList.toggle('border-slate-200', !unread);
    card.classList.toggle('bg-white', !unread);
    const badge = card.querySelector('p.text-xs');
    if (!badge) return;
    badge.textContent = getMessageBadgeText(unread);
    badge.classList.toggle('text-red-600', unread);
    badge.classList.toggle('text-slate-400', !unread);
  });
}

function refreshActiveMessageReference(messages) {
  if (!STATE.activeMessage) return;
  const updatedMessage = messages.find((msg) => msg.id === STATE.activeMessage.id);
  if (updatedMessage) {
    STATE.activeMessage = updatedMessage;
    if (isMessageModalOpen()) {
      populateMessageDetailModal(updatedMessage);
    }
  } else if (isMessageModalOpen()) {
    closeMessageDetailModal();
  }
}

function persistLastReadTimestamp() {
  localStorage.setItem(CONFIG.messageReadStorageKey, String(STATE.lastReadMessageTimestamp));
}

function updateMessagesBadge() {
  if (!DOM.messagesUnreadBadge) return;
  const count = Math.max(0, Number(STATE.unreadMessageCount) || 0);
  STATE.unreadMessageCount = count;
  if (count === 0) {
    DOM.messagesUnreadBadge.classList.add('hidden');
    DOM.messagesUnreadBadge.style.display = 'none';
    DOM.messagesUnreadBadge.textContent = '';
    DOM.messagesUnreadBadge.setAttribute('aria-hidden', 'true');
    return;
  }
  DOM.messagesUnreadBadge.textContent = String(Math.min(count, 99));
  DOM.messagesUnreadBadge.classList.remove('hidden');
  DOM.messagesUnreadBadge.style.display = 'inline-flex';
  DOM.messagesUnreadBadge.setAttribute('aria-hidden', 'false');
}

async function maybePromptForNotifications(messages) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  if (STATE.notificationPromptOpen) return;
  if (localStorage.getItem(CONFIG.notifPromptStorageKey) === 'dismissed') return;
  if (!messages.length) return;

  STATE.notificationPromptOpen = true;
  const confirmed = await showConfirmationModal(
    'Enable alerts',
    'Would you like browser notifications when a new inquiry arrives?',
    'Enable',
    'Not now'
  );
  STATE.notificationPromptOpen = false;
  if (!confirmed) {
    localStorage.setItem(CONFIG.notifPromptStorageKey, 'dismissed');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(CONFIG.notifPromptStorageKey, permission);
    if (permission !== 'granted') {
      showNotification('Notifications blocked', 'You can enable notifications from your browser settings.', 'info');
    }
  } catch (error) {
    console.warn('Notification permission request failed:', error);
  }
}

function maybeDeliverNotification(message) {
  if (STATE.deliveredNotificationIds.has(message.id)) return;
  if (document.visibilityState === 'visible' && STATE.activeTab === 'messages') return;

  const deliveredBrowser = shouldShowBrowserNotifications() && deliverBrowserNotification(message);
  if (!deliveredBrowser) {
    deliverInAppNotification(message);
  }
  STATE.deliveredNotificationIds.add(message.id);
}

function shouldShowBrowserNotifications() {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

function deliverBrowserNotification(message) {
  try {
    const title = message.title || 'New website inquiry';
    const bodyParts = [
      message.name ? `From: ${message.name}` : null,
      message.email ? `Email: ${message.email}` : null,
      message.message ? message.message.slice(0, 120) : null,
    ].filter(Boolean);
    const notification = new Notification(title, {
      body: bodyParts.join('\n'),
      icon: '/favicon.ico',
      tag: message.id,
    });
    notification.onclick = () => window.focus();
    return true;
  } catch (error) {
    console.warn('Failed to show browser notification:', error);
    return false;
  }
}

function deliverInAppNotification(message) {
  const name = message.name || t('messages.unknownName');
  const title = message.title || t('messages.defaultTitle');
  const body = message.message
    ? `${name}: ${message.message.slice(0, 120)}${message.message.length > 120 ? '…' : ''}`
    : name;
  showNotification(t('notifications.newMessageTitle'), `${title} • ${body}`, 'info');
}

// ---------------------------------------------------------------------------
// End
// ---------------------------------------------------------------------------