import './style.css';
// main.js
// Import shared Firebase instances and firebaseConfig from firebase.js
import { db, auth, firebaseConfig } from './firebase.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, updateDoc, setDoc as firestoreSetDoc, getDoc } from 'firebase/firestore'; 
// Corrected import: only import showNotification and showConfirmationModal
import { showNotification, showConfirmationModal } from './ui-utils.js'; 
import { setLightboxImages, registerLightboxTrigger } from './gallery-lightbox.js';

// Global variables
let allProjectsData = [];
// Store default texts from HTML to use if Firebase is unavailable or content isn't set
const defaultTexts = {};
// Store default styles from HTML (inline or computed)
const defaultStyles = {};
const defaultLayoutStyles = {};

// Define a maximum length for descriptions on the portfolio cards
const MAX_CARD_DESCRIPTION_LENGTH = 120; // You can adjust this value as needed
let defaultsCaptured = false;

const CONTACT_FIELD_LIMITS = {
  name: 120,
  email: 254,
  title: 140,
  message: 1500,
};

const THUMB_ZOOM_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5v14" />
  <path d="M5 12h14" />
</svg>`;

const PROJECT_CACHE_KEY = 'statyba:projectsCache:v1';
const PROJECT_DETAIL_CACHE_PREFIX = 'statyba:projectDetail:v1:';
const PROJECT_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const PROJECT_DETAIL_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

function readCacheEntry(key, ttlMs) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload.timestamp !== 'number') return null;
    if (ttlMs && Date.now() - payload.timestamp > ttlMs) {
      window.localStorage.removeItem(key);
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

function writeCacheEntry(key, data) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      window.localStorage.removeItem(key);
    }
  }
}

function getCachedProjects() {
  return readCacheEntry(PROJECT_CACHE_KEY, PROJECT_CACHE_TTL_MS) || null;
}

function cacheProjects(projects = []) {
  writeCacheEntry(PROJECT_CACHE_KEY, projects);
}

function getCachedProjectDetail(id) {
  if (!id) return null;
  return readCacheEntry(`${PROJECT_DETAIL_CACHE_PREFIX}${id}`, PROJECT_DETAIL_CACHE_TTL_MS) || null;
}

function cacheProjectDetail(id, data) {
  if (!id) return;
  writeCacheEntry(`${PROJECT_DETAIL_CACHE_PREFIX}${id}`, data);
}

function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env?.DEV) return;
  const base = import.meta.env?.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const swUrl = `${normalizedBase}sw.js`;
  navigator.serviceWorker
    .register(swUrl)
    .catch((error) => console.warn('Service worker registration failed:', error));
}

function captureDefaultEditableContent() {
  if (defaultsCaptured) return;
  defaultsCaptured = true;

  document.querySelectorAll('[data-editable-text-id], [data-editable-placeholder-id]').forEach((element) => {
    const id = element.dataset.editableTextId || element.dataset.editablePlaceholderId;
    if (!id || defaultTexts[id] !== undefined) return;
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      defaultTexts[id] = element.value;
    } else {
      defaultTexts[id] = element.textContent;
    }
  });

  document.querySelectorAll('[data-editable-color-id], [data-editable-background-color-id], [data-editable-gradient-id], [data-editable-background-image-id], [data-editable-background-id]').forEach((element) => {
    const styles = window.getComputedStyle(element);
    let id;
    let type;
    let defaultValue;

    if (element.dataset.editableColorId) {
      id = element.dataset.editableColorId;
      type = 'color';
      defaultValue = styles.color;
    } else if (element.dataset.editableBackgroundColorId) {
      id = element.dataset.editableBackgroundColorId;
      type = 'background-color';
      defaultValue = styles.backgroundColor;
    } else if (element.dataset.editableGradientId) {
      id = element.dataset.editableGradientId;
      type = 'gradient';
      defaultValue = styles.backgroundImage;
    } else if (element.dataset.editableBackgroundImageId) {
      id = element.dataset.editableBackgroundImageId;
      type = 'background-image';
      defaultValue = styles.backgroundImage;
    } else if (element.dataset.editableBackgroundId) {
      id = element.dataset.editableBackgroundId;
      const bgImage = styles.backgroundImage;
      const bgColor = styles.backgroundColor;
      if (bgImage && bgImage !== 'none' && bgImage.startsWith('linear-gradient')) {
        type = 'gradient';
        defaultValue = bgImage;
      } else if (bgImage && bgImage !== 'none' && bgImage.startsWith('url')) {
        type = 'background-image';
        defaultValue = bgImage;
      } else if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        type = 'background-color';
        defaultValue = bgColor;
      } else {
        type = 'background-color';
        defaultValue = 'rgb(255, 255, 255)';
      }
    }

    if (!id || defaultStyles[id] !== undefined) return;
    defaultStyles[id] = { type, value: defaultValue };
  });

  document.querySelectorAll('.editable-element[id]').forEach((element) => {
    const elementId = element.id;
    if (!elementId || defaultLayoutStyles[elementId]) return;
    defaultLayoutStyles[elementId] = getLayoutStylesForElement(element);
  });

  document.querySelectorAll('[data-editable-link-id]').forEach((element) => {
    const id = element.dataset.editableLinkId;
    if (!id || defaultStyles[id]) return;
    defaultStyles[id] = { type: 'link', value: element.getAttribute('href') || '' };
  });
}

function initIndexPage() {
  captureDefaultEditableContent();
  auth.onAuthStateChanged(() => {
    setupMobileMenu();
    loadPortfolioProjects();
    loadEditableContentAndStyles();
    setupScrollIndicator();
    setupContactForm();
  });
}

function initProjectDetailPage() {
  auth.onAuthStateChanged(() => {
    loadProjectDetails();
  });
}

function bootstrapPublicPages() {
  const isIndexPage = document.getElementById('portfolio-grid') !== null;
  const isProjectsListingPage = document.getElementById('projects-list') !== null;
  const isProjectDetailPage = document.getElementById('project-detail-content') !== null;
  const hasEditableElements = document.querySelector('[data-editable-text-id],[data-editable-placeholder-id],[data-editable-color-id],[data-editable-background-color-id],[data-editable-gradient-id],[data-editable-background-image-id],[data-editable-background-id],[data-editable-link-id]') !== null;

  if (hasEditableElements) {
    captureDefaultEditableContent();
    loadEditableContentAndStyles();
  }

  if (isIndexPage) {
    initIndexPage();
  } else if (isProjectsListingPage) {
    initProjectsListingPage();
  } else if (isProjectDetailPage) {
    initProjectDetailPage();
  }
}

registerServiceWorker();

document.addEventListener('DOMContentLoaded', () => {
  const start = () => bootstrapPublicPages();
  const shellExists = document.getElementById('site-main');
  const portfolioReady = document.getElementById('portfolio-grid') !== null;

  if (shellExists && !portfolioReady) {
    if (window.__siteRendered) {
      start();
    } else {
      window.addEventListener('site:rendered', start, { once: true });
    }
  } else {
    start();
  }
});

/**
 * Sets up the mobile menu toggle functionality.
 */
function setupMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeMenu = document.getElementById('close-menu');

  if (menuToggle && mobileMenu && closeMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      menuToggle.setAttribute('aria-expanded', 'true');
    });

    closeMenu.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });

    // Close menu when a navigation link is clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Sets up the scroll progress indicator.
 */
function setupScrollIndicator() {
  const scrollIndicator = document.getElementById('scroll-indicator');

  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      // Ensure totalHeight is not 0 to prevent division by zero
      const scrollProgress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      scrollIndicator.style.width = `${scrollProgress}%`;
    });
  }
}

/**
 * Sets up the contact form submission.
 */
function setupContactForm() {
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const name = (contactForm.name.value || '').trim();
      const email = (contactForm.email.value || '').trim();
      const title = contactForm.title ? (contactForm.title.value || '').trim() : '';
      const message = (contactForm.message.value || '').trim();

      const limitErrors = [];
      if (!name || name.length > CONTACT_FIELD_LIMITS.name) {
        limitErrors.push(`Vardas turi būti iki ${CONTACT_FIELD_LIMITS.name} simbolių.`);
      }
      if (!email || email.length > CONTACT_FIELD_LIMITS.email) {
        limitErrors.push(`El. paštas turi būti iki ${CONTACT_FIELD_LIMITS.email} simbolių.`);
      }
      if (!title || title.length > CONTACT_FIELD_LIMITS.title) {
        limitErrors.push(`Tema turi būti iki ${CONTACT_FIELD_LIMITS.title} simbolių.`);
      }
      if (!message || message.length > CONTACT_FIELD_LIMITS.message) {
        limitErrors.push(`Žinutė turi būti iki ${CONTACT_FIELD_LIMITS.message} simbolių.`);
      }

      if (limitErrors.length) {
        showNotification('Formos klaida', limitErrors.join(' '), 'error');
        return;
      }

      try {
        // Use the correct Firestore path for public messages using projectId
        const messagesCollectionRef = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/messages`);
        await addDoc(messagesCollectionRef, {
          name,
          email,
          title,
          message,
          timestamp: serverTimestamp()
        });
        showNotification('Success!', 'Your message has been sent successfully.', 'success');
        contactForm.reset();
      } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Error!', 'Failed to send message. Please try again.', 'error');
      }
    });
  }
}

/**
 * Loads portfolio projects from Firestore and displays them.
 */
export async function loadPortfolioProjects() {
  const portfolioGrid = document.getElementById('portfolio-grid');
  const portfolioLoading = document.getElementById('portfolio-loading');
  const portfolioError = document.getElementById('portfolio-error');
  const showAllProjectsBtn = document.getElementById('show-all-projects');

  if (!portfolioGrid || !portfolioLoading || !portfolioError || !showAllProjectsBtn) {
    console.error("Missing portfolio DOM elements.");
    return;
  }

  portfolioError.classList.add('hidden');
  let renderedFromCache = false;
  const cachedProjects = getCachedProjects();
  if (cachedProjects?.length) {
    renderedFromCache = true;
    allProjectsData = cachedProjects;
    renderProjects(allProjectsData.slice(0, 3), portfolioGrid);
    portfolioGrid.classList.remove('hidden');
    portfolioLoading.classList.add('hidden');
    showAllProjectsBtn.classList.toggle('hidden', allProjectsData.length <= 3);
  } else {
    portfolioLoading.classList.remove('hidden');
    portfolioGrid.classList.add('hidden');
    showAllProjectsBtn.classList.add('hidden');
  }

  try {
    if (!db) {
      console.error("loadPortfolioProjects: Firestore DB is null or undefined.");
      throw new Error("Database not initialized.");
    }

    // Use the correct Firestore path for public projects using projectId
    const projectsCol = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`);
    const q = query(projectsCol); 

    const snapshot = await getDocs(q);
    allProjectsData = []; // Clear previous data
    snapshot.forEach(doc => {
      allProjectsData.push({ id: doc.id, ...doc.data() });
    });

    cacheProjects(allProjectsData);
    if (allProjectsData.length > 0) {
      renderProjects(allProjectsData.slice(0, 3), portfolioGrid); // Show first 3 projects
      portfolioGrid.classList.remove('hidden');
      if (allProjectsData.length > 3) {
        showAllProjectsBtn.classList.remove('hidden');
      } else {
        showAllProjectsBtn.classList.add('hidden');
      }
    } else {
      portfolioGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full">No projects found.</p>';
      portfolioGrid.classList.remove('hidden');
      showAllProjectsBtn.classList.add('hidden');
    }

    // Hide loading spinner
    portfolioLoading.classList.add('hidden');

  } catch (error) {
    console.error('Error loading portfolio projects:', error);
    if (!renderedFromCache) {
      portfolioLoading.classList.add('hidden');
      portfolioError.classList.remove('hidden');
    }
  }
}

async function initProjectsListingPage() {
  const list = document.getElementById('projects-list');
  const loading = document.getElementById('projects-list-loading');
  const error = document.getElementById('projects-list-error');
  const empty = document.getElementById('projects-list-empty');

  if (!list || !loading || !error || !empty) return;

  error.classList.add('hidden');
  empty.classList.add('hidden');

  let renderedFromCache = false;
  const cachedProjects = getCachedProjects();
  if (cachedProjects?.length) {
    renderedFromCache = true;
    renderProjects(cachedProjects, list, 'list');
    list.classList.remove('hidden');
    loading.classList.add('hidden');
  } else {
    loading.classList.remove('hidden');
    list.classList.add('hidden');
  }

  try {
    if (!db) {
      throw new Error('Database not initialized.');
    }
    const projectsCol = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`);
    const qProjects = query(projectsCol, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(qProjects);

    const projects = [];
    snapshot.forEach((docSnap) => {
      projects.push({ id: docSnap.id, ...docSnap.data() });
    });

    cacheProjects(projects);
    loading.classList.add('hidden');

    if (!projects.length) {
      empty.classList.remove('hidden');
      list.classList.add('hidden');
      return;
    }

    renderProjects(projects, list);
    list.classList.remove('hidden');
  } catch (err) {
    console.error('initProjectsListingPage error:', err);
    if (!renderedFromCache) {
      loading.classList.add('hidden');
      error.classList.remove('hidden');
    }
  }
}

/**
 * Renders projects into a specified grid.
 * Adds lazy loading attribute to images.
 * Makes project cards clickable to view details.
 * @param {Array} projects - Array of project data.
 * @param {HTMLElement} targetGrid - The DOM element to render projects into.
 */
function renderProjects(projects, targetGrid, variant = 'grid') {
  targetGrid.innerHTML = '';
  if (!projects.length) {
    targetGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full">No projects found.</p>';
    return;
  }
  projects.forEach((project) => {
    targetGrid.insertAdjacentHTML('beforeend', createProjectCard(project, variant));
  });
}

function createProjectCard(project, variant = 'grid') {
  const description = project.description || '';
  const displayedDescription =
    description.length > MAX_CARD_DESCRIPTION_LENGTH
      ? `${description.substring(0, MAX_CARD_DESCRIPTION_LENGTH)}...`
      : description;
  const thumbnailUrl =
    project.imageUrls && project.imageUrls.length > 0
      ? project.imageUrls[0]
      : 'https://placehold.co/800x600?text=No+Image';

  if (variant === 'grid') {
    return `
      <a href="../project-detail.html?id=${project.id}" class="group bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-2xl transition flex flex-col overflow-hidden">
        <div class="relative aspect-[4/3] overflow-hidden">
          <img src="${thumbnailUrl}" alt="${project.title}" class="w-full h-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" decoding="async" fetchpriority="low">
        </div>
        <div class="p-6 space-y-3">
          <h3 class="text-xl font-semibold text-slate-900">${project.title}</h3>
          <p class="text-sm text-slate-600 leading-relaxed">${displayedDescription}</p>
          <span class="inline-flex items-center text-orange-600 font-semibold gap-2">
            Žiūrėti projektą
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
            </svg>
          </span>
        </div>
      </a>
    `;
  }

  return `
    <div class="flex gap-5 p-4 rounded-2xl border border-slate-200 bg-white">
      <div class="w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
        <img src="${thumbnailUrl}" alt="${project.title}" class="w-full h-full object-cover" loading="lazy" decoding="async" fetchpriority="low">
      </div>
      <div>
        <h3 class="text-lg font-semibold text-slate-900">${project.title}</h3>
        <p class="text-slate-600 text-sm mt-2">${displayedDescription}</p>
        <a href="../project-detail.html?id=${project.id}" class="inline-flex items-center text-orange-600 font-semibold mt-3">View details →</a>
      </div>
    </div>
  `;
}

/**
 * Loads editable content (text and styles) from Firestore for elements with data-text-id and data-editable-id.
 */
export async function loadEditableContentAndStyles() {
  try {
    if (!db) {
      console.error("loadEditableContentAndStyles: Firestore DB is null or undefined.");
      return;
    }

    // Select elements based on any of the data attributes for editable content/styles
    const elementsToUpdate = document.querySelectorAll(
        '[data-editable-text-id], [data-editable-placeholder-id], ' +
        '[data-editable-color-id], [data-editable-background-color-id], ' +
        '[data-editable-gradient-id], [data-editable-background-image-id], ' +
        '[data-editable-background-id], [data-editable-link-id]'
    );
    
    const textFetchPromises = [];
    const styleFetchPromises = [];

    elementsToUpdate.forEach(element => {
      // Check for each specific editable data attribute and push corresponding fetch promise
      if (element.dataset.editableTextId) {
        const id = element.dataset.editableTextId;
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableTexts`, id);
        textFetchPromises.push(getDoc(docRef).then(snapshot => ({ element, snapshot, id, type: 'text' })));
      }
      if (element.dataset.editablePlaceholderId) {
        const id = element.dataset.editablePlaceholderId;
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableTexts`, id);
        textFetchPromises.push(getDoc(docRef).then(snapshot => ({ element, snapshot, id, type: 'placeholder' })));
      }
      if (element.dataset.editableColorId) {
        const id = element.dataset.editableColorId;
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, id);
        styleFetchPromises.push(getDoc(docRef).then(snapshot => ({ element, snapshot, id, type: 'color' })));
        const outlineId = `${id}__outline`;
        const outlineDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, outlineId);
        styleFetchPromises.push(
          getDoc(outlineDocRef).then(snapshot => ({ element, snapshot, id: outlineId, type: 'text-outline' }))
        );
      }
      if (element.dataset.editableLinkId) {
        const id = element.dataset.editableLinkId;
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, id);
        styleFetchPromises.push(getDoc(docRef).then(snapshot => ({ element, snapshot, id, type: 'link' })));
      }
      if (element.dataset.editableBackgroundColorId) {
        const id = element.dataset.editableBackgroundColorId;
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, id);
        styleFetchPromises.push(getDoc(docRef).then(snapshot => ({ element, snapshot, id, type: 'background-color' })));
      }
      // Combine gradient and background-image handling under data-editable-background-id
      else if (element.dataset.editableGradientId) { // Legacy gradient ID
          const id = element.dataset.editableGradientId;
          const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, id);
          styleFetchPromises.push(getDoc(docRef).then(snapshot => {
              const firebaseType = snapshot.exists() ? snapshot.data().type : 'gradient'; 
              return { element, snapshot, id, type: firebaseType }; 
          }));
      } else if (element.dataset.editableBackgroundImageId) { // Legacy background-image ID
          const id = element.dataset.editableBackgroundImageId;
          const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, id);
          styleFetchPromises.push(getDoc(docRef).then(snapshot => {
              const firebaseType = snapshot.exists() ? snapshot.data().type : 'background-image';
              return { element, snapshot, id, type: firebaseType }; 
          }));
      } else if (element.dataset.editableBackgroundId) { // New generic background ID
          const id = element.dataset.editableBackgroundId;
          const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, id);
          styleFetchPromises.push(getDoc(docRef).then(snapshot => {
              const firebaseType = snapshot.exists() ? snapshot.data().type : 'gradient'; // Default to gradient if not specified
              return { element, snapshot, id, type: firebaseType }; 
          }));
      }
    });

    const textResults = await Promise.all(textFetchPromises);
    const styleResults = await Promise.all(styleFetchPromises);

    textResults.forEach(({ element, snapshot, id, type }) => {
      if (snapshot.exists()) {
        const content = snapshot.data().content;
        if (type === 'placeholder') {
          element.setAttribute('placeholder', content);
        } else {
          element.textContent = content;
        }
      } else {
        // If content is not in Firebase, keep the default from HTML
        if (defaultTexts[id] !== undefined) {
          if (type === 'placeholder') {
            element.setAttribute('placeholder', defaultTexts[id]);
          } else {
            element.textContent = defaultTexts[id];
          }
        }
      }
    });

    styleResults.forEach(({ element, snapshot, id }) => { 
      if (snapshot.exists()) {
        const value = snapshot.data().value;
        const savedType = snapshot.data().type;

        if (savedType === 'color') {
            element.style.color = value;
        } else if (savedType === 'background-color') {
            element.style.backgroundColor = value;
        } else if (savedType === 'gradient') {
            element.style.backgroundImage = value;
        } else if (savedType === 'background-image') {
            element.style.backgroundImage = value === 'none' ? 'none' : `url('${value}')`;
            element.style.backgroundSize = 'cover'; 
            element.style.backgroundPosition = 'center';
            element.style.backgroundRepeat = 'no-repeat';
        } else if (savedType === 'text-outline') {
            if (typeof value === 'object') {
                applyTextOutlineStyles(element, Boolean(value.enabled), value.color || 'currentColor', `${value.width || 1}px`);
            } else {
                applyTextOutlineStyles(element, value === 'on');
            }
        } else if (savedType === 'link') {
            if (element.tagName === 'A') {
                element.setAttribute('href', value || '#');
                if (!value) {
                    element.removeAttribute('target');
                    element.removeAttribute('rel');
                }
            }
        } else {
            console.warn(`Unknown or unhandled style type '${savedType}' for ID '${id}'.`);
        }
      } else if (defaultStyles[id] !== undefined) {
        const defaultVal = defaultStyles[id].value;
        const defaultType = defaultStyles[id].type;

        if (defaultType === 'color') {
            element.style.color = defaultVal;
        } else if (defaultType === 'background-color') {
            element.style.backgroundColor = defaultVal;
        } else if (defaultType === 'gradient') {
            element.style.backgroundImage = defaultVal;
        } else if (defaultType === 'background-image') {
            element.style.backgroundImage = defaultVal === 'none' ? 'none' : `url('${defaultVal}')`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.style.backgroundRepeat = 'no-repeat';
        } else if (defaultType === 'text-outline') {
            if (typeof defaultVal === 'object') {
                applyTextOutlineStyles(element, Boolean(defaultVal.enabled), defaultVal.color || 'currentColor', `${defaultVal.width || 1}px`);
            } else {
                applyTextOutlineStyles(element, defaultVal === 'on');
            }
        } else if (defaultType === 'link') {
            if (element.tagName === 'A') {
                element.setAttribute('href', defaultVal || '#');
                if (!defaultVal) {
                    element.removeAttribute('target');
                    element.removeAttribute('rel');
                }
            }
        }
      }
    });

    await loadEditableLayouts();

    // If this script is running inside the iframe in admin panel, notify parent it's loaded
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'IFRAME_CONTENT_LOADED' }, '*');
    }

  } catch (error) {
    console.error('Error loading editable content and styles:', error);
    // Optionally, show a user-friendly error message
  }
}

// Listen for messages from the parent window (admin.html)
window.addEventListener('message', (event) => {
    // Only process messages from the expected origin (your admin panel's domain)
    // In development, you might use '*' but secure this in production.
    if (event.data.type === 'LOAD_EDITABLE_CONTENT') {
        loadEditableContentAndStyles(); // Reload all content and styles
    } else if (event.data.type === 'UPDATE_ELEMENT_AFTER_SAVE') {
        const { id, value, elementType } = event.data;
        // Select element based on its specific data-editable-*-id
        const element = document.querySelector(
            `[data-editable-text-id="${id}"], [data-editable-placeholder-id="${id}"], ` +
            `[data-editable-color-id="${id}"], [data-editable-background-color-id="${id}"], ` +
            `[data-editable-gradient-id="${id}"], [data-editable-background-image-id="${id}"], ` +
            `[data-editable-background-id="${id}"]` // Include the new generic background ID
        );

        if (element) {
            // Clear previous background styles to prevent conflicts
            element.style.backgroundImage = '';
            element.style.backgroundColor = '';
            element.style.color = ''; // Also clear color here for consistency
            element.style.backgroundSize = '';
            element.style.backgroundPosition = '';
            element.style.backgroundRepeat = '';

            if (elementType === 'text' || elementType === 'placeholder') { 
                if (elementType === 'placeholder') {
                    element.setAttribute('placeholder', value);
                } else {
                    element.textContent = value;
                }
            } else if (elementType === 'color') { // CORRECTED: Apply to text color
                element.style.color = value;
            } else if (elementType === 'background-color') { // CORRECTED: Apply to background color
                element.style.backgroundColor = value;
            } else if (elementType === 'gradient') { 
                element.style.backgroundImage = value;
            } else if (elementType === 'background-image') { 
                element.style.backgroundImage = value === 'none' ? 'none' : `url('${value}')`;
                element.style.backgroundSize = 'cover';
                element.style.backgroundPosition = 'center';
                element.style.backgroundRepeat = 'no-repeat';
            }
        } else {
            console.warn(`IFRAME: Element with ID matching '${id}' not found for live update.`);
        }
    } else if (event.data.type === 'REQUEST_PAGE_SNAPSHOT') {
        const snapshot = buildCurrentSnapshot();
        window.parent.postMessage({ type: 'PAGE_SNAPSHOT_RESPONSE', requestId: event.data.requestId, snapshot }, '*');
    } else if (event.data.type === 'REQUEST_DEFAULT_SNAPSHOT') {
        const snapshot = buildDefaultSnapshot();
        window.parent.postMessage({ type: 'DEFAULT_SNAPSHOT_RESPONSE', requestId: event.data.requestId, snapshot }, '*');
    }
});

function getLayoutStylesForElement(element) {
    if (!element) return {};
    const computed = element.ownerDocument.defaultView.getComputedStyle(element);
    return {
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        order: computed.order || '0',
        textAlign: computed.textAlign || '',
        justifyContent: computed.justifyContent || '',
        alignItems: computed.alignItems || '',
        gap: computed.gap || ''
    };
}

function applyLayoutStylesToElement(element, layoutData = {}) {
    if (!element || !layoutData) return;
    const assignableProps = [
        'marginTop',
        'marginRight',
        'marginBottom',
        'marginLeft',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'order',
        'textAlign',
        'justifyContent',
        'alignItems',
        'gap'
    ];

    assignableProps.forEach((prop) => {
        if (Object.prototype.hasOwnProperty.call(layoutData, prop)) {
            element.style[prop] = layoutData[prop];
        }
    });
}

async function loadEditableLayouts() {
    try {
        const layoutCollectionRef = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/editableLayouts`);
        const snapshot = await getDocs(layoutCollectionRef);
        snapshot.forEach((docSnap) => {
            const layoutData = docSnap.data();
            const element =
                document.getElementById(docSnap.id) ||
                document.querySelector(`[data-editable-layout-id="${docSnap.id}"]`);
            if (element) {
                applyLayoutStylesToElement(element, layoutData);
            }
        });
    } catch (error) {
        console.error('Error loading layout overrides:', error);
    }
}

function buildCurrentSnapshot() {
    return {
        texts: collectCurrentTextSnapshot(),
        styles: collectCurrentStyleSnapshot(),
        layouts: collectCurrentLayoutSnapshot()
    };
}

function buildDefaultSnapshot() {
    return {
        texts: collectDefaultTextSnapshot(),
        styles: collectDefaultStyleSnapshot(),
        layouts: collectDefaultLayoutSnapshot()
    };
}

function collectCurrentTextSnapshot() {
    const snapshot = {};

    document.querySelectorAll('[data-editable-text-id]').forEach((element) => {
        const id = element.dataset.editableTextId;
        if (!id) return;
        snapshot[id] = { type: 'text', content: element.textContent || '' };
    });

    document.querySelectorAll('[data-editable-placeholder-id]').forEach((element) => {
        const id = element.dataset.editablePlaceholderId;
        if (!id) return;
        snapshot[id] = { type: 'placeholder', content: element.getAttribute('placeholder') || element.placeholder || '' };
    });

    return snapshot;
}

function collectCurrentStyleSnapshot() {
    const snapshot = {};

    const ensureEntry = (id, type, value) => {
        if (!id || value === undefined || value === null) return;
        snapshot[id] = { type, value };
    };

    const getComputed = (element) => element.ownerDocument.defaultView.getComputedStyle(element);

    document.querySelectorAll('[data-editable-color-id]').forEach((element) => {
        ensureEntry(element.dataset.editableColorId, 'color', getComputed(element).color);
    });

    document.querySelectorAll('[data-editable-background-color-id]').forEach((element) => {
        ensureEntry(element.dataset.editableBackgroundColorId, 'background-color', getComputed(element).backgroundColor);
    });

    document.querySelectorAll('[data-editable-gradient-id]').forEach((element) => {
        ensureEntry(element.dataset.editableGradientId, 'gradient', getComputed(element).backgroundImage);
    });

    document.querySelectorAll('[data-editable-background-image-id]').forEach((element) => {
        ensureEntry(
            element.dataset.editableBackgroundImageId,
            'background-image',
            extractUrlFromBackgroundImage(getComputed(element).backgroundImage)
        );
    });

    document.querySelectorAll('[data-editable-background-id]').forEach((element) => {
        const id = element.dataset.editableBackgroundId;
        if (!id) return;
        const computed = getComputed(element);
        const backgroundImage = computed.backgroundImage;

        if (backgroundImage && backgroundImage.startsWith('linear-gradient')) {
            ensureEntry(id, 'gradient', backgroundImage);
        } else if (backgroundImage && backgroundImage !== 'none') {
            ensureEntry(id, 'background-image', extractUrlFromBackgroundImage(backgroundImage));
        } else {
            ensureEntry(id, 'background-color', computed.backgroundColor);
        }
    });

    return snapshot;
}

function collectCurrentLayoutSnapshot() {
    const snapshot = {};
    Object.keys(defaultLayoutStyles).forEach((id) => {
        const element = document.getElementById(id) || document.querySelector(`[data-editable-layout-id="${id}"]`);
        if (!element) return;
        snapshot[id] = getLayoutStylesForElement(element);
    });
    return snapshot;
}

function collectDefaultTextSnapshot() {
    const snapshot = {};

    document.querySelectorAll('[data-editable-text-id]').forEach((element) => {
        const id = element.dataset.editableTextId;
        if (!id) return;
        snapshot[id] = { type: 'text', content: defaultTexts[id] ?? element.textContent ?? '' };
    });

    document.querySelectorAll('[data-editable-placeholder-id]').forEach((element) => {
        const id = element.dataset.editablePlaceholderId;
        if (!id) return;
        snapshot[id] = { type: 'placeholder', content: defaultTexts[id] ?? element.getAttribute('placeholder') ?? '' };
    });

    return snapshot;
}

function collectDefaultStyleSnapshot() {
    const snapshot = {};
    Object.entries(defaultStyles).forEach(([id, data]) => {
        snapshot[id] = { type: data.type, value: data.value };
    });
    return snapshot;
}

function collectDefaultLayoutSnapshot() {
    const snapshot = {};
    Object.entries(defaultLayoutStyles).forEach(([id, data]) => {
        snapshot[id] = { ...data };
    });
    return snapshot;
}

function extractUrlFromBackgroundImage(value) {
    if (!value || value === 'none') return 'none';
    const match = value.match(/url\((['"]?)(.*?)\1\)/);
    return match ? match[2] : value;
}

function applyTextOutlineStyles(element, enabled, color = 'currentColor', width = '1px') {
    if (!element) return;
    if (enabled) {
        element.style.webkitTextStroke = `${width} ${color}`;
        element.style.textStroke = `${width} ${color}`;
        element.style.paintOrder = 'stroke fill';
    } else {
        element.style.webkitTextStroke = '';
        element.style.textStroke = '';
        element.style.paintOrder = '';
    }
}

function waitForImageElement(element) {
    return new Promise((resolve) => {
        if (!element) return resolve();
        const settle = () => resolve();

        if (element.complete && element.naturalWidth !== 0) {
            return settle();
        }

        if (typeof element.decode === 'function') {
            element.decode().then(settle).catch(settle);
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
    return Promise.all(elements.map((element) => waitForImageElement(element)));
}


/**
 * Loads and displays details for a single project based on ID from URL.
 */
async function loadProjectDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    const projectTitleTag = document.getElementById('project-detail-title-tag');
    const projectLoadingDiv = document.getElementById('project-loading');
    const projectErrorDiv = document.getElementById('project-error');
    const projectDisplayDiv = document.getElementById('project-display');
    const projectTitleElement = document.getElementById('project-title');
    const projectHeroImageElement = document.getElementById('project-hero-image');
    const projectHeroTriggerElement = document.getElementById('project-hero-trigger');
    const projectGalleryElement = document.getElementById('project-gallery');
    const projectDescriptionElement = document.getElementById('project-description');
    const pageLoaderOverlay = document.getElementById('project-page-loader');
    const setPageLoaderVisible = (visible) => {
        if (!pageLoaderOverlay) return;
        pageLoaderOverlay.classList.toggle('hidden', !visible);
    };
    setPageLoaderVisible(true);

    const showErrorState = (titleText) => {
        if (projectLoadingDiv) projectLoadingDiv.classList.add('hidden');
        if (projectDisplayDiv) projectDisplayDiv.classList.add('hidden');
        if (projectErrorDiv) projectErrorDiv.classList.remove('hidden');
        if (projectTitleTag) projectTitleTag.textContent = titleText;
    };

    const showContentState = () => {
        if (projectLoadingDiv) projectLoadingDiv.classList.add('hidden');
        if (projectErrorDiv) projectErrorDiv.classList.add('hidden');
        if (projectDisplayDiv) projectDisplayDiv.classList.remove('hidden');
    };

    const domRefs = {
        projectTitleTag,
        projectTitleElement,
        projectDescriptionElement,
        projectHeroImageElement,
        projectHeroTriggerElement,
        projectGalleryElement,
    };

    if (!projectId) {
        console.error('No project ID found in URL.');
        showErrorState('Project Not Found - Statyba');
        setPageLoaderVisible(false);
        return;
    }

    const cachedProject = getCachedProjectDetail(projectId);
    if (cachedProject) {
        await hydrateProjectDetailView(cachedProject, domRefs);
        showContentState();
        setPageLoaderVisible(false);
    } else {
        if (projectLoadingDiv) projectLoadingDiv.classList.remove('hidden');
        if (projectErrorDiv) projectErrorDiv.classList.add('hidden');
        if (projectDisplayDiv) projectDisplayDiv.classList.add('hidden');
    }

    try {
        if (!db) {
            console.error("loadProjectDetails: Firestore DB is null or undefined.");
            throw new Error("Database not initialized.");
        }

        const projectDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/projects`, projectId);
        const projectSnapshot = await getDoc(projectDocRef);

        if (projectSnapshot.exists()) {
            const projectData = { id: projectSnapshot.id, ...projectSnapshot.data() };
            await hydrateProjectDetailView(projectData, domRefs);
            cacheProjectDetail(projectId, projectData);
            showContentState();
        } else {
            console.warn(`Project with ID ${projectId} not found.`);
            if (!cachedProject) {
                showErrorState('Project Not Found - Statyba');
            }
        }
    } catch (error) {
        console.error('Error loading project details:', error);
        if (!cachedProject) {
            showErrorState('Error - Statyba');
        }
    } finally {
        setPageLoaderVisible(false);
    }
}

async function hydrateProjectDetailView(projectData, domRefs = {}) {
    if (!projectData) return;
    const {
        projectTitleTag,
        projectTitleElement,
        projectDescriptionElement,
        projectHeroImageElement,
        projectHeroTriggerElement,
        projectGalleryElement,
    } = domRefs;

    const fallbackTitle = projectData.title || 'Projektas';
    if (projectTitleElement) {
        projectTitleElement.textContent = fallbackTitle;
    }
    if (projectDescriptionElement) {
        projectDescriptionElement.textContent = projectData.description || 'No description available.';
    }
    if (projectTitleTag) {
        projectTitleTag.textContent = `${fallbackTitle} - Statyba`;
    }

    const rawImageUrls = Array.isArray(projectData.imageUrls) ? projectData.imageUrls.filter(Boolean) : [];
    const heroWaiters = [];
    const galleryWaiters = [];

    if (projectHeroImageElement) {
        const heroUrl = rawImageUrls[0] || 'https://placehold.co/1200x800?text=No+Image';
        projectHeroImageElement.loading = 'eager';
        projectHeroImageElement.decoding = 'async';
        projectHeroImageElement.fetchPriority = 'high';
        projectHeroImageElement.src = heroUrl;
        projectHeroImageElement.alt = fallbackTitle;
        heroWaiters.push(waitForImageElement(projectHeroImageElement));
    }

    const lightboxItems = rawImageUrls.map((url, index) => ({
        url,
        alt: `${fallbackTitle} nuotrauka ${index + 1}`,
        caption: fallbackTitle || ''
    }));
    setLightboxImages(lightboxItems);

    if (projectHeroTriggerElement) {
        registerLightboxTrigger(projectHeroTriggerElement, 0);
        if (lightboxItems.length) {
            projectHeroTriggerElement.removeAttribute('aria-disabled');
        } else {
            projectHeroTriggerElement.setAttribute('aria-disabled', 'true');
        }
    }

    if (projectGalleryElement) {
        projectGalleryElement.innerHTML = '';
        const galleryImages = rawImageUrls.slice(1);
        galleryImages.forEach((url, galleryIndex) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'project-gallery-thumb';
            button.setAttribute('aria-label', `Peržiūrėti nuotrauką ${galleryIndex + 2}`);

            const img = document.createElement('img');
            img.src = url;
            img.alt = fallbackTitle;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.fetchPriority = 'low';
            galleryWaiters.push(waitForImageElement(img));

            const icon = document.createElement('span');
            icon.className = 'project-gallery-thumb__icon';
            icon.innerHTML = THUMB_ZOOM_ICON;

            button.appendChild(img);
            button.appendChild(icon);
            projectGalleryElement.appendChild(button);

            registerLightboxTrigger(button, galleryIndex + 1);
        });
    }

    if (heroWaiters.length) {
        await Promise.all(heroWaiters);
    }
    if (galleryWaiters.length) {
        Promise.all(galleryWaiters).catch(() => {});
    }
}