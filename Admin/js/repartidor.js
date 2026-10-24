const courierAuthPanel = document.querySelector("#courier-auth-panel");
const courierWorkspace = document.querySelector("#courier-workspace");
const courierLoginForm = document.querySelector("#courier-login-form");
const courierAuthMessage = document.querySelector("#courier-auth-message");
const courierLoginSubmit = document.querySelector("#courier-login-submit");
const courierOrdersElement = document.querySelector("#courier-orders");
const courierMessage = document.querySelector("#courier-message");
const courierCount = document.querySelector("#courier-count");
const courierRefreshButton = document.querySelector("#courier-refresh");
const courierSignOutButton = document.querySelector("#courier-sign-out");
let courierUser = null;
let courierShipments = [];
let courierLoadError = "";
let courierPresenceInterval = null;

function normalizeCourierValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function formatCourierStatus(value) {
  const normalized = normalizeCourierValue(value);
  if (normalized === "en sucursal") return "En sucursal";
  if (normalized === "en camino") return "En camino";
  if (normalized === "recibido" || normalized === "entregado") return "Recibido";
  return String(value || "Sin estado");
}

function showCourierLogin(message = "") {
  courierAuthPanel.hidden = false;
  courierWorkspace.hidden = true;
  courierRefreshButton.hidden = true;
  courierSignOutButton.hidden = true;
  courierAuthMessage.textContent = message;
  courierShipments = [];
  renderCourierShipments();
}

async function loadCourierShipments() {
  courierMessage.textContent = "Cargando tus pedidos...";
  courierMessage.classList.remove("is-error");
  courierLoadError = "";
  renderCourierShipments();

  const [ordersResult, routeResult, companyResult] = await Promise.all([
    window.supabaseClient.from("envios").select("*").order("id_excel", { ascending: true }),
    window.supabaseClient.from("paquetes_ruta").select("*").order("id", { ascending: true }),
    window.supabaseClient.from("Xcargo").select("*").order("id", { ascending: true }),
  ]);
  if (ordersResult.error) throw ordersResult.error;
  if (routeResult.error) throw routeResult.error;
  if (companyResult.error) throw companyResult.error;

  const ordersByTracking = new Map();
  for (const order of ordersResult.data) {
    const key = normalizeCourierValue(order.tracking_code);
    ordersByTracking.set(key, {
      sourceTable: "envios",
      kind: "Envío",
      trackingCode: order.tracking_code,
      clientName: order.cliente_nombre,
      phone: order.cliente_telefono,
      status: order.estado_envio,
      address: order.direccion_entrega,
      locality: order.locality ?? order.localidad,
      lastUpdated: order.ultima_actualizacion,
      packageId: order.id_paquete,
      total: order.total_a_pagar,
      profile: order.perfil,
      routeName: order.ruta_nombre,
      routeId: order.ruta_id,
    });
  }

  const assignedRouteOnly = [];
  for (const routePackage of routeResult.data) {
    const key = normalizeCourierValue(routePackage.tracking_code);
    const linkedOrder = ordersByTracking.get(key);
    if (linkedOrder) {
      linkedOrder.packageId ||= routePackage.id_paquete;
      linkedOrder.total ||= routePackage.total_a_pagar;
      linkedOrder.profile ||= routePackage.perfil;
      linkedOrder.routeName ||= routePackage.ruta_nombre;
      linkedOrder.routeId ||= routePackage.ruta_id;
      linkedOrder.phone ||= routePackage.cliente_telefono;
      linkedOrder.clientName ||= routePackage.cliente_nombre;
      continue;
    }
    assignedRouteOnly.push({
      sourceTable: "paquetes_ruta",
      kind: "Paquete de ruta",
      trackingCode: routePackage.tracking_code.startsWith("__paquete_sin_empresa__")
        ? "Sin número de empresa"
        : routePackage.tracking_code,
      clientName: routePackage.cliente_nombre,
      phone: routePackage.cliente_telefono,
      packageId: routePackage.id_paquete,
      total: routePackage.total_a_pagar,
      profile: routePackage.perfil,
      routeName: routePackage.ruta_nombre,
      routeId: routePackage.ruta_id,
      routeStatus: routePackage.ruta_estado,
      readOnly: true,
    });
  }

  const shipments = [
    ...ordersByTracking.values(),
    ...companyResult.data.map((shipment) => ({
      sourceTable: "Xcargo",
      kind: "Xcargo",
      trackingCode: shipment.tracking_code,
      clientName: shipment.cliente_nombre,
      phone: shipment.cliente_telefono,
      status: shipment.estado_envio,
      address: shipment.ubicacion,
      locality: shipment.almacen,
      lastUpdated: shipment.ultima_actualizacion,
    })),
    ...assignedRouteOnly,
  ];
  courierShipments = shipments.sort((left, right) =>
    String(left.trackingCode).localeCompare(String(right.trackingCode), "es", {
      numeric: true,
      sensitivity: "base",
    })
  );
  courierMessage.textContent = "";
  renderCourierShipments();
}

function appendCourierDetail(container, label, value) {
  const text = String(value ?? "").trim();
  if (!text) return;
  const detail = document.createElement("div");
  detail.className = "courier-detail";
  const name = document.createElement("span");
  name.textContent = label;
  const content = document.createElement("strong");
  content.textContent = text;
  detail.append(name, content);
  container.append(detail);
}

function createCourierCard(shipment) {
  const card = document.createElement("article");
  card.className = "courier-card";
  const heading = document.createElement("div");
  heading.className = "courier-card-heading";
  const titleGroup = document.createElement("div");
  const kind = document.createElement("p");
  kind.className = "courier-card-kind";
  kind.textContent = shipment.kind;
  const title = document.createElement("h2");
  title.textContent = shipment.trackingCode || "Pedido sin guía";
  titleGroup.append(kind, title);

  const status = document.createElement("span");
  status.className = "courier-status";
  status.textContent = shipment.readOnly
    ? "Sin envío asociado"
    : formatCourierStatus(shipment.status);
  heading.append(titleGroup, status);

  const details = document.createElement("div");
  details.className = "courier-details";
  appendCourierDetail(details, "Cliente", shipment.clientName);
  appendCourierDetail(details, "Teléfono", shipment.phone);
  appendCourierDetail(details, "Dirección / ubicación", shipment.address);
  appendCourierDetail(details, "Localidad / almacén", shipment.locality);
  appendCourierDetail(details, "ID de paquete", shipment.packageId);
  appendCourierDetail(details, "Ruta", shipment.routeName);
  appendCourierDetail(details, "ID de ruta", shipment.routeId);
  appendCourierDetail(details, "Perfil", shipment.profile);
  appendCourierDetail(details, "Total a pagar", shipment.total);

  const footer = document.createElement("div");
  footer.className = "courier-card-footer";
  if (shipment.lastUpdated) {
    const updated = document.createElement("span");
    updated.textContent = `Actualizado: ${new Date(shipment.lastUpdated).toLocaleString("es")}`;
    footer.append(updated);
  }

  if (!shipment.readOnly) {
    const normalizedStatus = normalizeCourierValue(shipment.status);
    if (normalizedStatus === "en sucursal" || normalizedStatus === "en camino") {
      const button = document.createElement("button");
      button.className = "button button-primary courier-status-button";
      button.type = "button";
      button.dataset.sourceTable = shipment.sourceTable;
      button.dataset.trackingCode = shipment.trackingCode;
      button.textContent = normalizedStatus === "en sucursal"
        ? "Marcar en camino"
        : "Marcar recibido";
      footer.append(button);
    }
  }

  card.append(heading, details, footer);
  return card;
}

function renderCourierShipments() {
  courierOrdersElement.replaceChildren();
  courierCount.textContent = `${courierShipments.length} ${courierShipments.length === 1 ? "pedido" : "pedidos"}`;
  if (courierLoadError) {
    courierMessage.textContent = courierLoadError;
    return;
  }
  if (!courierShipments.length) {
    courierMessage.textContent = "Aún no tienes pedidos asignados.";
    return;
  }
  for (const shipment of courierShipments) {
    courierOrdersElement.append(createCourierCard(shipment));
  }
}

courierRefreshButton.addEventListener("click", async () => {
  courierRefreshButton.disabled = true;
  courierRefreshButton.setAttribute("aria-busy", "true");
  try {
    await loadCourierShipments();
  } catch (error) {
    courierLoadError = `No se pudieron cargar tus pedidos: ${error.message || "Error desconocido."}`;
    courierMessage.textContent = courierLoadError;
    renderCourierShipments();
  } finally {
    courierRefreshButton.disabled = false;
    courierRefreshButton.removeAttribute("aria-busy");
  }
});

courierOrdersElement.addEventListener("click", async (event) => {
  const button = event.target.closest(".courier-status-button");
  if (!button) return;

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    const { error } = await window.supabaseClient.rpc("advance_assigned_delivery_status", {
      p_source_table: button.dataset.sourceTable,
      p_tracking_code: button.dataset.trackingCode,
    });
    if (error) throw error;
    await loadCourierShipments();
  } catch (error) {
    courierMessage.textContent = `No se pudo actualizar el pedido: ${error.message || "Error desconocido."}`;
    courierMessage.classList.add("is-error");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
});

courierLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  courierLoginSubmit.disabled = true;
  courierAuthMessage.textContent = "";
  try {
    const formData = new FormData(courierLoginForm);
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: String(formData.get("email")).trim(),
      password: String(formData.get("password")),
    });
    if (error) throw error;
    await startCourierSession(data.user);
  } catch (error) {
    courierAuthMessage.textContent = error.message || "No se pudo iniciar sesión.";
  } finally {
    courierLoginSubmit.disabled = false;
  }
});

async function startCourierSession(user) {
  const role = user?.app_metadata?.role;
  if (role === "admin" || role === "editor") {
    const adminUrl = new URL("admin.html", window.location.href);
    adminUrl.search = window.location.search;
    window.location.replace(adminUrl.href);
    return;
  }
  if (role !== "repartidor") {
    await window.supabaseClient.auth.signOut();
    showCourierLogin("Esta cuenta no tiene permisos de repartidor.");
    return;
  }

  courierUser = user;
  courierAuthPanel.hidden = true;
  courierWorkspace.hidden = false;
  courierRefreshButton.hidden = false;
  courierSignOutButton.hidden = false;
  try {
    await updateCourierPresence();
    window.clearInterval(courierPresenceInterval);
    courierPresenceInterval = window.setInterval(() => {
      updateCourierPresence().catch((error) => {
        courierMessage.textContent = `No se pudo actualizar la conexión: ${error.message || "Error desconocido."}`;
        courierMessage.classList.add("is-error");
      });
    }, 30_000);
  } catch (error) {
    courierMessage.textContent = `No se pudo registrar la conexión: ${error.message || "Error desconocido."}`;
    courierMessage.classList.add("is-error");
  }
  try {
    await loadCourierShipments();
  } catch (error) {
    courierLoadError = `No se pudieron cargar tus pedidos: ${error.message || "Error desconocido."}`;
    courierMessage.textContent = courierLoadError;
    renderCourierShipments();
  }
}

async function updateCourierPresence() {
  if (!courierUser) return;
  const { error } = await window.supabaseClient
    .from("admin_presence")
    .upsert({
      user_id: courierUser.id,
      email: courierUser.email,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) throw error;
}

courierSignOutButton.addEventListener("click", async () => {
  courierSignOutButton.disabled = true;
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    window.clearInterval(courierPresenceInterval);
    courierPresenceInterval = null;
    courierUser = null;
    courierLoginForm.reset();
    showCourierLogin("Sesión cerrada.");
  } catch (error) {
    courierMessage.textContent = `No se pudo cerrar la sesión: ${error.message || "Error desconocido."}`;
  } finally {
    courierSignOutButton.disabled = false;
  }
});

async function restoreCourierSession() {
  if (!window.supabaseClient) {
    showCourierLogin("No se pudo cargar Supabase. Revisa la configuración del cliente.");
    courierLoginSubmit.disabled = true;
    return;
  }
  try {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      showCourierLogin();
      return;
    }
    const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error("La sesión no tiene una cuenta activa.");
    await startCourierSession(userData.user);
  } catch (error) {
    showCourierLogin(error.message || "No se pudo verificar la sesión.");
  }
}

showCourierLogin();
restoreCourierSession();
