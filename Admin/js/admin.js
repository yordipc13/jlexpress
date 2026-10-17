let orders = [];
let routePackages = [];
let companyThreeShipments = [];
const selectedOrderIds = new Set();
let orderSelectionMode = false;
let selectedOrderId = null;
let selectedRoutePackageTrackingCode = null;
let selectedCompanyThreeId = null;
let editingOrderId = null;
let editingRoutePackage = null;
let editingCompanyThreeId = null;
let routePackagePendingDelete = null;
let routePackageUpdateResolver = null;
let toastTimeout;
let databaseStatus = "Conectando con Supabase…";
let loadError = "";
let sortField = "id_excel";
let sortDirection = "asc";

const ordersBody = document.querySelector("#orders-body");
const tableViewport = document.querySelector(".table-viewport");
const tableScrollTop = document.querySelector("#table-scroll-top");
const tableScrollSpacer = document.querySelector("#table-scroll-spacer");
const ordersTable = tableViewport.querySelector("table");
const tableHeadRow = ordersTable.querySelector("thead tr");
const sortDirectionToggle = document.querySelector("#sort-direction-toggle");
const searchInput = document.querySelector("#order-search");
const viewSelect = document.querySelector("#order-view");
const historyTypeFilter = document.querySelector("#history-type-filter");
const historyTypeFilterWrap = document.querySelector("#history-type-filter-wrap");
const contextMenu = document.querySelector("#context-menu");
const contextBackdrop = document.querySelector("#context-backdrop");
const orderDialog = document.querySelector("#order-dialog");
const orderForm = document.querySelector("#order-form");
const routePackageDialog = document.querySelector("#route-package-dialog");
const routePackageForm = document.querySelector("#route-package-form");
const companyThreeDialog = document.querySelector("#empresa-3-dialog");
const companyThreeForm = document.querySelector("#empresa-3-form");
const routePackageDeleteDialog = document.querySelector("#route-package-delete-dialog");
const routePackageDeleteMessage = document.querySelector("#route-package-delete-message");
const routePackageDeleteError = document.querySelector("#route-package-delete-error");
const confirmRoutePackageDeleteButton = document.querySelector("#confirm-route-package-delete");
const routePackageUpdateDialog = document.querySelector("#route-package-update-dialog");
const routePackageUpdateMessage = document.querySelector("#route-package-update-message");
const routePackageUpdateList = document.querySelector("#route-package-update-list");
const excelFile = document.querySelector("#excel-file");
const authPanel = document.querySelector("#auth-panel");
const adminWorkspace = document.querySelector("#admin-workspace");
const loginForm = document.querySelector("#login-form");
const authMessage = document.querySelector("#auth-message");
const loginSubmit = document.querySelector("#login-submit");
const signOutButton = document.querySelector("#sign-out");
const refreshOrdersButton = document.querySelector("#refresh-orders");
const deleteSelectedOrdersButton = document.querySelector("#delete-selected-orders");
const bulkDeleteDialog = document.querySelector("#bulk-delete-dialog");
const bulkDeleteMessage = document.querySelector("#bulk-delete-message");
const bulkDeleteError = document.querySelector("#bulk-delete-error");
const confirmBulkDeleteButton = document.querySelector("#confirm-bulk-delete");
const clearOrderSelectionButton = document.querySelector("#clear-order-selection");
const tableHint = document.querySelector(".table-hint");
const debugClearOrdersButton = document.querySelector("#debug-clear-orders");
const addOrderButton = document.querySelector("#add-order");
const addOrderLabel = document.querySelector("#add-order-label");
const debugClearDialog = document.querySelector("#debug-clear-dialog");
const debugClearMessage = document.querySelector("#debug-clear-message");
const debugClearError = document.querySelector("#debug-clear-error");
const debugClearOptions = document.querySelector("#debug-clear-options");
const debugClearConfirmActions = document.querySelector("#debug-clear-confirm-actions");
const confirmDebugClearButton = document.querySelector("#confirm-debug-clear");
const themeToggle = document.querySelector("#theme-toggle");
const usersButton = document.querySelector("#show-admin-users");
const usersDialog = document.querySelector("#users-dialog");
const usersBody = document.querySelector("#admin-users-body");
const usersMessage = document.querySelector("#users-message");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
const toastActionButton = document.querySelector("#toast-action");
const adminErrorsButton = document.querySelector("#show-admin-errors");
const adminErrorCount = document.querySelector("#admin-error-count");
const adminErrorsDialog = document.querySelector("#admin-errors-dialog");
const adminErrorsEmpty = document.querySelector("#admin-errors-empty");
const adminErrorsList = document.querySelector("#admin-errors-list");
const adminErrors = [];
const customerUpdateDialog = document.querySelector("#customer-update-dialog");
const customerUpdateMessage = document.querySelector("#customer-update-message");
const customerUpdateList = document.querySelector("#customer-update-list");
let currentAdminUser = null;
let pendingClearCategory = null;
let pendingBulkDeleteIds = [];
let presenceInterval = null;
let usersRefreshInterval = null;
let presenceUpdateInProgress = false;
let presenceTrackingEnabled = false;
let toastAction = null;
let customerUpdateResolver = null;
const selectedSearchFields = new Set();
const ONLINE_WINDOW_MS = 90_000;
const PRESENCE_INTERVAL_MS = 30_000;
const ROUTE_PACKAGE_NO_COMPANY_PREFIX = "__paquete_sin_empresa__";
const ROUTE_LONG_PRESS_DURATION_MS = 550;
const ROUTE_LONG_PRESS_MOVE_THRESHOLD_PX = 12;

function renderAdminErrors() {
  const count = adminErrors.length;
  adminErrorCount.hidden = count === 0;
  adminErrorCount.textContent = String(count);
  adminErrorsButton.classList.toggle("has-errors", count > 0);
  adminErrorsButton.setAttribute("aria-label", count
    ? `Ver ${count} ${count === 1 ? "error" : "errores"}`
    : "Ver errores");
  adminErrorsEmpty.hidden = count > 0;
  adminErrorsList.replaceChildren();
  for (const entry of [...adminErrors].reverse()) {
    const item = document.createElement("li");
    const timestamp = document.createElement("time");
    timestamp.dateTime = entry.timestamp.toISOString();
    timestamp.textContent = entry.timestamp.toLocaleString("es");
    item.append(timestamp, document.createTextNode(entry.message));
    adminErrorsList.append(item);
  }
}

function reportAdminError(message) {
  const text = String(message ?? "").trim();
  if (!text) return;
  adminErrors.push({ message: text, timestamp: new Date() });
  renderAdminErrors();
}

adminErrorsButton.addEventListener("click", () => adminErrorsDialog.showModal());
document.querySelector("#close-admin-errors").addEventListener("click", () => adminErrorsDialog.close());
document.querySelector("#clear-admin-errors").addEventListener("click", () => {
  adminErrors.length = 0;
  renderAdminErrors();
});

window.addEventListener("error", (event) => {
  reportAdminError(event.message || "Ocurrió un error inesperado en la página de administración.");
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportAdminError(reason instanceof Error ? reason.message : String(reason ?? "Ocurrió un error inesperado."));
});
renderAdminErrors();

function updateTableScrollWidth() {
  tableScrollSpacer.style.width = `${ordersTable.scrollWidth}px`;
}

tableScrollTop.addEventListener("scroll", () => {
  if (tableViewport.scrollLeft !== tableScrollTop.scrollLeft) {
    tableViewport.scrollLeft = tableScrollTop.scrollLeft;
  }
});

tableViewport.addEventListener("scroll", () => {
  if (tableScrollTop.scrollLeft !== tableViewport.scrollLeft) {
    tableScrollTop.scrollLeft = tableViewport.scrollLeft;
  }
});

const tableScrollResizeObserver = new ResizeObserver(updateTableScrollWidth);
tableScrollResizeObserver.observe(tableViewport);
tableScrollResizeObserver.observe(ordersTable);
updateTableScrollWidth();

const ORDER_SEARCH_FIELDS = [
  "id",
  "id_excel",
  "id_paquete",
  "tracking_code",
  "cliente_nombre",
  "cliente_telefono",
  "total_a_pagar",
  "perfil",
  "ruta_id",
  "ruta_nombre",
  "ruta_estado",
  "ruta_fecha_inicio",
  "ruta_fecha_fin",
  "ruta_fecha_actualizacion",
  "direccion_entrega",
  "localidad",
  "estado",
  "fecha_creacion",
  "ultima_actualizacion",
  "notificacion_pendiente",
  "ubicacion",
  "almacen",
  "historial_tipo",
  "historial_estado",
  "historial_fecha_fin",
];

const ORDER_TABLE_COLUMNS = [
  ["id_excel", "ID Excel"],
  ["tracking_code", "Tracking code"],
  ["cliente_nombre", "Cliente"],
  ["cliente_telefono", "Teléfono"],
  ["direccion_entrega", "Dirección de entrega"],
  ["localidad", "Localidad"],
  ["estado", "Estado", (order) => formatOrderStatus(order.estado)],
  ["fecha_creacion", "Fecha de creación", (order) => formatTimestamp(order.fecha_creacion)],
  ["ultima_actualizacion", "Última actualización", (order) => formatTimestamp(order.ultima_actualizacion)],
  ["notificacion_pendiente", "Notificación pendiente"],
];

const ROUTE_TABLE_COLUMNS = [
  ["id_paquete", "ID paquete"],
  ["tracking_code", "Número de seguimiento", (routePackage) =>
    routePackage.tracking_code.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)
      ? "Sin número de empresa"
      : routePackage.tracking_code],
  ["cliente_nombre", "Cliente"],
  ["cliente_telefono", "Teléfono"],
  ["total_a_pagar", "Total a pagar"],
  ["perfil", "Perfil"],
  ["ruta_id", "ID ruta"],
  ["ruta_nombre", "Nombre de ruta"],
  ["ruta_estado", "Estado de ruta"],
  ["ruta_fecha_inicio", "Inicio de ruta"],
  ["ruta_fecha_fin", "Fin de ruta"],
  ["ruta_fecha_actualizacion", "Fecha de ruta"],
  ["ultima_actualizacion", "Última actualización", (order) => formatTimestamp(order.ultima_actualizacion)],
];

const COMPANY_THREE_TABLE_COLUMNS = [
  ["id", "ID"],
  ["cliente_nombre", "Nombre"],
  ["cliente_telefono", "Número"],
  ["tracking_code", "Guía"],
  ["ubicacion", "Ubicación"],
  ["almacen", "Almacén"],
  ["estado_envio", "Estado", (shipment) => formatOrderStatus(shipment.estado_envio)],
  ["fecha_creacion", "Fecha de creación", (shipment) => formatTimestamp(shipment.fecha_creacion)],
  ["ultima_actualizacion", "Última actualización", (shipment) => formatTimestamp(shipment.ultima_actualizacion)],
];

const HISTORY_TABLE_COLUMNS = [
  ["historial_tipo", "Tipo"],
  ["tracking_code", "Tracking code", (record) =>
    record.tracking_code.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)
      ? "Sin número de empresa"
      : record.tracking_code],
  ["cliente_nombre", "Cliente"],
  ["cliente_telefono", "Teléfono"],
  ["direccion_entrega", "Dirección / ubicación"],
  ["localidad", "Localidad / almacén"],
  ["historial_estado", "Estado"],
  ["ruta_nombre", "Ruta"],
  ["historial_fecha_fin", "Finalizado el", (record) => formatHistoryDate(record.historial_fecha_fin)],
  ["ultima_actualizacion", "Última actualización", (record) => formatTimestamp(record.ultima_actualizacion)],
];

function setDarkMode(enabled) {
  document.body.classList.toggle("dark-mode", enabled);
  themeToggle.setAttribute("aria-pressed", String(enabled));
  themeToggle.setAttribute("aria-label", enabled ? "Activar modo claro" : "Activar modo oscuro");
  themeToggle.querySelector(".theme-icon").textContent = enabled ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = enabled ? "Modo claro" : "Modo oscuro";
}

let savedTheme = null;
try {
  savedTheme = window.localStorage.getItem("ji-express-theme");
} catch (error) {
  console.warn("No se pudo leer la preferencia del tema guardada.", error);
  reportAdminError(`No se pudo leer la preferencia del tema guardada: ${error.message || "Error desconocido."}`);
}

let themePreference = savedTheme === "dark" || savedTheme === "light"
  ? savedTheme
  : null;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const mobileTheme = window.matchMedia("(max-width: 520px)");

function syncThemePreference() {
  setDarkMode(mobileTheme.matches || themePreference === null
    ? systemTheme.matches
    : themePreference === "dark");
}

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
    reportAdminError(`No se pudo guardar la preferencia del tema: ${error.message || "Error desconocido."}`);
  }
});

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function formatCount(count) {
  return `${count} ${count === 1 ? "envío" : "envíos"}`;
}

function createCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value === true ? "Sí" : value === false ? "No" : value ?? "";
  if (className) cell.className = className;
  return cell;
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-CR");
}

function formatRouteDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const dateParts = [value.getDate(), value.getMonth() + 1, value.getFullYear()];
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    const dateText = `${String(dateParts[0]).padStart(2, "0")}/${String(dateParts[1]).padStart(2, "0")}/${dateParts[2]}`;
    return hasTime
      ? `${dateText} ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${String(value.getSeconds()).padStart(2, "0")}`
      : dateText;
  }

  const text = String(value ?? "").trim();
  if (!text) return "";
  const isoMatch = text.match(/^([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})(?:[T\s]+([0-9]{1,2}):([0-9]{2})(?::([0-9]{2})(?:\.[0-9]+)?)?\s*(AM|PM)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?$/i);
  const localMatch = text.match(/^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{2,4})(?:[,\s]+([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?\s*(AM|PM)?)?$/i);
  const match = isoMatch ?? localMatch;
  if (!match) return text;

  const isIsoDate = match === isoMatch;
  const year = Number(isIsoDate ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(isIsoDate ? match[3] : match[1]);
  const normalizedYear = year < 100 ? year + (year >= 50 ? 1900 : 2000) : year;
  const validDate = new Date(Date.UTC(normalizedYear, month - 1, day));
  if (month < 1 || month > 12 || day < 1 || validDate.getUTCMonth() !== month - 1 || validDate.getUTCDate() !== day) {
    return text;
  }

  const dateText = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${normalizedYear}`;
  if (match[4] === undefined) return dateText;

  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const meridiem = String(match[7] ?? "").toUpperCase();
  if (minute > 59 || second > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return text;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour < 12) hour += 12;
  const timeText = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return match[6] === undefined
    ? `${dateText} ${timeText}`
    : `${dateText} ${timeText}:${String(second).padStart(2, "0")}`;
}

function mapDatabaseOrder(row) {
  return {
    id_excel: String(row.id_excel),
    id_paquete: row.id_paquete ?? "",
    tracking_code: row.tracking_code ?? "",
    cliente_nombre: row.cliente_nombre ?? "",
    cliente_telefono: row.cliente_telefono ?? "",
    total_a_pagar: row.total_a_pagar ?? "",
    perfil: row.perfil ?? "",
    ruta_id: row.ruta_id ?? "",
    ruta_nombre: row.ruta_nombre ?? "",
    ruta_estado: row.ruta_estado ?? "",
    ruta_fecha_inicio: row.ruta_fecha_inicio ?? "",
    ruta_fecha_fin: row.ruta_fecha_fin ?? "",
    ruta_fecha_actualizacion: row.ruta_fecha_actualizacion ?? "",
    direccion_entrega: row.direccion_entrega ?? "",
    localidad: row.locality ?? "",
    estado: row.estado_envio ?? "",
    fecha_creacion: row.fecha_creacion ?? "",
    ultima_actualizacion: row.ultima_actualizacion ?? "",
    notificacion_pendiente: row.notificacion_pendiente ?? false,
  };
}

function mapDatabaseRoutePackage(row) {
  return {
    id_paquete: row.id_paquete ?? "",
    tracking_code: row.tracking_code ?? "",
    cliente_nombre: row.cliente_nombre ?? "",
    cliente_telefono: row.cliente_telefono ?? "",
    total_a_pagar: row.total_a_pagar ?? "",
    perfil: row.perfil ?? "",
    ruta_id: row.ruta_id ?? "",
    ruta_nombre: row.ruta_nombre ?? "",
    ruta_estado: row.ruta_estado ?? "",
    ruta_fecha_inicio: row.ruta_fecha_inicio ?? "",
    ruta_fecha_fin: row.ruta_fecha_fin ?? "",
    ruta_fecha_actualizacion: row.ruta_fecha_actualizacion ?? "",
    estado: "",
    ultima_actualizacion: row.updated_at ?? "",
  };
}

function mapFormOrder(formData, currentStatus = "en sucursal") {
  return {
    tracking_code: String(formData.get("tracking_code")).trim(),
    cliente_nombre: String(formData.get("cliente_nombre")).trim(),
    cliente_telefono: String(formData.get("cliente_telefono")).trim(),
    direccion_entrega: String(formData.get("direccion_entrega")).trim(),
    locality: String(formData.get("localidad")).trim(),
    estado_envio: toDatabaseOrderStatus(currentStatus) || "en sucursal",
  };
}

async function importCompanyThreeRows(rows, headerRowIndex, normalizeHeader) {
  const headers = rows[headerRowIndex].map(normalizeHeader);
  const findHeaderIndex = (...aliases) => headers.findIndex((header) => aliases.includes(header));
  const columns = {
    cliente_nombre: findHeaderIndex("nombre", "nombredelcliente", "clientenombre"),
    cliente_telefono: findHeaderIndex("numero", "telefono", "celular", "phonenumber"),
    tracking_code: findHeaderIndex("guia", "numerodeguia", "trackingcode", "trackingnumber", "awb"),
    ubicacion: findHeaderIndex("ubicacion", "location"),
    almacen: findHeaderIndex("almacen", "warehouse"),
  };
  const existingTrackingCodes = new Set(companyThreeShipments.map((shipment) => normalize(shipment.tracking_code)));
  const seenTrackingCodes = new Set();
  const shipments = [];
  const skippedMissingTrackingRows = [];
  let duplicateRows = 0;

  for (const [rowIndex, row] of rows.slice(headerRowIndex + 1).entries()) {
    if (!row.some((value) => String(value).trim())) continue;
    const trackingCode = String(row[columns.tracking_code] ?? "").trim();
    if (!trackingCode) {
      skippedMissingTrackingRows.push(headerRowIndex + rowIndex + 2);
      continue;
    }

    const normalizedTrackingCode = normalize(trackingCode);
    if (existingTrackingCodes.has(normalizedTrackingCode) || seenTrackingCodes.has(normalizedTrackingCode)) {
      duplicateRows += 1;
      continue;
    }
    seenTrackingCodes.add(normalizedTrackingCode);
    shipments.push({
      tracking_code: trackingCode,
      cliente_nombre: String(row[columns.cliente_nombre] ?? "").trim(),
      cliente_telefono: String(row[columns.cliente_telefono] ?? "").trim(),
      ubicacion: String(row[columns.ubicacion] ?? "").trim(),
      almacen: String(row[columns.almacen] ?? "").trim(),
      estado_envio: "en sucursal",
    });
  }

  if (skippedMissingTrackingRows.length) {
    reportAdminError(
      `Importación de Excel de Xcargo: se omitieron ${skippedMissingTrackingRows.length} ` +
      `${skippedMissingTrackingRows.length === 1 ? "fila" : "filas"} sin guía ` +
      `(fila${skippedMissingTrackingRows.length === 1 ? "" : "s"} ${skippedMissingTrackingRows.join(", ")}).`,
    );
  }

  if (shipments.length) {
    const { data, error } = await window.supabaseClient
      .from("Xcargo")
      .insert(shipments)
      .select("*");
    if (error) throw error;
    if (data.length !== shipments.length) {
      throw new Error("Supabase no confirmó todos los envíos de Xcargo importados.");
    }
    companyThreeShipments = [...companyThreeShipments, ...data];
  }

  viewSelect.value = "empresa-3";
  searchInput.value = "";
  selectedCompanyThreeId = null;
  renderOrders();

  if (shipments.length || duplicateRows) {
    showToast([
      shipments.length
        ? `${shipments.length} ${shipments.length === 1 ? "envío de Xcargo importado" : "envíos de Xcargo importados"}`
        : "",
      duplicateRows
        ? `${duplicateRows} ${duplicateRows === 1 ? "guía duplicada omitida" : "guías duplicadas omitidas"}`
        : "",
    ].filter(Boolean).join("; ") + ".");
  }
}

const ORDER_STATUS_SEQUENCE = ["en sucursal", "en camino", "recibido"];
const ORDER_STATUS_LABELS = {
  "en sucursal": "En sucursal",
  empaquetando: "En sucursal",
  "en camino": "En camino",
  recibido: "Recibido",
  entregado: "Entregado",
  inactivo: "Inactivo",
  "en transito": "En camino",
  "listo para recoger": "Recibido",
};

function normalizeOrderStatus(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function isPhoneValue(value) {
  const text = String(value ?? "");
  const digits = text.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && !/[a-z]/i.test(text);
}

function formatOrderStatus(value) {
  const normalizedStatus = normalizeOrderStatus(value);
  return ORDER_STATUS_LABELS[normalizedStatus] ?? (normalizedStatus ? String(value) : "");
}

function toDatabaseOrderStatus(value) {
  const normalizedStatus = normalizeOrderStatus(value);
  if (normalizedStatus === "empaquetando") return "en sucursal";
  if (ORDER_STATUS_SEQUENCE.includes(normalizedStatus)) return normalizedStatus;
  if (normalizedStatus === "en transito") return "en camino";
  if (normalizedStatus === "listo para recoger") return "recibido";
  if (normalizedStatus === "entregado" || normalizedStatus === "inactivo") return normalizedStatus;
  return "";
}

function getNextOrderStatus(currentStatus) {
  const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
  const canonicalStatus = ORDER_STATUS_SEQUENCE.includes(normalizedCurrentStatus)
    ? normalizedCurrentStatus
    : normalizedCurrentStatus === "en transito" || normalizedCurrentStatus === "listo para recoger"
      ? normalizedCurrentStatus === "en transito" ? "en camino" : "recibido"
      : ORDER_STATUS_SEQUENCE[0];

  const index = ORDER_STATUS_SEQUENCE.indexOf(canonicalStatus);
  if (index === -1) {
    return ORDER_STATUS_SEQUENCE[0];
  }

  return ORDER_STATUS_SEQUENCE[Math.min(index + 1, ORDER_STATUS_SEQUENCE.length - 1)];
}

function isOrderInHistory(order) {
  return isShipmentStatusFinal(order.estado);
}

function isShipmentStatusFinal(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  return ["recibido", "listo para recoger", "entregado", "inactivo"].includes(normalizedStatus);
}

function isRoutePackageInHistory(routePackage) {
  const normalizedStatus = normalizeOrderStatus(routePackage.ruta_estado);
  return normalizedStatus === "inactivo" || normalizedStatus === "inactiva";
}

function formatHistoryDate(value) {
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(String(value ?? "").trim())) {
    return formatRouteDateTime(value);
  }
  return formatTimestamp(value);
}

function buildUnifiedHistory() {
  const orderByTracking = new Map(orders.map((order) => [normalize(order.tracking_code), order]));
  const routeByTracking = new Map(routePackages
    .filter((routePackage) => isRoutePackageInHistory(routePackage)
      && !routePackage.tracking_code.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX))
    .map((routePackage) => [normalize(routePackage.tracking_code), routePackage]));
  const includedOrderIds = new Set();
  const historyRows = [];

  for (const routePackage of routePackages) {
    if (!isRoutePackageInHistory(routePackage)) continue;
    const matchedOrder = !normalize(routePackage.tracking_code)
      || routePackage.tracking_code.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)
      ? null
      : orderByTracking.get(normalize(routePackage.tracking_code)) ?? null;
    const linkedOrder = matchedOrder && isOrderInHistory(matchedOrder) ? matchedOrder : null;
    if (linkedOrder) includedOrderIds.add(linkedOrder.id_excel);

    const historySources = linkedOrder ? ["envios", "ruta"] : ["ruta"];
    historyRows.push({
      ...(linkedOrder ?? {}),
      ...routePackage,
      tracking_code: routePackage.tracking_code.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)
        ? linkedOrder?.tracking_code ?? routePackage.tracking_code
        : routePackage.tracking_code,
      cliente_nombre: routePackage.cliente_nombre || linkedOrder?.cliente_nombre || "",
      cliente_telefono: routePackage.cliente_telefono || linkedOrder?.cliente_telefono || "",
      direccion_entrega: linkedOrder?.direccion_entrega ?? "",
      localidad: linkedOrder?.localidad ?? "",
      estado: linkedOrder?.estado ?? "",
      historial_tipo: linkedOrder ? "Envíos · Ruta" : "Ruta",
      historial_estado: routePackage.ruta_estado || linkedOrder?.estado || "Finalizado",
      historial_fecha_fin: routePackage.ruta_fecha_fin || linkedOrder?.ultima_actualizacion || routePackage.ultima_actualizacion,
      ultima_actualizacion: linkedOrder?.ultima_actualizacion || routePackage.ultima_actualizacion,
      historial_fuentes: historySources,
      historial_order_id: linkedOrder?.id_excel ?? "",
      historial_route_tracking_code: routePackage.tracking_code,
      historial_company_id: "",
    });
  }

  for (const order of orders) {
    if (!isOrderInHistory(order) || includedOrderIds.has(order.id_excel)) continue;
    const linkedRoute = routeByTracking.get(normalize(order.tracking_code));
    if (linkedRoute) includedOrderIds.add(order.id_excel);
    historyRows.push({
      ...order,
      ...(linkedRoute ?? {}),
      tracking_code: order.tracking_code,
      cliente_nombre: order.cliente_nombre || linkedRoute?.cliente_nombre || "",
      cliente_telefono: order.cliente_telefono || linkedRoute?.cliente_telefono || "",
      estado: order.estado,
      historial_tipo: linkedRoute ? "Envíos · Ruta" : "Envíos",
      historial_estado: formatOrderStatus(order.estado),
      historial_fecha_fin: order.ultima_actualizacion || order.fecha_creacion,
      ultima_actualizacion: order.ultima_actualizacion || linkedRoute?.ultima_actualizacion || "",
      historial_fuentes: linkedRoute ? ["envios", "ruta"] : ["envios"],
      historial_order_id: order.id_excel,
      historial_route_tracking_code: linkedRoute?.tracking_code ?? "",
      historial_company_id: "",
    });
  }

  for (const shipment of companyThreeShipments) {
    if (!isShipmentStatusFinal(shipment.estado_envio)) continue;
    historyRows.push({
      ...shipment,
      estado: shipment.estado_envio,
      localidad: shipment.almacen ?? "",
      direccion_entrega: shipment.ubicacion ?? "",
      historial_tipo: "Xcargo",
      historial_estado: formatOrderStatus(shipment.estado_envio),
      historial_fecha_fin: shipment.ultima_actualizacion || shipment.fecha_creacion,
      ultima_actualizacion: shipment.ultima_actualizacion ?? "",
      historial_fuentes: ["xcargo"],
      historial_order_id: "",
      historial_route_tracking_code: "",
      historial_company_id: String(shipment.id),
    });
  }

  return historyRows;
}

function hasRouteData(order) {
  return Boolean(
    order.id_paquete || order.total_a_pagar || order.perfil || order.ruta_id
      || order.ruta_nombre || order.ruta_estado || order.ruta_fecha_inicio
      || order.ruta_fecha_fin || order.ruta_fecha_actualizacion
  );
}

async function loadOrders() {
  databaseStatus = "Conectando con Supabase…";
  loadError = "";
  renderOrders();

  try {
    const [ordersResult, routePackagesResult, companyThreeResult] = await Promise.all([
      window.supabaseClient.from("envios").select("*").order("id_excel", { ascending: true }),
      window.supabaseClient.from("paquetes_ruta").select("*").order("id", { ascending: true }),
      window.supabaseClient.from("Xcargo").select("*").order("id", { ascending: true }),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (routePackagesResult.error) throw routePackagesResult.error;
    if (companyThreeResult.error) throw companyThreeResult.error;
    orders = ordersResult.data.map(mapDatabaseOrder);
    routePackages = routePackagesResult.data.map((row) => {
      const routePackage = mapDatabaseRoutePackage(row);
      const linkedOrder = orders.find((order) => normalize(order.tracking_code) === normalize(routePackage.tracking_code));
      return {
        ...routePackage,
        estado: linkedOrder?.estado ?? "",
        ultima_actualizacion: linkedOrder?.ultima_actualizacion ?? routePackage.ultima_actualizacion,
      };
    });
    companyThreeShipments = companyThreeResult.data;
    databaseStatus = "Conectado a Supabase";
    renderOrders();
    return true;
  } catch (error) {
    databaseStatus = "Error al cargar desde Supabase";
    loadError = error.message || "Error desconocido al cargar los envíos.";
    reportAdminError(`No se pudieron cargar los envíos: ${loadError}`);
    renderOrders();
    return false;
  }
}

refreshOrdersButton.addEventListener("click", async () => {
  refreshOrdersButton.disabled = true;
  refreshOrdersButton.setAttribute("aria-busy", "true");
  try {
    const refreshed = await loadOrders();
    if (refreshed) showToast("Tabla actualizada desde Supabase.");
  } finally {
    refreshOrdersButton.disabled = false;
    refreshOrdersButton.removeAttribute("aria-busy");
  }
});

deleteSelectedOrdersButton.addEventListener("click", () => {
  if (currentAdminUser?.app_metadata?.role !== "admin") {
    reportAdminError("Necesitas una sesión de administrador para borrar envíos.");
    return;
  }

  pendingBulkDeleteIds = [...selectedOrderIds];
  const numericIds = pendingBulkDeleteIds.map(Number);
  if (!pendingBulkDeleteIds.length || numericIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) return;

  bulkDeleteMessage.textContent = `Se eliminarán ${pendingBulkDeleteIds.length} ${pendingBulkDeleteIds.length === 1 ? "pedido" : "pedidos"} seleccionados. Esta acción no se puede deshacer.`;
  bulkDeleteError.textContent = "";
  bulkDeleteDialog.showModal();
  confirmBulkDeleteButton.focus();
});

document.querySelector("#close-bulk-delete").addEventListener("click", () => bulkDeleteDialog.close());
document.querySelector("#cancel-bulk-delete").addEventListener("click", () => bulkDeleteDialog.close());
bulkDeleteDialog.addEventListener("close", () => {
  pendingBulkDeleteIds = [];
  confirmBulkDeleteButton.disabled = false;
  bulkDeleteError.textContent = "";
});

confirmBulkDeleteButton.addEventListener("click", async () => {
  const selectedIds = [...pendingBulkDeleteIds];
  if (!selectedIds.length) return bulkDeleteDialog.close();
  if (currentAdminUser?.app_metadata?.role !== "admin") {
    bulkDeleteError.textContent = "Tu sesión de administrador ya no está activa.";
    return;
  }

  const numericIds = selectedIds.map(Number);
  confirmBulkDeleteButton.disabled = true;
  confirmBulkDeleteButton.setAttribute("aria-busy", "true");
  bulkDeleteError.textContent = "";
  try {
    const { data, error } = await window.supabaseClient.rpc(
      "borrar_envios_activos_y_sincronizar",
      { p_ids_excel: numericIds },
    );
    if (error) throw error;
    const deletedCount = Number(data);
    if (!Number.isSafeInteger(deletedCount) || deletedCount < 0 || deletedCount > selectedIds.length) {
      throw new Error("Supabase no confirmó cuántos envíos se borraron.");
    }

    const removedIds = new Set(selectedIds);
    orders = orders.filter((order) => !removedIds.has(String(order.id_excel)));
    selectedOrderIds.clear();
    orderSelectionMode = false;
    if (removedIds.has(String(selectedOrderId))) selectedOrderId = null;
    bulkDeleteDialog.close();
    renderOrders();
    showToast(deletedCount === selectedIds.length
      ? `Se borraron ${formatCount(deletedCount)} y se actualizó el contador.`
      : `Se borraron ${deletedCount} de ${selectedIds.length} pedidos seleccionados.`);
  } catch (error) {
    const message =
      `No se pudieron borrar los envíos seleccionados: ${error.message || "Error desconocido."} ` +
      "Verifica que hayas ejecutado Admin/supabase-envios-id-management.sql en el SQL Editor de Supabase.";
    bulkDeleteError.textContent = message;
    reportAdminError(message);
  } finally {
    confirmBulkDeleteButton.disabled = false;
    confirmBulkDeleteButton.removeAttribute("aria-busy");
    renderOrders();
  }
});

clearOrderSelectionButton.addEventListener("click", () => {
  selectedOrderIds.clear();
  orderSelectionMode = false;
  renderOrders();
  showToast("Selección cancelada.");
});

debugClearOrdersButton.addEventListener("click", () => {
  if (currentAdminUser?.app_metadata?.role !== "admin") {
    reportAdminError("Necesitas una sesión de administrador para borrar datos.");
    return;
  }

  pendingClearCategory = null;
  debugClearMessage.textContent = "Selecciona una categoría para continuar.";
  debugClearError.textContent = "";
  debugClearOptions.hidden = false;
  debugClearConfirmActions.hidden = true;
  debugClearDialog.showModal();
});

debugClearOptions.addEventListener("click", (event) => {
  const category = event.target.closest("[data-clear-category]")?.dataset.clearCategory;
  if (!category) return;

  pendingClearCategory = category;
  debugClearError.textContent = "";
  const count = category === "route"
    ? routePackages.length
    : category === "xcargo"
      ? companyThreeShipments.length
      : orders.filter((order) => !isOrderInHistory(order)).length;
  const label = category === "route"
    ? count === 1 ? "paquete de ruta" : "paquetes de ruta"
    : category === "xcargo"
      ? count === 1 ? "registro de Xcargo" : "registros de Xcargo"
      : count === 1 ? "envío activo" : "envíos activos";
  const impact = category === "route"
    ? "Los envíos y el historial se conservarán."
    : category === "xcargo"
      ? "Las demás tablas se conservarán."
      : "El historial y los datos de ruta se conservarán.";
  debugClearMessage.textContent = count
    ? `Se eliminarán ${count} ${label}. ${impact} Esta acción no se puede deshacer.`
    : `No hay ${label} para eliminar.`;
  debugClearOptions.hidden = true;
  debugClearConfirmActions.hidden = false;
  confirmDebugClearButton.disabled = count === 0;
  confirmDebugClearButton.focus();
});

document.querySelector("#close-debug-clear").addEventListener("click", () => debugClearDialog.close());
document.querySelector("#cancel-debug-clear").addEventListener("click", () => debugClearDialog.close());
debugClearDialog.addEventListener("close", () => {
  pendingClearCategory = null;
  debugClearOrdersButton.disabled = false;
  debugClearOrdersButton.removeAttribute("aria-busy");
  debugClearOptions.hidden = false;
  debugClearConfirmActions.hidden = true;
  confirmDebugClearButton.disabled = false;
});

confirmDebugClearButton.addEventListener("click", async () => {
  if (!pendingClearCategory) return debugClearDialog.close();

  debugClearOrdersButton.disabled = true;
  debugClearOrdersButton.setAttribute("aria-busy", "true");
  confirmDebugClearButton.disabled = true;
  debugClearError.textContent = "";
  try {
    let deletedCount;
    if (pendingClearCategory === "route") {
      const { data, error } = await window.supabaseClient
        .from("paquetes_ruta")
        .delete()
        .not("id", "is", null)
        .select("id");
      if (error) throw error;
      deletedCount = data.length;
      routePackages = [];
      viewSelect.value = "route-data";
      selectedRoutePackageTrackingCode = null;
    } else if (pendingClearCategory === "xcargo") {
      const { data, error } = await window.supabaseClient
        .from("Xcargo")
        .delete()
        .not("id", "is", null)
        .select("id");
      if (error) throw error;
      deletedCount = data.length;
      companyThreeShipments = [];
      viewSelect.value = "empresa-3";
      selectedCompanyThreeId = null;
    } else {
      const activeOrderIds = orders
        .filter((order) => !isOrderInHistory(order))
        .map((order) => Number(order.id_excel));
      const { data, error } = await window.supabaseClient.rpc(
        "borrar_envios_activos_y_sincronizar",
        { p_ids_excel: activeOrderIds },
      );
      if (error) throw error;
      deletedCount = Number(data);
      if (!Number.isSafeInteger(deletedCount) || deletedCount < 0) {
        throw new Error("Supabase no confirmó cuántos envíos se borraron.");
      }
      const removedIds = new Set(activeOrderIds.map(String));
      orders = orders.filter((order) => !removedIds.has(order.id_excel));
      viewSelect.value = "active";
      selectedOrderId = null;
    }

    searchInput.value = "";
    databaseStatus = "Conectado a Supabase";
    loadError = "";
    const deletedCategory = pendingClearCategory;
    pendingClearCategory = null;
    debugClearDialog.close();
    renderOrders();
    showToast(deletedCategory === "route"
      ? `Se borraron ${deletedCount} ${deletedCount === 1 ? "paquete de ruta" : "paquetes de ruta"}.`
      : deletedCategory === "xcargo"
        ? `Se borraron ${deletedCount} ${deletedCount === 1 ? "registro" : "registros"} de Xcargo.`
        : `Se borraron ${formatCount(deletedCount)} activos y se actualizó el contador.`);
  } catch (error) {
    debugClearError.textContent =
      `No se pudieron borrar los datos: ${error.message || "Error desconocido."}`;
    reportAdminError(debugClearError.textContent);
  } finally {
    debugClearOrdersButton.disabled = false;
    debugClearOrdersButton.removeAttribute("aria-busy");
    confirmDebugClearButton.disabled = !pendingClearCategory;
  }
});

function showLogin(message = "") {
  authPanel.hidden = false;
  adminWorkspace.hidden = true;
  signOutButton.hidden = true;
  authMessage.textContent = message;
  databaseStatus = "Inicia sesión para consultar los envíos";
  selectedOrderIds.clear();
  orderSelectionMode = false;
  orders = [];
  renderOrders();
}

async function startAdminSession(session) {
  if (session?.user?.app_metadata?.role !== "admin") {
    await window.supabaseClient.auth.signOut();
    const message = "Esta cuenta no tiene permisos de administración.";
    reportAdminError(message);
    showLogin(message);
    return;
  }

  authMessage.textContent = "";
  authPanel.hidden = true;
  adminWorkspace.hidden = false;
  signOutButton.hidden = false;
  usersButton.hidden = false;
  currentAdminUser = session.user;
  await loadOrders();
  try {
    await updateAdminPresence();
    await loadAdminUsers();
    presenceTrackingEnabled = true;
  } catch (error) {
    presenceTrackingEnabled = false;
    reportAdminError(`No se pudo registrar la presencia: ${error.message || "Revisa la tabla admin_presence y sus políticas."}`);
  }
  window.clearInterval(presenceInterval);
  presenceInterval = window.setInterval(() => {
    if (!presenceTrackingEnabled) return;
    updateAdminPresence().catch((error) => {
      presenceTrackingEnabled = false;
      reportAdminError(`No se pudo actualizar la presencia: ${error.message || "Error desconocido."}`);
    });
  }, PRESENCE_INTERVAL_MS);
  window.clearInterval(usersRefreshInterval);
  usersRefreshInterval = window.setInterval(() => {
    if (!usersDialog.open) return;
    loadAdminUsers().catch((error) => {
      usersMessage.textContent = `No se pudieron cargar los usuarios: ${error.message || "Error desconocido."}`;
      reportAdminError(usersMessage.textContent);
    });
  }, PRESENCE_INTERVAL_MS);
}

async function updateAdminPresence() {
  if (!currentAdminUser || presenceUpdateInProgress) return;
  presenceUpdateInProgress = true;
  try {
    const { error } = await window.supabaseClient
      .from("admin_presence")
      .upsert({
        user_id: currentAdminUser.id,
        email: currentAdminUser.email,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) throw error;
  } finally {
    presenceUpdateInProgress = false;
  }
}

async function loadAdminUsers() {
  usersMessage.textContent = "";
  const { data, error } = await window.supabaseClient
    .from("admin_presence")
    .select("user_id,email,last_seen_at")
    .order("email", { ascending: true });
  if (error) throw error;

  usersBody.replaceChildren();
  if (!data.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "users-empty";
    cell.textContent = "No hay usuarios permitidos. Revisa los roles admin y ejecuta la sincronización SQL.";
    row.append(cell);
    usersBody.append(row);
    return;
  }

  const now = Date.now();
  for (const user of data) {
    const isOnline = user.last_seen_at && now - new Date(user.last_seen_at).getTime() <= ONLINE_WINDOW_MS;
    const row = document.createElement("tr");
    const emailCell = document.createElement("td");
    emailCell.textContent = user.email;
    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `user-status${isOnline ? " is-online" : ""}`;
    status.textContent = isOnline ? "Conectado" : "Desconectado";
    statusCell.append(status);
    const lastSeenCell = document.createElement("td");
    lastSeenCell.textContent = user.last_seen_at
      ? formatTimestamp(user.last_seen_at)
      : "Sin conexión registrada";
    row.append(emailCell, statusCell, lastSeenCell);
    usersBody.append(row);
  }
}

usersButton.addEventListener("click", async () => {
  usersDialog.showModal();
  try {
    await loadAdminUsers();
  } catch (error) {
    usersMessage.textContent = `No se pudieron cargar los usuarios: ${error.message || "Error desconocido."}`;
    reportAdminError(usersMessage.textContent);
  }
});

document.querySelector("#close-users-dialog").addEventListener("click", () => usersDialog.close());
document.querySelector("#refresh-admin-users").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await loadAdminUsers();
  } catch (error) {
    usersMessage.textContent = `No se pudieron cargar los usuarios: ${error.message || "Error desconocido."}`;
    reportAdminError(usersMessage.textContent);
  } finally {
    button.disabled = false;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginSubmit.disabled = true;
  authMessage.textContent = "";
  const formData = new FormData(loginForm);

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: String(formData.get("email")).trim(),
      password: String(formData.get("password")),
    });
    if (error) throw error;
    await startAdminSession(data.session);
  } catch (error) {
    authMessage.textContent = error.message || "No se pudo iniciar sesión.";
    reportAdminError(authMessage.textContent);
  } finally {
    loginSubmit.disabled = false;
  }
});

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    window.clearInterval(presenceInterval);
    window.clearInterval(usersRefreshInterval);
    presenceInterval = null;
    usersRefreshInterval = null;
    presenceTrackingEnabled = false;
    currentAdminUser = null;
    usersDialog.close();
    usersButton.hidden = true;
    showLogin("Sesión cerrada.");
    loginForm.reset();
  } catch (error) {
    reportAdminError(`No se pudo cerrar la sesión: ${error.message || "Error desconocido."}`);
  } finally {
    signOutButton.disabled = false;
  }
});

function renderOrders() {
  const query = normalize(searchInput.value.trim());
  const availableOrderIds = new Set(orders.map((order) => String(order.id_excel)));
  for (const id of selectedOrderIds) {
    if (!availableOrderIds.has(id)) selectedOrderIds.delete(id);
  }
  const selectedView = viewSelect.value;
  const isHistoryView = selectedView === "history";
  historyTypeFilterWrap.hidden = !isHistoryView;
  ordersTable.classList.toggle("route-data-table", selectedView === "route-data");
  const isRouteView = selectedView === "route-data";
  const isCompanyThreeView = selectedView === "empresa-3";
  const canSelectOrders = !isRouteView && !isCompanyThreeView;
  const columns = isRouteView
    ? ROUTE_TABLE_COLUMNS
    : isCompanyThreeView
      ? COMPANY_THREE_TABLE_COLUMNS
      : isHistoryView ? HISTORY_TABLE_COLUMNS : ORDER_TABLE_COLUMNS;
  if (!columns.some(([field]) => field === sortField)) {
    sortField = columns[0][0];
    sortDirection = "asc";
  }

  tableHeadRow.replaceChildren(...columns.map(([field, label]) => {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.setAttribute("aria-sort", "none");
    const button = document.createElement("button");
    button.className = "sort-button";
    button.type = "button";
    button.dataset.sort = field;
    button.setAttribute("aria-pressed", "false");
    button.textContent = label;
    heading.append(button);
    return heading;
  }));

  const sourceRows = isRouteView
    ? routePackages
    : isCompanyThreeView
    ? companyThreeShipments.filter((shipment) => !isShipmentStatusFinal(shipment.estado_envio))
      : isHistoryView ? buildUnifiedHistory() : orders;
  const visibleOrders = sourceRows.filter((order) => {
    const matchesView = isHistoryView
      ? historyTypeFilter.value === "all" || order.historial_fuentes.includes(historyTypeFilter.value)
      : isRouteView || isCompanyThreeView || !isOrderInHistory(order);
    const matchesSearch = matchesOrderSearch(order, query);
    return matchesView && matchesSearch;
  }).sort(compareOrders);

  ordersBody.replaceChildren();
  for (const order of visibleOrders) {
    const row = document.createElement("tr");
    if (isHistoryView) {
      const preferredSource = historyTypeFilter.value === "ruta" && order.historial_fuentes.includes("ruta")
        ? "route-package"
        : order.historial_fuentes.includes("envios")
          ? "order"
          : order.historial_fuentes.includes("ruta")
            ? "route-package"
            : "empresa-3";
      row.dataset.historySource = preferredSource;
      if (order.historial_order_id) row.dataset.historyOrderId = order.historial_order_id;
      if (order.historial_order_id) row.dataset.orderId = String(order.historial_order_id);
      if (order.historial_route_tracking_code) {
        row.dataset.historyRouteTrackingCode = order.historial_route_tracking_code;
      }
      if (order.historial_company_id) row.dataset.historyCompanyId = order.historial_company_id;
      if (order.historial_order_id === selectedOrderId
        || order.historial_route_tracking_code === selectedRoutePackageTrackingCode
        || order.historial_company_id === selectedCompanyThreeId) {
        row.classList.add("is-selected");
      }
    } else if (isCompanyThreeView) {
      row.dataset.companyShipmentId = order.id;
      if (String(order.id) === selectedCompanyThreeId) row.classList.add("is-selected");
    } else if (!isRouteView) {
      row.dataset.orderId = order.id_excel;
      if (order.id_excel === selectedOrderId) row.classList.add("is-selected");
    } else {
      row.dataset.routePackageTrackingCode = order.tracking_code;
    }
    const rowOrderId = isHistoryView ? order.historial_order_id : isRouteView || isCompanyThreeView ? "" : order.id_excel;
    if (rowOrderId && selectedOrderIds.has(String(rowOrderId))) row.classList.add("is-bulk-selected");
    row.tabIndex = 0;
    row.setAttribute("aria-label", isHistoryView
      ? `${order.historial_tipo}: ${order.tracking_code} ${order.cliente_nombre}`
      : isCompanyThreeView
      ? `Paquete ${order.id}: ${order.tracking_code}`
      : isRouteView
        ? `Paquete ${order.id_paquete || order.tracking_code}`
        : `Envío ${order.id_excel}: ${order.tracking_code}`);
    row.append(...columns.map(([field, , format]) =>
      createCell(format ? format(order) : order[field])
    ));
    ordersBody.append(row);
  }

  deleteSelectedOrdersButton.hidden = !canSelectOrders || selectedOrderIds.size === 0;
  clearOrderSelectionButton.hidden = !orderSelectionMode;
  deleteSelectedOrdersButton.textContent = `Borrar seleccionados (${selectedOrderIds.size})`;
  ordersBody.classList.toggle("is-selecting", orderSelectionMode && canSelectOrders);
  tableHint.classList.toggle("is-selection-mode", orderSelectionMode && canSelectOrders);
  tableHint.textContent = orderSelectionMode && canSelectOrders
    ? "Toca filas para añadirlas o quitarlas de la selección"
    : "Clic derecho para seleccionar o ver acciones";

  document.querySelector("#result-count").textContent = isHistoryView
    ? `${visibleOrders.length} ${visibleOrders.length === 1 ? "registro" : "registros"}`
    : formatCount(visibleOrders.length);
  document.querySelector("#view-label").textContent = isRouteView
    ? "Datos de ruta"
    : isCompanyThreeView
      ? "Paquetes empresa 3"
      : isHistoryView ? "Historial unificado" : "Envíos activos";
  const emptyState = document.querySelector("#empty-state");
  emptyState.hidden = visibleOrders.length !== 0;
  document.querySelector("#empty-message").textContent = loadError
    ? `No se pudieron cargar los datos: ${loadError}`
    : query
      ? "Prueba con otro término."
      : isRouteView
        ? "No hay paquetes con datos de ruta importados."
        : isCompanyThreeView
          ? "No hay paquetes importados de esta empresa."
        : isHistoryView
          ? "No hay registros finalizados de este tipo."
          : "No hay envíos en esta vista.";
  document.querySelector("#table-summary").textContent = databaseStatus;
  updateSearchFieldIndicator();
  updateSortIndicators();
}

function compareOrders(left, right) {
  const leftValue = left[sortField];
  const rightValue = right[sortField];
  let result;

  if (sortField === "id_excel" || sortField === "id") {
    result = Number(leftValue) - Number(rightValue);
  } else if (sortField === "fecha_creacion" || sortField === "ultima_actualizacion"
    || sortField === "historial_fecha_fin") {
    const leftTime = leftValue ? new Date(leftValue).getTime() : Number.NEGATIVE_INFINITY;
    const rightTime = rightValue ? new Date(rightValue).getTime() : Number.NEGATIVE_INFINITY;
    result = leftTime - rightTime;
    if (Number.isNaN(result)) result = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "es", { numeric: true, sensitivity: "base" });
  } else if (typeof leftValue === "boolean" || typeof rightValue === "boolean") {
    result = Number(Boolean(leftValue)) - Number(Boolean(rightValue));
  } else {
    result = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "es", {
      numeric: true,
      sensitivity: "base",
    });
  }

  return sortDirection === "asc" ? result : -result;
}

function updateSortIndicators() {
  const sortedColumn = document.querySelector(`thead button[data-sort="${sortField}"]`).textContent.trim();
  const isAscending = sortDirection === "asc";
  sortDirectionToggle.textContent = isAscending ? "↑" : "↓";
  sortDirectionToggle.title = `Orden ${isAscending ? "ascendente" : "descendente"} por ${sortedColumn}`;
  sortDirectionToggle.setAttribute(
    "aria-label",
    `Orden ${isAscending ? "ascendente" : "descendente"} por ${sortedColumn}. Cambiar a orden ${isAscending ? "descendente" : "ascendente"}`,
  );

  for (const button of document.querySelectorAll("thead button[data-sort]")) {
    const header = button.closest("th");
    const isSorted = button.dataset.sort === sortField;
    header.setAttribute("aria-sort", isSorted
      ? sortDirection === "asc" ? "ascending" : "descending"
      : "none");
  }
}

sortDirectionToggle.addEventListener("click", () => {
  sortDirection = sortDirection === "asc" ? "desc" : "asc";
  renderOrders();
});

document.querySelector("thead").addEventListener("click", (event) => {
  const header = event.target.closest("th");
  const button = header?.querySelector("button[data-sort]");
  if (!button) return;

  const field = button.dataset.sort;
  if (selectedSearchFields.has(field)) {
    selectedSearchFields.delete(field);
  } else {
    selectedSearchFields.add(field);
  }
  updateSearchFieldIndicator();

  if (event.target.closest("button[data-sort]")) {
    if (button.dataset.sort === sortField) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = button.dataset.sort;
      sortDirection = "asc";
    }
  }
  renderOrders();
});

function matchesOrderSearch(order, query) {
  if (!query) return true;

  const fields = selectedSearchFields.size ? [...selectedSearchFields] : ORDER_SEARCH_FIELDS;
  const idQuery = query.match(/^id\s*(\d+)$/);
  if (idQuery && (fields.includes("id_excel") || fields.includes("id"))) {
    return normalize(order.id_excel ?? order.id) === idQuery[1];
  }

  return fields.some((field) => normalize(getOrderSearchValue(order, field)).includes(query));
}

function getOrderSearchValue(order, field) {
  if (field === "estado") return formatOrderStatus(order.estado);
  if (field === "fecha_creacion" || field === "ultima_actualizacion"
    || field === "historial_fecha_fin") {
    return formatTimestamp(order[field]);
  }
  if (field === "notificacion_pendiente") return order[field] ? "Sí" : "No";
  return order[field];
}

function updateSearchFieldIndicator() {
  const visibleSortFields = new Set(
    [...document.querySelectorAll("thead button[data-sort]")].map((button) => button.dataset.sort)
  );
  for (const field of selectedSearchFields) {
    if (!visibleSortFields.has(field)) selectedSearchFields.delete(field);
  }

  for (const button of document.querySelectorAll("thead button[data-sort]")) {
    const isActive = selectedSearchFields.has(button.dataset.sort);
    button.setAttribute("aria-pressed", String(isActive));
    button.closest("th").classList.toggle("is-search-field", isActive);
  }
  const selectedLabels = [...selectedSearchFields].map((field) =>
    document.querySelector(`thead button[data-sort="${field}"]`).textContent.trim()
  );
  const isGlobalSearch = selectedLabels.length === 0;
  const fieldLabel = selectedLabels.length > 2
    ? `${selectedLabels.length} columnas seleccionadas`
    : selectedLabels.join(" + ");
  searchInput.placeholder = isGlobalSearch
    ? "Buscar en todas las columnas..."
    : `Buscar en ${fieldLabel}...`;
  searchInput.setAttribute("aria-label", isGlobalSearch
    ? "Buscar envíos en todas las columnas"
    : `Buscar envíos en ${selectedLabels.join(", ")}`);
}

function closeContextMenu() {
  contextMenu.hidden = true;
  contextBackdrop.hidden = true;
}

function openContextMenu(row, x, y) {
  const isHistoryRow = viewSelect.value === "history";
  const historySource = isHistoryRow ? row.dataset.historySource : "";
  const isRoutePackage = viewSelect.value === "route-data" || historySource === "route-package";
  const isCompanyThree = viewSelect.value === "empresa-3" || historySource === "empresa-3";
  contextMenu.dataset.source = isRoutePackage
    ? "route-package"
    : isCompanyThree ? "empresa-3" : "order";
  selectedOrderId = isHistoryRow
    ? row.dataset.historyOrderId ?? null
    : isRoutePackage || isCompanyThree ? null : row.dataset.orderId;
  selectedRoutePackageTrackingCode = isHistoryRow
    ? row.dataset.historyRouteTrackingCode ?? null
    : isRoutePackage ? row.dataset.routePackageTrackingCode : null;
  selectedCompanyThreeId = isHistoryRow
    ? row.dataset.historyCompanyId ?? null
    : isCompanyThree ? row.dataset.companyShipmentId : null;
  renderOrders();
  const selectedOrder = orders.find((order) => order.id_excel === selectedOrderId);
  const isHistoryView = selectedOrder ? isOrderInHistory(selectedOrder) : false;
  const companyShipment = isCompanyThree
    ? companyThreeShipments.find((shipment) => String(shipment.id) === selectedCompanyThreeId)
    : null;
  const isCompanyThreeHistory = Boolean(companyShipment && isShipmentStatusFinal(companyShipment.estado_envio));
  const routePackage = isRoutePackage
    ? routePackages.find((item) => item.tracking_code === selectedRoutePackageTrackingCode)
    : null;
  const isRoutePackageHistory = Boolean(routePackage && isRoutePackageInHistory(routePackage));
  const isFinalRecord = isHistoryView || isCompanyThreeHistory || isRoutePackageHistory;
  contextMenu.querySelector('[data-action="edit"] .context-action-label').textContent = isRoutePackage
    ? "Actualizar datos de ruta"
    : isCompanyThree ? "Editar envío empresa 3" : "Editar envío";
  const selectOrderAction = contextMenu.querySelector('[data-action="select"]');
  selectOrderAction.hidden = isRoutePackage || isCompanyThree || !selectedOrderId;
  selectOrderAction.querySelector(".context-action-label").textContent = selectedOrderIds.has(String(selectedOrderId))
    ? "Quitar selección"
    : "Seleccionar pedido";
  contextMenu.querySelector('[data-action="delete"] .context-action-label').textContent = isRoutePackage
    ? "Eliminar paquete de ruta"
    : isCompanyThree ? "Borrar envío empresa 3" : "Borrar envío";
  contextMenu.querySelector('[data-action="finalize"] .context-action-label').textContent = isRoutePackage
    ? "Finalizar paquete de ruta"
    : isCompanyThree ? "Finalizar envío empresa 3" : "Finalizar pedido";
  contextMenu.querySelector('[data-action="reactivate"] .context-action-label').textContent = isRoutePackage
    ? "Reactivar paquete de ruta"
    : isCompanyThree ? "Reactivar envío empresa 3" : "Reactivar pedido";
  contextMenu.querySelector('[data-action="status"]').hidden = isFinalRecord;
  contextMenu.querySelector('[data-action="finalize"]').hidden = isFinalRecord;
  contextMenu.querySelector('[data-action="reactivate"]').hidden = !isFinalRecord;
  contextMenu.hidden = false;
  contextBackdrop.hidden = false;
  const menuWidth = 185;
  const menuHeight = contextMenu.offsetHeight;
  contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))}px`;
  contextMenu.querySelector("button").focus();
}

async function updateOrderStatus(order, nextStatus) {
  const { data, error } = await window.supabaseClient
    .from("envios")
    .update({
      estado_envio: nextStatus,
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq("id_excel", order.id_excel)
    .select("*")
    .single();

  if (error) throw error;

  const updatedOrder = mapDatabaseOrder(data);
  orders = orders.map((item) => item.id_excel === order.id_excel ? updatedOrder : item);
  viewSelect.value = isOrderInHistory(updatedOrder) ? "history" : "active";
  selectedOrderId = null;
  renderOrders();
  return updatedOrder;
}

async function updateCompanyThreeStatus(shipment, nextStatus) {
  const { data, error } = await window.supabaseClient
    .from("Xcargo")
    .update({
      estado_envio: nextStatus,
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq("id", shipment.id)
    .select("*")
    .single();

  if (error) throw error;
  companyThreeShipments = companyThreeShipments.map((item) =>
    item.id === shipment.id ? data : item
  );
  selectedCompanyThreeId = String(data.id);
  if (isShipmentStatusFinal(data.estado_envio)) {
    viewSelect.value = "history";
    historyTypeFilter.value = "xcargo";
  } else {
    viewSelect.value = "empresa-3";
  }
  renderOrders();
  return data;
}

async function updateRoutePackageStatus(routePackage, nextStatus) {
  const now = new Date();
  const isInactive = normalizeOrderStatus(nextStatus) === "inactivo";
  const { data, error } = await window.supabaseClient
    .from("paquetes_ruta")
    .update({
      ruta_estado: nextStatus,
      ruta_fecha_fin: isInactive ? formatRouteDateTime(now) : "",
      ruta_fecha_actualizacion: formatRouteDateTime(now),
      updated_at: now.toISOString(),
    })
    .eq("tracking_code", routePackage.tracking_code)
    .select("*")
    .single();

  if (error) throw error;
  const savedPackage = mapDatabaseRoutePackage(data);
  const linkedOrder = orders.find((order) =>
    normalize(order.tracking_code) === normalize(savedPackage.tracking_code)
  );
  const updatedRoutePackage = {
    ...savedPackage,
    estado: linkedOrder?.estado ?? "",
    ultima_actualizacion: linkedOrder?.ultima_actualizacion ?? savedPackage.ultima_actualizacion,
  };
  routePackages = routePackages.map((item) =>
    item.tracking_code === routePackage.tracking_code ? updatedRoutePackage : item
  );
  selectedRoutePackageTrackingCode = savedPackage.tracking_code;
  viewSelect.value = isRoutePackageInHistory(updatedRoutePackage) ? "history" : "route-data";
  if (viewSelect.value === "history") historyTypeFilter.value = "ruta";
  renderOrders();
  return updatedRoutePackage;
}

function showToast(message, action = null) {
  if (toastAction && !action) return;
  toastMessage.textContent = message;
  toastAction = action?.onClick ?? null;
  toastActionButton.hidden = !action;
  toastActionButton.textContent = action?.label ?? "";
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  if (!action) {
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }
}

document.addEventListener("dblclick", async (event) => {
  const cell = event.target.closest(
    ".table-viewport td, .table-viewport th, .users-table td, .users-table th"
  );
  if (!cell) return;

  const cellText = cell.innerText.trim();
  if (!cellText) return;

  try {
    await navigator.clipboard.writeText(cellText);
    showToast("Contenido copiado.");
  } catch (error) {
    reportAdminError(`No se pudo copiar el contenido: ${error.message || "Error desconocido."}`);
  }
});

toastActionButton.addEventListener("click", () => {
  const action = toastAction;
  toastAction = null;
  toast.classList.remove("is-visible");
  if (action) action();
});

function requestCustomerDataUpdate(entries, fieldLabels) {
  customerUpdateMessage.textContent = `Se detectaron cambios en los datos del Excel para ${formatCount(entries.length)}. ¿Quieres actualizarlos?`;
  customerUpdateList.replaceChildren();
  for (const update of entries.slice(0, 5)) {
    const item = document.createElement("li");
    item.className = "customer-update-order";
    const trackingCode = document.createElement("strong");
    trackingCode.className = "customer-update-tracking";
    trackingCode.textContent = update.order.tracking_code;
    const fields = document.createElement("dl");
    fields.className = "customer-update-fields";

    for (const [field, newValue] of Object.entries(update.customerChanges)) {
      const row = document.createElement("div");
      row.className = "customer-update-field";
      const label = document.createElement("dt");
      label.textContent = fieldLabels[field];
      const values = document.createElement("dd");
      const currentValue = field === "locality" ? update.order.localidad : update.order[field];
      const current = document.createElement("span");
      current.className = "customer-update-value";
      current.textContent = `Actual: ${String(currentValue ?? "").trim() || "(vacío)"}`;
      const proposed = document.createElement("span");
      proposed.className = "customer-update-value customer-update-value-new";
      proposed.textContent = `Nuevo: ${String(newValue ?? "").trim() || "(vacío)"}`;
      values.append(current, proposed);
      row.append(label, values);
      fields.append(row);
    }

    item.append(trackingCode, fields);
    customerUpdateList.append(item);
  }
  if (entries.length > 5) {
    const item = document.createElement("li");
    item.textContent = `Y ${formatCount(entries.length - 5)} más.`;
    customerUpdateList.append(item);
  }

  return new Promise((resolve) => {
    customerUpdateResolver = resolve;
    showToast("Hay datos del Excel diferentes a los registrados.", {
      label: "Revisar datos",
      onClick: () => customerUpdateDialog.showModal(),
    });
  });
}

function finishCustomerDataUpdate(shouldUpdate) {
  if (!customerUpdateResolver) return;
  const resolve = customerUpdateResolver;
  customerUpdateResolver = null;
  customerUpdateDialog.close();
  resolve(shouldUpdate);
}

customerUpdateDialog.addEventListener("close", () => {
  if (!customerUpdateResolver) return;
  const resolve = customerUpdateResolver;
  customerUpdateResolver = null;
  resolve(false);
});
document.querySelector("#close-customer-update").addEventListener("click", () => finishCustomerDataUpdate(false));
document.querySelector("#keep-customer-data").addEventListener("click", () => finishCustomerDataUpdate(false));
document.querySelector("#apply-customer-data").addEventListener("click", () => finishCustomerDataUpdate(true));
customerUpdateDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  finishCustomerDataUpdate(false);
});

function openOrderDialog(order = null) {
  closeContextMenu();
  editingOrderId = order?.id_excel ?? null;
  orderForm.reset();
  document.querySelector("#dialog-title").textContent = order ? "Editar envío" : "Agregar envío";
  document.querySelector("#field-id").value = order?.id_excel ?? "Se genera al guardar";
  document.querySelector("#field-tracking").value = order?.tracking_code ?? "";
  document.querySelector("#field-name").value = order?.cliente_nombre ?? "";
  document.querySelector("#field-phone").value = order?.cliente_telefono ?? "";
  document.querySelector("#field-address").value = order?.direccion_entrega ?? "";
  document.querySelector("#field-locality").value = order?.localidad ?? "";
  orderDialog.showModal();
  document.querySelector("#field-tracking").focus();
}

function openCompanyThreeDialog(shipment = null) {
  closeContextMenu();
  editingCompanyThreeId = shipment ? String(shipment.id) : null;
  companyThreeForm.reset();
  document.querySelector("#empresa-3-dialog-title").textContent = shipment
    ? "Editar envío empresa 3"
    : "Agregar envío empresa 3";
  document.querySelector("#empresa-3-field-id").value = shipment?.id ?? "Se genera al guardar";
  document.querySelector("#empresa-3-field-tracking").value = shipment?.tracking_code ?? "";
  document.querySelector("#empresa-3-field-name").value = shipment?.cliente_nombre ?? "";
  document.querySelector("#empresa-3-field-phone").value = shipment?.cliente_telefono ?? "";
  document.querySelector("#empresa-3-field-location").value = shipment?.ubicacion ?? "";
  document.querySelector("#empresa-3-field-warehouse").value = shipment?.almacen ?? "";
  document.querySelector("#empresa-3-field-status").value =
    toDatabaseOrderStatus(shipment?.estado_envio) || "en sucursal";
  companyThreeDialog.showModal();
  document.querySelector("#empresa-3-field-tracking").focus();
}

function openRoutePackageDialog(routePackage) {
  closeContextMenu();
  editingRoutePackage = routePackage;
  routePackageForm.reset();
  document.querySelector("#route-field-package-id").value = routePackage.id_paquete ?? "";
  document.querySelector("#route-field-company-number").value = routePackage.tracking_code.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)
    ? ""
    : routePackage.tracking_code;
  document.querySelector("#route-field-customer").value = routePackage.cliente_nombre ?? "";
  document.querySelector("#route-field-phone").value = routePackage.cliente_telefono ?? "";
  document.querySelector("#route-field-total").value = routePackage.total_a_pagar ?? "";
  document.querySelector("#route-field-profile").value = routePackage.perfil ?? "";
  document.querySelector("#route-field-route-id").value = routePackage.ruta_id ?? "";
  document.querySelector("#route-field-route-name").value = routePackage.ruta_nombre ?? "";
  document.querySelector("#route-field-route-status").value = routePackage.ruta_estado ?? "";
  document.querySelector("#route-field-start").value = routePackage.ruta_fecha_inicio ?? "";
  document.querySelector("#route-field-end").value = routePackage.ruta_fecha_fin ?? "";
  document.querySelector("#route-field-updated").value = routePackage.ruta_fecha_actualizacion ?? "";
  routePackageDialog.showModal();
  document.querySelector("#route-field-package-id").focus();
}

function requestRoutePackageUpdate(changes) {
  const fieldLabels = {
    id_paquete: "ID paquete",
    tracking_code: "Número de empresa",
    cliente_nombre: "Cliente",
    cliente_telefono: "Teléfono",
    total_a_pagar: "Total a pagar",
    perfil: "Perfil",
    ruta_id: "ID ruta",
    ruta_nombre: "Nombre de ruta",
    ruta_estado: "Estado de ruta",
    ruta_fecha_inicio: "Inicio de ruta",
    ruta_fecha_fin: "Fin de ruta",
    ruta_fecha_actualizacion: "Fecha de ruta",
  };
  routePackageUpdateMessage.textContent = `Se detectaron ${changes.length} campos diferentes. ¿Quieres guardar estos cambios?`;
  routePackageUpdateList.replaceChildren(...changes.map(([field, value]) => {
    const item = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = fieldLabels[field] ?? field;
    const newValue = document.createElement("span");
    newValue.textContent = `Nuevo valor: ${value || "(vacío)"}`;
    item.append(label, newValue);
    return item;
  }));

  return new Promise((resolve) => {
    routePackageUpdateResolver = resolve;
    routePackageUpdateDialog.showModal();
    document.querySelector("#confirm-route-package-update").focus();
  });
}

function requestRoutePackageImportUpdate(entries) {
  const fieldLabels = {
    id_paquete: "ID paquete",
    tracking_code: "Número de empresa",
    cliente_nombre: "Cliente",
    cliente_telefono: "Teléfono",
    total_a_pagar: "Total a pagar",
    perfil: "Perfil",
    ruta_id: "ID ruta",
    ruta_nombre: "Nombre de ruta",
    ruta_estado: "Estado de ruta",
    ruta_fecha_inicio: "Inicio de ruta",
    ruta_fecha_fin: "Fin de ruta",
    ruta_fecha_actualizacion: "Fecha de ruta",
  };
  const packageCountLabel = entries.length === 1 ? "1 paquete de ruta" : `${entries.length} paquetes de ruta`;
  routePackageUpdateMessage.textContent = `El Excel tiene datos diferentes para ${packageCountLabel}. Revisa los cambios antes de guardar.`;
  routePackageUpdateList.replaceChildren(...entries.slice(0, 5).map(({ routePackage, changes }) => {
    const item = document.createElement("li");
    const packageLabel = document.createElement("strong");
    packageLabel.textContent = `Paquete ${routePackage.id_paquete || routePackage.tracking_code}`;
    item.append(packageLabel);

    for (const [field, newValue] of Object.entries(changes)) {
      const change = document.createElement("span");
      const currentValue = String(routePackage[field] ?? "").trim() || "(vacío)";
      change.textContent = `${fieldLabels[field] ?? field}: Actual ${currentValue} → Nuevo ${newValue || "(vacío)"}`;
      item.append(change);
    }
    return item;
  }));
  if (entries.length > 5) {
    const more = document.createElement("li");
    more.textContent = `Y ${formatCount(entries.length - 5)} más; desplázate por la lista para revisarlos.`;
    routePackageUpdateList.append(more);
  }

  return new Promise((resolve) => {
    routePackageUpdateResolver = resolve;
    routePackageUpdateDialog.showModal();
    document.querySelector("#confirm-route-package-update").focus();
  });
}

function finishRoutePackageUpdate(shouldUpdate) {
  if (!routePackageUpdateResolver) return;
  const resolve = routePackageUpdateResolver;
  routePackageUpdateResolver = null;
  routePackageUpdateDialog.close();
  resolve(shouldUpdate);
}

addOrderButton.addEventListener("click", () => {
  if (viewSelect.value === "empresa-3") {
    openCompanyThreeDialog();
  } else {
    openOrderDialog();
  }
});
document.querySelector("#close-dialog").addEventListener("click", () => orderDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => orderDialog.close());
document.querySelector("#close-route-package-dialog").addEventListener("click", () => routePackageDialog.close());
document.querySelector("#cancel-route-package-dialog").addEventListener("click", () => routePackageDialog.close());
document.querySelector("#close-empresa-3-dialog").addEventListener("click", () => companyThreeDialog.close());
document.querySelector("#cancel-empresa-3-dialog").addEventListener("click", () => companyThreeDialog.close());
document.querySelector("#close-route-package-update").addEventListener("click", () => finishRoutePackageUpdate(false));
document.querySelector("#cancel-route-package-update").addEventListener("click", () => finishRoutePackageUpdate(false));
document.querySelector("#confirm-route-package-update").addEventListener("click", () => finishRoutePackageUpdate(true));
routePackageUpdateDialog.addEventListener("close", () => {
  if (!routePackageUpdateResolver) return;
  const resolve = routePackageUpdateResolver;
  routePackageUpdateResolver = null;
  resolve(false);
});

routePackageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingRoutePackage) return;

  const formData = new FormData(routePackageForm);
  const packageId = String(formData.get("id_paquete") ?? "").trim();
  const companyNumber = String(formData.get("tracking_code") ?? "").trim();
  if (!packageId && !companyNumber) {
    reportAdminError("Ingresa el ID de paquete o el número de empresa.");
    document.querySelector("#route-field-package-id").focus();
    return;
  }

  const payload = {
    id_paquete: packageId,
    tracking_code: companyNumber || `${ROUTE_PACKAGE_NO_COMPANY_PREFIX}${packageId}`,
    cliente_nombre: String(formData.get("cliente_nombre") ?? "").trim(),
    cliente_telefono: String(formData.get("cliente_telefono") ?? "").trim(),
    total_a_pagar: String(formData.get("total_a_pagar") ?? "").trim(),
    perfil: String(formData.get("perfil") ?? "").trim(),
    ruta_id: String(formData.get("ruta_id") ?? "").trim(),
    ruta_nombre: String(formData.get("ruta_nombre") ?? "").trim(),
    ruta_estado: String(formData.get("ruta_estado") ?? "").trim(),
    ruta_fecha_inicio: formatRouteDateTime(formData.get("ruta_fecha_inicio")),
    ruta_fecha_fin: formatRouteDateTime(formData.get("ruta_fecha_fin")),
    ruta_fecha_actualizacion: String(formData.get("ruta_fecha_actualizacion") ?? "").trim(),
    updated_at: new Date().toISOString(),
  };
  const changedFields = Object.entries(payload).filter(([field, value]) =>
    field !== "updated_at"
      && String(value ?? "").trim() !== String(editingRoutePackage[field] ?? "").trim()
  );
  if (!changedFields.length) {
    editingRoutePackage = null;
    routePackageDialog.close();
    showToast("No hay cambios; se conservaron los datos actuales.");
    return;
  }

  const saveButton = routePackageForm.querySelector('[type="submit"]');
  saveButton.disabled = true;

  try {
    const shouldUpdate = await requestRoutePackageUpdate(changedFields);
    if (!shouldUpdate) {
      editingRoutePackage = null;
      routePackageDialog.close();
      showToast("Actualización cancelada; no se guardaron cambios.");
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("paquetes_ruta")
      .update(payload)
      .eq("tracking_code", editingRoutePackage.tracking_code)
      .select("*")
      .single();
    if (error) throw error;

    const savedPackage = mapDatabaseRoutePackage(data);
    const linkedOrder = orders.find((order) => normalize(order.tracking_code) === normalize(savedPackage.tracking_code));
    routePackages = routePackages.map((routePackage) =>
      routePackage.tracking_code === editingRoutePackage.tracking_code
        ? {
            ...savedPackage,
            estado: linkedOrder?.estado ?? "",
            ultima_actualizacion: linkedOrder?.ultima_actualizacion ?? savedPackage.ultima_actualizacion,
          }
        : routePackage
    );
    selectedRoutePackageTrackingCode = savedPackage.tracking_code;
    editingRoutePackage = null;
    routePackageDialog.close();
    renderOrders();
    showToast("Datos de ruta actualizados.");
  } catch (error) {
    reportAdminError(`No se pudieron actualizar los datos de ruta: ${error.message || "Error desconocido."}`);
  } finally {
    saveButton.disabled = false;
  }
});

companyThreeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(companyThreeForm);
  const trackingCode = String(formData.get("tracking_code") ?? "").trim();
  const duplicateTracking = companyThreeShipments.some((shipment) =>
    shipment.tracking_code === trackingCode && String(shipment.id) !== editingCompanyThreeId
  );
  if (duplicateTracking) {
    reportAdminError("Ya existe un envío de empresa 3 con esa guía.");
    document.querySelector("#empresa-3-field-tracking").focus();
    return;
  }

  const payload = {
    tracking_code: trackingCode,
    cliente_nombre: String(formData.get("cliente_nombre") ?? "").trim(),
    cliente_telefono: String(formData.get("cliente_telefono") ?? "").trim(),
    ubicacion: String(formData.get("ubicacion") ?? "").trim(),
    almacen: String(formData.get("almacen") ?? "").trim(),
    estado_envio: toDatabaseOrderStatus(formData.get("estado_envio")) || "en sucursal",
  };
  const saveButton = companyThreeForm.querySelector('[type="submit"]');
  saveButton.disabled = true;

  try {
    let savedShipment;
    if (editingCompanyThreeId) {
      const { data, error } = await window.supabaseClient
        .from("Xcargo")
        .update({ ...payload, ultima_actualizacion: new Date().toISOString() })
        .eq("id", editingCompanyThreeId)
        .select("*")
        .single();
      if (error) throw error;
      savedShipment = data;
      companyThreeShipments = companyThreeShipments.map((shipment) =>
        String(shipment.id) === editingCompanyThreeId ? savedShipment : shipment
      );
      showToast("Envío de empresa 3 actualizado.");
    } else {
      const { data, error } = await window.supabaseClient
        .from("Xcargo")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      savedShipment = data;
      companyThreeShipments = [...companyThreeShipments, savedShipment];
      showToast("Envío de empresa 3 agregado.");
    }

    databaseStatus = "Conectado a Supabase";
    loadError = "";
    selectedCompanyThreeId = String(savedShipment.id);
    editingCompanyThreeId = null;
    if (isShipmentStatusFinal(savedShipment.estado_envio)) {
      viewSelect.value = "history";
      historyTypeFilter.value = "xcargo";
    } else {
      viewSelect.value = "empresa-3";
    }
    searchInput.value = "";
    companyThreeDialog.close();
    renderOrders();
  } catch (error) {
    reportAdminError(`No se pudo guardar el envío de empresa 3: ${error.message || "Error desconocido."}`);
  } finally {
    saveButton.disabled = false;
  }
});

searchInput.addEventListener("input", renderOrders);
historyTypeFilter.addEventListener("change", () => {
  selectedSearchFields.clear();
  renderOrders();
});
viewSelect.addEventListener("change", () => {
  selectedOrderId = null;
  selectedRoutePackageTrackingCode = null;
  selectedCompanyThreeId = null;
  selectedSearchFields.clear();
  addOrderLabel.textContent = viewSelect.value === "empresa-3"
    ? "Agregar envío empresa 3"
    : "Agregar envío";
  renderOrders();
});

let routeLongPressTimer = null;
let routeLongPressPointerId = null;
let routeLongPressOrigin = null;

ordersBody.addEventListener("click", (event) => {
  if (!orderSelectionMode || event.button !== 0) return;
  const row = event.target.closest("tr[data-order-id]");
  if (!row) return;
  const order = orders.find((item) => String(item.id_excel) === row.dataset.orderId);
  if (!order) return;

  const id = String(order.id_excel);
  if (selectedOrderIds.has(id)) selectedOrderIds.delete(id);
  else selectedOrderIds.add(id);
  renderOrders();
});

function cancelRouteLongPress() {
  if (routeLongPressTimer !== null) window.clearTimeout(routeLongPressTimer);
  routeLongPressTimer = null;
  routeLongPressPointerId = null;
  routeLongPressOrigin = null;
}

ordersBody.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") return;
  const row = event.target.closest("tr[data-order-id], tr[data-route-package-tracking-code], tr[data-company-shipment-id], tr[data-history-source]");
  if (!row) return;

  cancelRouteLongPress();
  routeLongPressPointerId = event.pointerId;
  routeLongPressOrigin = { row, x: event.clientX, y: event.clientY };
  routeLongPressTimer = window.setTimeout(() => {
    const origin = routeLongPressOrigin;
    cancelRouteLongPress();
    if (origin) openContextMenu(origin.row, origin.x, origin.y);
  }, ROUTE_LONG_PRESS_DURATION_MS);
});

document.addEventListener("pointermove", (event) => {
  if (event.pointerId !== routeLongPressPointerId || !routeLongPressOrigin) return;
  if (Math.hypot(event.clientX - routeLongPressOrigin.x, event.clientY - routeLongPressOrigin.y)
    > ROUTE_LONG_PRESS_MOVE_THRESHOLD_PX) {
    cancelRouteLongPress();
  }
});
document.addEventListener("pointerup", (event) => {
  if (event.pointerId === routeLongPressPointerId) cancelRouteLongPress();
});
document.addEventListener("pointercancel", (event) => {
  if (event.pointerId === routeLongPressPointerId) cancelRouteLongPress();
});

ordersBody.addEventListener("contextmenu", (event) => {
  const row = event.target.closest("tr[data-order-id], tr[data-route-package-tracking-code], tr[data-company-shipment-id], tr[data-history-source]");
  if (!row) return;
  event.preventDefault();
  cancelRouteLongPress();
  openContextMenu(row, event.clientX, event.clientY);
});

ordersBody.addEventListener("keydown", (event) => {
  const row = event.target.closest("tr[data-order-id], tr[data-route-package-tracking-code], tr[data-company-shipment-id], tr[data-history-source]");
  if (row && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
    event.preventDefault();
    const bounds = row.getBoundingClientRect();
    openContextMenu(row, bounds.left + 20, bounds.bottom);
  }
});

contextBackdrop.addEventListener("click", closeContextMenu);
contextBackdrop.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  closeContextMenu();
  const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
  const row = elementUnderPointer?.closest("tr[data-order-id], tr[data-route-package-tracking-code], tr[data-company-shipment-id], tr[data-history-source]");
  if (row) openContextMenu(row, event.clientX, event.clientY);
});
contextMenu.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (contextMenu.dataset.source === "empresa-3") {
    const shipment = companyThreeShipments.find((item) => String(item.id) === selectedCompanyThreeId);
    if (!shipment) return closeContextMenu();

    if (action === "edit") {
      openCompanyThreeDialog(shipment);
      return;
    }

    if (action === "status" || action === "finalize" || action === "reactivate") {
      closeContextMenu();
      try {
        const nextStatus = action === "status"
          ? getNextOrderStatus(shipment.estado_envio)
          : action === "finalize" ? "recibido" : "en sucursal";
        const updatedShipment = await updateCompanyThreeStatus(shipment, nextStatus);
        showToast(action === "finalize"
          ? "Pedido de Xcargo finalizado y movido al historial."
          : action === "reactivate"
            ? "Pedido de Xcargo reactivado y movido a activos."
            : `Estado actualizado: ${formatOrderStatus(updatedShipment.estado_envio)}`);
      } catch (error) {
        reportAdminError(`No se pudo cambiar el estado del envío de Xcargo: ${error.message || "Error desconocido."}`);
      }
      return;
    }

    if (action === "delete") {
      closeContextMenu();
      if (!window.confirm(`¿Borrar el envío ${shipment.tracking_code} de Paquetes empresa 3?`)) return;
      try {
        const { error } = await window.supabaseClient
          .from("Xcargo")
          .delete()
          .eq("id", shipment.id)
          .select("id")
          .single();
        if (error) throw error;
        companyThreeShipments = companyThreeShipments.filter((item) => item.id !== shipment.id);
        selectedCompanyThreeId = null;
        renderOrders();
        showToast("Envío de empresa 3 borrado.");
      } catch (error) {
        reportAdminError(`No se pudo borrar el envío de empresa 3: ${error.message || "Error desconocido."}`);
      }
    }
    return;
  }

  if (contextMenu.dataset.source === "route-package") {
    const routePackage = routePackages.find((item) => item.tracking_code === selectedRoutePackageTrackingCode);
    if (!routePackage) return closeContextMenu();

    if (action === "edit") {
      openRoutePackageDialog(routePackage);
      return;
    }

    if (action === "status" || action === "finalize" || action === "reactivate") {
      closeContextMenu();
      try {
        const nextStatus = action === "reactivate"
          ? "Activa"
          : action === "status" && isRoutePackageInHistory(routePackage)
            ? "Activa"
            : "Inactivo";
        const updatedRoutePackage = await updateRoutePackageStatus(routePackage, nextStatus);
        showToast(isRoutePackageInHistory(updatedRoutePackage)
          ? "Paquete de ruta finalizado y movido al historial."
          : "Paquete de ruta reactivado y movido a datos de ruta.");
      } catch (error) {
        reportAdminError(`No se pudo cambiar el estado del paquete de ruta: ${error.message || "Error desconocido."}`);
      }
      return;
    }

    if (action === "delete") {
      closeContextMenu();
      const packageLabel = routePackage.id_paquete || routePackage.tracking_code;
      routePackagePendingDelete = routePackage;
      routePackageDeleteMessage.textContent = `¿Realmente quieres eliminar el paquete de ruta ${packageLabel}? Esta acción no se puede deshacer.`;
      routePackageDeleteError.textContent = "";
      routePackageDeleteDialog.showModal();
      confirmRoutePackageDeleteButton.focus();
      return;
    }

    return;
  }

  const order = orders.find((item) => item.id_excel === selectedOrderId);
  if (!order) return closeContextMenu();

  if (action === "select") {
    const id = String(order.id_excel);
    if (selectedOrderIds.has(id)) selectedOrderIds.delete(id);
    else selectedOrderIds.add(id);
    orderSelectionMode = true;
    closeContextMenu();
    renderOrders();
    showToast(selectedOrderIds.has(id) ? "Pedido seleccionado." : "Pedido quitado de la selección.");
    return;
  }

  if (action === "edit") {
    closeContextMenu();
    openOrderDialog(order);
    return;
  }

  if (action === "status") {
    closeContextMenu();
    try {
      const nextStatus = getNextOrderStatus(order.estado);
      const updatedOrder = await updateOrderStatus(order, nextStatus);
      showToast(`Estado actualizado: ${formatOrderStatus(updatedOrder.estado)}`);
    } catch (error) {
      reportAdminError(`No se pudo cambiar el estado: ${error.message || "Error desconocido."}`);
    }
    return;
  }

  if (action === "finalize") {
    closeContextMenu();
    try {
      await updateOrderStatus(order, "recibido");
      showToast("Pedido finalizado y movido al historial.");
    } catch (error) {
      reportAdminError(`No se pudo finalizar el pedido: ${error.message || "Error desconocido."}`);
    }
    return;
  }

  if (action === "reactivate") {
    closeContextMenu();
    try {
      await updateOrderStatus(order, "en sucursal");
      showToast("Pedido reactivado y movido a envíos activos.");
    } catch (error) {
      reportAdminError(`No se pudo reactivar el pedido: ${error.message || "Error desconocido."}`);
    }
    return;
  }

  if (action === "delete") {
    closeContextMenu();
    if (window.confirm(`¿Borrar el envío ${order.tracking_code}?`)) {
      try {
        const { data, error } = await window.supabaseClient.rpc(
          "borrar_envio_y_sincronizar",
          { p_id_excel: order.id_excel },
        );
        if (error) throw error;
        if (Number(data) !== 1) throw new Error("No se encontró el envío para borrar.");
        orders = orders.filter((item) => item.id_excel !== order.id_excel);
        selectedOrderIds.delete(String(order.id_excel));
        selectedOrderId = null;
        renderOrders();
        showToast("Envío borrado y contador de IDs actualizado.");
      } catch (error) {
        reportAdminError(
          `No se pudo borrar el envío: ${error.message || "Error desconocido."} ` +
          "Verifica que hayas ejecutado Admin/supabase-envios-id-management.sql en el SQL Editor de Supabase.",
        );
      }
    }
  }
});

document.querySelector("#close-route-package-delete").addEventListener("click", () => routePackageDeleteDialog.close());
document.querySelector("#cancel-route-package-delete").addEventListener("click", () => routePackageDeleteDialog.close());
routePackageDeleteDialog.addEventListener("close", () => {
  routePackagePendingDelete = null;
  confirmRoutePackageDeleteButton.disabled = false;
});
confirmRoutePackageDeleteButton.addEventListener("click", async () => {
  const routePackage = routePackagePendingDelete;
  if (!routePackage) return routePackageDeleteDialog.close();

  confirmRoutePackageDeleteButton.disabled = true;
  routePackageDeleteError.textContent = "";
  try {
    const { error } = await window.supabaseClient
      .from("paquetes_ruta")
      .delete()
      .eq("tracking_code", routePackage.tracking_code)
      .select("id")
      .single();
    if (error) throw error;
    routePackages = routePackages.filter((item) => item.tracking_code !== routePackage.tracking_code);
    selectedRoutePackageTrackingCode = null;
    routePackagePendingDelete = null;
    routePackageDeleteDialog.close();
    renderOrders();
    showToast("Paquete de ruta eliminado.");
  } catch (error) {
    routePackageDeleteError.textContent = `No se pudo eliminar el paquete: ${error.message || "Error desconocido."}`;
    reportAdminError(routePackageDeleteError.textContent);
  } finally {
    confirmRoutePackageDeleteButton.disabled = false;
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(orderForm);
  const existingOrder = orders.find((order) => order.id_excel === editingOrderId);
  const trackingCode = String(formData.get("tracking_code")).trim();
  const duplicateTracking = orders.some((order) =>
    order.tracking_code === trackingCode && order.id_excel !== editingOrderId
  );
  if (duplicateTracking) {
    reportAdminError("Ya existe un envío con ese tracking code.");
    document.querySelector("#field-tracking").focus();
    return;
  }
  const payload = mapFormOrder(formData, existingOrder?.estado);
  const saveButton = orderForm.querySelector('[type="submit"]');
  saveButton.disabled = true;
  try {
    let savedOrder;
    if (existingOrder) {
      const { data, error } = await window.supabaseClient
        .from("envios")
        .update(payload)
        .eq("id_excel", existingOrder.id_excel)
        .select("*")
        .single();
      if (error) throw error;
      savedOrder = mapDatabaseOrder(data);
      orders = orders.map((order) => order.id_excel === editingOrderId ? savedOrder : order);
      showToast("Envío actualizado.");
    } else {
      const { data, error } = await window.supabaseClient
        .from("envios")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      savedOrder = mapDatabaseOrder(data);
      orders = [savedOrder, ...orders];
      showToast("Envío agregado.");
    }
    databaseStatus = "Conectado a Supabase";
    loadError = "";
    viewSelect.value = isOrderInHistory(savedOrder) ? "history" : "active";
    searchInput.value = "";
    selectedOrderId = savedOrder.id_excel;
    orderDialog.close();
    renderOrders();
  } catch (error) {
    reportAdminError(`No se pudo guardar el envío: ${error.message || "Error desconocido."}`);
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelector("#import-orders").addEventListener("click", () => excelFile.click());
excelFile.addEventListener("change", async () => {
  const file = excelFile.files?.[0];
  if (!file) return;
  try {
    if (!window.XLSX) throw new Error("No se pudo cargar el lector de Excel. Revisa tu conexión e inténtalo de nuevo.");
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    const fieldNames = [
      "id_excel",
      "tracking_code",
      "cliente_nombre",
      "cliente_telefono",
      "direccion_entrega",
      "localidad",
      "estado_envio",
    ];
    const headerAliases = {
      id_excel: ["id", "idexcel"],
      id_paquete: ["idpaquete", "paqueteid", "iddelpaquete", "packageid"],
      tracking_code: ["trackingcode", "tracking", "trackingnumber", "trackingno", "trackingid", "awb", "codigo", "codigotracking", "codigodeseguimiento", "codigoderastreo", "numerode", "numerodeseguimiento", "numeroderastreo", "numerodeguia", "numeroguia", "numerodeempresa", "numeroempresa", "guia", "rastreo"],
      cliente_nombre: ["clientenombre", "nombrecliente", "nombredel", "nombredelcliente", "nombrecompleto", "customername", "nombre"],
      cliente_telefono: ["clientetelefono", "telefonocliente", "customerphone", "phonenumber", "phone", "celular", "telefono"],
      direccion_entrega: ["direccionentrega", "direccion"],
      localidad: ["locality", "localidad"],
      estado_envio: ["estadoenvio", "estadodelenvio", "status", "estado"],
      total_a_pagar: ["totalapagar", "totalpagar", "montoapagar", "amountdue", "totalamount"],
      perfil: ["perfil", "profile"],
      ruta_id: ["idruta", "idderuta", "routeid", "rutaid"],
      ruta_nombre: ["nombrederuta", "nombredelaruta", "nombreruta", "rutanombre", "routename"],
      ruta_estado: ["estadoderuta", "estadoruta", "routestatus", "rutaestado"],
      ruta_fecha_inicio: ["fechadeinicio", "fechainicio", "fechainicioderuta", "fechainicioruta", "rutafechainicio", "startdate"],
      ruta_fecha_fin: ["fechadefin", "fechafin", "fechafinderuta", "rutafechafin", "enddate"],
      ruta_fecha_actualizacion: ["fechadeactualizacion", "fechaactualizacion", "fechadeactualizacionderuta", "fechaactualizacionruta", "fechadedescarga", "rutafechaactualizacion", "routeupdatedat"],
    };
    const normalizeHeader = (value) => normalize(value).replace(/[^a-z0-9]/g, "");
    const companyThreeHeaderAliases = [
      ["nombre", "nombredelcliente", "clientenombre"],
      ["numero", "telefono", "celular", "phonenumber"],
      ["guia", "numerodeguia", "trackingcode", "trackingnumber", "awb"],
      ["ubicacion", "location"],
      ["almacen", "warehouse"],
    ];
    const companyThreeHeaderRowIndex = rows.slice(0, 30).findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return companyThreeHeaderAliases.every((aliases) =>
        headers.some((header) => aliases.includes(header))
      );
    });
    if (companyThreeHeaderRowIndex >= 0) {
      await importCompanyThreeRows(rows, companyThreeHeaderRowIndex, normalizeHeader);
      return;
    }

    const headerRowIndex = rows.slice(0, 30).findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return headers.some((header) => headerAliases.tracking_code.includes(header))
        && headers.filter((header) => Object.values(headerAliases).some((aliases) => aliases.includes(header))).length >= 2;
    });
    const hasHeaders = headerRowIndex >= 0;
    const normalizedHeaders = hasHeaders ? rows[headerRowIndex].map(normalizeHeader) : [];
    const dataRows = hasHeaders ? rows.slice(headerRowIndex + 1) : rows;
    const columnByField = Object.fromEntries(Object.entries(headerAliases).map(([field, aliases]) => [
      field,
      normalizedHeaders.findIndex((header) => aliases.includes(header)),
    ]));
    const hasRouteHeaders = hasHeaders && [
      "id_paquete",
      "total_a_pagar",
      "perfil",
      "ruta_id",
      "ruta_nombre",
      "ruta_fecha_inicio",
      "ruta_fecha_fin",
      "ruta_fecha_actualizacion",
    ].some((field) => columnByField[field] >= 0);
    const explicitRouteStatusIndex = normalizedHeaders.findIndex((header) =>
      headerAliases.ruta_estado.includes(header)
    );
    if (hasRouteHeaders && explicitRouteStatusIndex < 0 && columnByField.estado_envio >= 0
      && normalizedHeaders[columnByField.estado_envio] === "estado") {
      columnByField.ruta_estado = columnByField.estado_envio;
      columnByField.estado_envio = -1;
    }
    const routeMetadata = {
      ruta_id: "",
      ruta_nombre: "",
      ruta_estado: "",
      ruta_fecha_inicio: "",
      ruta_fecha_fin: "",
      ruta_fecha_actualizacion: "",
    };
    const routeMetadataAliases = {
      ruta_id: ["idruta", "idderuta", "routeid"],
      ruta_nombre: ["nombrederuta", "nombredelaruta", "rutanombre", "routename"],
      ruta_estado: ["estado", "estadoderuta", "estadoruta", "routestatus"],
      ruta_fecha_inicio: ["fechadeinicio", "fechainicio", "startdate"],
      ruta_fecha_fin: ["fechadefin", "fechafin", "enddate"],
      ruta_fecha_actualizacion: ["fechade", "fecha", "fechadedescarga", "routeupdatedat", "fechaactualizacion"],
    };
    if (hasHeaders) {
      for (const row of rows.slice(0, headerRowIndex)) {
        for (let index = 0; index < row.length - 1; index += 1) {
          const key = normalizeHeader(row[index]);
          const metadataField = Object.entries(routeMetadataAliases).find(([, aliases]) => aliases.includes(key))?.[0];
          if (metadataField && String(row[index + 1] ?? "").trim()) {
            const metadataValue = row[index + 1];
            routeMetadata[metadataField] = metadataField === "ruta_fecha_inicio" || metadataField === "ruta_fecha_fin"
              ? formatRouteDateTime(metadataValue)
              : String(metadataValue).trim();
          }
        }
      }
    }
    const maxColumnCount = dataRows.reduce((max, row) => Math.max(max, row.length), 0);
    const detectedColumnIndexes = Array.from({ length: maxColumnCount }, (_, index) => index)
      .filter((index) => dataRows.some((row) => String(row[index] ?? "").trim()));
    const columnIndexes = hasHeaders
      ? fieldNames.map((field, index) => columnByField[field] < 0 ? index : columnByField[field])
      : detectedColumnIndexes.slice(0, fieldNames.length);
    const imported = [];
    const importedRoutePackages = [];
    const existingOrdersByTracking = new Map(orders.map((order) => [normalize(order.tracking_code), order]));
    const usedTrackingCodes = new Set();
    const statusUpdates = new Map();
    const skippedMissingTrackingRows = [];
    let duplicateRows = 0;
    for (const [rowIndex, row] of dataRows.entries()) {
      if (!row.some((value) => String(value).trim())) continue;
      const values = hasHeaders
        ? columnIndexes.map((index) => row[index] ?? "")
        : detectedColumnIndexes.map((index) => row[index] ?? "");
      const phoneIndex = hasHeaders ? 3 : values.findIndex(isPhoneValue);
      const hasLeadingId = !hasHeaders
        && /^\d+$/.test(String(values[0] ?? "").trim())
        && phoneIndex >= 3;
      const idIndex = hasLeadingId ? 0 : -1;
      const knownStatusIndex = hasHeaders
        ? 6
        : values.findIndex((value, index) => index !== idIndex
          && ORDER_STATUS_LABELS[normalizeOrderStatus(value)] !== undefined);
      const statusIndex = hasHeaders ? 6 : knownStatusIndex;
      const existingTrackingIndex = hasHeaders
        ? 1
        : values.findIndex((value) => existingOrdersByTracking.has(normalize(value)));
      const likelyTrackingIndex = hasHeaders
        ? 1
        : values.findIndex((value, index) => index !== idIndex
          && index !== phoneIndex
          && index !== statusIndex
          && /^[a-z0-9_-]{5,}$/i.test(String(value).trim())
          && /\d/.test(String(value)));
      const trackingIndex = existingTrackingIndex >= 0
        ? existingTrackingIndex
        : likelyTrackingIndex >= 0 ? likelyTrackingIndex : hasLeadingId ? 1 : hasHeaders ? 1 : 0;
      const rawTrackingCode = String(values[trackingIndex] ?? "").trim();
      const packageId = hasHeaders ? String(row[columnByField.id_paquete] ?? "").trim() : "";
      const footerText = normalizeHeader(row.join(" "));
      if (hasRouteHeaders && (footerText.includes("zonemoversignature")
        || footerText.includes("deliverypersonnel"))) continue;
      if (!rawTrackingCode && !(hasRouteHeaders && packageId)) {
        skippedMissingTrackingRows.push(hasHeaders ? headerRowIndex + rowIndex + 2 : rowIndex + 1);
        continue;
      }
      const trackingCode = rawTrackingCode || `__paquete_sin_empresa__${packageId}`;
      const normalizedTrackingCode = normalize(trackingCode);
      const importedStatus = hasHeaders
        ? columnByField.estado_envio >= 0 ? String(row[columnByField.estado_envio] ?? "").trim() : ""
        : statusIndex >= 0 ? String(values[statusIndex] ?? "").trim() : "";
      const databaseStatusValue = importedStatus ? toDatabaseOrderStatus(importedStatus) : "";
      if (importedStatus && !databaseStatusValue) {
        throw new Error(`El estado "${importedStatus}" no es válido. Usa En sucursal, En camino o Recibido.`);
      }
      const existingOrder = existingOrdersByTracking.get(normalizedTrackingCode);

      let importedOrder;
      if (hasHeaders) {
        importedOrder = {
          tracking_code: trackingCode,
          cliente_nombre: String(row[columnByField.cliente_nombre] ?? "").trim(),
          cliente_telefono: String(row[columnByField.cliente_telefono] ?? "").trim(),
          direccion_entrega: String(row[columnByField.direccion_entrega] ?? "").trim(),
          locality: String(row[columnByField.localidad] ?? "").trim(),
          id_paquete: String(row[columnByField.id_paquete] ?? "").trim(),
          total_a_pagar: String(row[columnByField.total_a_pagar] ?? "").trim(),
          perfil: String(row[columnByField.perfil] ?? "").trim(),
          ...routeMetadata,
          ruta_id: String(row[columnByField.ruta_id] ?? "").trim() || routeMetadata.ruta_id,
          ruta_nombre: String(row[columnByField.ruta_nombre] ?? "").trim() || routeMetadata.ruta_nombre,
          ruta_estado: String(row[columnByField.ruta_estado] ?? "").trim() || routeMetadata.ruta_estado,
          ruta_fecha_inicio: formatRouteDateTime(row[columnByField.ruta_fecha_inicio]) || routeMetadata.ruta_fecha_inicio,
          ruta_fecha_fin: formatRouteDateTime(row[columnByField.ruta_fecha_fin]) || routeMetadata.ruta_fecha_fin,
          ruta_fecha_actualizacion: String(row[columnByField.ruta_fecha_actualizacion] ?? "").trim() || routeMetadata.ruta_fecha_actualizacion,
        };
      } else {
        const reservedIndexes = new Set([idIndex, trackingIndex, phoneIndex, statusIndex]);
        const otherValues = values.filter((_, index) =>
          !reservedIndexes.has(index) && String(values[index]).trim()
        );
        importedOrder = {
          tracking_code: trackingCode,
          cliente_nombre: String(otherValues[0] ?? "").trim(),
          cliente_telefono: String(values[phoneIndex >= 0 ? phoneIndex : hasLeadingId ? 3 : 2] ?? "").trim(),
          direccion_entrega: String(otherValues[1] ?? "").trim(),
          locality: String(otherValues[2] ?? "").trim(),
        };
      }
      importedOrder.estado_envio = databaseStatusValue || "en sucursal";

      if (hasRouteData(importedOrder)) {
        importedRoutePackages.push({
          id_paquete: importedOrder.id_paquete,
          tracking_code: importedOrder.tracking_code,
          cliente_nombre: importedOrder.cliente_nombre,
          cliente_telefono: importedOrder.cliente_telefono,
          total_a_pagar: importedOrder.total_a_pagar,
          perfil: importedOrder.perfil,
          ruta_id: importedOrder.ruta_id,
          ruta_nombre: importedOrder.ruta_nombre,
          ruta_estado: importedOrder.ruta_estado,
          ruta_fecha_inicio: importedOrder.ruta_fecha_inicio,
          ruta_fecha_fin: importedOrder.ruta_fecha_fin,
          ruta_fecha_actualizacion: importedOrder.ruta_fecha_actualizacion,
        });
        continue;
      }

      if (existingOrder) {
        duplicateRows += 1;
        const pendingUpdate = statusUpdates.get(existingOrder.id_excel) ?? {
          order: existingOrder,
          customerChanges: {},
        };
        if (databaseStatusValue) {
          if (normalizeOrderStatus(databaseStatusValue) !== normalizeOrderStatus(existingOrder.estado)) {
            pendingUpdate.estado_envio = databaseStatusValue;
          } else {
            delete pendingUpdate.estado_envio;
          }
        }

        const customerFields = [
          ["cliente_nombre", existingOrder.cliente_nombre, importedOrder.cliente_nombre],
          ["cliente_telefono", existingOrder.cliente_telefono, importedOrder.cliente_telefono],
          ["id_paquete", existingOrder.id_paquete, importedOrder.id_paquete],
          ["total_a_pagar", existingOrder.total_a_pagar, importedOrder.total_a_pagar],
          ["perfil", existingOrder.perfil, importedOrder.perfil],
          ["ruta_id", existingOrder.ruta_id, importedOrder.ruta_id],
          ["ruta_nombre", existingOrder.ruta_nombre, importedOrder.ruta_nombre],
          ["ruta_estado", existingOrder.ruta_estado, importedOrder.ruta_estado],
          ["ruta_fecha_inicio", existingOrder.ruta_fecha_inicio, importedOrder.ruta_fecha_inicio],
          ["ruta_fecha_fin", existingOrder.ruta_fecha_fin, importedOrder.ruta_fecha_fin],
          ["ruta_fecha_actualizacion", existingOrder.ruta_fecha_actualizacion, importedOrder.ruta_fecha_actualizacion],
          ["direccion_entrega", existingOrder.direccion_entrega, importedOrder.direccion_entrega],
          ["locality", existingOrder.localidad, importedOrder.locality],
        ];
        for (const [field, currentValue, importedValue] of customerFields) {
          if (!importedValue) continue;
          if (importedValue.trim() !== String(currentValue ?? "").trim()) {
            pendingUpdate.customerChanges[field] = importedValue;
          } else {
            delete pendingUpdate.customerChanges[field];
          }
        }

        if (pendingUpdate.estado_envio || Object.keys(pendingUpdate.customerChanges).length) {
          statusUpdates.set(existingOrder.id_excel, pendingUpdate);
        } else {
          statusUpdates.delete(existingOrder.id_excel);
        }
        continue;
      }

      if (usedTrackingCodes.has(normalizedTrackingCode)) {
        throw new Error(`El tracking code ${trackingCode} está repetido en el archivo.`);
      }
      usedTrackingCodes.add(normalizedTrackingCode);
      imported.push(importedOrder);
    }
    if (skippedMissingTrackingRows.length) {
      reportAdminError(
        `Importación de Excel: se omitieron ${skippedMissingTrackingRows.length} ` +
        `${skippedMissingTrackingRows.length === 1 ? "fila" : "filas"} sin tracking code ` +
        `(fila${skippedMissingTrackingRows.length === 1 ? "" : "s"} ${skippedMissingTrackingRows.join(", ")}).`,
      );
    }

    const existingRoutePackagesByTracking = new Map(routePackages.map((routePackage) => [
      normalize(routePackage.tracking_code), routePackage,
    ]));
    const existingRoutePackagesById = new Map(routePackages
      .filter((routePackage) => normalize(routePackage.id_paquete))
      .map((routePackage) => [normalize(routePackage.id_paquete), routePackage]));
    const seenRouteTrackingCodes = new Set();
    const seenRoutePackageIds = new Set();
    const processedExistingRoutePackages = new Set();
    const uniqueRoutePackages = [];
    const routePackageUpdates = [];
    let duplicateRoutePackages = 0;
    for (const routePackage of importedRoutePackages) {
      const trackingKey = normalize(routePackage.tracking_code);
      const packageIdKey = normalize(routePackage.id_paquete);
      const existingRoutePackage = existingRoutePackagesByTracking.get(trackingKey)
        ?? (packageIdKey ? existingRoutePackagesById.get(packageIdKey) : null);
      if (existingRoutePackage) {
        const existingKey = normalize(existingRoutePackage.tracking_code);
        if (processedExistingRoutePackages.has(existingKey)) {
          duplicateRoutePackages += 1;
          continue;
        }
        processedExistingRoutePackages.add(existingKey);

        const changes = {};
        const routeFields = [
          "id_paquete",
          "tracking_code",
          "cliente_nombre",
          "cliente_telefono",
          "total_a_pagar",
          "perfil",
          "ruta_id",
          "ruta_nombre",
          "ruta_estado",
          "ruta_fecha_inicio",
          "ruta_fecha_fin",
          "ruta_fecha_actualizacion",
        ];
        for (const field of routeFields) {
          const importedValue = String(routePackage[field] ?? "").trim();
          const currentValue = String(existingRoutePackage[field] ?? "").trim();
          if (!importedValue) continue;
          if (field === "tracking_code"
            && importedValue.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)
            && !currentValue.startsWith(ROUTE_PACKAGE_NO_COMPANY_PREFIX)) continue;
          if (importedValue !== currentValue) changes[field] = importedValue;
        }

        if (Object.keys(changes).length) {
          routePackageUpdates.push({ routePackage: existingRoutePackage, changes });
        } else {
          duplicateRoutePackages += 1;
        }
        continue;
      }

      if (seenRouteTrackingCodes.has(trackingKey)
        || (packageIdKey && seenRoutePackageIds.has(packageIdKey))) {
        duplicateRoutePackages += 1;
        continue;
      }
      seenRouteTrackingCodes.add(trackingKey);
      if (packageIdKey) seenRoutePackageIds.add(packageIdKey);
      uniqueRoutePackages.push(routePackage);
    }
    importedRoutePackages.splice(0, importedRoutePackages.length, ...uniqueRoutePackages);

    let declinedRoutePackageUpdates = 0;
    if (routePackageUpdates.length) {
      const shouldUpdateRoutePackages = await requestRoutePackageImportUpdate(routePackageUpdates);
      if (!shouldUpdateRoutePackages) {
        declinedRoutePackageUpdates = routePackageUpdates.length;
        routePackageUpdates.length = 0;
      }
    }

    const customerChangeEntries = [...statusUpdates.values()].filter((update) =>
      Object.keys(update.customerChanges).length
    );
    let declinedCustomerUpdates = 0;
    if (customerChangeEntries.length) {
      const fieldLabels = {
        cliente_nombre: "cliente",
        cliente_telefono: "teléfono",
        id_paquete: "ID del paquete",
        total_a_pagar: "total a pagar",
        perfil: "perfil",
        ruta_id: "ID de ruta",
        ruta_nombre: "nombre de ruta",
        ruta_estado: "estado de ruta",
        ruta_fecha_inicio: "fecha de inicio de ruta",
        ruta_fecha_fin: "fecha de fin de ruta",
        ruta_fecha_actualizacion: "fecha de ruta",
        direccion_entrega: "dirección",
        locality: "localidad",
      };
      const shouldUpdateCustomerData = await requestCustomerDataUpdate(customerChangeEntries, fieldLabels);

      if (!shouldUpdateCustomerData) {
        declinedCustomerUpdates = customerChangeEntries.length;
        for (const update of customerChangeEntries) {
          update.customerChanges = {};
          if (!update.estado_envio) statusUpdates.delete(update.order.id_excel);
        }
      }
    }

    if (!imported.length && !statusUpdates.size && !importedRoutePackages.length && !routePackageUpdates.length) {
      if (!skippedMissingTrackingRows.length) showToast(declinedCustomerUpdates
        ? `Los datos del cliente de ${formatCount(declinedCustomerUpdates)} se dejaron como estaban.`
        : declinedRoutePackageUpdates
          ? `Los datos de ${formatCount(declinedRoutePackageUpdates)} con cambios se dejaron como estaban.`
        : duplicateRows || duplicateRoutePackages
          ? [
              duplicateRows ? `Se encontraron ${formatCount(duplicateRows)} ya registrados` : "",
              duplicateRoutePackages
                ? `${duplicateRoutePackages} ${duplicateRoutePackages === 1 ? "paquete de ruta repetido omitido" : "paquetes de ruta repetidos omitidos"}`
                : "",
              "No había cambios para aplicar.",
            ].filter(Boolean).join("; ")
        : "No se detectaron filas de envío en la primera hoja del Excel.");
    } else {
      const updatedOrders = [];
      const updatedRoutePackages = [];
      for (const { order, estado_envio, customerChanges } of statusUpdates.values()) {
        const updatePayload = {
          ...customerChanges,
          ultima_actualizacion: new Date().toISOString(),
        };
        if (estado_envio) updatePayload.estado_envio = estado_envio;
        const { data, error } = await window.supabaseClient
          .from("envios")
          .update(updatePayload)
          .eq("tracking_code", order.tracking_code)
          .select("*")
          .single();
        if (error) throw error;
        updatedOrders.push(mapDatabaseOrder(data));
      }

      for (const { routePackage, changes } of routePackageUpdates) {
        const { data, error } = await window.supabaseClient
          .from("paquetes_ruta")
          .update({ ...changes, updated_at: new Date().toISOString() })
          .eq("tracking_code", routePackage.tracking_code)
          .select("*")
          .single();
        if (error) throw error;
        updatedRoutePackages.push(mapDatabaseRoutePackage(data));
      }

      let importedOrders = [];
      if (imported.length) {
        const shipmentRows = imported.map((order) => ({
          tracking_code: order.tracking_code,
          cliente_nombre: order.cliente_nombre,
          cliente_telefono: order.cliente_telefono,
          direccion_entrega: order.direccion_entrega,
          locality: order.locality,
          estado_envio: order.estado_envio,
        }));
        const { data, error } = await window.supabaseClient
          .from("envios")
          .insert(shipmentRows)
          .select("*");
        if (error) throw error;
        if (data.length !== imported.length) {
          throw new Error("Supabase no confirmó todos los envíos importados. Revisa las políticas de acceso.");
        }
        importedOrders = data.map(mapDatabaseOrder);
      }

      const routePackagesByTracking = new Map(importedRoutePackages.map((routePackage) => [
        normalize(routePackage.tracking_code), routePackage,
      ]));
      let savedRoutePackages = [];
      if (routePackagesByTracking.size) {
        const { data, error } = await window.supabaseClient
          .from("paquetes_ruta")
          .upsert([...routePackagesByTracking.values()], { onConflict: "tracking_code" })
          .select("*");
        if (error) throw error;
        savedRoutePackages = data.map(mapDatabaseRoutePackage);
        if (savedRoutePackages.length !== routePackagesByTracking.size) {
          throw new Error("Supabase no confirmó todos los paquetes de ruta importados.");
        }
      }

      const updatedOrdersById = new Map(updatedOrders.map((order) => [order.id_excel, order]));
      orders = [
        ...importedOrders,
        ...orders.map((order) => updatedOrdersById.get(order.id_excel) ?? order),
      ];
      const persistedRoutePackages = [...updatedRoutePackages, ...savedRoutePackages];
      if (persistedRoutePackages.length) {
        const savedTrackingCodes = new Set(persistedRoutePackages.map((routePackage) => normalize(routePackage.tracking_code)));
        const replacedRouteTrackingCodes = new Set(routePackageUpdates.map(({ routePackage }) =>
          normalize(routePackage.tracking_code)
        ));
        routePackages = [
          ...persistedRoutePackages.map((routePackage) => {
            const linkedOrder = orders.find((order) => normalize(order.tracking_code) === normalize(routePackage.tracking_code));
            return {
              ...routePackage,
              estado: linkedOrder?.estado ?? "",
              ultima_actualizacion: linkedOrder?.ultima_actualizacion ?? routePackage.ultima_actualizacion,
            };
          }),
          ...routePackages.filter((routePackage) =>
            !savedTrackingCodes.has(normalize(routePackage.tracking_code))
              && !replacedRouteTrackingCodes.has(normalize(routePackage.tracking_code))
          ),
        ];
      }
      databaseStatus = "Conectado a Supabase";
      loadError = "";
      if (importedOrders.length) {
        viewSelect.value = importedOrders.some(hasRouteData) ? "route-data" : "active";
      }
      if (persistedRoutePackages.length) viewSelect.value = "route-data";
      searchInput.value = "";
      renderOrders();
      const resultMessages = [];
      if (importedOrders.length) {
        resultMessages.push(`${importedOrders.length} ${importedOrders.length === 1 ? "envío importado" : "envíos importados"}`);
      }
      if (updatedOrders.length) {
        resultMessages.push(`${updatedOrders.length} ${updatedOrders.length === 1 ? "envío actualizado" : "envíos actualizados"}`);
      }
      if (updatedRoutePackages.length) {
        resultMessages.push(`${updatedRoutePackages.length} ${updatedRoutePackages.length === 1 ? "paquete de ruta actualizado" : "paquetes de ruta actualizados"}`);
      }
      if (savedRoutePackages.length) {
        const packageLabel = savedRoutePackages.length === 1 ? "paquete de ruta" : "paquetes de ruta";
        resultMessages.push(`${savedRoutePackages.length} ${packageLabel} nuevos guardados`);
      }
      if (declinedCustomerUpdates) {
        resultMessages.push(`datos del cliente de ${formatCount(declinedCustomerUpdates)} se dejaron igual`);
      }
      if (duplicateRoutePackages) {
        resultMessages.push(`${duplicateRoutePackages} ${duplicateRoutePackages === 1 ? "paquete de ruta repetido omitido" : "paquetes de ruta repetidos omitidos"}`);
      }
      if (declinedRoutePackageUpdates) {
        resultMessages.push(`datos de ${formatCount(declinedRoutePackageUpdates)} con cambios se dejaron como estaban`);
      }
      showToast(`${resultMessages.join("; ")} correctamente.`);
    }
  } catch (error) {
    reportAdminError(error.message || "No se pudo leer el archivo seleccionado.");
  } finally {
    excelFile.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (event.key === "Escape") closeContextMenu();
});

window.addEventListener("resize", closeContextMenu);
window.addEventListener("scroll", closeContextMenu, true);
renderOrders();

async function restoreAdminSession() {
  if (!window.supabaseClient) {
    const message = "No se pudo cargar Supabase. Revisa la configuración del cliente.";
    reportAdminError(message);
    showLogin(message);
    loginSubmit.disabled = true;
    return;
  }

  try {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      await startAdminSession(data.session);
    } else {
      showLogin();
    }
  } catch (error) {
    const message = `No se pudo verificar la sesión: ${error.message || "Error desconocido."}`;
    reportAdminError(message);
    showLogin(message);
  }
}
