const LIGHTBOX_ID = 'project-image-lightbox';
let lightboxInstance = null;

const closeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

const chevronLeft = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="15 18 9 12 15 6"></polyline>
</svg>`;

const chevronRight = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"></polyline>
</svg>`;

function ensureLightbox() {
  if (lightboxInstance) return lightboxInstance;

  const overlay = document.createElement('div');
  overlay.id = LIGHTBOX_ID;
  overlay.className = 'image-lightbox';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="image-lightbox__content" role="dialog" aria-modal="true" aria-labelledby="image-lightbox-caption">
      <button type="button" class="image-lightbox__close" aria-label="Uždaryti" data-lightbox-close>${closeIcon}</button>
      <button type="button" class="image-lightbox__nav-btn image-lightbox__nav-btn--prev" aria-label="Ankstesnė nuotrauka" data-lightbox-prev>${chevronLeft}</button>
      <button type="button" class="image-lightbox__nav-btn image-lightbox__nav-btn--next" aria-label="Kita nuotrauka" data-lightbox-next>${chevronRight}</button>
      <div class="image-lightbox__img-wrapper">
        <img data-lightbox-image class="image-lightbox__image" alt="" loading="lazy" decoding="async" />
        <img data-lightbox-image-buffer class="image-lightbox__image" alt="" loading="lazy" decoding="async" />
      </div>
      <div class="image-lightbox__footer">
        <p id="image-lightbox-caption" class="image-lightbox__caption"></p>
        <span class="image-lightbox__counter" data-lightbox-counter></span>
      </div>
    </div>
  `;

  const appendOverlay = () => document.body.appendChild(overlay);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendOverlay, { once: true });
  } else {
    appendOverlay();
  }

  const imageEl = overlay.querySelector('[data-lightbox-image]');
  const imageBufferEl = overlay.querySelector('[data-lightbox-image-buffer]');
  const closeBtn = overlay.querySelector('[data-lightbox-close]');
  const prevBtn = overlay.querySelector('[data-lightbox-prev]');
  const nextBtn = overlay.querySelector('[data-lightbox-next]');
  const counterEl = overlay.querySelector('[data-lightbox-counter]');
  const captionEl = overlay.querySelector('#image-lightbox-caption');

  const state = {
    images: [],
    currentIndex: 0,
    isOpen: false,
    zoomed: false,
  };
  let activeImageEl = imageEl;
  let idleImageEl = imageBufferEl;

  function resetImageClasses(el) {
    if (!el) return;
    el.classList.remove('is-active', 'prep-from-right', 'prep-from-left', 'slide-in-from-right', 'slide-in-from-left', 'slide-out-to-left', 'slide-out-to-right');
  }

  function setImageContent(el, item, onReady = () => {}) {
    if (!el || !item) return;
    const handleLoad = () => {
      el.removeEventListener('load', handleLoad);
      onReady();
    };
    el.addEventListener('load', handleLoad);
    el.src = item.url;
    el.alt = item.alt || '';
    if (el.complete && el.naturalWidth !== 0) {
      handleLoad();
    }
  }

  function updateMeta() {
    const hasImages = state.images.length > 0;
    counterEl.textContent = hasImages ? `${state.currentIndex + 1} / ${state.images.length}` : '';
    captionEl.textContent = hasImages ? (state.images[state.currentIndex]?.caption || state.images[state.currentIndex]?.alt || '') : '';

    const multipleImages = state.images.length > 1;
    if (prevBtn) {
      prevBtn.style.display = multipleImages ? '' : 'none';
      prevBtn.setAttribute('aria-hidden', multipleImages ? 'false' : 'true');
    }
    if (nextBtn) {
      nextBtn.style.display = multipleImages ? '' : 'none';
      nextBtn.setAttribute('aria-hidden', multipleImages ? 'false' : 'true');
    }
  }

  function renderCurrentImage(direction = 0) {
    const item = state.images[state.currentIndex];
    if (!item) return;

    if (!direction) {
      resetImageClasses(activeImageEl);
      setImageContent(activeImageEl, item, () => {
        requestAnimationFrame(() => {
          activeImageEl?.classList.add('is-active');
        });
      });
      updateMeta();
      return;
    }

    const incoming = idleImageEl;
    const outgoing = activeImageEl;
    if (!incoming || !outgoing) {
      updateMeta();
      return;
    }

    resetImageClasses(incoming);
    const prepClass = direction > 0 ? 'prep-from-right' : 'prep-from-left';
    const slideInClass = direction > 0 ? 'slide-in-from-right' : 'slide-in-from-left';
    const slideOutClass = direction > 0 ? 'slide-out-to-left' : 'slide-out-to-right';
    incoming.classList.add(prepClass);

    setImageContent(incoming, item, () => {
      requestAnimationFrame(() => {
        outgoing.classList.remove('is-active');
        outgoing.classList.add(slideOutClass);
        outgoing.addEventListener('transitionend', () => {
          resetImageClasses(outgoing);
        }, { once: true });

        incoming.classList.remove(prepClass);
        incoming.classList.add(slideInClass, 'is-active');
        incoming.addEventListener('transitionend', () => {
          incoming.classList.remove(slideInClass);
        }, { once: true });
      });
    });

    activeImageEl = incoming;
    idleImageEl = outgoing;
    updateMeta();
  }

  function resetZoom() {
    state.zoomed = false;
    overlay.classList.remove('zoomed');
  }

  function toggleZoom() {
    state.zoomed = !state.zoomed;
    overlay.classList.toggle('zoomed', state.zoomed);
  }

  function open(index = 0) {
    if (!state.images.length) return;
    state.currentIndex = Math.max(0, Math.min(index, state.images.length - 1));
    state.isOpen = true;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    renderCurrentImage(0);
    resetZoom();
    closeBtn?.focus({ preventScroll: true });
  }

  function close() {
    state.isOpen = false;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    resetZoom();
  }

  function step(delta) {
    if (!state.images.length) return;
    state.currentIndex = (state.currentIndex + delta + state.images.length) % state.images.length;
    renderCurrentImage(delta);
    resetZoom();
  }

  closeBtn?.addEventListener('click', close);
  nextBtn?.addEventListener('click', () => step(1));
  prevBtn?.addEventListener('click', () => step(-1));
  const handleImageClick = (event) => {
    event.preventDefault();
    toggleZoom();
  };
  imageEl?.addEventListener('click', handleImageClick);
  imageBufferEl?.addEventListener('click', handleImageClick);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', (event) => {
    if (!state.isOpen) return;
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowRight') {
      step(1);
    } else if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key.toLowerCase() === 'z') {
      toggleZoom();
    }
  });

  lightboxInstance = {
    setImages(images = []) {
      state.images = Array.isArray(images) ? images : [];
      state.currentIndex = 0;
      activeImageEl = imageEl;
      idleImageEl = imageBufferEl;
      resetImageClasses(imageEl);
      resetImageClasses(imageBufferEl);
      if (state.isOpen && !state.images.length) {
        close();
      } else if (state.isOpen) {
        renderCurrentImage(0);
      }
      updateMeta();
    },
    open,
    close,
  };

  return lightboxInstance;
}

export function setLightboxImages(images = []) {
  ensureLightbox().setImages(images);
}

export function registerLightboxTrigger(element, index = 0) {
  if (!element) return;
  const instance = ensureLightbox();
  element.dataset.lightboxIndex = String(index);
  if (element.dataset.lightboxBound === 'true') return;
  if (!element.hasAttribute('tabindex')) {
    element.tabIndex = 0;
  }

  const activate = (event) => {
    event.preventDefault();
    const currentIndex = Number(element.dataset.lightboxIndex) || 0;
    instance.open(currentIndex);
  };

  element.addEventListener('click', activate);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(event);
    }
  });

  element.dataset.lightboxBound = 'true';
}

export function clearLightboxImages() {
  ensureLightbox().setImages([]);
}
