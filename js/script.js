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
const trackingNotificationConsent = document.querySelector("#tracking-notification-consent");
const trackingNotificationEmail = document.querySelector("#tracking-notification-email");
const trackingNotificationEmailConsent = document.querySelector("#tracking-notification-email-consent");
const trackingNotificationSubmit = document.querySelector("#tracking-notification-submit");
const trackingNotificationMessage = document.querySelector("#tracking-notification-message");
const VAPID_PUBLIC_KEY = "BM04QKN5xpudplpDvyu-AM1Jux-bv-SDIl1vAJsp1-fvulNWr3Lm3tHG5rIg1MO99CMcBDjF81uHZwuNM78Mp3k";
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
    "tracking-notify-copy": "Elige si quieres recibir los cambios de estado por correo electrónico, mediante notificaciones push en este dispositivo o por ambos medios.",
    "tracking-notify-yes": "Sí, avisarme",
    "tracking-notify-no": "Ahora no",
    "tracking-notify-submit": "Guardar preferencias",
    "tracking-notify-activating": "Guardando tus preferencias…",
    "tracking-notify-active": "Tus preferencias de notificación quedaron guardadas.",
    "tracking-notify-email-label": "Correo electrónico",
    "tracking-notify-email-placeholder": "nombre@ejemplo.com",
    "tracking-notify-email-consent": "Acepto recibir correos cuando cambie el estado de este envío. Puedo cancelar los avisos desde el correo recibido.",
    "tracking-notify-email-required": "Escribe un correo válido y acepta recibir avisos por correo.",
    "tracking-notify-selection-required": "Selecciona al menos un medio de notificación y acepta su consentimiento.",
    "tracking-notify-email-pending": "Revisa tu correo y confirma la suscripción.",
    "tracking-notify-email-active": "El correo ya estaba suscrito a este envío.",
    "tracking-notify-push-active": "Las notificaciones push quedaron activadas en este dispositivo.",
    "tracking-notify-consent": "Acepto recibir notificaciones push en este dispositivo sobre los cambios de estado de este envío. Puedo desactivarlas desde la configuración del navegador.",
    "tracking-notify-consent-required": "Acepta recibir notificaciones push para continuar.",
    "tracking-notify-denied": "El permiso fue bloqueado. Cámbialo en la configuración de notificaciones de tu navegador.",
    "tracking-notify-unsupported": "Este navegador no admite notificaciones push. Prueba en otro navegador o dispositivo.",
    "tracking-notify-unconfigured": "Las notificaciones aún no están configuradas. Inténtalo más tarde.",
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
    "privacy-eyebrow": "AVISO DE PRIVACIDAD",
    "privacy-title": "Cómo tratamos tus datos",
    "privacy-intro": "JLEXPRESS (JL Express) es responsable del tratamiento de los datos gestionados mediante este sitio y sus servicios de mensajería en Costa Rica. Para consultas sobre privacidad, escribe a jlexpressturrialba@gmail.com.",
    "privacy-data-title": "Datos y finalidades",
    "privacy-data-copy": "Tratamos los códigos de seguimiento y estados para localizar y dar seguimiento a los envíos. Para administrar la entrega, también podemos tratar el nombre, teléfono y dirección o ubicación facilitados para el servicio. Usamos estos datos para organizar la operación, atender consultas y reclamos, y mantener la información del pedido actualizada. El rastreo público muestra únicamente el código, el estado y la fecha de actualización.",
    "privacy-tracking-title": "Rastreo y protección del servicio",
    "privacy-tracking-copy": "Al consultar un envío, el código se contrasta con los registros de envíos almacenados en Supabase, nuestro proveedor de base de datos. La respuesta pública muestra el código, el estado y la última actualización. Para limitar consultas automatizadas, el sistema usa la IP recibida de Cloudflare y guarda un HMAC, no la IP en claro; el límite es de 20 consultas por minuto.",
    "privacy-push-title": "Avisos opcionales por correo y push",
    "privacy-push-copy": "Los avisos son opcionales. Para correo, guardamos la dirección, el código del envío y las fechas de consentimiento y confirmación; debes confirmar la dirección y puedes cancelar desde el enlace del mensaje. Los correos se envían mediante Gmail. Para push, guardamos el código, el endpoint y las claves técnicas de la suscripción en el dispositivo; el navegador y su servicio de notificaciones intervienen en la entrega. Las suscripciones push se eliminan al marcarse el envío como entregado/listo para recoger o si el endpoint vence. La suscripción por correo permanece activa hasta que la canceles; el registro de cancelación puede conservarse para dejar constancia de tu solicitud.",
    "privacy-providers-title": "Proveedores y comunicaciones",
    "privacy-providers-copy": "Usamos Supabase para la base de datos y funciones del sitio, Gmail para enviar avisos por correo y Cloudflare para recibir la dirección IP necesaria para limitar consultas automatizadas de rastreo. Para proteger el servicio, se conserva un HMAC de esa IP, no la dirección en texto claro; los registros de limitación antiguos se depuran periódicamente. Si nos contactas por WhatsApp, Meta procesa esa comunicación conforme a sus propias condiciones y aviso de privacidad. Estos proveedores pueden tratar datos en servidores fuera de Costa Rica.",
    "privacy-browser-title": "Almacenamiento en el navegador",
    "privacy-browser-copy": "El sitio guarda localmente tus preferencias de idioma y tema, y si ya respondiste a la invitación de notificaciones para un código. El código del sitio no integra una herramienta propia de analítica.",
    "privacy-retention-title": "Conservación y consultas",
    "privacy-retention-copy": "Los datos operativos se utilizan mientras el envío está en gestión y hasta su entrega. Marcar un pedido como entregado no elimina automáticamente su registro; los datos pueden conservarse después para atender consultas o reclamos, proteger el servicio o cumplir obligaciones legales. Puedes solicitar acceso, corrección o eliminación escribiendo a JL Express; atenderemos la solicitud conforme a la normativa aplicable y a las obligaciones de conservación. Para consultas sobre tus datos, utiliza también este contacto:",
    "terms-eyebrow": "TÉRMINOS Y CONDICIONES",
    "terms-title": "Uso del sitio y coordinación de envíos",
    "terms-intro": "Estos términos regulan el uso del sitio de JL Express (JLEXPRESS) para consultar el estado de pedidos y solicitar servicios de mensajería en Costa Rica. Los pedidos extra y sus condiciones se coordinan por WhatsApp.",
    "terms-service-title": "Servicio y responsabilidad",
    "terms-service-copy": "La gestión de JL Express comienza cuando el paquete está disponible para ser recogido por la empresa y es aceptado para su traslado. El servicio se presta hasta la entrega al destinatario o hasta que el paquete quede disponible para retiro, según lo coordinado. Si surge un problema, comunícate con soporte e indica el código de seguimiento para que podamos revisar el caso. La atención y responsabilidad se rigen por las condiciones confirmadas para cada servicio y la legislación aplicable en Costa Rica; estos términos no excluyen derechos ni responsabilidades que la ley no permita excluir.",
    "terms-quotes-title": "Tarifas y entrega",
    "terms-quotes-copy": "La disponibilidad, tarifa, destino, forma de entrega y plazo estimado de cada pedido extra se acuerdan por WhatsApp antes de confirmar la solicitud. No hay tarifas ni plazos generales publicados en el sitio. Sigue las instrucciones de entrega que JL Express confirme para tu pedido.",
    "terms-tracking-title": "Rastreo del pedido",
    "terms-tracking-copy": "Ingresa únicamente un código de seguimiento que estés autorizado a consultar y evita compartirlo públicamente. JL Express actualiza el estado del envío en el sistema; la información puede tardar en reflejar un cambio y no constituye por sí sola una confirmación de entrega.",
    "terms-push-title": "Avisos y uso permitido",
    "terms-push-copy": "Los avisos por correo y las notificaciones push son opcionales y requieren tu consentimiento. El correo debe confirmarse y puede cancelarse desde el mensaje; push depende del navegador, el dispositivo y la conexión, y puedes retirar el permiso desde su configuración. Para proteger el rastreo, se permiten hasta 20 consultas por minuto y por IP; los excesos pueden recibir una respuesta temporal HTTP 429.",
    "terms-rights-title": "Derechos y contacto",
    "terms-rights-copy": "Proporciona información correcta para coordinar la entrega y consulta únicamente códigos de seguimiento que estés autorizado a usar. Las notificaciones por correo y push son opcionales y requieren consentimiento; puedes cancelar el correo desde el mensaje o desactivar push en el navegador. Para dudas, reclamos o solicitudes sobre tus datos, contacta a soporte por WhatsApp o escribe a jlexpressturrialba@gmail.com. Estos términos se aplican sin perjuicio de los derechos que reconoce la normativa costarricense.",
    "legal-updated": "Actualizado: 23 de octubre de 2026.",
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
    "tracking-notify-copy": "Choose whether to receive status changes by email, as push notifications on this device, or both.",
    "tracking-notify-yes": "Yes, notify me",
    "tracking-notify-no": "Not now",
    "tracking-notify-submit": "Save preferences",
    "tracking-notify-activating": "Saving your preferences…",
    "tracking-notify-active": "Your notification preferences have been saved.",
    "tracking-notify-email-label": "Email address",
    "tracking-notify-email-placeholder": "name@example.com",
    "tracking-notify-email-consent": "I agree to receive emails when this shipment's status changes. I can cancel these updates from the email.",
    "tracking-notify-email-required": "Enter a valid email address and agree to receive email updates.",
    "tracking-notify-selection-required": "Select at least one notification method and accept its consent.",
    "tracking-notify-email-pending": "Check your inbox and confirm the subscription.",
    "tracking-notify-email-active": "This email is already subscribed to this shipment.",
    "tracking-notify-push-active": "Push notifications are enabled on this device.",
    "tracking-notify-consent": "I agree to receive push notifications on this device about this shipment's status changes. I can turn them off in my browser settings.",
    "tracking-notify-consent-required": "Accept push notifications to continue.",
    "tracking-notify-denied": "Permission was blocked. Change it in your browser's notification settings.",
    "tracking-notify-unsupported": "This browser does not support push notifications. Try another browser or device.",
    "tracking-notify-unconfigured": "Notifications are not configured yet. Please try again later.",
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
    "privacy-eyebrow": "PRIVACY NOTICE",
    "privacy-title": "How we handle your data",
    "privacy-intro": "JLEXPRESS (JL Express) is responsible for processing data handled through this site and its courier services in Costa Rica. For privacy questions, email jlexpressturrialba@gmail.com.",
    "privacy-data-title": "Data and purposes",
    "privacy-data-copy": "We process tracking codes and shipment statuses to locate and track shipments. To manage delivery, we may also process the name, phone number, and delivery address or location provided for the service. We use this information to organize operations, handle questions and claims, and keep shipment details current. Public tracking displays only the code, status, and update date.",
    "privacy-tracking-title": "Tracking and service protection",
    "privacy-tracking-copy": "When you track a shipment, the code is checked against shipment records stored in Supabase, our database provider. The public response shows the code, status, and last update. To limit automated queries, the system uses the IP address received from Cloudflare and stores an HMAC, not the IP address in plain text; the limit is 20 queries per minute.",
    "privacy-push-title": "Optional email and push updates",
    "privacy-push-copy": "Updates are optional. For email, we store the address, shipment code, and consent and confirmation dates; you must confirm the address and can unsubscribe using the message link. Emails are sent through Gmail. For push, we store the code, endpoint, and technical subscription keys for the device; the browser and its notification service participate in delivery. Push subscriptions are deleted when a shipment is marked delivered/ready for pickup or the endpoint expires. Email subscriptions remain active until you cancel them; cancellation records may be retained to document your request.",
    "privacy-providers-title": "Providers and communications",
    "privacy-providers-copy": "We use Supabase for the site's database and functions, Gmail to send email updates, and Cloudflare to receive the IP address needed to limit automated tracking queries. To protect the service, we retain an HMAC of that IP, not the address in plain text; old rate-limit records are periodically purged. If you contact us through WhatsApp, Meta processes that communication under its own terms and privacy notice. These providers may process data on servers outside Costa Rica.",
    "privacy-browser-title": "Browser storage",
    "privacy-browser-copy": "The site stores your language and theme preferences, and whether you have already responded to the push-notification prompt for a tracking code, in your browser's local storage. The site code does not include its own analytics tool.",
    "privacy-retention-title": "Retention and requests",
    "privacy-retention-copy": "Operational data is used while a shipment is being handled and until delivery. Marking an order as delivered does not automatically delete its record; data may be retained afterward to handle questions or claims, protect the service, or meet legal obligations. You may request access, correction, or deletion by emailing JL Express; requests will be handled under applicable law and retention obligations. You may also use this contact for privacy questions:",
    "terms-eyebrow": "TERMS AND CONDITIONS",
    "terms-title": "Using this site and coordinating shipments",
    "terms-intro": "These terms govern use of the JL Express (JLEXPRESS) website to check order status and request courier services in Costa Rica. Extra requests and their conditions are coordinated through WhatsApp.",
    "terms-service-title": "Service and responsibility",
    "terms-service-copy": "JL Express begins handling a package when it is available for collection by the company and accepted for transport. The service continues until delivery to the recipient or until the package is available for pickup, as coordinated. If a problem arises, contact support and provide the tracking code so we can review the case. Service handling and responsibility are governed by the conditions confirmed for each service and applicable Costa Rican law; these terms do not exclude rights or responsibilities that may not legally be excluded.",
    "terms-quotes-title": "Fees and delivery",
    "terms-quotes-copy": "Availability, fee, destination, delivery method, and estimated timeframe for each extra request are agreed through WhatsApp before the request is confirmed. The site does not publish general rates or timeframes. Follow the delivery instructions JL Express confirms for your order.",
    "terms-tracking-title": "Shipment tracking",
    "terms-tracking-copy": "Only enter a tracking code you are authorized to use, and avoid sharing it publicly. JL Express updates shipment status in the system; information may take time to reflect a change and is not, by itself, confirmation of delivery.",
    "terms-push-title": "Updates and acceptable use",
    "terms-push-copy": "Email and push updates are optional and require your consent. Email must be confirmed and can be canceled from the message; push depends on your browser, device, and connection, and you can withdraw permission in browser settings. To protect tracking, up to 20 queries per minute per IP are allowed; excess requests may receive a temporary HTTP 429 response.",
    "terms-rights-title": "Rights and contact",
    "terms-rights-copy": "Provide accurate information to coordinate delivery and only check tracking codes you are authorized to use. Email and push updates are optional and require consent; you can unsubscribe from the email or disable push in your browser. For questions, claims, or data requests, contact support through WhatsApp or email jlexpressturrialba@gmail.com. These terms apply without prejudice to rights under Costa Rican law.",
    "legal-updated": "Updated: October 23, 2026.",
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
  setText(".primary-link-label", "hero-link");
  setEyebrow(".company-info .eyebrow", "company-eyebrow");
  setText("#company-title", "company-title");
  setText(".company-info p", "company-description");
  setEyebrow(".temu-heading .eyebrow", "tracking-eyebrow");
  setHeadlineWithAccent(".temu-heading h1", "tracking-title-part-one", "tracking-title-part-two");
  setText(".temu-description", "tracking-description");
  setText("label[for='order-code']", "tracking-code-label");
  setText("#order-code", "tracking-code-placeholder", true);
  setText("#order-code-help", "tracking-code-help");
  setText("#tracking-notification-yes", "tracking-notify-yes");
  setText("#tracking-notification-no", "tracking-notify-no");
  setText("#tracking-notification-consent-copy", "tracking-notify-consent");
  setText("#tracking-notification-email-label", "tracking-notify-email-label");
  setText("#tracking-notification-email", "tracking-notify-email-placeholder", true);
  setText("#tracking-notification-email-consent-copy", "tracking-notify-email-consent");
  setEyebrow(".extra-copy .eyebrow", "service-more");
  setHeadlineWithAccent(".extra-copy h1", "service-more-title-part-one", "service-more-title-part-two");
  setText(".extra-description", "service-more-description");
  setText(".extra-whatsapp-label", "service-extra-request");
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
  document.querySelectorAll("[data-legal-text]").forEach((element) => {
    element.textContent = getText(element.dataset.legalText);
  });
  document.querySelectorAll(".contact-option-whatsapp-label").forEach((label) => {
    label.textContent = getText("contact-option-whatsapp");
  });
  document.querySelectorAll(".contact-option-call-label").forEach((label) => {
    label.textContent = getText("call-us");
  });
  document.querySelectorAll(".contact-option-email-label").forEach((label) => {
    label.textContent = getText("contact-option-email");
  });

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

const legalSectionIds = new Set(["avisos", "terminos"]);

function showLegalSectionFromHash() {
  const sectionId = window.location.hash.slice(1);
  if (!legalSectionIds.has(sectionId)) return;

  showInformation();
  const section = document.getElementById(sectionId);
  requestAnimationFrame(() => {
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.focus({ preventScroll: true });
  });
}

window.addEventListener("hashchange", showLegalSectionFromHash);
window.addEventListener("popstate", showLegalSectionFromHash);
for (const link of document.querySelectorAll(".footer-legal a[href^='#']")) {
  link.addEventListener("click", () => showInformation());
}
showLegalSectionFromHash();

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
const mobileTheme = window.matchMedia("(max-width: 620px)");

function syncThemePreference() {
  setDarkMode(mobileTheme.matches || themePreference === null
    ? systemTheme.matches
    : themePreference === "dark");
}

currentLanguage = getPreferredLanguage();
applyLanguage(currentLanguage);
syncThemePreference();
systemTheme.addEventListener("change", (event) => {
  if (mobileTheme.matches || themePreference === null) {
    setDarkMode(event.matches);
  }
});
mobileTheme.addEventListener("change", syncThemePreference);

themeToggle.addEventListener("click", () => {
  if (mobileTheme.matches) return;
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
const trackingStageTypes = ["packaging", "transit", "ready"];
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
    marker.className = `tracking-step-marker tracking-step-marker--${trackingStageTypes[index]}`;
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
    return window.localStorage.getItem(`ji-express-push-notifications:${trackingCode}`) === "done";
  } catch (error) {
    return false;
  }
}

function markNotificationHandled(trackingCode) {
  try {
    window.localStorage.setItem(`ji-express-push-notifications:${trackingCode}`, "done");
  } catch (error) {
    console.warn("No se pudo guardar la preferencia de notificaciones.", error);
  }
}

function showTrackingNotificationPrompt(trackingCode) {
  if (notificationWasHandled(trackingCode)) return;
  currentTrackingCode = trackingCode;
  trackingNotificationConsent.checked = false;
  trackingNotificationEmailConsent.checked = false;
  trackingNotificationEmail.value = "";
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
  trackingNotificationSubmit.focus();
});

document.querySelector("#tracking-notification-no").addEventListener("click", () => {
  markNotificationHandled(currentTrackingCode);
  trackingNotification.hidden = true;
});

trackingNotificationSubmit.addEventListener("click", async () => {
  if (!currentTrackingCode) return;

  trackingNotificationSubmit.disabled = true;
  trackingNotificationMessage.textContent = getText("tracking-notify-activating");
  try {
    if (!window.supabaseClient || typeof window.supabaseClient.functions?.invoke !== "function") {
      throw new Error(getText("tracking-notify-unavailable"));
    }

    const wantsEmail = trackingNotificationEmailConsent.checked;
    const wantsPush = trackingNotificationConsent.checked;
    if (!wantsEmail && !wantsPush) {
      throw new Error(getText("tracking-notify-selection-required"));
    }
    if (wantsEmail && (!trackingNotificationEmail.validity.valid || !trackingNotificationEmail.value.trim())) {
      trackingNotificationEmail.focus();
      throw new Error(getText("tracking-notify-email-required"));
    }

    const subscriptions = [];
    if (wantsPush) subscriptions.push({ method: "push", promise: subscribeToPushNotifications() });
    if (wantsEmail) subscriptions.push({ method: "email", promise: subscribeToEmailNotifications() });
    const results = await Promise.allSettled(subscriptions.map(({ promise }) => promise));
    const messages = results.map((result, index) => {
      if (result.status === "rejected") return result.reason?.message || "No se pudo guardar una preferencia.";
      return getText(subscriptions[index].method === "push" ? "tracking-notify-push-active" : result.value);
    });
    trackingNotificationMessage.textContent = messages.join(" ");

    if (results.every((result) => result.status === "fulfilled")) {
      markNotificationHandled(currentTrackingCode);
      trackingNotificationForm.hidden = true;
    }
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
    const isMissingFunction = /does not exist|function.*not found|manage-push-subscription/i.test(message);

    if (isMissingFunction) {
      trackingNotificationMessage.textContent = getText("tracking-notify-unavailable");
      return;
    }

    trackingNotificationMessage.textContent = message;
  } finally {
    trackingNotificationSubmit.disabled = false;
  }
});

async function subscribeToEmailNotifications() {
  const { data, error } = await window.supabaseClient.functions.invoke("manage-tracking-subscription", {
    body: {
      action: "subscribe",
      tracking_code: currentTrackingCode,
      email: trackingNotificationEmail.value.trim(),
      consent: true,
    },
  });
  if (error) throw error;
  return data?.status === "already_active" ? "tracking-notify-email-active" : "tracking-notify-email-pending";
}

async function subscribeToPushNotifications() {
  if (!window.Notification || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error(getText("tracking-notify-unsupported"));
  }

  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted") throw new Error(getText("tracking-notify-denied"));

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const applicationServerKey = decodeVapidPublicKey(VAPID_PUBLIC_KEY);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameApplicationServerKey(subscription.options.applicationServerKey, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const { error } = await window.supabaseClient.functions.invoke("manage-push-subscription", {
    body: {
      action: "subscribe",
      tracking_code: currentTrackingCode,
      consent: trackingNotificationConsent.checked,
      subscription: subscription.toJSON(),
    },
  });
  if (error) throw error;
}

function decodeVapidPublicKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function sameApplicationServerKey(currentKey, expectedKey) {
  if (!currentKey) return false;
  const currentBytes = new Uint8Array(currentKey);
  return currentBytes.length === expectedKey.length
    && currentBytes.every((byte, index) => byte === expectedKey[index]);
}

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

const linkedTrackingCode = new URLSearchParams(window.location.search).get("tracking");
if (linkedTrackingCode) {
  trackingInput.value = linkedTrackingCode;
  trackingForm.requestSubmit();
}
