import './style.css';
import { db, auth, firebaseConfig } from './firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getIdTokenResult,
  signOut,
} from 'firebase/auth';
import { showNotification, showConfirmationModal } from './ui-utils.js';
import { updateProjectInFirebase, deleteProjectFromFirebase } from './admin-data.js';
import { setLightboxImages, registerLightboxTrigger } from './gallery-lightbox.js';

const CONFIG = {
  allowlistDocPath: `artifacts/${firebaseConfig.projectId}/private/config/adminAllowlist`,
};

const STATE = {
  projectId: null,
  projectData: null,
  editing: false,
  selectedImageFiles: [],
  removedImageUrls: [],
  existingImageUrls: [],
  allowlistPromise: null,
  allowlistedEmails: new Set(),
};

const DOM = {
  pageOverlay: null,
  loginSection: null,
  shell: null,
  googleButton: null,
  googleText: null,
  googleSpinner: null,
  loginError: null,
  logoutBtn: null,
  statusLabel: null,
  editBtn: null,
  cancelBtn: null,
  saveBtn: null,
  saveSpinner: null,
  deleteBtn: null,
  deleteSpinner: null,
  projectLoading: null,
  projectError: null,
  projectDisplay: null,
  projectTitle: null,
  projectDescription: null,
  projectHero: null,
  projectHeroTrigger: null,
  projectGallery: null,
  editPanel: null,
  editTitleInput: null,
  editDescriptionInput: null,
  existingImagesContainer: null,
  existingImagesEmpty: null,
  imageInput: null,
  imageFilename: null,
  imagePreviewContainer: null,
  editError: null,
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

document.addEventListener('DOMContentLoaded', () => {
  STATE.projectId = new URLSearchParams(window.location.search).get('id');
  cacheDom();
  bindEvents();
  startAllowlistPrefetch();
  initializeAuthFlow();
  updateSelectedImageFilename();
});

function cacheDom() {
  DOM.pageOverlay = document.getElementById('admin-project-page-loader');
  DOM.loginSection = document.getElementById('admin-project-login');
  DOM.shell = document.getElementById('admin-project-shell');
  DOM.googleButton = document.getElementById('admin-project-google-btn');
  DOM.googleText = document.getElementById('admin-project-google-text');
  DOM.googleSpinner = document.getElementById('admin-project-google-spinner');
  DOM.loginError = document.getElementById('admin-project-login-error');
  DOM.logoutBtn = document.getElementById('admin-project-logout-btn');
  DOM.statusLabel = document.getElementById('admin-project-status');
  DOM.editBtn = document.getElementById('admin-project-edit-btn');
  DOM.cancelBtn = document.getElementById('admin-project-cancel-btn');
  DOM.saveBtn = document.getElementById('admin-project-save-btn');
  DOM.saveSpinner = document.getElementById('admin-project-save-spinner');
  DOM.deleteBtn = document.getElementById('admin-project-delete-btn');
  DOM.deleteSpinner = document.getElementById('admin-project-delete-spinner');
  DOM.projectLoading = document.getElementById('project-loading');
  DOM.projectError = document.getElementById('project-error');
  DOM.projectDisplay = document.getElementById('project-display');
  DOM.projectTitle = document.getElementById('project-title');
  DOM.projectDescription = document.getElementById('project-description');
  DOM.projectHero = document.getElementById('project-hero-image');
  DOM.projectHeroTrigger = document.getElementById('project-hero-trigger');
  DOM.projectGallery = document.getElementById('project-gallery');
  DOM.editPanel = document.getElementById('admin-project-edit-panel');
  DOM.editTitleInput = document.getElementById('edit-project-title');
  DOM.editDescriptionInput = document.getElementById('edit-project-description');
  DOM.existingImagesContainer = document.getElementById('admin-project-existing-images');
  DOM.existingImagesEmpty = document.getElementById('admin-project-existing-empty');
  DOM.imageInput = document.getElementById('admin-project-image');
  DOM.imageFilename = document.getElementById('admin-project-image-filename');
  DOM.imagePreviewContainer = document.getElementById('admin-project-image-previews');
  DOM.editError = document.getElementById('admin-project-edit-error');
}

function bindEvents() {
  DOM.googleButton?.addEventListener('click', handleGoogleLogin);
  DOM.logoutBtn?.addEventListener('click', handleLogout);
  DOM.editBtn?.addEventListener('click', () => enterEditMode());
  DOM.cancelBtn?.addEventListener('click', () => exitEditMode());
  DOM.saveBtn?.addEventListener('click', handleSaveChanges);
  DOM.deleteBtn?.addEventListener('click', handleDeleteProject);
  DOM.imageInput?.addEventListener('change', handleImageSelection);
}

function initializeAuthFlow() {
  handleRedirectResult();
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      showLoginView();
      hideShell();
      return;
    }

    try {
      const authorized = await verifyAdminClaim(user);
      if (!authorized) return;
      showShell();
      await loadProject();
    } catch (error) {
      console.error('admin-project auth error', error);
      showNotification('Klaida', error.message || 'Nepavyko patvirtinti prieigos.', 'error');
    }
  });
}

async function handleRedirectResult() {
  try {
    await getRedirectResult(auth);
    setGoogleButtonLoading(false);
  } catch (error) {
    handleGoogleError(error);
  }
}

async function handleGoogleLogin() {
  setGoogleButtonLoading(true);
  clearLoginError();
  const usePopup = shouldUsePopupAuth();

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

  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    handleGoogleError(error);
  }
}

function shouldUsePopupAuth() {
  const isMobile = /iphone|ipad|android/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return !isMobile && !isStandalone;
}

function shouldFallbackToRedirect(error) {
  if (!error?.code) return false;
  return ['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/popup-closed-by-user'].includes(error.code);
}

function clearLoginError() {
  if (!DOM.loginError) return;
  DOM.loginError.textContent = '';
  DOM.loginError.classList.add('hidden');
}

function showLoginError(message) {
  if (!DOM.loginError) return;
  DOM.loginError.textContent = message;
  DOM.loginError.classList.remove('hidden');
}

function setGoogleButtonLoading(isLoading) {
  if (!DOM.googleButton || !DOM.googleSpinner || !DOM.googleText) return;
  DOM.googleButton.disabled = isLoading;
  DOM.googleSpinner.classList.toggle('hidden', !isLoading);
  DOM.googleText.classList.toggle('hidden', isLoading);
}

function mapAuthErrorToMessage(error) {
  switch (error?.code) {
    case 'auth/api-key-expired':
      return 'Pasibaigė API raktas. Atnaujinkite konfigūraciją.';
    case 'auth/popup-closed-by-user':
      return 'Prisijungimo langas uždarytas.';
    case 'auth/cancelled-popup-request':
      return 'Kita prisijungimo užklausa jau vykdoma.';
    case 'auth/network-request-failed':
      return 'Tinklo klaida. Patikrinkite ryšį.';
    default:
      return 'Nepavyko prisijungti per Google.';
  }
}

function handleGoogleError(error) {
  const message = mapAuthErrorToMessage(error);
  showLoginError(message);
  showNotification('Prisijungti nepavyko', message, 'error');
  setGoogleButtonLoading(false);
}

async function verifyAdminClaim(user) {
  await ensureAllowlistLoaded();
  const tokenResult = await getIdTokenResult(user, true);
  const hasAdminClaim = Boolean(tokenResult.claims?.admin);
  const allowlisted = isEmailAllowlisted(user?.email || '');
  if (hasAdminClaim || allowlisted) return true;

  const message = 'Neturite leidimo peržiūrėti šio puslapio.';
  showNotification('Prieiga uždrausta', message, 'error');
  showLoginError(message);
  await handleLogout();
  return false;
}

function showLoginView() {
  DOM.loginSection?.classList.remove('hidden');
}

function hideShell() {
  DOM.shell?.classList.add('hidden');
}

function showShell() {
  DOM.loginSection?.classList.add('hidden');
  DOM.shell?.classList.remove('hidden');
}

async function loadProject() {
  toggleProjectLoading(true);
  showPageOverlay();
  try {
    if (!STATE.projectId) {
      showProjectError('Projektas nerastas. Nenurodytas ID.');
      return;
    }
    if (!db) {
      showProjectError('Duomenų bazė neinicijuota.');
      return;
    }

    const projectDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`, STATE.projectId);
    const snapshot = await getDoc(projectDocRef);

    if (!snapshot.exists()) {
      showProjectError('Projektas nerastas arba buvo pašalintas.');
      return;
    }

    const data = snapshot.data();
    STATE.projectData = { id: snapshot.id, ...data };
    STATE.existingImageUrls = Array.isArray(data.imageUrls) ? data.imageUrls.slice() : [];
    await renderProjectView();
    exitEditMode();
  } catch (error) {
    console.error('admin-project: load error', error);
    showProjectError('Nepavyko įkelti projekto.');
  } finally {
    toggleProjectLoading(false);
    hidePageOverlay();
  }
}

function toggleProjectLoading(isLoading) {
  DOM.projectLoading?.classList.toggle('hidden', !isLoading);
  DOM.projectDisplay?.classList.toggle('hidden', isLoading);
  DOM.projectError?.classList.add('hidden');
}

function showPageOverlay() {
  const overlay = DOM.pageOverlay;
  if (!overlay) return;
  overlay.style.transition = 'none';
  overlay.classList.remove('hidden');
  // Force reflow so the next transition (when hiding) works as expected
  void overlay.offsetWidth;
  overlay.style.transition = '';
}

function hidePageOverlay() {
  const overlay = DOM.pageOverlay;
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function waitForImageElement(element) {
  return new Promise((resolve) => {
    if (!element) return resolve();
    const settle = () => resolve();
    if (element.complete && element.naturalWidth !== 0) {
      return settle();
    }
    if (typeof element.decode === 'function') {
      element
        .decode()
        .then(settle)
        .catch(settle);
      return;
    }
    const cleanup = () => {
      element.removeEventListener('load', cleanup);
      element.removeEventListener('error', cleanup);
      settle();
    };
    element.addEventListener('load', cleanup, { once: true });
    element.addEventListener('error', cleanup, { once: true });
  });
}

function waitForImageElements(elements = []) {
  return Promise.all(elements.map(waitForImageElement));
}

function showProjectError(message) {
  if (DOM.projectLoading) DOM.projectLoading.classList.add('hidden');
  if (DOM.projectDisplay) DOM.projectDisplay.classList.add('hidden');
  if (DOM.projectError) {
    DOM.projectError.classList.remove('hidden');
    const bodyText = DOM.projectError.querySelector('p');
    bodyText?.classList?.add('text-slate-600');
    if (bodyText) bodyText.textContent = message;
  }
}

async function renderProjectView() {
  if (!STATE.projectData) return;
  if (DOM.projectTitle) DOM.projectTitle.textContent = STATE.projectData.title || 'Be pavadinimo';
  if (DOM.projectDescription) DOM.projectDescription.textContent = STATE.projectData.description || 'Aprašymas nepateiktas.';

  const imageUrls = STATE.existingImageUrls;
  if (DOM.projectHero) {
    const heroUrl = imageUrls[0] || 'https://placehold.co/1200x800?text=No+Image';
    DOM.projectHero.src = heroUrl;
    DOM.projectHero.alt = STATE.projectData.title || 'Projektas';
  }

  const lightboxItems = imageUrls.map((url, index) => ({
    url,
    alt: `${STATE.projectData.title || 'Projektas'} nuotrauka ${index + 1}`,
    caption: STATE.projectData.title || ''
  }));
  setLightboxImages(lightboxItems);

  if (DOM.projectHeroTrigger) {
    registerLightboxTrigger(DOM.projectHeroTrigger, 0);
    if (lightboxItems.length) {
      DOM.projectHeroTrigger.removeAttribute('aria-disabled');
    } else {
      DOM.projectHeroTrigger.setAttribute('aria-disabled', 'true');
    }
  }

  if (DOM.projectGallery) {
    DOM.projectGallery.innerHTML = '';
    const galleryImages = imageUrls.slice(1);
    galleryImages.forEach((url, galleryIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-gallery-thumb';
      button.setAttribute('aria-label', `Peržiūrėti nuotrauką ${galleryIndex + 2}`);

      const img = document.createElement('img');
      img.src = url;
      img.alt = STATE.projectData.title || 'Projektas';
      img.loading = 'lazy';

      const icon = document.createElement('span');
      icon.className = 'project-gallery-thumb__icon';
      icon.innerHTML = THUMB_ZOOM_ICON;

      button.appendChild(img);
      button.appendChild(icon);
      DOM.projectGallery.appendChild(button);

      registerLightboxTrigger(button, galleryIndex + 1);
    });
  }

  const waitList = [];
  if (DOM.projectHero) {
    waitList.push(DOM.projectHero);
  }
  if (DOM.projectGallery) {
    DOM.projectGallery.querySelectorAll('img').forEach((img) => waitList.push(img));
  }
  if (waitList.length) {
    await waitForImageElements(waitList);
  }
}

function enterEditMode() {
  if (!STATE.projectData || STATE.editing) return;
  STATE.editing = true;
  DOM.statusLabel.textContent = 'Redagavimo režimas';
  DOM.editPanel?.classList.remove('hidden');
  DOM.editBtn?.classList.add('hidden');
  DOM.cancelBtn?.classList.remove('hidden');
  DOM.saveBtn?.classList.remove('hidden');
  STATE.selectedImageFiles = [];
  STATE.removedImageUrls = [];
  populateEditForm();
}

function exitEditMode({ keepValues = false } = {}) {
  STATE.editing = false;
  DOM.statusLabel.textContent = 'Peržiūros režimas';
  DOM.editPanel?.classList.add('hidden');
  DOM.editBtn?.classList.remove('hidden');
  DOM.cancelBtn?.classList.add('hidden');
  DOM.saveBtn?.classList.add('hidden');
  STATE.selectedImageFiles = [];
  STATE.removedImageUrls = [];
  if (!keepValues) {
    DOM.editTitleInput && (DOM.editTitleInput.value = '');
    DOM.editDescriptionInput && (DOM.editDescriptionInput.value = '');
  }
  renderExistingImages();
  renderSelectedImagePreviews();
  updateSelectedImageFilename();
  DOM.editError?.classList.add('hidden');
}

function populateEditForm() {
  if (!STATE.projectData) return;
  if (DOM.editTitleInput) DOM.editTitleInput.value = STATE.projectData.title || '';
  if (DOM.editDescriptionInput) DOM.editDescriptionInput.value = STATE.projectData.description || '';
  renderExistingImages();
  renderSelectedImagePreviews();
  updateSelectedImageFilename();
}

function handleImageSelection(event) {
  STATE.selectedImageFiles.push(...Array.from(event.target.files || []));
  event.target.value = '';
  renderSelectedImagePreviews();
  updateSelectedImageFilename();
}

function renderSelectedImagePreviews() {
  if (!DOM.imagePreviewContainer) return;
  DOM.imagePreviewContainer.innerHTML = '';
  STATE.selectedImageFiles.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 bg-white';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.className = 'w-full h-full object-cover';
    img.onload = () => URL.revokeObjectURL(img.src);
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
      STATE.selectedImageFiles.splice(index, 1);
      renderSelectedImagePreviews();
      updateSelectedImageFilename();
    });
    wrapper.append(img, deleteBtn);
    DOM.imagePreviewContainer.appendChild(wrapper);
  });
}

function updateSelectedImageFilename() {
  if (!DOM.imageFilename) return;
  const count = STATE.selectedImageFiles.length;
  if (!count) {
    DOM.imageFilename.textContent = 'Failai nepasirinkti';
    return;
  }
  DOM.imageFilename.textContent = `${count} ${count === 1 ? 'failas' : 'failai'} pasirinkti`;
}

function renderExistingImages() {
  if (!DOM.existingImagesContainer || !DOM.existingImagesEmpty) return;
  const images = STATE.existingImageUrls || [];
  DOM.existingImagesContainer.innerHTML = '';
  DOM.existingImagesEmpty.classList.toggle('hidden', images.length > 0);

  images.forEach((url) => {
    const marked = STATE.removedImageUrls.includes(url);
    const wrapper = document.createElement('div');
    wrapper.className = `relative w-24 h-24 rounded-xl overflow-hidden border flex-shrink-0 ${
      marked ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200'
    }`;
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Projekto nuotrauka';
    img.className = 'w-full h-full object-cover';
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
      marked ? 'bg-green-600 text-white' : 'bg-white text-red-600 border border-red-200'
    }`;
    toggleBtn.textContent = marked ? '↺' : '×';
    toggleBtn.addEventListener('click', () => toggleExistingImageRemoval(url));
    const badge = document.createElement('span');
    badge.className = `absolute bottom-1 left-1 right-1 text-[10px] font-semibold text-center rounded-full px-1 py-0.5 ${
      marked ? 'bg-red-600 text-white' : 'bg-slate-900/80 text-white'
    }`;
    badge.textContent = marked ? 'Bus pašalinta' : 'Paliekama';
    wrapper.append(img, toggleBtn, badge);
    DOM.existingImagesContainer.appendChild(wrapper);
  });
}

function toggleExistingImageRemoval(url) {
  const index = STATE.removedImageUrls.indexOf(url);
  if (index >= 0) {
    STATE.removedImageUrls.splice(index, 1);
  } else {
    STATE.removedImageUrls.push(url);
  }
  renderExistingImages();
}

function getRemainingExistingImages() {
  if (!STATE.existingImageUrls?.length) return [];
  if (!STATE.removedImageUrls.length) return [...STATE.existingImageUrls];
  return STATE.existingImageUrls.filter((url) => !STATE.removedImageUrls.includes(url));
}

function validateEditForm() {
  const title = DOM.editTitleInput?.value.trim();
  const description = DOM.editDescriptionInput?.value.trim();
  const remaining = getRemainingExistingImages().length;
  const newImages = STATE.selectedImageFiles.length;
  if (!title || !description) {
    return 'Užpildykite pavadinimo ir aprašymo laukus.';
  }
  if (remaining + newImages === 0) {
    return 'Projektas turi turėti bent vieną nuotrauką.';
  }
  return null;
}

async function handleSaveChanges() {
  if (!STATE.projectData) return;
  const validationError = validateEditForm();
  if (validationError) {
    showEditError(validationError);
    return;
  }

  hideEditError();
  setSavingState(true);
  try {
    await updateProjectInFirebase(
      STATE.projectData.id,
      {
        title: DOM.editTitleInput.value.trim(),
        description: DOM.editDescriptionInput.value.trim(),
      },
      STATE.selectedImageFiles,
      getRemainingExistingImages(),
      STATE.removedImageUrls
    );
    showNotification('Išsaugota', 'Projektas atnaujintas sėkmingai.', 'success');
    await loadProject();
  } catch (error) {
    console.error('admin-project: update error', error);
    showEditError(error.message || 'Nepavyko atnaujinti projekto.');
  } finally {
    setSavingState(false);
  }
}

function showEditError(message) {
  if (!DOM.editError) return;
  DOM.editError.textContent = message;
  DOM.editError.classList.remove('hidden');
}

function hideEditError() {
  DOM.editError?.classList.add('hidden');
}

function setSavingState(isSaving) {
  if (!DOM.saveBtn || !DOM.saveSpinner) return;
  DOM.saveBtn.disabled = isSaving;
  DOM.saveSpinner.classList.toggle('hidden', !isSaving);
}

function setDeleteState(isDeleting) {
  if (!DOM.deleteBtn || !DOM.deleteSpinner) return;
  DOM.deleteBtn.disabled = isDeleting;
  DOM.deleteSpinner.classList.toggle('hidden', !isDeleting);
}

async function handleDeleteProject() {
  if (!STATE.projectData) return;
  const confirmed = await showConfirmationModal(
    'Ištrinti projektą',
    'Projektas bus pašalintas iš viešos svetainės. Tęsti?',
    'Ištrinti',
    'Atšaukti'
  );
  if (!confirmed) return;

  setDeleteState(true);
  try {
    await deleteProjectFromFirebase(STATE.projectData.id, STATE.existingImageUrls);
    showNotification('Projektas ištrintas', 'Projektas pašalintas sėkmingai.', 'success');
    window.location.href = 'admin.html#project-management-tab';
  } catch (error) {
    console.error('admin-project: delete error', error);
    showNotification('Klaida', 'Nepavyko ištrinti projekto.', 'error');
  } finally {
    setDeleteState(false);
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    showNotification('Atsijungta', 'Sėkmingai atsijungėte.', 'info');
    showLoginView();
    hideShell();
  } catch (error) {
    console.error('admin-project: logout error', error);
    showNotification('Klaida', 'Nepavyko atsijungti.', 'error');
  }
}

function startAllowlistPrefetch() {
  if (STATE.allowlistPromise) return STATE.allowlistPromise;
  STATE.allowlistPromise = fetchAllowlist().catch((error) => {
    console.warn('admin-project: allowlist fetch failed', error);
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
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  envEmails.forEach((email) => emails.add(email));

  if (db && CONFIG.allowlistDocPath) {
    try {
      const docRef = doc(db, CONFIG.allowlistDocPath);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() || {};
        const docEmails = Array.isArray(data.emails) ? data.emails : [];
        docEmails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
          .forEach((email) => emails.add(email));
      } else {
        await setDoc(docRef, { emails: [] }, { merge: true });
        console.warn('admin-project: allowlist doc missing; created placeholder at', CONFIG.allowlistDocPath);
      }
    } catch (error) {
      console.warn('admin-project: allowlist request error', error);
    }
  }

  STATE.allowlistedEmails = emails;
  return emails;
}

function isEmailAllowlisted(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return false;
  return STATE.allowlistedEmails.has(normalized);
}
const THUMB_ZOOM_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5v14" />
  <path d="M5 12h14" />
</svg>`;
