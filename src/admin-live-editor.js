// admin-live-editor.js
import { db, storage, auth, firebaseConfig } from './firebase.js'; // Ensure firebaseConfig is imported
import { getDoc, setDoc, doc, serverTimestamp, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { showNotification, showConfirmationModal, trapFocus, releaseFocus } from './ui-utils.js';

// --- DOM Elements ---
const liveEditorIframe = document.getElementById('live-editor-iframe');
const liveEditorLoading = document.getElementById('live-editor-loading');

// Universal Edit Modal Elements
const editModalOverlay = document.getElementById('live-editor-edit-modal-overlay');
const editModal = document.getElementById('live-editor-edit-modal');
const editModalHeader = document.getElementById('live-editor-edit-modal-header');
const editModalCloseBtn = document.getElementById('live-editor-edit-modal-close-btn');
const editModalCancelBtn = document.getElementById('live-editor-edit-modal-cancel-btn');
const editModalSaveBtn = document.getElementById('live-editor-edit-modal-save-btn');
const editModalSaveText = document.getElementById('live-editor-edit-modal-save-text');
const editModalSpinner = document.getElementById('live-editor-edit-modal-spinner');
const editModalTitle = document.getElementById('live-editor-edit-modal-title');

// Sections within the modal
const editTextSection = document.getElementById('edit-text-section');
const editTextArea = document.getElementById('edit-live-text-area');

const editTextColorSection = document.getElementById('edit-text-color-section');
const editTextColorPicker = document.getElementById('edit-live-text-color-picker');
const editTextColorHex = document.getElementById('edit-live-text-color-hex');
const editTextOutlineSection = document.getElementById('edit-text-outline-section');
const editTextOutlineToggle = document.getElementById('edit-text-outline-toggle');
const editTextOutlineColorPicker = document.getElementById('edit-text-outline-color-picker');
const editTextOutlineColorHex = document.getElementById('edit-text-outline-color-hex');
const editTextOutlineWidthSlider = document.getElementById('edit-text-outline-width');
const editTextOutlineWidthValue = document.getElementById('edit-text-outline-width-value');
const editLinkSection = document.getElementById('edit-link-section');
const editLinkInput = document.getElementById('edit-link-input');

const editBgColorSection = document.getElementById('edit-color-section');
const editBgColorPicker = document.getElementById('edit-live-color-picker');
const editBgColorHex = document.getElementById('edit-live-color-hex');

const editBackgroundSection = document.getElementById('edit-background-section');
const backgroundTypeGradientRadio = document.getElementById('background-type-gradient');
const backgroundTypeImageRadio = document.getElementById('background-type-image');
const editGradientSection = document.getElementById('edit-gradient-section');
const editGradientColor1 = document.getElementById('edit-live-gradient-color1');
const editGradientHex1 = document.getElementById('edit-live-gradient-hex1');
const editGradientColor2 = document.getElementById('edit-live-gradient-color2');
const editGradientHex2 = document.getElementById('edit-live-gradient-hex2');
const editGradientDirection = document.getElementById('edit-live-gradient-direction');

const editImageSection = document.getElementById('edit-image-section');
const editImageURL = document.getElementById('edit-live-image-url');
const editImageUpload = document.getElementById('edit-live-image-upload');
const editImagePreview = document.getElementById('edit-live-image-preview');

const reloadIframeButton = document.getElementById('reload-site-button');
const resetSiteButton = document.getElementById('reset-site-button');
const openPresetsButton = document.getElementById('open-presets-button');
const closePresetsButton = document.getElementById('close-presets-button');
const presetManagerModal = document.getElementById('preset-manager-modal');
const refreshPresetsButton = document.getElementById('refresh-presets-button');
const presetCardElements = Array.from(document.querySelectorAll('[data-preset-slot]'));


// --- Global State ---
let currentEditableElement = null; // Reference to the element in the iframe being edited
let elementThatOpenedModal = null; // To return focus to after modal closes in parent admin.html
// Stores mapping: { 'text': 'text-id', 'color': 'color-id', 'backgroundColor': 'bg-color-id', 'background': 'bg-id' }
let currentEditableProperties = {}; 
const presetState = new Map();
const pendingSnapshotRequests = new Map();
let snapshotRequestCounter = 0;
let cachedDefaultSnapshot = null;
const presetUiBindings = new Map();
let presetModalTrigger = null;
const MODAL_POSITION_STORAGE_KEY = 'liveEditorModalPosition';
let cachedModalPosition = loadStoredModalPosition();
let isDraggingModal = false;
let dragOffset = { x: 0, y: 0 };

function loadStoredModalPosition() {
    try {
        const raw = localStorage.getItem(MODAL_POSITION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') {
            return parsed;
        }
    } catch (error) {
        console.warn('Unable to parse stored modal position', error);
    }
    return null;
}

function clampPosition(left, top, modalWidth, modalHeight) {
    const padding = 16;
    const maxLeft = Math.max(padding, window.innerWidth - modalWidth - padding);
    const maxTop = Math.max(padding, window.innerHeight - modalHeight - padding);
    return {
        left: Math.min(Math.max(left, padding), maxLeft),
        top: Math.min(Math.max(top, padding), maxTop)
    };
}

function saveModalPosition(position) {
    cachedModalPosition = position;
    try {
        localStorage.setItem(MODAL_POSITION_STORAGE_KEY, JSON.stringify(position));
    } catch (_) {
        // ignore storage failures
    }
}

function setModalPosition(position, { persist = true } = {}) {
    if (!editModal || !position) return;
    const modalRect = editModal.getBoundingClientRect();
    const clamped = clampPosition(position.left, position.top, modalRect.width || 1, modalRect.height || 1);
    editModal.style.left = `${clamped.left}px`;
    editModal.style.top = `${clamped.top}px`;
    editModal.style.transform = 'translate(0, 0)';
    if (persist) saveModalPosition(clamped);
}

function applyStoredModalPosition() {
    if (cachedModalPosition) {
        setModalPosition(cachedModalPosition, { persist: false });
    }
}

function positionModalNearElement(element) {
    if (!editModal || !element || cachedModalPosition) {
        applyStoredModalPosition();
        return;
    }

    const iframeRect = liveEditorIframe.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetRect = {
        left: iframeRect.left + elementRect.left,
        top: iframeRect.top + elementRect.top,
        width: elementRect.width,
        height: elementRect.height
    };

    const modalRect = editModal.getBoundingClientRect();
    const padding = 20;
    let proposedLeft = targetRect.right + padding;
    if (proposedLeft + modalRect.width > window.innerWidth - padding) {
        proposedLeft = targetRect.left - modalRect.width - padding;
    }
    if (proposedLeft < padding) proposedLeft = window.innerWidth - modalRect.width - padding;

    let proposedTop = targetRect.top;
    if (proposedTop + modalRect.height > window.innerHeight - padding) {
        proposedTop = window.innerHeight - modalRect.height - padding;
    }
    if (proposedTop < padding) proposedTop = padding;

    setModalPosition({ left: proposedLeft, top: proposedTop }, { persist: false });
}

function initializeModalDragging() {
    if (!editModal || !editModalHeader) return;

    editModalHeader.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        isDraggingModal = true;
        const rect = editModal.getBoundingClientRect();
        dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        editModal.classList.add('dragging');
        document.addEventListener('pointermove', handleModalDrag);
        document.addEventListener('pointerup', stopModalDrag, { once: true });
    });
}

function handleModalDrag(event) {
    if (!isDraggingModal) return;
    event.preventDefault();
    const modalRect = editModal.getBoundingClientRect();
    const proposedLeft = event.clientX - dragOffset.x;
    const proposedTop = event.clientY - dragOffset.y;
    setModalPosition({ left: proposedLeft, top: proposedTop }, { persist: false });
}

function stopModalDrag() {
    if (!isDraggingModal) return;
    isDraggingModal = false;
    editModal.classList.remove('dragging');
    document.removeEventListener('pointermove', handleModalDrag);
    const rect = editModal.getBoundingClientRect();
    saveModalPosition({ left: rect.left, top: rect.top });
}

function clampModalToViewport() {
    if (!editModal) return;
    const rect = editModal.getBoundingClientRect();
    setModalPosition({ left: rect.left, top: rect.top }, { persist: true });
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Set up iframe load listener
    liveEditorIframe.addEventListener('load', handleIframeLoad);

    // Set up modal event listeners
    editModalCloseBtn.addEventListener('click', closeEditModal);
    editModalCancelBtn.addEventListener('click', closeEditModal);
    editModalSaveBtn.addEventListener('click', saveChangesToFirebase);
    editTextOutlineToggle?.addEventListener('change', () => {
        toggleOutlineColorInputs(editTextOutlineToggle.checked);
        applyLivePreview();
    });
    editTextOutlineColorPicker?.addEventListener('input', () => {
        editTextOutlineColorHex.value = editTextOutlineColorPicker.value;
        applyLivePreview();
    });
    editTextOutlineColorHex?.addEventListener('input', () => {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editTextOutlineColorHex.value)) {
            editTextOutlineColorPicker.value = editTextOutlineColorHex.value;
            applyLivePreview();
        }
    });
    editModalOverlay?.addEventListener('click', (event) => {
        if (event.target === editModalOverlay) {
            closeEditModal();
        }
    });

    // Color picker and hex input synchronization for BACKGROUND color
    editBgColorPicker.addEventListener('input', () => {
        editBgColorHex.value = editBgColorPicker.value;
        applyLivePreview();
    });
    editBgColorHex.addEventListener('input', () => {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editBgColorHex.value)) {
            editBgColorPicker.value = editBgColorHex.value;
            applyLivePreview();
        }
    });

    // Color picker and hex input synchronization for TEXT color
    editTextColorPicker.addEventListener('input', () => {
        editTextColorHex.value = editTextColorPicker.value;
        applyLivePreview();
    });
    editTextColorHex.addEventListener('input', () => {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editTextColorHex.value)) {
            editTextColorPicker.value = editTextColorHex.value;
            applyLivePreview();
        }
    });

    // Gradient color pickers and hex inputs synchronization
    editGradientColor1.addEventListener('input', () => {
        editGradientHex1.value = editGradientColor1.value;
        applyLivePreview();
    });
    editGradientHex1.addEventListener('input', () => {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editGradientHex1.value)) {
            editGradientColor1.value = editGradientHex1.value;
            applyLivePreview();
        }
    });
    editGradientColor2.addEventListener('input', () => {
        editGradientHex2.value = editGradientColor2.value;
        applyLivePreview();
    });
    editGradientHex2.addEventListener('input', () => {
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editGradientHex2.value)) {
            editGradientColor2.value = editGradientHex2.value;
            applyLivePreview();
        }
    });
    editGradientDirection.addEventListener('change', applyLivePreview);

    // Image URL input and file upload
    editImageURL.addEventListener('input', applyLivePreview);
    editImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                editImagePreview.src = event.target.result;
                editImagePreview.classList.remove('hidden');
                // Auto-select image radio if a file is chosen
                backgroundTypeImageRadio.checked = true;
                showBackgroundEditSection('image');
                applyLivePreview();
            };
            reader.readAsDataURL(file);
        } else {
            editImagePreview.classList.add('hidden');
            editImagePreview.src = '';
            applyLivePreview();
        }
    });

    editTextArea.addEventListener('input', applyLivePreview);

    // Background type radio buttons listeners
    backgroundTypeGradientRadio.addEventListener('change', () => {
        showBackgroundEditSection('gradient');
        applyLivePreview(); // Apply preview immediately on type change
    });
    backgroundTypeImageRadio.addEventListener('change', () => {
        showBackgroundEditSection('image');
        applyLivePreview(); // Apply preview immediately on type change
    });

    reloadIframeButton?.addEventListener('click', refreshIframe);
    resetSiteButton?.addEventListener('click', handleResetSiteToDefaults);
    refreshPresetsButton?.addEventListener('click', () => loadPresetCards(true));
    openPresetsButton?.addEventListener('click', openPresetManager);
    closePresetsButton?.addEventListener('click', closePresetManager);
    presetManagerModal?.addEventListener('click', (event) => {
        if (event.target === presetManagerModal) {
            closePresetManager();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !presetManagerModal?.classList.contains('hidden')) {
            closePresetManager();
        }
    });

    presetCardElements.forEach(setupPresetCardInteractions);
    loadPresetCards();
    initializeModalDragging();
    applyStoredModalPosition();
    window.addEventListener('resize', clampModalToViewport);

    // Listener for tab change (from admin-dashboard.js)
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (button.dataset.tab === 'live-editor') {
                if (auth.currentUser) {
                    // Force a reload of the iframe when the Live Editor tab is clicked
                    // This ensures the iframe content gets the latest Firebase data
                    liveEditorLoading.classList.remove('hidden'); // Show loading spinner
                    liveEditorIframe.src = liveEditorIframe.src; // Reload iframe
                } else {
                    showNotification('Access Denied', 'Please log in to access the Live Editor.', 'info');
                }
            }
        });
    });
});

// --- Iframe Communication ---

/**
 * Checks if an element has any of the defined editable data attributes.
 * @param {HTMLElement} element The element to check.
 * @returns {boolean} True if the element has any editable attribute, false otherwise.
 */
function hasAnyEditableAttribute(element) {
    return (
        element.dataset.editableTextId ||
        element.dataset.editablePlaceholderId ||
        element.dataset.editableColorId ||
        element.dataset.editableBackgroundColorId ||
        element.dataset.editableGradientId ||
        element.dataset.editableBackgroundImageId ||
        element.dataset.editableBackgroundId ||
        element.dataset.editableLinkId
    );
}

function handleIframeLoad() {
    liveEditorLoading.classList.add('hidden'); // Hide loading spinner once iframe is loaded
    try {
        const iframeDoc = liveEditorIframe.contentDocument || liveEditorIframe.contentWindow.document;
        // Add a class to the iframe body for specific styling in admin mode if needed
        iframeDoc.body.classList.add('admin-live-edit-mode');

        // Attach event listeners to the iframe's document body
        iframeDoc.body.addEventListener('click', handleIframeClick);
        // Add a mouseover/mouseout for visual indication
        iframeDoc.body.addEventListener('mouseover', handleIframeMouseOver);
        iframeDoc.body.addEventListener('mouseout', handleIframeMouseOut);

        // Notify iframe to load editable content from Firebase
        // This is important because the iframe runs in its own context
        liveEditorIframe.contentWindow.postMessage({ type: 'LOAD_EDITABLE_CONTENT' }, '*');

    } catch (error) {
        console.error('Error accessing iframe content:', error);
        showNotification('Error', 'Could not load live editor. Browser security restrictions may apply.', 'error');
    }
}

function handleIframeMouseOver(e) {
    let target = e.target;
    // Traverse up the DOM to find the closest editable element
    while (target && target !== this && !hasAnyEditableAttribute(target)) {
        target = target.parentNode;
    }
    if (target && hasAnyEditableAttribute(target)) {
        target.classList.add('editable-element'); // Add class for highlighting
    }
}

function handleIframeMouseOut(e) {
    let target = e.target;
    // Traverse up the DOM to find the closest editable element
    while (target && target !== this && !hasAnyEditableAttribute(target)) {
        target = target.parentNode;
    }
    if (target && hasAnyEditableAttribute(target)) {
        target.classList.remove('editable-element'); // Remove class
    }
}

function handleIframeClick(e) {
    e.preventDefault(); // Prevent default link clicks or button actions inside iframe

    let target = e.target;
    // Traverse up the DOM to find the closest editable element based on any data-editable-* attribute
    while (target && target !== this && !hasAnyEditableAttribute(target)) {
        target = target.parentNode;
    }

    if (target && hasAnyEditableAttribute(target)) {
        currentEditableElement = target;
        currentEditableProperties = {}; // Reset properties for new element

        // Populate currentEditableProperties based on specific data-editable-*-id attributes
        if (target.dataset.editableTextId) {
            currentEditableProperties.text = target.dataset.editableTextId;
        }
        if (target.dataset.editablePlaceholderId) {
            currentEditableProperties.placeholder = target.dataset.editablePlaceholderId;
        }
        if (target.dataset.editableColorId) { // For text color
            currentEditableProperties.color = target.dataset.editableColorId;
            currentEditableProperties.textOutline = target.dataset.editableOutlineId || `${target.dataset.editableColorId}__outline`;
        } else if (target.dataset.editableOutlineId) {
            currentEditableProperties.textOutline = target.dataset.editableOutlineId;
        }
        if (target.dataset.editableBackgroundColorId) { // For background color
            currentEditableProperties.backgroundColor = target.dataset.editableBackgroundColorId;
        }
        // Use a single 'background' property for generic background handling
        if (target.dataset.editableGradientId) { // Fallback for old gradient ID
            currentEditableProperties.background = target.dataset.editableGradientId;
        }
        if (target.dataset.editableLinkId) {
            currentEditableProperties.link = target.dataset.editableLinkId;
        }
        if (target.dataset.editableBackgroundImageId) { // Fallback for old image ID
            currentEditableProperties.background = target.dataset.editableBackgroundImageId;
        }
        if (target.dataset.editableBackgroundId) { // New generic background ID
            currentEditableProperties.background = target.dataset.editableBackgroundId;
        }
        

        // Highlight the selected element in the iframe
        liveEditorIframe.contentDocument.querySelectorAll('.editable-element.selected').forEach(el => el.classList.remove('selected'));
        currentEditableElement.classList.add('selected');
        openEditModal(currentEditableElement, currentEditableProperties);
    } else {
        currentEditableElement = null;
        currentEditableProperties = {};
    }
}

// Listen for messages from the iframe (e.g., when it confirms content loaded or changes)
window.addEventListener('message', (event) => {
    // Ensure the message is from our iframe and from a trusted origin in production
    // For local development, '*' is fine, but specify origin in production
    if (event.source === liveEditorIframe.contentWindow) {
        const data = event.data;
        if (data.type === 'IFRAME_CONTENT_LOADED') {
        } else if (data.type === 'UPDATE_ELEMENT_STYLE') {
            // This can be used to reflect changes from the iframe if it initiates them
        } else if (data.type === 'PAGE_SNAPSHOT_RESPONSE' || data.type === 'DEFAULT_SNAPSHOT_RESPONSE') {
            const pending = pendingSnapshotRequests.get(data.requestId);
            if (pending) {
                clearTimeout(pending.timeoutId);
                pending.resolve(data.snapshot);
                pendingSnapshotRequests.delete(data.requestId);
                if (data.type === 'DEFAULT_SNAPSHOT_RESPONSE') {
                    cachedDefaultSnapshot = data.snapshot;
                }
            }
        }
    }
});

// --- Quick Actions, Presets & Layout Helpers ---

function openPresetManager() {
    if (!presetManagerModal) return;
    presetModalTrigger = document.activeElement;
    presetManagerModal.classList.remove('hidden');
    trapFocus(presetManagerModal, presetManagerModal.querySelector('[data-preset-save]') || closePresetsButton);
}

function closePresetManager() {
    if (!presetManagerModal) return;
    presetManagerModal.classList.add('hidden');
    releaseFocus(presetManagerModal, presetModalTrigger || openPresetsButton || document.body);
    presetModalTrigger = null;
}

function refreshIframe() {
    if (!liveEditorIframe) return;
    liveEditorLoading?.classList.remove('hidden');
    liveEditorIframe.src = liveEditorIframe.src;
}

function setupPresetCardInteractions(card) {
    const slot = card?.dataset?.presetSlot;
    if (!slot) return;

    const binding = {
        slot,
        card,
        nameInput: card.querySelector('[data-preset-name-input]'),
        saveBtn: card.querySelector('[data-preset-save]'),
        loadBtn: card.querySelector('[data-preset-load]'),
        deleteBtn: card.querySelector('[data-preset-delete]'),
        statusEl: card.querySelector('[data-preset-status]'),
        metaEl: card.querySelector('[data-preset-meta]')
    };

    presetUiBindings.set(slot, binding);

    binding.saveBtn?.addEventListener('click', () => handleSavePreset(slot));
    binding.loadBtn?.addEventListener('click', () => handleLoadPreset(slot));
    binding.deleteBtn?.addEventListener('click', () => handleDeletePreset(slot));
}

async function handleResetSiteToDefaults() {
    const confirmed = await showConfirmationModal(
        'Atkurti svetainę į numatytą būseną?',
        'Tai pakeis visus tekstus, spalvas, mediją ir išdėstymo pakeitimus į numatytą šabloną. Išsaugokite puslapį kaip šabloną, jei norite išlaikyti dabartinį vaizdą.',
        'Atkurti svetainę',
        'Atšaukti'
    );
    if (!confirmed) return;

    try {
        const defaultSnapshot = await ensureDefaultSnapshot();
        await applySnapshotToFirestore(defaultSnapshot);
        refreshIframe();
        showNotification('Svetainė atnaujinta', 'Visos sekcijos sugrąžintos į numatytą šabloną.', 'success');
    } catch (error) {
        console.error('Error resetting site:', error);
        showNotification('Klaida', error.message || 'Nepavyko atkurti svetainės.', 'error');
    }
}

async function loadPresetCards(forceRefresh = false) {
    try {
        setPresetPanelBusy(true);
        const presetCollectionRef = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/layoutPresets`);
        const snapshot = await getDocs(presetCollectionRef);

        if (forceRefresh) {
            presetState.clear();
        }

        const seenSlots = new Set();
        snapshot.forEach((docSnap) => {
            const slotMatch = docSnap.id.match(/preset-(\d+)/);
            if (!slotMatch) return;
            const slot = slotMatch[1];
            const data = docSnap.data();
            presetState.set(slot, data);
            updatePresetCardUI(slot, data);
            seenSlots.add(slot);
        });

        presetUiBindings.forEach((_, slot) => {
            if (!seenSlots.has(slot)) {
                presetState.delete(slot);
                updatePresetCardUI(slot, null);
            }
        });
    } catch (error) {
        console.error('Failed to load presets:', error);
        showNotification('Error', 'Could not load presets from Firestore.', 'error');
    } finally {
        setPresetPanelBusy(false);
    }
}

function updatePresetCardUI(slot, data) {
    const binding = presetUiBindings.get(slot);
    if (!binding) return;

    const hasData = Boolean(data);
    binding.statusEl.textContent = hasData ? (data.name || `Preset ${slot}`) : 'Empty';

    if (binding.metaEl) {
        if (hasData && data.updatedAt?.toDate) {
            binding.metaEl.textContent = `Updated ${data.updatedAt.toDate().toLocaleString()}`;
        } else {
            binding.metaEl.textContent = 'Never saved';
        }
    }

    if (!binding.nameInput.value && hasData && data.name) {
        binding.nameInput.value = data.name;
    }

    if (binding.loadBtn) {
        binding.loadBtn.disabled = !hasData;
    }
    if (binding.deleteBtn) {
        binding.deleteBtn.disabled = !hasData;
    }
}

function setPresetPanelBusy(isBusy) {
    const method = isBusy ? 'add' : 'remove';
    presetCardElements.forEach((card) => {
        card.classList[method]('opacity-60');
        card.classList[method]('pointer-events-none');
    });
}

async function handleSavePreset(slot) {
    const binding = presetUiBindings.get(slot);
    if (!binding) return;
    setPresetPanelBusy(true);

    try {
        const snapshot = await requestSnapshotFromIframe('current');
        const name = (binding.nameInput?.value?.trim() || `Preset ${slot}`).slice(0, 60);
        await persistPreset(slot, name, snapshot);
        showNotification('Preset saved', `Preset ${slot} updated successfully.`, 'success');
        await loadPresetCards();
    } catch (error) {
        console.error('Failed to save preset:', error);
        showNotification('Error', error.message || 'Failed to save preset.', 'error');
    } finally {
        setPresetPanelBusy(false);
    }
}

async function handleLoadPreset(slot) {
    const data = presetState.get(slot);
    if (!data) {
        showNotification('Missing preset', 'Save this preset slot before trying to load it.', 'info');
        return;
    }

    try {
        setPresetPanelBusy(true);
        await applySnapshotToFirestore(data);
        refreshIframe();
        showNotification('Preset applied', `${data.name || `Preset ${slot}`} is now live.`, 'success');
    } catch (error) {
        console.error('Failed to load preset:', error);
        showNotification('Error', error.message || 'Could not apply preset.', 'error');
    } finally {
        setPresetPanelBusy(false);
    }
}

async function handleDeletePreset(slot) {
    const binding = presetUiBindings.get(slot);
    if (!binding) return;

    const confirmed = await showConfirmationModal(
        t('presets.deleteConfirmTitle'),
        t('presets.deleteConfirmBody'),
        t('presets.deleteConfirmConfirm'),
        t('presets.deleteConfirmCancel')
    );
    if (!confirmed) return;

    try {
        setPresetPanelBusy(true);
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/layoutPresets`, `preset-${slot}`);
        await deleteDoc(docRef);
        presetState.delete(slot);
        updatePresetCardUI(slot, null);
        showNotification('Preset deleted', `Preset ${slot} has been removed.`, 'success');
    } catch (error) {
        console.error('Failed to delete preset:', error);
        showNotification('Error', error.message || 'Could not delete preset.', 'error');
    } finally {
        setPresetPanelBusy(false);
    }
}

async function persistPreset(slot, name, snapshot) {
    if (!snapshot) throw new Error('Snapshot payload is empty.');
    const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/layoutPresets`, `preset-${slot}`);
    const existing = await getDoc(docRef);
    const payload = {
        name,
        texts: snapshot.texts || {},
        styles: snapshot.styles || {},
        layouts: snapshot.layouts || {},
        updatedAt: serverTimestamp()
    };
    if (!existing.exists()) {
        payload.createdAt = serverTimestamp();
    }
    await setDoc(docRef, payload, { merge: true });
}

async function applySnapshotToFirestore(snapshot) {
    if (!snapshot) throw new Error('Snapshot payload is empty.');

    await overwriteCollection(
        `artifacts/${firebaseConfig.projectId}/public/data/editableTexts`,
        snapshot.texts,
        (payload) => ({
            content: payload?.content ?? '',
            type: payload?.type ?? 'text',
            lastModified: serverTimestamp()
        })
    );

    await overwriteCollection(
        `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`,
        snapshot.styles,
        (payload) => ({
            value: payload?.value ?? '',
            type: payload?.type ?? 'color',
            lastModified: serverTimestamp()
        })
    );

    await overwriteCollection(
        `artifacts/${firebaseConfig.projectId}/public/data/editableLayouts`,
        snapshot.layouts,
        (payload) => ({
            ...payload,
            lastModified: serverTimestamp()
        })
    );
}

async function overwriteCollection(path, entries = {}, buildData) {
    const collectionRef = collection(db, path);
    const existingSnapshot = await getDocs(collectionRef);
    if (!existingSnapshot.empty) {
        await Promise.all(existingSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
    }

    const entryList = Object.entries(entries || {});
    if (!entryList.length) {
        return;
    }

    await Promise.all(
        entryList.map(([id, payload]) => {
            const docRef = doc(collectionRef, id);
            return setDoc(docRef, buildData(payload));
        })
    );
}

async function requestSnapshotFromIframe(type = 'current') {
    if (!liveEditorIframe?.contentWindow) {
        throw new Error('Live preview is not ready yet.');
    }

    return new Promise((resolve, reject) => {
        const requestId = `snapshot-${Date.now()}-${++snapshotRequestCounter}`;
        const timeoutId = setTimeout(() => {
            pendingSnapshotRequests.delete(requestId);
            reject(new Error('Timed out while waiting for the snapshot response.'));
        }, 10000);

        pendingSnapshotRequests.set(requestId, { resolve, reject, timeoutId });
        liveEditorIframe.contentWindow.postMessage(
            {
                type: type === 'default' ? 'REQUEST_DEFAULT_SNAPSHOT' : 'REQUEST_PAGE_SNAPSHOT',
                requestId
            },
            '*'
        );
    });
}

async function ensureDefaultSnapshot() {
    if (cachedDefaultSnapshot) return cachedDefaultSnapshot;
    cachedDefaultSnapshot = await requestSnapshotFromIframe('default');
    return cachedDefaultSnapshot;
}


// --- Edit Modal Functions ---
async function openEditModal(element, properties) {
    // Hide all sections first
    editTextSection.classList.add('hidden');
    editTextColorSection.classList.add('hidden'); 
    editTextOutlineSection.classList.add('hidden');
    if (editTextOutlineToggle) editTextOutlineToggle.checked = false;
    if (editTextOutlineColorPicker) editTextOutlineColorPicker.value = '#000000';
    if (editTextOutlineColorHex) editTextOutlineColorHex.value = '#000000';
    if (editTextOutlineWidthSlider) editTextOutlineWidthSlider.value = '1';
    if (editTextOutlineWidthValue) editTextOutlineWidthValue.textContent = '1px';
    toggleOutlineColorInputs(false);
    editBgColorSection.classList.add('hidden');
    editBackgroundSection.classList.add('hidden'); // Parent for gradient/image
    editGradientSection.classList.add('hidden');
    editImageSection.classList.add('hidden');
    editImagePreview.classList.add('hidden'); // Always hide preview initially
    editImageUpload.value = ''; // Clear file input
    editImageURL.value = ''; // Clear URL input
    editLinkSection?.classList.add('hidden');
    if (editLinkInput) editLinkInput.value = '';


    editModalTitle.textContent = `Edit: ${element.id || 'Element'}`;

    let firstInput = null; // To set initial focus

    // Show and populate sections based on identified properties
    if (properties.text || properties.placeholder) {
        editTextSection.classList.remove('hidden');
        editTextArea.value = properties.placeholder ? element.getAttribute('placeholder') : element.textContent;
        firstInput = firstInput || editTextArea;
    }
    
    if (properties.color) { // Text color
        editTextColorSection.classList.remove('hidden');
        const currentColor = window.getComputedStyle(element).color;
        const hexColor = rgbToHex(currentColor);
        editTextColorPicker.value = hexColor;
        editTextColorHex.value = hexColor;
        firstInput = firstInput || editTextColorPicker;

        if (properties.textOutline) {
            const outlineData = await getTextOutlineValue(properties.textOutline, element);
            editTextOutlineSection.classList.remove('hidden');
            editTextOutlineToggle.checked = outlineData.enabled;
            editTextOutlineColorPicker.value = outlineData.color;
            editTextOutlineColorHex.value = outlineData.color;
            editTextOutlineWidthSlider.value = outlineData.width;
            editTextOutlineWidthValue.textContent = `${outlineData.width}px`;
            toggleOutlineColorInputs(outlineData.enabled);
        }
    }

    if (properties.link && editLinkSection) {
        editLinkSection.classList.remove('hidden');
        editLinkInput.value = element.getAttribute('href') || '';
        firstInput = firstInput || editLinkInput;
    }

    if (properties.backgroundColor) { // Background color (simple, non-gradient/image)
        editBgColorSection.classList.remove('hidden');
        const currentBgColor = window.getComputedStyle(element).backgroundColor;
        const hexBgColor = rgbToHex(currentBgColor);
        editBgColorPicker.value = hexBgColor;
        editBgColorHex.value = hexBgColor;
        firstInput = firstInput || editBgColorPicker;
    }

    if (properties.background) { // Generic background (gradient/image)
        editBackgroundSection.classList.remove('hidden');
        
        const backgroundStyleId = properties.background;
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, backgroundStyleId);
        const snapshot = await getDoc(docRef);

        let savedType = 'gradient'; // Default if not found or no type
        let savedValue = '';

        if (snapshot.exists()) {
            const data = snapshot.data();
            savedType = data.type || savedType;
            savedValue = data.value || '';
        } else {
            // If no data in Firebase, try to infer from live element's computed style
            const computedBackground = window.getComputedStyle(element).backgroundImage;
            const computedBackgroundColor = window.getComputedStyle(element).backgroundColor;

            if (computedBackground && computedBackground !== 'none' && computedBackground.startsWith('linear-gradient')) {
                savedType = 'gradient';
                savedValue = computedBackground;
            } else if (computedBackground && computedBackground !== 'none' && computedBackground.startsWith('url')) {
                savedType = 'background-image';
                savedValue = computedBackground;
            } else if (computedBackgroundColor && computedBackgroundColor !== 'rgba(0, 0, 0, 0)' && computedBackgroundColor !== 'transparent') {
                 // If it's a solid background color, treat it as a background color, not gradient/image
                savedType = 'background-color';
                savedValue = computedBackgroundColor;
                // For a background-color saved as generic 'background', show color picker in background section
                editBgColorSection.classList.remove('hidden');
                const hexColor = rgbToHex(savedValue);
                editBgColorPicker.value = hexColor;
                editBgColorHex.value = hexColor;
                firstInput = firstInput || editBgColorPicker; // Set focus if it's the first active input
            } else {
                // Default to gradient if nothing found
                savedType = 'gradient';
                savedValue = 'linear-gradient(135deg, #ea580c, #dc2626)'; // Default gradient
            }
        }
        
        // Ensure radio buttons reflect the actual type
        if (savedType === 'gradient') {
            backgroundTypeGradientRadio.checked = true;
            showBackgroundEditSection('gradient');
            const parsed = parseGradient(savedValue);
            if (parsed) {
                editGradientDirection.value = parsed.direction;
                editGradientColor1.value = parsed.color1; editGradientHex1.value = parsed.color1;
                editGradientColor2.value = parsed.color2; editGradientHex2.value = parsed.color2;
            } else {
                // Fallback if parsing fails
                editGradientDirection.value = '135deg';
                editGradientColor1.value = '#ea580c'; editGradientHex1.value = '#ea580c';
                editGradientColor2.value = '#dc2626'; editGradientHex2.value = '#dc2626';
            }
        } else if (savedType === 'background-image') {
            backgroundTypeImageRadio.checked = true;
            showBackgroundEditSection('image');
            const imageUrlMatch = savedValue.match(/url\(['"]?(.*?)['"]?\)/);
            if (imageUrlMatch && imageUrlMatch[1]) {
                editImageURL.value = imageUrlMatch[1].replace(/"/g, '');
                editImagePreview.src = editImageURL.value;
                editImagePreview.classList.remove('hidden');
            } else {
                editImageURL.value = savedValue === 'none' ? '' : savedValue; // Show 'none' as empty
                editImagePreview.classList.add('hidden');
            }
        } else if (savedType === 'background-color') {
            // If the saved type is 'background-color' for a 'data-editable-background-id',
            // we will effectively handle it as a single color background, not a gradient/image type.
            // This case should be handled by `editBgColorSection` above.
            // If it somehow reached here, it means the background system is mixing.
            // For now, we will default it to gradient as a fallback in this section, 
            // though ideally, this ID should manage complex backgrounds only.
            backgroundTypeGradientRadio.checked = true;
            showBackgroundEditSection('gradient');
            editGradientDirection.value = '135deg';
            editGradientColor1.value = rgbToHex(savedValue); editGradientHex1.value = rgbToHex(savedValue);
            editGradientColor2.value = rgbToHex(savedValue); editGradientHex2.value = rgbToHex(savedValue);
            showNotification('Warning', 'A plain background color was found for a complex background element. Defaulting to gradient.', 'warning');
        }

        firstInput = firstInput || (backgroundTypeGradientRadio.checked ? editGradientColor1 : editImageURL);
    }


    editModalOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        if (currentEditableElement) {
            if (cachedModalPosition) {
                applyStoredModalPosition();
            } else {
                positionModalNearElement(currentEditableElement);
            }
        }
        editModalOverlay.classList.add('open');
        trapFocus(editModalOverlay, firstInput || editModalCloseBtn);
    });
}

function showBackgroundEditSection(type) {
    if (type === 'gradient') {
        editGradientSection.classList.remove('hidden');
        editImageSection.classList.add('hidden');
    } else if (type === 'image') {
        editImageSection.classList.remove('hidden');
        editGradientSection.classList.add('hidden');
    }
}

function closeEditModal() {
    editModalOverlay.classList.remove('open');
    setTimeout(() => {
        editModalOverlay.classList.add('hidden');
        // Remove highlighting from the selected element
        if (currentEditableElement) {
            currentEditableElement.classList.remove('selected');
        }
        currentEditableElement = null;
        currentEditableProperties = {}; // Clear properties
        isDraggingModal = false;
        editModal?.classList.remove('dragging');
        document.removeEventListener('pointermove', handleModalDrag);
        releaseFocus(editModalOverlay, elementThatOpenedModal || liveEditorIframe); // Return focus to iframe or original element
    }, 300); // Match CSS transition duration
}

function applyLivePreview() {
    if (!currentEditableElement || Object.keys(currentEditableProperties).length === 0 || !liveEditorIframe.contentDocument) return;

    const iframeElement = currentEditableElement; // Reference to the element inside the iframe

    if (currentEditableProperties.text || currentEditableProperties.placeholder) {
        const newContent = editTextArea.value;
        if (currentEditableProperties.placeholder) { 
            iframeElement.setAttribute('placeholder', newContent);
        } else {
            iframeElement.textContent = newContent;
        }
    }
    
    if (currentEditableProperties.color) { // For text color
        const newColor = editTextColorHex.value;
        iframeElement.style.color = newColor;
    }

    if (currentEditableProperties.textOutline) {
        const enabled = editTextOutlineToggle.checked;
        const outlineColor = editTextOutlineColorHex.value || '#000000';
        const outlineWidth = `${editTextOutlineWidthSlider.value || 1}px`;
        applyTextOutlineStyles(iframeElement, enabled, outlineColor, outlineWidth);
    }

    if (currentEditableProperties.link) {
        const newLink = (editLinkInput?.value || '').trim();
        if (newLink) {
            iframeElement.setAttribute('href', newLink);
            iframeElement.setAttribute('target', '_blank');
            iframeElement.setAttribute('rel', 'noreferrer noopener');
        } else {
            iframeElement.setAttribute('href', '#');
            iframeElement.removeAttribute('target');
            iframeElement.removeAttribute('rel');
        }
    }
    
    if (currentEditableProperties.backgroundColor) { // For simple background color
        const newColor = editBgColorHex.value;
        iframeElement.style.backgroundColor = newColor;
        // Ensure no background image/gradient is applied if it's a simple background color
        iframeElement.style.backgroundImage = 'none';
    }

    if (currentEditableProperties.background) { // Generic background (gradient/image)
        // Clear previous background styles to avoid conflicts
        iframeElement.style.backgroundImage = 'none';
        iframeElement.style.backgroundColor = 'transparent'; // Ensure transparent if no color explicitly set

        if (backgroundTypeGradientRadio.checked) {
            const color1 = editGradientHex1.value;
            const color2 = editGradientHex2.value;
            const direction = editGradientDirection.value;
            iframeElement.style.backgroundImage = `linear-gradient(${direction}, ${color1}, ${color2})`;
            iframeElement.style.backgroundSize = ''; // Clear image-specific styles
            iframeElement.style.backgroundPosition = '';
            iframeElement.style.backgroundRepeat = '';
        } else if (backgroundTypeImageRadio.checked) {
            const imageUrl = editImageURL.value;
            const imageFile = editImageUpload.files[0];

            if (imageFile) {
                // If a new file is selected, show its preview immediately
                const reader = new FileReader();
                reader.onload = (e) => {
                    iframeElement.style.backgroundImage = `url('${e.target.result}')`;
                    iframeElement.style.backgroundSize = 'cover';
                    iframeElement.style.backgroundPosition = 'center';
                    iframeElement.style.backgroundRepeat = 'no-repeat';
                };
                reader.readAsDataURL(imageFile);
            } else {
                // Otherwise, use the URL from the input
                iframeElement.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : 'none';
                iframeElement.style.backgroundSize = 'cover';
                iframeElement.style.backgroundPosition = 'center';
                iframeElement.style.backgroundRepeat = 'no-repeat';
            }
        }
    }
}

async function getTextOutlineValue(outlineId, element) {
    if (!outlineId) return { enabled: false, color: '#000000', width: '1' };
    try {
        const docRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, outlineId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            const value = snapshot.data().value;
            if (typeof value === 'object') {
                return {
                    enabled: Boolean(value.enabled),
                    color: value.color || '#000000',
                    width: value.width || '1'
                };
            }
            return {
                enabled: value === 'on',
                color: '#000000',
                width: '1'
            };
        }
    } catch (error) {
        console.error('Failed to load text outline style:', error);
    }
    if (!element) return { enabled: false, color: '#000000', width: '1' };
    const computed = window.getComputedStyle(element);
    const strokeWidth = parseFloat(computed.getPropertyValue('-webkit-text-stroke-width')) || 0;
    const strokeColor = computed.getPropertyValue('-webkit-text-stroke-color') || '#000000';
    return {
        enabled: strokeWidth > 0,
        color: strokeColor.startsWith('rgb') ? rgbToHex(strokeColor) : strokeColor || '#000000',
        width: String(strokeWidth || '1')
    };
}

function applyTextOutlineStyles(element, enabled, color = '#000000', width = '1px') {
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


async function saveChangesToFirebase() {
    if (!currentEditableElement || Object.keys(currentEditableProperties).length === 0 || !auth.currentUser) {
        showNotification('Error', 'No element selected, no editable properties, or not authenticated.', 'error');
        return;
    }

    editModalSaveBtn.disabled = true;
    editModalSaveText.classList.add('hidden');
    editModalSpinner.classList.remove('hidden');
    editModalSpinner.setAttribute('aria-label', 'Saving changes');

    const savePromises = [];

    // Save Text property
    if (currentEditableProperties.text) {
        const textId = currentEditableProperties.text;
        const newContent = editTextArea.value;
        savePromises.push(saveEditableTextToFirestore(textId, newContent));
    }
    // Save Placeholder property (also treated as text)
    if (currentEditableProperties.placeholder) {
        const placeholderId = currentEditableProperties.placeholder;
        const newContent = editTextArea.value; // Placeholder uses the same textarea
        savePromises.push(saveEditableTextToFirestore(placeholderId, newContent));
    }

    // Save Text Color property
    if (currentEditableProperties.color) {
        const colorId = currentEditableProperties.color;
        const newColor = editTextColorHex.value;
        savePromises.push(saveEditableStyleToFirestore(colorId, { type: 'color', value: newColor }));
    }

    if (currentEditableProperties.textOutline) {
        const outlineId = currentEditableProperties.textOutline;
        const outlineValue = {
            enabled: editTextOutlineToggle.checked,
            color: editTextOutlineColorHex.value || '#000000',
            width: editTextOutlineWidthSlider.value || '1'
        };
        savePromises.push(saveEditableStyleToFirestore(outlineId, { type: 'text-outline', value: outlineValue }));
    }

    if (currentEditableProperties.link) {
        const linkId = currentEditableProperties.link;
        const hrefValue = (editLinkInput?.value || '').trim();
        savePromises.push(saveEditableStyleToFirestore(linkId, { type: 'link', value: hrefValue }));
    }

    // Save Background Color property (simple, non-gradient/image)
    if (currentEditableProperties.backgroundColor) {
        const bgColorId = currentEditableProperties.backgroundColor;
        const newBgColor = editBgColorHex.value;
        savePromises.push(saveEditableStyleToFirestore(bgColorId, { type: 'background-color', value: newBgColor }));
    }

    // Save Generic Background property (gradient/image)
    if (currentEditableProperties.background) {
        const styleId = currentEditableProperties.background;
        let styleTypeToSave;
        let styleValueToSave;

        if (backgroundTypeGradientRadio.checked) {
            styleTypeToSave = 'gradient';
            const color1 = editGradientHex1.value;
            const color2 = editGradientHex2.value;
            const direction = editGradientDirection.value;
            styleValueToSave = `linear-gradient(${direction}, ${color1}, ${color2})`;
        } else if (backgroundTypeImageRadio.checked) {
            styleTypeToSave = 'background-image';
            let imageUrlToSave = editImageURL.value;
            const imageFile = editImageUpload.files[0];

            if (imageFile) {
                // Upload new image to Storage
                const imageRef = ref(storage, `artifacts/${firebaseConfig.projectId}/public/images/editor/${imageFile.name}`);
                const uploadResult = await uploadBytes(imageRef, imageFile);
                imageUrlToSave = await getDownloadURL(uploadResult.ref);

                // Delete old image if it existed and was from Firebase Storage
                const currentBgImageStyle = window.getComputedStyle(currentEditableElement).backgroundImage;
                const oldImageUrlMatch = currentBgImageStyle.match(/url\(['"]?(.*?)['"]?\)/);
                if (oldImageUrlMatch && oldImageUrlMatch[1] && oldImageUrlMatch[1].includes('firebasestorage.googleapis.com')) {
                    try {
                        const oldPathStartIndex = oldImageUrlMatch[1].indexOf(`/o/artifacts%2F${firebaseConfig.projectId}%2Fpublic%2Fimages%2Feditor%2F`) + `/o/artifacts%2F${firebaseConfig.projectId}%2Fpublic%2Fimages%2Feditor%2F`.length;
                        let oldStoragePath = oldImageUrlMatch[1].substring(oldPathStartIndex);
                        oldStoragePath = decodeURIComponent(oldStoragePath.split('?')[0]); 
                        const oldImageRef = ref(storage, `artifacts/${firebaseConfig.projectId}/public/images/editor/${oldStoragePath}`);
                        await deleteObject(oldImageRef);
                    } catch (deleteError) {
                        console.warn('Could not delete old image:', deleteError);
                    }
                }
            } else if (!imageUrlToSave) {
                // User cleared the URL input or no file uploaded, set to 'none' to clear background image
                const currentBgImageStyle = window.getComputedStyle(currentEditableElement).backgroundImage;
                if (currentBgImageStyle !== 'none' && currentBgImageStyle.startsWith('url')) {
                     // Only attempt to delete if there was an image previously
                    const oldImageUrlMatch = currentBgImageStyle.match(/url\(['"]?(.*?)['"]?\)/);
                    if (oldImageUrlMatch && oldImageUrlMatch[1] && oldImageUrlMatch[1].includes('firebasestorage.googleapis.com')) {
                        try {
                            const oldPathStartIndex = oldImageUrlMatch[1].indexOf(`/o/artifacts%2F${firebaseConfig.projectId}%2Fpublic%2Fimages%2Feditor%2F`) + `/o/artifacts%2F${firebaseConfig.projectId}%2Fpublic%2Fimages%2Feditor%2F`.length;
                            let oldStoragePath = oldImageUrlMatch[1].substring(oldPathStartIndex);
                            oldStoragePath = decodeURIComponent(oldStoragePath.split('?')[0]); 
                            const oldImageRef = ref(storage, `artifacts/${firebaseConfig.projectId}/public/images/editor/${oldStoragePath}`);
                            await deleteObject(oldImageRef);
                        } catch (deleteError) {
                            console.warn('Could not delete old image on clear input:', deleteError);
                        }
                    }
                }
                imageUrlToSave = 'none'; 
            }
            styleValueToSave = imageUrlToSave;
        }
        
        savePromises.push(saveEditableStyleToFirestore(styleId, { type: styleTypeToSave, value: styleValueToSave }));
    }


    try {
        const results = await Promise.all(savePromises);
        const allSuccessful = results.every(result => result === true);

        if (allSuccessful) {
            showNotification('Success', 'Changes saved successfully!', 'success');
            // Post message back to iframe to update its content based on saved data (or current preview)
            // This ensures consistency without a full iframe reload
            for (const propType in currentEditableProperties) {
                const propId = currentEditableProperties[propType];
                let valueToSend;
                let elementTypeToUpdate = propType; // Corresponds to the field in Firebase, or CSS property

                if (propType === 'text' || propType === 'placeholder') {
                    valueToSend = editTextArea.value;
                    elementTypeToUpdate = propType; // 'text' or 'placeholder'
                } else if (propType === 'color') {
                    valueToSend = editTextColorHex.value;
                } else if (propType === 'backgroundColor') {
                    valueToSend = editBgColorHex.value;
                    elementTypeToUpdate = 'background-color';
                } else if (propType === 'background') { // Generic background
                    if (backgroundTypeGradientRadio.checked) {
                        const color1 = editGradientHex1.value;
                        const color2 = editGradientHex2.value;
                        const direction = editGradientDirection.value;
                        valueToSend = `linear-gradient(${direction}, ${color1}, ${color2})`;
                        elementTypeToUpdate = 'gradient'; // This will be the 'type' saved in Firebase
                    } else if (backgroundTypeImageRadio.checked) {
                        const imageFile = editImageUpload.files[0];
                        if (imageFile) {
                            // If a file was just uploaded, use the new URL.
                            // This would require waiting for the upload result, or sending a placeholder
                            // and then updating again. For now, we'll rely on the main.js reload or
                            // a second postMessage if the URL is only known after upload.
                            // Simplest: `main.js` re-fetches from Firebase for this ID.
                            // So, we don't send the direct image data here, but the URL or 'none' if cleared.
                            valueToSend = editImageURL.value || 'none'; // Send the URL from input
                            elementTypeToUpdate = 'background-image'; // This will be the 'type' saved in Firebase
                        } else {
                            valueToSend = editImageURL.value || 'none'; // Send the URL from input
                            elementTypeToUpdate = 'background-image'; // This will be the 'type' saved in Firebase
                        }
                    }
                }
                
                liveEditorIframe.contentWindow.postMessage({ 
                    type: 'UPDATE_ELEMENT_AFTER_SAVE', 
                    id: propId, // Use the specific ID for this property
                    value: valueToSend, 
                    elementType: elementTypeToUpdate 
                }, '*');
            }
            closeEditModal();
        } else {
            showNotification('Error', 'Some changes failed to save. Please check console for details.', 'error');
        }

    } catch (error) {
        console.error('Error during save operation:', error);
        showNotification('Error', `Failed to save changes: ${error.message}`, 'error');
    } finally {
        editModalSaveBtn.disabled = false;
        editModalSaveText.classList.remove('hidden');
        editModalSpinner.classList.add('hidden');
        editModalSpinner.removeAttribute('aria-label');
    }
}

// Helper to convert RGB to Hex
function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb.startsWith('rgba(0, 0, 0, 0)')) return '#000000'; 
    const parts = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!parts) return rgb; 
    const toHex = (c) => ('0' + parseInt(c).toString(16)).slice(-2);
    return `#${toHex(parts[1])}${toHex(parts[2])}${toHex(parts[3])}`;
}

// Helper to parse gradient string
function parseGradient(gradientString) {
    const match = gradientString.match(/linear-gradient\(([^,]+),\s*(.+?)\s*(?:[\d.]+%?|),\s*(.+?)\s*(?:[\d.]+%?|)\)/);
    if (match && match.length >= 4) {
        let direction = match[1].trim();
        let color1 = match[2].trim();
        let color2 = match[3].trim();
        
        if (color1.startsWith('rgb')) color1 = rgbToHex(color1);
        if (color2.startsWith('rgb')) color2 = rgbToHex(color2);

        return { direction, color1, color2 };
    }
    return null;
}

// --- Firebase Operations ---
async function saveEditableTextToFirestore(textId, newContent) {
    try {
        const textDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableTexts`, textId);
        await setDoc(textDocRef, { content: newContent, lastModified: serverTimestamp() }, { merge: true });
        return true;
    } catch (error) {
        console.error(`Error saving editable text '${textId}':`, error);
        return false;
    }
}

async function saveEditableStyleToFirestore(styleId, data) {
    try {
        const styleDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/public/data/editableStyles`, styleId);
        await setDoc(styleDocRef, { ...data, lastModified: serverTimestamp() }, { merge: true });
        return true;
    } catch (error) {
        console.error(`Error saving editable style '${styleId}':`, error);
        return false;
    }
}
function toggleOutlineColorInputs(enabled) {
    const colorRow = document.getElementById('edit-text-outline-color-row');
    const widthRow = document.getElementById('edit-text-outline-thickness-row');
    [colorRow, widthRow].forEach((row) => {
        if (!row) return;
        row.style.opacity = enabled ? '1' : '0.5';
        row.querySelectorAll('input').forEach((input) => {
            input.disabled = !enabled;
        });
    });
}
    editTextOutlineWidthSlider?.addEventListener('input', () => {
        if (editTextOutlineWidthValue) {
            editTextOutlineWidthValue.textContent = `${editTextOutlineWidthSlider.value}px`;
        }
        applyLivePreview();
    });

    editLinkInput?.addEventListener('input', applyLivePreview);
