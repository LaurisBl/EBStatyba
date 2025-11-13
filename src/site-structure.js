const navItems = [
  { id: 'nav-home', textId: 'nav-home-text', colorId: 'nav-home-color', href: '#home', label: 'Pagrindinis' },
  { id: 'nav-about', textId: 'nav-about-text', colorId: 'nav-about-color', href: '#about', label: 'Apie mus' },
  { id: 'nav-portfolio', textId: 'nav-portfolio-text', colorId: 'nav-portfolio-color', href: '#portfolio', label: 'Projektai' }
];

const ctaItem = {
  id: 'nav-contact-button',
  textId: 'nav-contact-button-text',
  gradientId: 'nav-contact-button-gradient',
  colorId: 'nav-contact-button-color',
  label: 'Susisiekite',
  href: '#contact'
};

const mobileNavItems = [
  { id: 'mobile-nav-home', textId: 'mobile-nav-home-text', colorId: 'mobile-nav-home-color', href: '#home', label: 'Pagrindinis' },
  { id: 'mobile-nav-about', textId: 'mobile-nav-about-text', colorId: 'mobile-nav-about-color', href: '#about', label: 'Apie mus' },
  { id: 'mobile-nav-portfolio', textId: 'mobile-nav-portfolio-text', colorId: 'mobile-nav-portfolio-color', href: '#portfolio', label: 'Projektai' },
  { id: 'mobile-nav-contact', textId: 'mobile-nav-contact-text', colorId: 'mobile-nav-contact-color', href: '#contact', label: 'Susisiekite' }
];

const serviceCards = [
  {
    cardId: 'service-card-1-bg',
    backgroundColorId: 'service-card-1-bg-color',
    textColorId: 'service-card-1-text-color',
    iconWrapperId: 'service-icon-1-bg',
    iconBgId: 'service-icon-1-bg-color',
    iconId: 'service-icon-1-color',
    iconColorId: 'service-icon-1-color',
    headingId: 'service-residential-heading-text',
    headingColorId: 'service-residential-heading-color',
    descriptionId: 'service-residential-description-text',
    descriptionColorId: 'service-residential-description-color',
    defaultHeading: 'Gyvenamųjų namų statyba',
    defaultDescription: 'Projektuojame ir statome individualius namus, pritaikytus jūsų šeimos poreikiams.'
  },
  {
    cardId: 'service-card-2-bg',
    backgroundColorId: 'service-card-2-bg-color',
    textColorId: 'service-card-2-text-color',
    iconWrapperId: 'service-icon-2-bg',
    iconBgId: 'service-icon-2-bg-color',
    iconId: 'service-icon-2-color',
    iconColorId: 'service-icon-2-color',
    headingId: 'service-commercial-heading-text',
    headingColorId: 'service-commercial-heading-color',
    descriptionId: 'service-commercial-description-text',
    descriptionColorId: 'service-commercial-description-color',
    defaultHeading: 'Komerciniai projektai',
    defaultDescription: 'Kuriame modernias verslo erdves, užtikrinančias funkcionalumą ir komfortą.'
  },
  {
    cardId: 'service-card-3-bg',
    backgroundColorId: 'service-card-3-bg-color',
    textColorId: 'service-card-3-text-color',
    iconWrapperId: 'service-icon-3-bg',
    iconBgId: 'service-icon-3-bg-color',
    iconId: 'service-icon-3-color',
    iconColorId: 'service-icon-3-color',
    headingId: 'service-renovation-heading-text',
    headingColorId: 'service-renovation-heading-color',
    descriptionId: 'service-renovation-description-text',
    descriptionColorId: 'service-renovation-description-color',
    defaultHeading: 'Renovacija ir atnaujinimas',
    defaultDescription: 'Atnaujiname senas erdves, pritaikydami jas šiuolaikiniams poreikiams.'
  }
];

const statsData = [
  { countId: 'about-projects-count-text', labelId: 'about-projects-label-text', colorId: 'about-projects-label-color', value: '100+', label: 'Įgyvendintų projektų', accent: 'text-orange-600' },
  { countId: 'about-years-count-text', labelId: 'about-years-label-text', colorId: 'about-years-label-color', value: '10+', label: 'Metų patirties', accent: 'text-red-600' },
  { countId: 'about-clients-count-text', labelId: 'about-clients-label-text', colorId: 'about-clients-label-color', value: '40+', label: 'Aktyvių klientų', accent: 'text-rose-500' },
  { countId: 'about-teams-count-text', labelId: 'about-teams-label-text', colorId: 'about-teams-label-color', value: '25+', label: 'Specialistų komandos', accent: 'text-amber-500' }
];

const contactCards = [
  {
    iconWrapperId: 'contact-email-icon-bg',
    iconBg: 'contact-email-icon-bg-color',
    iconId: 'contact-email-icon-color',
    iconColor: 'contact-email-icon-color',
    labelElementId: 'contact-email-label',
    labelId: 'contact-email-label-text',
    labelColor: 'contact-email-label-color',
    valueElementId: 'contact-email-value',
    valueId: 'contact-email-value-text',
    valueColor: 'contact-email-value-color',
    defaultLabel: 'El. paštas',
    defaultValue: 'egidijusbusma@gmail.com',
    iconPath: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z'
  },
  {
    iconWrapperId: 'contact-phone-icon-bg',
    iconBg: 'contact-phone-icon-bg-color',
    iconId: 'contact-phone-icon-color',
    iconColor: 'contact-phone-icon-color',
    labelElementId: 'contact-phone-label',
    labelId: 'contact-phone-label-text',
    labelColor: 'contact-phone-label-color',
    valueElementId: 'contact-phone-value',
    valueId: 'contact-phone-value-text',
    valueColor: 'contact-phone-value-color',
    defaultLabel: 'Telefonas',
    defaultValue: '+370 675 78044',
    iconPath: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
  },
  {
    iconWrapperId: 'contact-location-icon-bg',
    iconBg: 'contact-location-icon-bg-color',
    iconId: 'contact-location-icon-color',
    iconColor: 'contact-location-icon-color',
    labelElementId: 'contact-location-label',
    labelId: 'contact-location-label-text',
    labelColor: 'contact-location-label-color',
    valueElementId: 'contact-location-value',
    valueId: 'contact-location-value-text',
    valueColor: 'contact-location-value-color',
    defaultLabel: 'Vieta',
    defaultValue: 'Klaipėda, Lietuva',
    iconPath: 'M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM19.5 8c0 7.5-7.5 13-7.5 13S4.5 15.5 4.5 8a7.5 7.5 0 1115 0z'
  }
];

const footerServices = [
  { id: 'footer-service-residential', textId: 'footer-service-residential-text', colorId: 'footer-service-residential-color', label: 'Gyvenamųjų namų statyba' },
  { id: 'footer-service-commercial', textId: 'footer-service-commercial-text', colorId: 'footer-service-commercial-color', label: 'Komerciniai projektai' },
  { id: 'footer-service-renovation', textId: 'footer-service-renovation-text', colorId: 'footer-service-renovation-color', label: 'Renovacija ir remontas' },
  { id: 'footer-service-management', textId: 'footer-service-management-text', colorId: 'footer-service-management-color', label: 'Projektų valdymas' }
];

function renderNavLinks() {
  return navItems
    .map(
      ({ id, textId, colorId, href, label }) => `
        <li>
          <a href="${href}" class="text-slate-700 hover:text-orange-600 transition-colors font-semibold editable-element" id="${id}" data-editable-text-id="${textId}" data-editable-color-id="${colorId}">${label}</a>
        </li>`
    )
    .join('');
}

function renderMobileLinks() {
  return mobileNavItems.map(({ id, textId, colorId, href, label }) => (
    `<li><a href="${href}" class="block text-gray-700 hover:text-orange-600 transition-colors py-2 text-lg editable-element" id="${id}" data-editable-text-id="${textId}" data-editable-color-id="${colorId}">${label}</a></li>`
  )).join('');
}

function renderServiceCards() {
  return serviceCards.map(card => (
    `<div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 card-hover editable-element" id="${card.cardId}" data-editable-background-color-id="${card.backgroundColorId}" data-editable-color-id="${card.textColorId}">
       <div class="w-16 h-16 rounded-xl flex items-center justify-center mb-6 editable-element" id="${card.iconWrapperId}" aria-hidden="true" data-editable-background-color-id="${card.iconBgId}">
         ${renderServiceIcon(card.iconId)}
       </div>
       <h3 class="text-xl font-semibold mb-3 editable-element" data-editable-text-id="${card.headingId}" data-editable-color-id="${card.headingColorId}">${card.defaultHeading}</h3>
       <p class="text-gray-600 editable-element" data-editable-text-id="${card.descriptionId}" data-editable-color-id="${card.descriptionColorId}">${card.defaultDescription}</p>
     </div>`
  )).join('');
}

function renderServiceIcon(iconId) {
  const icons = {
    'service-icon-1-color': `<svg class="w-7 h-7 editable-element" id="${iconId}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-editable-color-id="${iconId}">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
    </svg>`,
    'service-icon-2-color': `<svg class="w-7 h-7 editable-element" id="${iconId}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-editable-color-id="${iconId}">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 8h9M7.5 12h9M7.5 16h5m9-4v6a2 2 0 01-2 2h-15a2 2 0 01-2-2V6a2 2 0 012-2h6l3 3h8a2 2 0 012 2z"></path>
    </svg>`,
    'service-icon-3-color': `<svg class="w-7 h-7 editable-element" id="${iconId}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-editable-color-id="${iconId}">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276a1 1 0 010 1.807L15 12m0 0l4.553 2.469a1 1 0 010 1.806L15 15m0 0v4a2 2 0 11-4 0v-4m0 0l-4.553 2.276a1 1 0 010-1.806L11 12m0 0L6.447 9.531a1 1 0 010-1.807L11 10m0 0V6a2 2 0 114 0v4z"></path>
    </svg>`
  };
  return icons[iconId] || '';
}

function renderStats() {
  return statsData.map(({ countId, labelId, colorId, value, label, accent }) => (
    `<div class="text-center">
        <div class="text-4xl font-bold ${accent} mb-2 editable-element" data-editable-text-id="${countId}">${value}</div>
        <div class="text-gray-600 editable-element" data-editable-text-id="${labelId}" data-editable-color-id="${colorId}">${label}</div>
      </div>`
  )).join('');
}

function renderContactCards() {
  return contactCards.map(card => (
    `<div class="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center editable-element" id="${card.iconWrapperId}" data-editable-background-color-id="${card.iconBg}">
          <svg class="w-6 h-6 editable-element" id="${card.iconId}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-editable-color-id="${card.iconColor}">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${card.iconPath}"></path>
          </svg>
        </div>
        <div>
          <div class="font-semibold text-gray-900 editable-element" id="${card.labelElementId}" data-editable-text-id="${card.labelId}" data-editable-color-id="${card.labelColor}">${card.defaultLabel}</div>
          <div class="text-gray-600 editable-element" id="${card.valueElementId}" data-editable-text-id="${card.valueId}" data-editable-color-id="${card.valueColor}">${card.defaultValue}</div>
        </div>
      </div>`
  )).join('');
}

function renderFooterServices() {
  return footerServices.map(({ id, textId, colorId, label }) => (
    `<li class="editable-element" id="${id}" data-editable-text-id="${textId}" data-editable-color-id="${colorId}">${label}</li>`
  )).join('');
}

function renderHeader() {
  return `
      <nav class="page-container flex flex-wrap items-center justify-between gap-4 py-4">
        <a href="#home" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center editable-element" id="logo-container" data-editable-gradient-id="logo-s-bg-gradient" style="background: linear-gradient(135deg, #ea580c, #dc2626);">
            <span class="text-white text-xl font-bold editable-element" id="logo-s" data-editable-text-id="logo-s-text" data-editable-color-id="logo-s-color">EB</span>
          </div>
          <p class="text-xl font-bold gradient-text editable-element" id="site-title" data-editable-text-id="site-title-text" data-editable-color-id="site-title-color">Statyba</p>
        </a>
        <ul class="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-700">
          ${renderNavLinks()}
          <li>
            <a href="${ctaItem.href}" class="bg-white text-slate-900 border border-slate-200 px-6 py-2 rounded-full font-semibold hover:bg-slate-50 transition editable-element" id="${ctaItem.id}" data-editable-text-id="${ctaItem.textId}" data-editable-color-id="${ctaItem.colorId}" data-editable-background-color-id="${ctaItem.gradientId}">
              ${ctaItem.label}
            </a>
          </li>
        </ul>
      </nav>
  `;
}

function renderHero() {
  return `
    <section id="home" class="min-h-screen flex items-center justify-center hero-gradient relative overflow-hidden editable-element" data-editable-background-id="hero-section-background">
      <div class="absolute inset-0 z-0">
        <div class="absolute -top-4 -right-4 w-72 h-72 bg-white/10 rounded-full blur-3xl float-animation editable-element" id="hero-animated-element-1" data-editable-background-color-id="hero-animated-element-1-bg-color"></div>
        <div class="absolute -bottom-8 -left-8 w-96 h-96 bg-white/5 rounded-full blur-3xl editable-element" id="hero-animated-element-2" data-editable-background-color-id="hero-animated-element-2-bg-color"></div>
      </div>
      <div class="text-center text-white z-10 px-6 pt-32 pb-16 max-w-4xl mx-auto space-y-6">
        <div class="inline-flex items-center px-5 py-2 rounded-full bg-white/10 backdrop-blur fade-in-up editable-element" id="hero-badge" data-editable-text-id="hero-badge-text" data-editable-color-id="hero-badge-color">
          Patikimi statybų sprendimai
        </div>
        <h1 id="hero-title" class="text-5xl md:text-7xl font-bold leading-tight fade-in-up editable-element" data-editable-text-id="hero-title-text" data-editable-color-id="hero-title-color">
          Įgyvendiname jūsų statybų idėjas
        </h1>
        <p id="hero-subtitle" class="text-xl md:text-2xl text-white/90 fade-in-up editable-element" data-editable-text-id="hero-subtitle-text" data-editable-color-id="hero-subtitle-color">
          Dirbame kokybiškai, greitai ir atsakingai – jūsų namai patikimose rankose.
        </p>
        <div class="flex flex-wrap justify-center items-center gap-4 fade-in-up">
          <a href="#portfolio" class="bg-white text-slate-900 border border-slate-200 px-8 py-3 rounded-full font-semibold hover:shadow-xl hover:scale-105 transition editable-element" id="hero-projects-button" data-editable-text-id="hero-projects-button-text" data-editable-background-color-id="hero-projects-button-bg-color" data-editable-color-id="hero-projects-button-color" style="color:#0f172a;">Peržiūrėti projektus</a>
          <a href="#contact" class="glass-effect text-white px-8 py-3 rounded-full font-semibold hover:bg-white/20 transition editable-element" id="hero-quote-button" data-editable-text-id="hero-quote-button-text" data-editable-background-color-id="hero-quote-button-bg-color" data-editable-color-id="hero-quote-button-color">Susisiekti dėl darbų</a>
        </div>
      </div>
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70" aria-hidden="true">
        <svg class="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7-7-7m7 7V3"></path>
        </svg>
      </div>
    </section>
  `;
}

function renderAbout() {
  return `
    <section id="about" class="py-20 bg-white editable-element" data-editable-background-color-id="about-section-bg-color">
      <div class="page-container grid gap-16 lg:grid-cols-2 items-center">
        <div>
          <p class="text-sm uppercase tracking-wide text-orange-600 font-semibold editable-element" id="about-kicker" data-editable-text-id="about-kicker-text" data-editable-color-id="about-kicker-color">Apie mus</p>
          <h2 class="text-4xl font-bold text-slate-900 mt-3 editable-element" id="about-heading" data-editable-text-id="about-heading-text" data-editable-color-id="about-heading-color">Statybos partneris Lietuvoje</h2>
          <p class="mt-6 text-lg text-slate-600 leading-relaxed editable-element" id="about-description" data-editable-text-id="about-description-text" data-editable-color-id="about-description-color">
            Esame profesionali statybų įmonė Lietuvoje, teikianti kokybiškus statybų sprendimus, paremtus šiuolaikinėmis technologijomis ir patikimu darbu.
          </p>
          <div class="grid grid-cols-2 gap-6 mt-10">
            ${renderStats()}
          </div>
        </div>
        <div class="bg-orange-50 rounded-3xl p-10 space-y-6 editable-element" id="mission-card-bg" data-editable-background-color-id="mission-card-bg-color">
          <h3 class="text-2xl font-semibold text-orange-700 editable-element" id="mission-heading" data-editable-text-id="mission-heading-text" data-editable-color-id="mission-heading-color">Mūsų misija</h3>
          <p class="text-orange-900/80 editable-element" id="mission-description" data-editable-text-id="mission-description-text" data-editable-color-id="mission-description-color">Kiekvieną projektą atliekame taip, kad jis būtų ilgaamžis, estetiškas ir vertingas klientui.</p>
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <span class="text-green-600">•</span>
              <p class="text-slate-700 editable-element" id="mission-bullet-1" data-editable-text-id="mission-bullet-1-text" data-editable-color-id="mission-bullet-1-color">Aiškus biudžetas ir terminai</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-green-600">•</span>
              <p class="text-slate-700 editable-element" id="mission-bullet-2" data-editable-text-id="mission-bullet-2-text" data-editable-color-id="mission-bullet-2-color">Asmeninis projekto vadovas</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-green-600">•</span>
              <p class="text-slate-700 editable-element" id="mission-bullet-3" data-editable-text-id="mission-bullet-3-text" data-editable-color-id="mission-bullet-3-color">Kokybė ir atsakomybė</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderServices() {
  return `
    <section class="py-20 bg-slate-50 editable-element" id="services-section-bg" data-editable-background-color-id="services-section-bg-color">
      <div class="page-container">
        <div class="text-center max-w-2xl mx-auto">
          <p class="text-sm uppercase tracking-wide text-orange-600 font-semibold editable-element" id="services-kicker" data-editable-text-id="services-kicker-text" data-editable-color-id="services-kicker-color">Ką siūlome</p>
          <h2 class="text-4xl font-bold text-slate-900 mt-3 editable-element" id="services-heading" data-editable-text-id="services-heading-text" data-editable-color-id="services-heading-color">Mūsų paslaugos</h2>
          <p class="text-lg text-slate-600 mt-4 editable-element" id="services-subtitle" data-editable-text-id="services-subtitle-text" data-editable-color-id="services-subtitle-color">Nuosekliai rūpinamės visais statybų etapai – tiek gyvenamaisiais, tiek komerciniais projektais.</p>
        </div>
        <div class="grid gap-8 mt-12 md:grid-cols-3">
          ${renderServiceCards()}
        </div>
      </div>
    </section>
  `;
}

function renderPortfolio() {
  return `
    <section id="portfolio" class="py-20 bg-white">
      <div class="page-container space-y-12">
        <div class="flex flex-col items-center text-center gap-6">
          <div class="max-w-2xl">
            <p class="text-sm uppercase tracking-wide text-orange-600 font-semibold editable-element" id="portfolio-kicker" data-editable-text-id="portfolio-kicker-text" data-editable-color-id="portfolio-kicker-color">Mūsų darbai</p>
            <h2 class="text-4xl font-bold text-slate-900 mt-3 editable-element" id="portfolio-heading" data-editable-text-id="portfolio-heading-text" data-editable-color-id="portfolio-heading-color">Mūsų darbai</h2>
            <p class="text-lg text-slate-600 mt-4 editable-element" id="portfolio-subheading" data-editable-text-id="portfolio-subheading-text" data-editable-color-id="portfolio-subheading-color">Džiaugiamės įgyvendintais statybų projektais</p>
          </div>
          <a href="projects/" id="show-all-projects" class="bg-white text-slate-900 border border-slate-200 px-5 py-3 rounded-full font-semibold hover:bg-slate-50 transition inline-flex justify-center editable-element" data-editable-text-id="portfolio-show-all-text" data-editable-background-color-id="portfolio-show-all-bg-color" data-editable-color-id="portfolio-show-all-color">Peržiūrėti visus</a>
        </div>
        <div id="portfolio-loading" class="hidden text-center">
          <div class="spinner mx-auto mb-4"></div>
          <p class="text-slate-500">Krauname projektus...</p>
        </div>
        <div id="portfolio-error" class="hidden text-center text-red-500">Nepavyko įkelti projektų. Bandykite dar kartą.</div>
        <div id="portfolio-grid" class="grid gap-8 md:grid-cols-3"></div>
      </div>
    </section>
  `;
}

function renderContact() {
  return `
    <section id="contact" class="py-24 bg-slate-50 editable-element" data-editable-background-color-id="contact-section-bg-color">
      <div class="page-container grid gap-12 lg:grid-cols-2">
        <div class="space-y-5">
          <p class="text-sm uppercase tracking-wide text-orange-600 font-semibold editable-element" id="contact-kicker" data-editable-text-id="contact-kicker-text" data-editable-color-id="contact-kicker-color">Susisiekite</p>
          <h2 class="text-4xl font-bold text-slate-900 editable-element" id="contact-heading" data-editable-text-id="contact-heading-text" data-editable-color-id="contact-heading-color">Pasikalbėkime apie jūsų projektą</h2>
          <p class="text-lg text-slate-600 editable-element" id="contact-description" data-editable-text-id="contact-description-text" data-editable-color-id="contact-description-color">Parašykite el. paštu, paskambinkite arba užpildykite formą – atsakysime per vieną darbo dieną.</p>
          <div class="space-y-4">
            ${renderCompactContactCards()}
          </div>
        </div>
        <div class="bg-white rounded-3xl shadow-lg p-8 editable-element" id="contact-form-bg" data-editable-background-color-id="contact-form-bg-color">
          <form id="contact-form" class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-semibold text-slate-700 mb-2 editable-element" id="contact-form-name-label" data-editable-text-id="contact-form-name-label-text" data-editable-color-id="contact-form-name-label-color">Vardas ir pavardė</label>
              <input type="text" id="name" name="name" placeholder="Jūsų vardas" required maxlength="120" class="w-full p-4 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 editable-element" data-editable-placeholder-id="contact-form-name-placeholder-text" data-editable-color-id="contact-form-name-placeholder-color">
            </div>
            <div>
              <label for="email" class="block text-sm font-semibold text-slate-700 mb-2 editable-element" id="contact-form-email-label" data-editable-text-id="contact-form-email-label-text" data-editable-color-id="contact-form-email-label-color">El. paštas</label>
              <input type="email" id="email" name="email" placeholder="Jūsų el. paštas" required maxlength="254" class="w-full p-4 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 editable-element" data-editable-placeholder-id="contact-form-email-placeholder-text" data-editable-color-id="contact-form-email-placeholder-color">
            </div>
            <div>
              <label for="title" class="block text-sm font-semibold text-slate-700 mb-2 editable-element" id="contact-form-title-label" data-editable-text-id="contact-form-title-label-text" data-editable-color-id="contact-form-title-label-color">Žinutės tema</label>
              <input type="text" id="title" name="title" placeholder="Įrašykite temą" required maxlength="140" class="w-full p-4 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 editable-element" data-editable-placeholder-id="contact-form-title-placeholder-text" data-editable-color-id="contact-form-title-placeholder-color">
            </div>
            <div>
              <label for="message" class="block text-sm font-semibold text-slate-700 mb-2 editable-element" id="contact-form-message-label" data-editable-text-id="contact-form-message-label-text" data-editable-color-id="contact-form-message-label-color">Žinutė</label>
              <textarea id="message" name="message" rows="5" placeholder="Parašykite žinutę" required maxlength="1500" class="w-full p-4 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none editable-element" data-editable-placeholder-id="contact-form-message-placeholder-text" data-editable-color-id="contact-form-message-placeholder-color"></textarea>
            </div>
            <button type="submit" class="w-full bg-white text-slate-900 border border-slate-200 p-4 rounded-2xl font-semibold hover:bg-slate-50 transition editable-element" id="contact-form-submit-button" data-editable-text-id="contact-form-submit-button-text" data-editable-color-id="contact-form-submit-button-text-color" data-editable-background-color-id="contact-form-submit-button-bg-color">Siųsti žinutę</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderCompactContactCards() {
  return contactCards
    .map(
      (card) => `
        <div>
          <p class="text-sm uppercase tracking-wide text-slate-500 font-semibold editable-element" id="${card.labelElementId}" data-editable-text-id="${card.labelId}" data-editable-color-id="${card.labelColor}">${card.defaultLabel}</p>
          <p class="text-base text-slate-900 font-semibold editable-element" id="${card.valueElementId}" data-editable-text-id="${card.valueId}" data-editable-color-id="${card.valueColor}">${card.defaultValue}</p>
        </div>
      `
    )
    .join('');
}

function renderFooter() {
  return `
    <footer class="bg-slate-900 text-white py-12 editable-element" id="footer-bg" data-editable-background-color-id="footer-bg-color" style="background-color:#0f172a;">
      <div class="page-container grid gap-10 md:grid-cols-3">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center editable-element" id="footer-logo-container" data-editable-gradient-id="logo-s-bg-gradient" style="background: linear-gradient(135deg, #ea580c, #dc2626);">
              <span class="text-white font-bold text-xl editable-element" id="footer-logo-s" data-editable-text-id="logo-s-text" data-editable-color-id="logo-s-color">EB</span>
            </div>
            <div>
              <p class="text-lg font-semibold editable-element" id="footer-site-name" data-editable-text-id="footer-site-name-text" data-editable-color-id="footer-site-name-color">Statyba</p>
              <p class="text-sm text-white/60 editable-element" id="footer-tagline" data-editable-text-id="footer-tagline-text" data-editable-color-id="footer-tagline-color">Kuriame kokybiškus ir ilgaamžius statinius.</p>
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold mb-4 editable-element" id="footer-services-heading" data-editable-text-id="footer-services-heading-text" data-editable-color-id="footer-services-heading-color">Paslaugos</h4>
          <ul class="space-y-2 text-white/70">
            ${renderFooterServices()}
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-4 editable-element" id="footer-connect-heading" data-editable-text-id="footer-connect-heading-text" data-editable-color-id="footer-connect-heading-color">Susisiekite</h4>
          <div class="flex gap-3">
            <a href="#" class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-orange-600 transition border border-white/30 editable-element" id="footer-facebook-icon-bg" data-editable-background-color-id="footer-facebook-icon-bg-color" data-editable-link-id="footer-facebook-link" target="_blank" rel="noreferrer noopener">
              <svg class="w-5 h-5 editable-element" fill="currentColor" viewBox="0 0 24 24" id="footer-facebook-icon-color" data-editable-color-id="footer-facebook-icon-color">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.811c-3.27 0-4.189 1.458-4.189 4.009v2.991z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <p class="text-center text-white/50 mt-10 editable-element" id="footer-copyright" data-editable-text-id="footer-copyright-text" data-editable-color-id="footer-copyright-color">© 2025 Statyba. Visos teisės saugomos.</p>
    </footer>
  `;
}

function renderSite() {
  const header = document.getElementById('site-header');
  const main = document.getElementById('site-main');
  const footer = document.getElementById('site-footer');

  if (header) {
    header.className = 'fixed top-0 left-0 w-full bg-white border-b border-slate-200 shadow-sm z-50';
    header.innerHTML = renderHeader();
  }
  if (main) main.innerHTML = [renderHero(), renderAbout(), renderServices(), renderPortfolio(), renderContact()].join('');
  if (footer) footer.innerHTML = renderFooter();

  window.__siteRendered = true;
  window.dispatchEvent(new CustomEvent('site:rendered'));
}

renderSite();
