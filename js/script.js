const tabs = Array.from(document.querySelectorAll(".nav-tab"));
const panels = Array.from(document.querySelectorAll(".tab-panel"));
const landingPanels = panels.filter((panel) => panel.dataset.panel !== "contacto");
const informationPanel = panels.find((panel) => panel.dataset.panel === "contacto");
const sectionTabs = Array.from(document.querySelectorAll("[data-section-target]"));
const informationTab = document.querySelector("[data-view-target='contacto']");
const themeToggle = document.querySelector("#theme-toggle");
const currentYear = document.querySelector("#current-year");
const trackingForm = document.querySelector("#tracking-form");
const trackingInput = document.querySelector("#order-code");
const trackingButton = trackingForm.querySelector('[type="submit"]');
const trackingResult = document.querySelector("#tracking-result");
const trackingNotification = document.querySelector("#tracking-notification");
const trackingNotificationPrompt = document.querySelector("#tracking-notification-prompt");
const trackingNotificationForm = document.querySelector("#tracking-notification-form");
const trackingNotificationEmail = document.querySelector("#tracking-notification-email");
const trackingNotificationConsent = document.querySelector("#tracking-notification-consent");
const trackingNotificationSubmit = document.querySelector("#tracking-notification-submit");
const trackingNotificationMessage = document.querySelector("#tracking-notification-message");
let currentTrackingCode = "";
let currentLanguage = "es";

const appText = {
  es: {
    "header-caption": "Transporte que conecta",
    "support": "Soporte",
    "theme-dark": "Modo oscuro",
    "theme-light": "Modo claro",
    "nav-home": "Inicio",
    "nav-tracking": "Rastreo",
    "nav-requests": "Solicitar envíos",
    "nav-info": "Información",
    "hero-eyebrow": "JL EXPRESS · TRANSPORTE Y LOGÍSTICA",
    "hero-title-part-one": "Movemos lo que",
    "hero-title-part-two": "más importa.",
    "hero-description": "Conectamos destinos y personas con un servicio confiable, atención cercana y soluciones pensadas para cada envío.",
    "hero-link": "Conoce más",
    "company-eyebrow": "QUIÉNES SOMOS",
    "company-title": "Tu aliado en cada trayecto.",
    "company-description": "En JL Express trabajamos para que tus envíos lleguen a su destino de forma segura y oportuna. También ofrecemos servicios de correos y mandados para ayudarte con documentos, correspondencia y otras entregas.",
    "tracking-eyebrow": "SEGUIMIENTO DE PEDIDOS",
    "tracking-title-part-one": "Consulta tu pedido",
    "tracking-title-part-two": "TEMU.",
    "tracking-description": "Ingresa el código de seguimiento para consultar el estado de tu pedido.",
    "tracking-code-label": "Código de pedido",
    "tracking-code-placeholder": "Ej. LMXXXXXXXXXXX",
    "tracking-code-help": "Ejemplos: LMXXXXXXXXXXX, 2631297721093041 o JCXXXXXXXXXXXX.",
    "tracking-search": "Buscar pedido",
    "tracking-searching": "Buscando…",
    "tracking-consulting": "Consultando el estado de tu pedido…",
    "tracking-empty-state": "Aquí aparecerá el estado de tu pedido.",
    "tracking-no-result": "No encontramos un pedido con ese código. Verifica los datos e inténtalo de nuevo.",
    "tracking-notify-question": "¿Quieres recibir actualizaciones?",
    "tracking-notify-copy": "Te enviaremos un correo cada vez que cambie el estado de este paquete.",
    "tracking-notify-yes": "Sí, avisarme",
    "tracking-notify-no": "Ahora no",
    "tracking-notify-email": "Correo electrónico",
    "tracking-notify-submit": "Enviar confirmación",
    "tracking-notify-activating": "Enviando el correo de confirmación…",
    "tracking-notify-pending": "Te enviamos un correo para confirmar la suscripción. Revisa tu bandeja de entrada.",
    "tracking-notify-active": "Esta dirección ya está suscrita a los avisos de este envío.",
    "tracking-notify-consent": "Acepto recibir correos sobre los cambios de estado de este envío. Puedo cancelar los avisos desde el enlace incluido en cada correo.",
    "tracking-notify-unavailable": "Las notificaciones de este servicio no están activas.",
    "tracking-status-label": "Estado del envío",
    "tracking-step-label": "Progreso del envío",
    "tracking-detail-tracking-code": "Tracking code",
    "tracking-detail-last-update": "Última actualización",
    "tracking-detail-status": "Estado del envío",
    "tracking-detail-not-available": "No disponible",
    "tracking-status-pending": "Pendiente de actualización",
    "tracking-info-eyebrow": "ESTAMOS PARA AYUDARTE",
    "tracking-info-title-part-one": "Información y",
    "tracking-info-title-part-two": "ayuda.",
    "tracking-info-description": "Conoce más sobre JL Express y encuentra respuestas para tus envíos.",
    "tracking-about-title": "Sobre JL Express",
    "tracking-about-copy": "Somos un servicio de transporte y logística enfocado en conectar destinos y personas. Además del rastreo de pedidos, puedes contactarnos para coordinar correspondencia, documentos y mandados.",
    "faq-heading": "¿En qué podemos ayudarte?",
    "faq-a": "¿Cómo consulto el estado de mi pedido?",
    "faq-a-copy": "Abre la pestaña “Rastreo”, escribe el código de seguimiento de tu pedido y selecciona “Buscar pedido”.",
    "faq-b": "¿Qué significa cada estado?",
    "faq-b-copy": "“En sucursal Turrialba” indica que el pedido está en sucursal, “En camino” que va hacia su destino y “Recibido” que figura como entregado.",
    "faq-c": "¿Puedo solicitar un envío de cartas o un mandado?",
    "faq-c-copy": "Sí. En la pestaña “Solicitar envíos” puedes iniciar una conversación por WhatsApp para coordinar una solicitud extra.",
    "faq-d": "¿Qué hago si no encuentro mi pedido?",
    "faq-d-copy": "Verifica que el código esté escrito correctamente. Si aún necesitas ayuda, contáctanos por WhatsApp, teléfono o correo electrónico.",
    "contact-title": "Hablemos de tu envío.",
    "contact-copy": "Elige el medio que prefieras para comunicarte con nosotros.",
    "call-us": "Llámanos",
    "email-label": "Correo electrónico",
    "follow-us": "Síguenos",
    "certifications": "Certificaciones",
    "privacy": "Aviso de privacidad",
    "terms": "Términos y condiciones",
    "service-more": "MÁS SERVICIOS PARA TI",
    "service-more-title-part-one": "¿Necesitas enviar algo",
    "service-more-title-part-two": "más?",
    "service-more-description": "Además de tus paquetes, te ayudamos con envíos de correspondencia, documentos y mandados. Cuéntanos qué necesitas y coordinaremos contigo los detalles de la entrega.",
    "service-extra-request": "Solicitar pedido extra",
    "service-extra-note": "Te atenderemos por WhatsApp para coordinar tu solicitud.",
    "service-card-correspondence": "Correspondencia",
    "service-card-documents": "Documentos",
    "service-card-mandados": "Mandados",
    "footer-contact": "Contacto",
    "footer-brand-tagline": "Transporte que conecta",
    "footer-placeholder": "LOGO",
    "footer-iso": "ISO",
    "contact-option-whatsapp": "WhatsApp",
    "contact-option-email": "Correo electrónico",
    "toggle-dark": "Activar modo oscuro",
    "toggle-light": "Activar modo claro",
  },
  en: {
    "header-caption": "Transport that connects",
    "support": "Support",
    "theme-dark": "Dark mode",
    "theme-light": "Light mode",
    "nav-home": "Home",
    "nav-tracking": "Tracking",
    "nav-requests": "Request shipments",
    "nav-info": "Information",
    "hero-eyebrow": "JL EXPRESS · TRANSPORT AND LOGISTICS",
    "hero-title-part-one": "We move what",
    "hero-title-part-two": "matters most.",
    "hero-description": "We connect destinations and people with reliable service, close support, and solutions designed for every shipment.",
    "hero-link": "Learn more",
    "company-eyebrow": "WHO WE ARE",
    "company-title": "Your trusted partner on every route.",
    "company-description": "At JL Express, we work so your shipments reach their destination safely and on time. We also offer postal and courier services to help with documents, correspondence, and other deliveries.",
    "tracking-eyebrow": "ORDER TRACKING",
    "tracking-title-part-one": "Track your order",
    "tracking-title-part-two": "TEMU.",
    "tracking-description": "Enter the tracking code to check the status of your order.",
    "tracking-code-label": "Order code",
    "tracking-code-placeholder": "Ex. LMXXXXXXXXXXX",
    "tracking-code-help": "Examples: LMXXXXXXXXXXX, 2631297721093041 or JCXXXXXXXXXXXX.",
    "tracking-search": "Track order",
    "tracking-searching": "Searching…",
    "tracking-consulting": "Checking the status of your order…",
    "tracking-empty-state": "Your order status will appear here.",
    "tracking-no-result": "We could not find an order with that code. Please check the details and try again.",
    "tracking-notify-question": "Want to receive updates?",
    "tracking-notify-copy": "We will email you each time this package changes status.",
    "tracking-notify-yes": "Yes, notify me",
    "tracking-notify-no": "Not now",
    "tracking-notify-email": "Email address",
    "tracking-notify-submit": "Send confirmation",
    "tracking-notify-activating": "Sending confirmation email…",
    "tracking-notify-pending": "We sent you an email to confirm your subscription. Check your inbox.",
    "tracking-notify-active": "This email is already subscribed to updates for this shipment.",
    "tracking-notify-consent": "I agree to receive emails about this shipment's status changes. I can cancel alerts using the link in any email.",
    "tracking-notify-unavailable": "Notifications for this service are currently inactive.",
    "tracking-status-label": "Shipment status",
    "tracking-step-label": "Shipment progress",
    "tracking-detail-tracking-code": "Tracking code",
    "tracking-detail-last-update": "Last update",
    "tracking-detail-status": "Shipment status",
    "tracking-detail-not-available": "Not available",
    "tracking-status-pending": "Pending update",
    "tracking-info-eyebrow": "WE ARE HERE TO HELP",
    "tracking-info-title-part-one": "Information and",
    "tracking-info-title-part-two": "help.",
    "tracking-info-description": "Learn more about JL Express and find answers for your shipments.",
    "tracking-about-title": "About JL Express",
    "tracking-about-copy": "We are a transportation and logistics service focused on connecting destinations and people. In addition to tracking orders, you can contact us to coordinate correspondence, documents, and errands.",
    "faq-heading": "How can we help you?",
    "faq-a": "How do I check my order status?",
    "faq-a-copy": "Open the “Tracking” tab, enter your order tracking code, and select “Track order”.",
    "faq-b": "What does each status mean?",
    "faq-b-copy": "“At Turrialba branch” means the order is at the branch, “In transit” means it is on the way to its destination, and “Received” means it has been delivered.",
    "faq-c": "Can I request a letter or errand delivery?",
    "faq-c-copy": "Yes. In the “Request shipments” tab, you can start a WhatsApp conversation to coordinate an extra request.",
    "faq-d": "What should I do if I cannot find my order?",
    "faq-d-copy": "Check that the code is written correctly. If you still need help, contact us by WhatsApp, phone, or email.",
    "contact-title": "Let’s talk about your shipment.",
    "contact-copy": "Choose the method you prefer to contact us.",
    "call-us": "Call us",
    "email-label": "Email",
    "follow-us": "Follow us",
    "certifications": "Certifications",
    "privacy": "Privacy notice",
    "terms": "Terms and conditions",
    "service-more": "MORE SERVICES FOR YOU",
    "service-more-title-part-one": "Need to send something",
    "service-more-title-part-two": "else?",
    "service-more-description": "In addition to your packages, we help with correspondence, documents, and courier services. Tell us what you need and we will coordinate the delivery details with you.",
    "service-extra-request": "Request extra shipment",
    "service-extra-note": "We will assist you via WhatsApp to coordinate your request.",
    "service-card-correspondence": "Correspondence",
    "service-card-documents": "Documents",
    "service-card-mandados": "Errands",
    "footer-contact": "Contact",
    "footer-brand-tagline": "Transport that connects",
    "footer-placeholder": "LOGO",
    "footer-iso": "ISO",
    "contact-option-whatsapp": "WhatsApp",
    "contact-option-email": "Email",
    "toggle-dark": "Activate dark mode",
    "toggle-light": "Activate light mode",
  }
};

function getPreferredLanguage() {
  try {
    const storedLanguage = window.localStorage.getItem("ji-express-language");
    if (storedLanguage === "en" || storedLanguage === "es") {
      return storedLanguage;
    }
  } catch (error) {
    console.warn("No se pudo leer la preferencia de idioma guardada.", error);
  }

  const browserLanguage = (navigator.language || navigator.languages?.[0] || "es").toLowerCase();
  return browserLanguage.startsWith("en") ? "en" : "es";
}

function getText(key) {
  return appText[currentLanguage]?.[key] ?? appText.es[key] ?? key;
}

function applyLanguage(language) {
  currentLanguage = language;
  document.documentElement.lang = language;

  try {
    window.localStorage.setItem("ji-express-language", language);
  } catch (error) {
    console.warn("No se pudo guardar la preferencia de idioma.", error);
  }

  const setText = (selector, key, isPlaceholder = false) => {
    const element = document.querySelector(selector);
    if (!element) return;

    const value = getText(key);
    if (isPlaceholder) {
      element.placeholder = value;
      return;
    }

    element.textContent = value;
  };

  const setEyebrow = (selector, key) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.innerHTML = '<span></span> ' + getText(key);
  };

  const setHeadlineWithAccent = (selector, firstKey, secondKey) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.innerHTML = `${getText(firstKey)} <span>${getText(secondKey)}</span>`;
  };

  setText(".header-caption", "header-caption");
  setText(".support-button span:last-child", "support");
  setText("#tab-inicio", "nav-home");
  setText("#tab-servicios", "nav-tracking");
  setText("#tab-nosotros", "nav-requests");
  setText("#tab-contacto", "nav-info");
  setEyebrow(".hero-copy .eyebrow", "hero-eyebrow");
  setHeadlineWithAccent(".hero-copy h1", "hero-title-part-one", "hero-title-part-two");
  setText(".hero-description", "hero-description");
  setText(".primary-link", "hero-link");
  setEyebrow(".company-info .eyebrow", "company-eyebrow");
  setText("#company-title", "company-title");
  setText(".company-info p", "company-description");
  setEyebrow(".temu-heading .eyebrow", "tracking-eyebrow");
  setHeadlineWithAccent(".temu-heading h1", "tracking-title-part-one", "tracking-title-part-two");
  setText(".temu-description", "tracking-description");
  setText("label[for='order-code']", "tracking-code-label");
  setText("#order-code", "tracking-code-placeholder", true);
  setText("#order-code-help", "tracking-code-help");
  setText(".temu-search-button", "tracking-search");
  setText("#tracking-notification-yes", "tracking-notify-yes");
  setText("#tracking-notification-no", "tracking-notify-no");
  setText("#tracking-notification-email", "tracking-notify-email", true);
  setText("#tracking-notification-consent-copy", "tracking-notify-consent");
  setText("#tracking-notification-submit", "tracking-notify-submit");
  setEyebrow(".extra-copy .eyebrow", "service-more");
  setHeadlineWithAccent(".extra-copy h1", "service-more-title-part-one", "service-more-title-part-two");
  setText(".extra-description", "service-more-description");
  setText(".extra-whatsapp-button", "service-extra-request");
  setText(".extra-note", "service-extra-note");
  setText(".extra-service-card:nth-child(1) span:last-child", "service-card-correspondence");
  setText(".extra-service-card:nth-child(2) span:last-child", "service-card-documents");
  setText(".extra-service-card:nth-child(3) span:last-child", "service-card-mandados");
  setEyebrow(".information-heading .eyebrow", "tracking-info-eyebrow");
  setHeadlineWithAccent(".information-heading h1", "tracking-info-title-part-one", "tracking-info-title-part-two");
  setText(".information-heading p", "tracking-info-description");
  setText("#information-about-title", "tracking-about-title");
  setText(".information-about p", "tracking-about-copy");
  setText("#help-title", "faq-heading");
  const faqSummaries = document.querySelectorAll(".help-item summary");
  const faqText = ["faq-a", "faq-b", "faq-c", "faq-d"];
  faqSummaries.forEach((item, index) => {
    item.textContent = getText(faqText[index]);
  });
  const faqParagraphs = document.querySelectorAll(".help-item p");
  const faqParagraphText = ["faq-a-copy", "faq-b-copy", "faq-c-copy", "faq-d-copy"];
  faqParagraphs.forEach((item, index) => {
    item.textContent = getText(faqParagraphText[index]);
  });
  setText("#information-contact-title", "contact-title");
  setText(".information-contact > p", "contact-copy");
  setText(".footer-contact .footer-heading", "footer-contact");
  setText(".footer-social .footer-heading", "follow-us");
  setText(".footer-certifications .footer-heading", "certifications");
  setText(".footer-brand span", "footer-brand-tagline");
  setText(".footer-legal a[href='#avisos']", "privacy");
  setText(".footer-legal a[href='#terminos']", "terms");
  const firstContactText = document.querySelector(".contact-option:nth-child(1) small");
  if (firstContactText) firstContactText.textContent = getText("contact-option-whatsapp");
  const firstCallText = document.querySelector(".contact-option:nth-child(2) small");
  if (firstCallText) firstCallText.textContent = getText("call-us");
  const firstEmailText = document.querySelector(".contact-option:nth-child(3) small");
  if (firstEmailText) firstEmailText.textContent = getText("contact-option-email");

  const trackingNotificationPromptTitle = document.querySelector(".tracking-notification-title");
  if (trackingNotificationPromptTitle) trackingNotificationPromptTitle.textContent = getText("tracking-notify-question");
  const trackingNotificationPromptCopy = document.querySelector(".tracking-notification-copy");
  if (trackingNotificationPromptCopy) trackingNotificationPromptCopy.textContent = getText("tracking-notify-copy");

  if (trackingButton) {
    trackingButton.textContent = getText("tracking-search");
  }
  if (trackingNotificationSubmit) {
    trackingNotificationSubmit.textContent = getText("tracking-notify-submit");
  }
  if (!trackingResult?.classList.contains("has-order") && !trackingResult?.classList.contains("is-error")) {
    trackingResult.textContent = getText("tracking-empty-state");
  }

  if (themeToggle) {
    const enabled = document.body.classList.contains("dark-mode");
    themeToggle.setAttribute("aria-label", enabled ? getText("toggle-light") : getText("toggle-dark"));
    themeToggle.querySelector(".theme-label").textContent = enabled ? getText("theme-light") : getText("theme-dark");
  }
}

function setActiveNavigation(tab) {
  for (const item of tabs) {
    const isActive = item === tab;
    item.classList.toggle("is-active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", item.dataset.viewTarget ? "page" : "location");
    } else {
      item.removeAttribute("aria-current");
    }
  }
}

function showLandingSection(name) {
  informationPanel.hidden = true;
  for (const panel of landingPanels) panel.hidden = false;

  const tab = sectionTabs.find((item) => item.dataset.sectionTarget === name);
  const section = landingPanels.find((panel) => panel.dataset.panel === name);
  if (!tab || !section) return;

  setActiveNavigation(tab);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showInformation() {
  for (const panel of landingPanels) panel.hidden = true;
  informationPanel.hidden = false;
  setActiveNavigation(informationTab);
}

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    if (tab.dataset.sectionTarget) {
      showLandingSection(tab.dataset.sectionTarget);
    } else {
      showInformation();
    }
  });
}

for (const link of document.querySelectorAll("[data-tab-link]")) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const destination = link.dataset.tabLink;

    if (destination === "contacto") {
      showInformation();
      informationPanel.focus({ preventScroll: true });
    } else {
      showLandingSection(destination);
    }
  });
}

const landingSectionObserver = new IntersectionObserver((entries) => {
  if (!informationPanel.hidden) return;

  const visibleSection = entries
    .filter((entry) => entry.isIntersecting)
    .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
  if (!visibleSection) return;

  const tab = sectionTabs.find((item) =>
    item.dataset.sectionTarget === visibleSection.target.dataset.panel
  );
  if (tab) setActiveNavigation(tab);
}, {
  rootMargin: "-15% 0px -65% 0px",
  threshold: 0,
});

for (const panel of landingPanels) landingSectionObserver.observe(panel);

function setDarkMode(enabled) {
  document.body.classList.toggle("dark-mode", enabled);
  themeToggle.setAttribute("aria-pressed", String(enabled));
  themeToggle.setAttribute(
    "aria-label",
    enabled ? getText("toggle-light") : getText("toggle-dark"),
  );
  themeToggle.querySelector(".theme-icon").textContent = enabled ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = enabled
    ? getText("theme-light")
    : getText("theme-dark");
}

let savedTheme = null;
try {
  savedTheme = window.localStorage.getItem("ji-express-theme");
} catch (error) {
  console.warn("No se pudo leer la preferencia del tema guardada.", error);
}

let themePreference = savedTheme === "dark" || savedTheme === "light"
  ? savedTheme
  : null;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

currentLanguage = getPreferredLanguage();
applyLanguage(currentLanguage);
setDarkMode(themePreference ? themePreference === "dark" : systemTheme.matches);
systemTheme.addEventListener("change", (event) => {
  if (themePreference === null) {
    setDarkMode(event.matches);
  }
});

themeToggle.addEventListener("click", () => {
  const enabled = !document.body.classList.contains("dark-mode");
  themePreference = enabled ? "dark" : "light";
  setDarkMode(enabled);

  try {
    window.localStorage.setItem("ji-express-theme", themePreference);
  } catch (error) {
    console.warn("No se pudo guardar la preferencia del tema.", error);
  }
});

currentYear.textContent = String(new Date().getFullYear());

function formatTrackingDate(value) {
  if (!value) return getText("tracking-detail-not-available");
  const date = new Date(value);
  const locale = currentLanguage === "en" ? "en-US" : "es-CR";
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(locale);
}

function appendTrackingField(list, label, value) {
  const item = document.createElement("div");
  item.className = "tracking-detail";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value === true ? "Sí" : value === false ? "No" : String(value || getText("tracking-detail-not-available"));
  item.append(term, description);
  list.append(item);
}

const trackingStages = {
  es: ["En sucursal Turrialba", "En camino", "Recibido"],
  en: ["At Turrialba branch", "In transit", "Received"],
};
const trackingStageTypes = {
  es: ["packaging", "transit", "ready"],
  en: ["packaging", "transit", "ready"],
};
const trackingStatusAliases = {
  es: {
    "en sucursal": "En sucursal Turrialba",
    empaquetando: "En sucursal Turrialba",
    "en transito": "En camino",
    "en camino": "En camino",
    "listo para recoger": "Recibido",
    recibido: "Recibido",
  },
  en: {
    "en sucursal": "At Turrialba branch",
    empaquetando: "At Turrialba branch",
    packaging: "At Turrialba branch",
    "en transito": "In transit",
    "en camino": "In transit",
    transit: "In transit",
    "in transit": "In transit",
    "listo para recoger": "Received",
    "ready for pickup": "Received",
    recibido: "Received",
    received: "Received",
  },
};

function normalizeTrackingStatus(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(currentLanguage === "en" ? "en" : "es");
}

function resolveTrackingStage(value) {
  const normalizedStatus = normalizeTrackingStatus(value);
  return trackingStatusAliases[currentLanguage][normalizedStatus] ?? trackingStatusAliases.es[normalizedStatus] ?? (normalizedStatus ? String(value) : trackingStages[currentLanguage][0]);
}

function renderTrackingOrder(order) {
  trackingResult.replaceChildren();
  trackingResult.classList.add("has-order");

  const currentStatus = resolveTrackingStage(order.estado_envio);
  const stageLabels = trackingStages[currentLanguage];
  const currentStageIndex = stageLabels.findIndex((stage) =>
    normalizeTrackingStatus(stage) === normalizeTrackingStatus(currentStatus)
  );

  const heading = document.createElement("div");
  heading.className = "tracking-status-heading";
  const caption = document.createElement("span");
  caption.className = "tracking-status-caption";
  caption.textContent = getText("tracking-status-label");
  const status = document.createElement("strong");
  status.className = "tracking-status-value";
  status.textContent = currentStatus || getText("tracking-status-pending");
  heading.append(caption, status);

  const steps = document.createElement("ol");
  steps.className = "tracking-steps";
  steps.setAttribute("aria-label", getText("tracking-step-label"));
  const progress = currentStageIndex < 0
    ? 0
    : currentStageIndex / (stageLabels.length - 1);
  steps.style.setProperty("--tracking-progress", String(progress));
  stageLabels.forEach((stage, index) => {
    const item = document.createElement("li");
    item.className = "tracking-step";
    item.style.setProperty("--step-index", String(index));
    if (index < currentStageIndex) item.classList.add("is-complete");
    if (index === currentStageIndex) {
      item.classList.add("is-current");
      item.setAttribute("aria-current", "step");
    }

    const marker = document.createElement("span");
    marker.className = `tracking-step-marker tracking-step-marker--${trackingStageTypes[currentLanguage][index]}`;
    marker.setAttribute("aria-hidden", "true");
    const parcel = document.createElement("span");
    parcel.className = "tracking-parcel-icon";
    parcel.textContent = "📦";
    marker.append(parcel);

    if (index === 0) {
      const tape = document.createElement("span");
      tape.className = "tracking-tape-mark";
      marker.append(tape);
    } else if (index === 1) {
      const truck = document.createElement("span");
      truck.className = "tracking-truck-icon";
      truck.textContent = "🚚";
      marker.append(truck);
    } else {
      const readyMark = document.createElement("span");
      readyMark.className = "tracking-ready-mark";
      readyMark.textContent = "✓";
      marker.append(readyMark);
    }

    const label = document.createElement("span");
    label.className = "tracking-step-label";
    label.textContent = stage;
    item.append(marker, label);
    steps.append(item);
  });

  const details = document.createElement("dl");
  details.className = "tracking-details";
  appendTrackingField(details, getText("tracking-detail-tracking-code"), order.tracking_code);
  appendTrackingField(details, getText("tracking-detail-last-update"), formatTrackingDate(order.ultima_actualizacion));

  trackingResult.append(heading, steps, details);
}

function notificationWasHandled(trackingCode) {
  try {
    return window.localStorage.getItem(`ji-express-tracking-notifications:${trackingCode}`) === "done";
  } catch (error) {
    return false;
  }
}

function markNotificationHandled(trackingCode) {
  try {
    window.localStorage.setItem(`ji-express-tracking-notifications:${trackingCode}`, "done");
  } catch (error) {
    console.warn("No se pudo guardar la preferencia de notificaciones.", error);
  }
}

function showTrackingNotificationPrompt(trackingCode) {
  if (notificationWasHandled(trackingCode)) return;
  currentTrackingCode = trackingCode;
  trackingNotificationConsent.checked = false;
  trackingNotification.hidden = false;
  trackingNotificationPrompt.hidden = false;
  trackingNotificationForm.hidden = true;
  trackingNotificationMessage.textContent = "";
  const promptTitle = document.querySelector(".tracking-notification-title");
  if (promptTitle) promptTitle.textContent = getText("tracking-notify-question");
  const promptCopy = document.querySelector(".tracking-notification-copy");
  if (promptCopy) promptCopy.textContent = getText("tracking-notify-copy");
}

document.querySelector("#tracking-notification-yes").addEventListener("click", () => {
  trackingNotificationPrompt.hidden = true;
  trackingNotificationForm.hidden = false;
  trackingNotificationEmail.focus();
});

document.querySelector("#tracking-notification-no").addEventListener("click", () => {
  markNotificationHandled(currentTrackingCode);
  trackingNotification.hidden = true;
});

trackingNotificationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentTrackingCode) return;

  trackingNotificationSubmit.disabled = true;
  trackingNotificationMessage.textContent = getText("tracking-notify-activating");
  try {
    if (!window.supabaseClient || typeof window.supabaseClient.rpc !== "function") {
      throw new Error("Las notificaciones no están disponibles en este momento.");
    }

    if (!trackingNotificationConsent.checked) {
      throw new Error(getText("tracking-notify-consent"));
    }

    const { data, error } = await window.supabaseClient.functions.invoke("manage-tracking-subscription", {
      body: {
        action: "subscribe",
        tracking_code: currentTrackingCode,
        email: trackingNotificationEmail.value.trim(),
        consent: trackingNotificationConsent.checked,
      },
    });
    if (error) throw error;

    if (data?.status === "already_active") markNotificationHandled(currentTrackingCode);
    trackingNotificationForm.hidden = true;
    trackingNotificationMessage.textContent = data?.status === "already_active"
      ? getText("tracking-notify-active")
      : getText("tracking-notify-pending");
  } catch (error) {
    let message = error?.message || "No se pudo activar el aviso. Inténtalo de nuevo.";
    if (error?.context instanceof Response) {
      try {
        const responseBody = await error.context.clone().json();
        message = responseBody?.error || message;
      } catch {
        // Keep the SDK error when the response has no JSON body.
      }
    }
    const isMissingFunction = /does not exist|function.*not found|manage-tracking-subscription/i.test(message);

    if (isMissingFunction) {
      trackingNotificationMessage.textContent = getText("tracking-notify-unavailable");
      return;
    }

    trackingNotificationMessage.textContent = message;
  } finally {
    trackingNotificationSubmit.disabled = false;
  }
});

trackingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const trackingCode = trackingInput.value.trim();
  if (!trackingCode) return;

  trackingButton.disabled = true;
  trackingButton.textContent = getText("tracking-searching");
  trackingNotification.hidden = true;
  trackingResult.classList.remove("has-order", "is-error");
  trackingResult.textContent = getText("tracking-consulting");

  try {
    if (!window.supabaseClient) {
      throw new Error("No se pudo conectar con el servicio. Inténtalo más tarde.");
    }

    const { data, error } = await window.supabaseClient.rpc("consultar_envio", {
      p_tracking_code: trackingCode,
    });
    if (error) throw error;
    if (!data) {
      trackingResult.textContent = getText("tracking-no-result");
      return;
    }

    renderTrackingOrder(data);
    showTrackingNotificationPrompt(data.tracking_code || trackingCode);
  } catch (error) {
    trackingResult.classList.add("is-error");
    trackingResult.textContent = error.message || getText("tracking-no-result");
  } finally {
    trackingButton.disabled = false;
    trackingButton.textContent = getText("tracking-search");
  }
});
