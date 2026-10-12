let orders = [];
let selectedOrderId = null;
let editingOrderId = null;
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
const sortDirectionToggle = document.querySelector("#sort-direction-toggle");
const searchInput = document.querySelector("#order-search");
const viewSelect = document.querySelector("#order-view");
const contextMenu = document.querySelector("#context-menu");
const contextBackdrop = document.querySelector("#context-backdrop");
const orderDialog = document.querySelector("#order-dialog");
const orderForm = document.querySelector("#order-form");
const excelFile = document.querySelector("#excel-file");
const authPanel = document.querySelector("#auth-panel");
const adminWorkspace = document.querySelector("#admin-workspace");
const loginForm = document.querySelector("#login-form");
const authMessage = document.querySelector("#auth-message");
const loginSubmit = document.querySelector("#login-submit");
const signOutButton = document.querySelector("#sign-out");
const refreshOrdersButton = document.querySelector("#refresh-orders");
const debugClearOrdersButton = document.querySelector("#debug-clear-orders");
const themeToggle = document.querySelector("#theme-toggle");
const usersButton = document.querySelector("#show-admin-users");
const usersDialog = document.querySelector("#users-dialog");
const usersBody = document.querySelector("#admin-users-body");
const usersMessage = document.querySelector("#users-message");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
const toastActionButton = document.querySelector("#toast-action");
const customerUpdateDialog = document.querySelector("#customer-update-dialog");
const customerUpdateMessage = document.querySelector("#customer-update-message");
const customerUpdateList = document.querySelector("#customer-update-list");
let currentAdminUser = null;
let presenceInterval = null;
let usersRefreshInterval = null;
let presenceUpdateInProgress = false;
let presenceTrackingEnabled = false;
let toastAction = null;
let customerUpdateResolver = null;
const selectedSearchFields = new Set();
const ONLINE_WINDOW_MS = 90_000;
const PRESENCE_INTERVAL_MS = 30_000;

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
  "id_excel",
  "tracking_code",
  "cliente_nombre",
  "cliente_telefono",
  "direccion_entrega",
  "localidad",
  "estado",
  "fecha_creacion",
  "ultima_actualizacion",
  "notificacion_pendiente",
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
}

let themePreference = savedTheme === "dark" || savedTheme === "light"
  ? savedTheme
  : null;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

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

function mapDatabaseOrder(row) {
  return {
    id_excel: String(row.id_excel),
    tracking_code: row.tracking_code ?? "",
    cliente_nombre: row.cliente_nombre ?? "",
    cliente_telefono: row.cliente_telefono ?? "",
    direccion_entrega: row.direccion_entrega ?? "",
    localidad: row.locality ?? "",
    estado: row.estado_envio ?? "",
    fecha_creacion: row.fecha_creacion ?? "",
    ultima_actualizacion: row.ultima_actualizacion ?? "",
    notificacion_pendiente: row.notificacion_pendiente ?? false,
  };
}

function mapFormOrder(formData) {
  return {
    tracking_code: String(formData.get("tracking_code")).trim(),
    cliente_nombre: String(formData.get("cliente_nombre")).trim(),
    cliente_telefono: String(formData.get("cliente_telefono")).trim(),
    direccion_entrega: String(formData.get("direccion_entrega")).trim(),
    locality: String(formData.get("localidad")).trim(),
  };
}

const ORDER_STATUS_SEQUENCE = ["empaquetando", "en camino", "recibido"];
const ORDER_STATUS_LABELS = {
  empaquetando: "Empaquetando",
  "en camino": "En camino",
  recibido: "Recibido",
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
  if (ORDER_STATUS_SEQUENCE.includes(normalizedStatus)) return normalizedStatus;
  if (normalizedStatus === "en transito") return "en camino";
  if (normalizedStatus === "listo para recoger") return "recibido";
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
  const status = normalizeOrderStatus(order.estado);
  return status === "recibido" || status === "listo para recoger";
}

async function loadOrders() {
  databaseStatus = "Conectando con Supabase…";
  loadError = "";
  renderOrders();

  try {
    const { data, error } = await window.supabaseClient
      .from("envios")
      .select("*")
      .order("id_excel", { ascending: true });
    if (error) throw error;
    orders = data.map(mapDatabaseOrder);
    databaseStatus = "Conectado a Supabase";
    renderOrders();
    return true;
  } catch (error) {
    databaseStatus = "Error al cargar desde Supabase";
    loadError = error.message || "Error desconocido al cargar los envíos.";
    showToast(`No se pudieron cargar los envíos: ${loadError}`);
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

debugClearOrdersButton.addEventListener("click", async () => {
  if (currentAdminUser?.app_metadata?.role !== "admin") {
    showToast("Necesitas una sesión de administrador para borrar los pedidos.");
    return;
  }

  debugClearOrdersButton.disabled = true;
  debugClearOrdersButton.setAttribute("aria-busy", "true");
  try {
    const { count, error: countError } = await window.supabaseClient
      .from("envios")
      .select("id_excel", { count: "exact", head: true });
    if (countError) throw countError;
    if (count === null) throw new Error("No se pudo determinar cuántos pedidos hay.");
    if (count === 0) {
      showToast("No hay pedidos para borrar.");
      return;
    }

    const confirmed = window.confirm(
      `¿Borrar los ${formatCount(count)} de la tabla envios? Esta acción no se puede deshacer. ` +
      "Solo se borrarán los pedidos; las cuentas, la configuración y las demás tablas no cambiarán.",
    );
    if (!confirmed) return;

    const { count: deletedCount, error } = await window.supabaseClient
      .from("envios")
      .delete({ count: "exact" })
      .not("id_excel", "is", null);
    if (error) throw error;
    if (deletedCount === null) throw new Error("Supabase no confirmó cuántos pedidos se borraron.");

    orders = [];
    selectedOrderId = null;
    searchInput.value = "";
    viewSelect.value = "active";
    databaseStatus = "Conectado a Supabase";
    loadError = "";
    renderOrders();
    showToast(`Se borraron ${formatCount(deletedCount)} de la tabla envios.`);
  } catch (error) {
    showToast(`No se pudieron borrar los pedidos: ${error.message || "Error desconocido."}`);
  } finally {
    debugClearOrdersButton.disabled = false;
    debugClearOrdersButton.removeAttribute("aria-busy");
  }
});

function showLogin(message = "") {
  authPanel.hidden = false;
  adminWorkspace.hidden = true;
  signOutButton.hidden = true;
  authMessage.textContent = message;
  databaseStatus = "Inicia sesión para consultar los envíos";
  orders = [];
  renderOrders();
}

async function startAdminSession(session) {
  if (session?.user?.app_metadata?.role !== "admin") {
    await window.supabaseClient.auth.signOut();
    showLogin("Esta cuenta no tiene permisos de administración.");
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
    showToast(`No se pudo registrar la presencia: ${error.message || "Revisa la tabla admin_presence y sus políticas."}`);
  }
  window.clearInterval(presenceInterval);
  presenceInterval = window.setInterval(() => {
    if (!presenceTrackingEnabled) return;
    updateAdminPresence().catch((error) => {
      presenceTrackingEnabled = false;
      showToast(`No se pudo actualizar la presencia: ${error.message || "Error desconocido."}`);
    });
  }, PRESENCE_INTERVAL_MS);
  window.clearInterval(usersRefreshInterval);
  usersRefreshInterval = window.setInterval(() => {
    if (!usersDialog.open) return;
    loadAdminUsers().catch((error) => {
      usersMessage.textContent = `No se pudieron cargar los usuarios: ${error.message || "Error desconocido."}`;
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
    showToast(`No se pudo cerrar la sesión: ${error.message || "Error desconocido."}`);
  } finally {
    signOutButton.disabled = false;
  }
});

function renderOrders() {
  const query = normalize(searchInput.value.trim());
  const selectedView = viewSelect.value;
  const visibleOrders = orders.filter((order) => {
    const matchesView = (selectedView === "history") === isOrderInHistory(order);
    const matchesSearch = matchesOrderSearch(order, query);
    return matchesView && matchesSearch;
  }).sort(compareOrders);

  ordersBody.replaceChildren();
  for (const order of visibleOrders) {
    const row = document.createElement("tr");
    row.dataset.orderId = order.id_excel;
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Envío ${order.id_excel}: ${order.tracking_code}`);
    if (order.id_excel === selectedOrderId) row.classList.add("is-selected");
    row.append(
      createCell(order.id_excel),
      createCell(order.tracking_code),
      createCell(order.cliente_nombre),
      createCell(order.cliente_telefono),
      createCell(order.direccion_entrega),
      createCell(order.localidad),
      createCell(formatOrderStatus(order.estado)),
      createCell(formatTimestamp(order.fecha_creacion)),
      createCell(formatTimestamp(order.ultima_actualizacion)),
      createCell(order.notificacion_pendiente),
    );
    ordersBody.append(row);
  }

  document.querySelector("#result-count").textContent = formatCount(visibleOrders.length);
  document.querySelector("#view-label").textContent = selectedView === "active" ? "Envíos activos" : "Historial";
  const emptyState = document.querySelector("#empty-state");
  emptyState.hidden = visibleOrders.length !== 0;
  document.querySelector("#empty-message").textContent = loadError
    ? `No se pudieron cargar los datos: ${loadError}`
    : query
      ? "Prueba con otro término."
      : "No hay envíos en esta vista.";
  document.querySelector("#table-summary").textContent = databaseStatus;
  updateSortIndicators();
}

function compareOrders(left, right) {
  const leftValue = left[sortField];
  const rightValue = right[sortField];
  let result;

  if (sortField === "id_excel") {
    result = Number(leftValue) - Number(rightValue);
  } else if (sortField === "fecha_creacion" || sortField === "ultima_actualizacion") {
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
  if (idQuery && fields.includes("id_excel")) {
    return normalize(order.id_excel) === idQuery[1];
  }

  return fields.some((field) => normalize(getOrderSearchValue(order, field)).includes(query));
}

function getOrderSearchValue(order, field) {
  if (field === "estado") return formatOrderStatus(order.estado);
  if (field === "fecha_creacion" || field === "ultima_actualizacion") {
    return formatTimestamp(order[field]);
  }
  if (field === "notificacion_pendiente") return order[field] ? "Sí" : "No";
  return order[field];
}

function updateSearchFieldIndicator() {
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
  selectedOrderId = row.dataset.orderId;
  renderOrders();
  const isHistoryView = viewSelect.value === "history";
  contextMenu.querySelector('[data-action="status"]').hidden = isHistoryView;
  contextMenu.querySelector('[data-action="finalize"]').hidden = isHistoryView;
  contextMenu.querySelector('[data-action="reactivate"]').hidden = !isHistoryView;
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

toastActionButton.addEventListener("click", () => {
  const action = toastAction;
  toastAction = null;
  toast.classList.remove("is-visible");
  if (action) action();
});

function requestCustomerDataUpdate(entries, fieldLabels) {
  customerUpdateMessage.textContent = `Se detectaron cambios en los datos de ${formatCount(entries.length)}. ¿Quieres actualizarlos?`;
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
    showToast("Hay datos de cliente diferentes en el Excel.", {
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

document.querySelector("#add-order").addEventListener("click", () => openOrderDialog());
document.querySelector("#close-dialog").addEventListener("click", () => orderDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => orderDialog.close());
searchInput.addEventListener("input", renderOrders);
viewSelect.addEventListener("change", () => {
  selectedOrderId = null;
  renderOrders();
});

ordersBody.addEventListener("contextmenu", (event) => {
  const row = event.target.closest("tr[data-order-id]");
  if (!row) return;
  event.preventDefault();
  openContextMenu(row, event.clientX, event.clientY);
});

ordersBody.addEventListener("keydown", (event) => {
  const row = event.target.closest("tr[data-order-id]");
  if (row && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
    event.preventDefault();
    const bounds = row.getBoundingClientRect();
    openContextMenu(row, bounds.left + 20, bounds.bottom);
  }
});

contextBackdrop.addEventListener("click", closeContextMenu);
contextMenu.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const order = orders.find((item) => item.id_excel === selectedOrderId);
  if (!order) return closeContextMenu();

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
      showToast(`No se pudo cambiar el estado: ${error.message || "Error desconocido."}`);
    }
    return;
  }

  if (action === "finalize") {
    closeContextMenu();
    try {
      await updateOrderStatus(order, "recibido");
      showToast("Pedido finalizado y movido al historial.");
    } catch (error) {
      showToast(`No se pudo finalizar el pedido: ${error.message || "Error desconocido."}`);
    }
    return;
  }

  if (action === "reactivate") {
    closeContextMenu();
    try {
      await updateOrderStatus(order, "empaquetando");
      showToast("Pedido reactivado y movido a envíos activos.");
    } catch (error) {
      showToast(`No se pudo reactivar el pedido: ${error.message || "Error desconocido."}`);
    }
    return;
  }

  if (action === "delete") {
    closeContextMenu();
    if (window.confirm(`¿Borrar el envío ${order.tracking_code}?`)) {
      try {
        const { error } = await window.supabaseClient
          .from("envios")
          .delete()
          .eq("id_excel", order.id_excel)
          .select("id_excel")
          .single();
        if (error) throw error;
        orders = orders.filter((item) => item.id_excel !== order.id_excel);
        selectedOrderId = null;
        renderOrders();
        showToast("Envío borrado.");
      } catch (error) {
        showToast(`No se pudo borrar el envío: ${error.message || "Error desconocido."}`);
      }
    }
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
    showToast("Ya existe un envío con ese tracking code.");
    document.querySelector("#field-tracking").focus();
    return;
  }
  const payload = mapFormOrder(formData);
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
    showToast(`No se pudo guardar el envío: ${error.message || "Error desconocido."}`);
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
    const aliases = [
      ["id", "idexcel"],
      ["trackingcode", "codigo", "codigotracking"],
      ["clientenombre", "nombrecliente", "nombre"],
      ["clientetelefono", "telefonocliente", "telefono"],
      ["direccionentrega", "direccion"],
      ["locality", "localidad"],
      ["estado", "status", "estadoenvio", "estadodelenvio"],
    ];
    const firstRow = rows[0] ?? [];
    const normalizedHeaders = firstRow.map((value) =>
      normalize(value).replace(/[^a-z0-9]/g, "")
    );
    const hasHeaders = normalizedHeaders.some((header) =>
      aliases.some((fieldAliases) => fieldAliases.includes(header))
    );
    const dataRows = hasHeaders ? rows.slice(1) : rows;
    const maxColumnCount = dataRows.reduce((max, row) => Math.max(max, row.length), 0);
    const detectedColumnIndexes = Array.from({ length: maxColumnCount }, (_, index) => index)
      .filter((index) => dataRows.some((row) => String(row[index] ?? "").trim()));
    const columnIndexes = hasHeaders
      ? fieldNames.map((_, index) => {
        const headerIndex = normalizedHeaders.findIndex((header) => aliases[index].includes(header));
        return headerIndex < 0 ? index : headerIndex;
      })
      : detectedColumnIndexes.slice(0, fieldNames.length);
    const imported = [];
    const existingOrdersByTracking = new Map(
      orders.map((order) => [normalize(order.tracking_code), order])
    );
    const usedTrackingCodes = new Set();
    const statusUpdates = new Map();
    let duplicateRows = 0;
    for (const row of dataRows) {
      if (!row.some((value) => String(value).trim())) continue;
      const values = hasHeaders
        ? columnIndexes.map((index) => row[index] ?? "")
        : row.filter((value) => String(value).trim());
      const phoneIndex = hasHeaders ? 3 : values.findIndex(isPhoneValue);
      const hasLeadingId = !hasHeaders
        && /^\d+$/.test(String(values[0] ?? "").trim())
        && phoneIndex >= 3;
      const idIndex = hasLeadingId ? 0 : -1;
      const knownStatusIndex = hasHeaders
        ? 6
        : values.findIndex((value, index) => index !== idIndex
          && ORDER_STATUS_LABELS[normalizeOrderStatus(value)] !== undefined);
      const statusIndex = knownStatusIndex >= 0 ? knownStatusIndex : hasHeaders ? 6 : hasLeadingId ? 6 : 5;
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
      const trackingCode = String(values[trackingIndex] ?? "").trim();
      if (!trackingCode) throw new Error("Hay una fila sin tracking_code; este campo es obligatorio.");
      const normalizedTrackingCode = normalize(trackingCode);
      const importedStatus = String(values[statusIndex] ?? "").trim();
      const databaseStatusValue = importedStatus ? toDatabaseOrderStatus(importedStatus) : "";
      if (importedStatus && !databaseStatusValue) {
        throw new Error(`El estado "${importedStatus}" no es válido. Usa Empaquetando, En camino o Recibido.`);
      }
      const existingOrder = existingOrdersByTracking.get(normalizedTrackingCode);

      let importedOrder;
      if (hasHeaders) {
        importedOrder = {
          tracking_code: trackingCode,
          cliente_nombre: String(values[2]).trim(),
          cliente_telefono: String(values[3]).trim(),
          direccion_entrega: String(values[4]).trim(),
          locality: String(values[5]).trim(),
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
      if (databaseStatusValue) importedOrder.estado_envio = databaseStatusValue;

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

    const customerChangeEntries = [...statusUpdates.values()].filter((update) =>
      Object.keys(update.customerChanges).length
    );
    let declinedCustomerUpdates = 0;
    if (customerChangeEntries.length) {
      const fieldLabels = {
        cliente_nombre: "cliente",
        cliente_telefono: "teléfono",
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

    if (!imported.length && !statusUpdates.size) {
      showToast(declinedCustomerUpdates
        ? `Los datos del cliente de ${formatCount(declinedCustomerUpdates)} se dejaron como estaban.`
        : duplicateRows
          ? `Se encontraron ${formatCount(duplicateRows)} ya registrados, pero no había cambios para aplicar.`
        : "No se detectaron filas de envío en la primera hoja del Excel.");
    } else {
      const updatedOrders = [];
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

      let importedOrders = [];
      if (imported.length) {
        const { data, error } = await window.supabaseClient
          .from("envios")
          .insert(imported)
          .select("*");
        if (error) throw error;
        if (data.length !== imported.length) {
          throw new Error("Supabase no confirmó todos los envíos importados. Revisa las políticas de acceso.");
        }
        importedOrders = data.map(mapDatabaseOrder);
      }

      const updatedOrdersById = new Map(updatedOrders.map((order) => [order.id_excel, order]));
      orders = [
        ...importedOrders,
        ...orders.map((order) => updatedOrdersById.get(order.id_excel) ?? order),
      ];
      databaseStatus = "Conectado a Supabase";
      loadError = "";
      if (importedOrders.length) viewSelect.value = "active";
      searchInput.value = "";
      renderOrders();
      const resultMessages = [];
      if (importedOrders.length) resultMessages.push(`${formatCount(importedOrders.length)} importados`);
      if (updatedOrders.length) resultMessages.push(`${formatCount(updatedOrders.length)} actualizados`);
      if (declinedCustomerUpdates) {
        resultMessages.push(`datos del cliente de ${formatCount(declinedCustomerUpdates)} se dejaron igual`);
      }
      showToast(`${resultMessages.join("; ")} correctamente.`);
    }
  } catch (error) {
    showToast(error.message || "No se pudo leer el archivo seleccionado.");
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
    showLogin("No se pudo cargar Supabase. Revisa la configuración del cliente.");
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
    showLogin(`No se pudo verificar la sesión: ${error.message || "Error desconocido."}`);
  }
}

restoreAdminSession();