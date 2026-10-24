export {};

const deno = (globalThis as typeof globalThis & {
  Deno: {
    env: { get: (name: string) => string | undefined };
    serve: (handler: (request: Request) => Response | Promise<Response>) => void;
  };
}).Deno;

const siteUrl = "https://jlexpress.pages.dev";
const RECENT_AUTH_WINDOW_SECONDS = 300;
const ALLOWED_ROLES = ["admin", "editor", "repartidor"] as const;
type AppRole = typeof ALLOWED_ROLES[number];

interface ManagedAccount {
  user_id: string;
  email: string;
  name: string;
  role: AppRole;
  last_seen_at: string | null;
  is_pending: boolean;
}

interface PresenceRecord {
  user_id: string;
  email: string;
  last_seen_at: string | null;
}

deno.serve(async (request: Request) => {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return jsonResponse({ error: "Método no permitido." }, 405, headers);

  try {
    const payload = await request.json();
    const action = payload?.action;
    if (
      typeof action !== "string"
      || !["permission", "list", "couriers", "invite", "delete", "set-role"].includes(action)
    ) {
      return jsonResponse({ error: "Acción no válida." }, 400, headers);
    }

    const configuration = getConfiguration();
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authorization)) {
      return jsonResponse({ error: "Inicia sesión para continuar." }, 401, headers);
    }

    const userResponse = await fetch(new URL("/auth/v1/user", configuration.url), {
      headers: { apikey: configuration.anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) return jsonResponse({ error: "La sesión no es válida." }, 401, headers);
    const user = await userResponse.json();
    const role = user?.app_metadata?.role;

    if (action === "couriers") {
      if (role !== "admin" && role !== "editor") {
        return jsonResponse({ error: "La cuenta no puede consultar repartidores." }, 403, headers);
      }
      const users = await loadAdminUsers(configuration);
      return jsonResponse({
        couriers: users
          .filter((account) => account.role === "repartidor" && !account.is_pending)
          .map(({ user_id, email, name }) => ({ user_id, email, name })),
      }, 200, headers);
    }

    if (role !== "admin") {
      return jsonResponse({ error: "La cuenta no tiene permisos de administración." }, 403, headers);
    }

    if (action === "permission") return jsonResponse({ can_manage: true }, 200, headers);
    if (action === "list") {
      const users = await loadAdminUsers(configuration);
      return jsonResponse({ can_manage: true, users }, 200, headers);
    }

    const issuedAt = getTokenIssuedAt(authorization.slice(7));
    const now = Math.floor(Date.now() / 1000);
    if (issuedAt === null || issuedAt > now + 60 || now - issuedAt > RECENT_AUTH_WINDOW_SECONDS) {
      return jsonResponse({ error: "Vuelve a confirmar tu contraseña para continuar." }, 401, headers);
    }

    if (action === "delete") {
      const targetUserId = typeof payload?.user_id === "string" ? payload.user_id : "";
      if (!isValidUserId(targetUserId)) {
        return jsonResponse({ error: "La cuenta seleccionada no es válida." }, 400, headers);
      }
      if (targetUserId === user.id) {
        return jsonResponse({ error: "No puedes eliminar la cuenta con la que tienes la sesión abierta." }, 400, headers);
      }

      const targetUser = await getAuthorizedAccount(configuration, targetUserId);
      if (!targetUser) {
        return jsonResponse({ error: "La cuenta seleccionada no aparece en la lista de acceso." }, 404, headers);
      }
      if (targetUser.role === "admin" && !targetUser.is_pending) {
        const users = await loadAdminUsers(configuration);
        if (users.filter((account) => account.role === "admin" && !account.is_pending).length <= 1) {
          return jsonResponse({ error: "Debe quedar al menos una cuenta administradora autorizada." }, 409, headers);
        }
      }
      await deleteAuthorizedAccount(configuration, targetUserId);
      await recordAdminActivity(
        configuration,
        user.id,
        user.email,
        "usuario_eliminado",
        `Se eliminó la cuenta ${targetUser.user.email ?? targetUserId}.`,
      );
      return jsonResponse({ status: "deleted" }, 200, headers);
    }

    if (action === "set-role") {
      const targetUserId = typeof payload?.user_id === "string" ? payload.user_id : "";
      const newRole = typeof payload?.role === "string" ? payload.role : "";
      if (!isValidUserId(targetUserId)) {
        return jsonResponse({ error: "La cuenta seleccionada no es válida." }, 400, headers);
      }
      if (!isAppRole(newRole)) {
        return jsonResponse({ error: "Selecciona un rol válido." }, 400, headers);
      }
      if (targetUserId === user.id) {
        return jsonResponse({ error: "No puedes cambiar el rol de la cuenta con la que tienes la sesión abierta." }, 400, headers);
      }

      const targetUser = await getAuthorizedAccount(configuration, targetUserId);
      if (!targetUser) {
        return jsonResponse({ error: "La cuenta seleccionada no aparece en la lista de acceso." }, 404, headers);
      }
      if (targetUser.role === "admin" && !targetUser.is_pending && newRole !== "admin") {
        const users = await loadAdminUsers(configuration);
        if (users.filter((account) => account.role === "admin" && !account.is_pending).length <= 1) {
          return jsonResponse({ error: "Debe quedar al menos una cuenta administradora autorizada." }, 409, headers);
        }
      }

      await updateAuthorizedAccountRole(configuration, targetUserId, newRole);
      await recordAdminActivity(
        configuration,
        user.id,
        user.email,
        "rol_cambiado",
        `Se cambió el rol de ${targetUser.user.email ?? targetUserId}: ${targetUser.role} → ${newRole}.`,
      );
      return jsonResponse({ status: "updated", role: newRole }, 200, headers);
    }

    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    const requestedRole = typeof payload?.role === "string" ? payload.role : "";
    if (!isValidEmail(email)) return jsonResponse({ error: "Ingresa un correo válido." }, 400, headers);
    if (!isAppRole(requestedRole)) {
      return jsonResponse({ error: "Selecciona un rol válido para la cuenta." }, 400, headers);
    }
    if (await accountExists(configuration, email)) {
      return jsonResponse({ error: "Ya existe una cuenta con ese correo." }, 409, headers);
    }

    const invitedUser = await inviteAccount(configuration, email, requestedRole);
    await recordAdminActivity(
      configuration,
      user.id,
      user.email,
      "usuario_agregado",
      `Se invitó a ${invitedUser.email ?? email} con el rol ${requestedRole}.`,
    );
    return jsonResponse({ status: "invited", email: invitedUser.email ?? email }, 200, headers);
  } catch (error) {
    console.error("No se pudo administrar la cuenta:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "No se pudo completar la solicitud." },
      500,
      corsHeaders(),
    );
  }
});

function getConfiguration() {
  const url = deno.env.get("SUPABASE_URL");
  const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceRoleKey || !anonKey) {
    throw new Error("Falta configurar Supabase para administrar cuentas.");
  }
  return { url, serviceRoleKey, anonKey };
}

async function accountExists(configuration: ReturnType<typeof getConfiguration>, email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL("/auth/v1/admin/users", configuration.url);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "1000");
    const response = await fetch(url, { headers: serviceHeaders(configuration.serviceRoleKey) });
    if (!response.ok) throw new Error("No se pudo comprobar si el correo ya tiene una cuenta.");
    const result = await response.json();
    const users = Array.isArray(result?.users) ? result.users : [];
    if (users.some((account: { email?: string }) => account.email?.toLowerCase() === email)) return true;
    if (users.length < 1000) return false;
  }
  throw new Error("No se pudo comprobar el correo por el volumen de cuentas.");
}

async function loadAdminUsers(
  configuration: ReturnType<typeof getConfiguration>,
): Promise<ManagedAccount[]> {
  const presenceUrl = new URL("/rest/v1/admin_presence", configuration.url);
  presenceUrl.searchParams.set("select", "user_id,email,last_seen_at");
  presenceUrl.searchParams.set("order", "email.asc");
  const presenceResponse = await fetch(presenceUrl, { headers: serviceHeaders(configuration.serviceRoleKey) });
  if (!presenceResponse.ok) throw new Error("No se pudo cargar la lista de usuarios permitidos.");
  const presenceRows = await presenceResponse.json();

  const authUsersById = new Map<string, Record<string, unknown>>();
  for (let page = 1; page <= 100; page += 1) {
    const usersUrl = new URL("/auth/v1/admin/users", configuration.url);
    usersUrl.searchParams.set("page", String(page));
    usersUrl.searchParams.set("per_page", "1000");
    const usersResponse = await fetch(usersUrl, { headers: serviceHeaders(configuration.serviceRoleKey) });
    if (!usersResponse.ok) throw new Error("No se pudo consultar el estado de las invitaciones.");
    const result = await usersResponse.json();
    const users = Array.isArray(result?.users) ? result.users as Record<string, unknown>[] : [];
    for (const account of users) authUsersById.set(String(account.id), account);
    if (users.length < 1000) break;
    if (page === 100) throw new Error("No se pudo consultar el estado por el volumen de cuentas.");
  }

  return (presenceRows as PresenceRecord[]).flatMap((presence): ManagedAccount[] => {
    const account = authUsersById.get(presence.user_id);
    const appMetadata = account?.app_metadata as Record<string, unknown> | undefined;
    const userMetadata = account?.user_metadata as Record<string, unknown> | undefined;
    const role = appMetadata?.role;
    if (!account || !isAppRole(role)) return [];
    const invitedAt = typeof account.invited_at === "string" ? account.invited_at : null;
    const confirmedAt = typeof account.confirmed_at === "string" ? account.confirmed_at : null;
    return [{
      user_id: presence.user_id,
      email: typeof account.email === "string" ? account.email : presence.email,
      name: typeof userMetadata?.full_name === "string"
        ? userMetadata.full_name
        : typeof userMetadata?.name === "string"
          ? userMetadata.name
          : typeof userMetadata?.display_name === "string"
            ? userMetadata.display_name
            : typeof account.email === "string" ? account.email : presence.email,
      role,
      last_seen_at: presence.last_seen_at,
      is_pending: Boolean(invitedAt && !confirmedAt),
    }];
  });
}

async function getAuthorizedAccount(configuration: ReturnType<typeof getConfiguration>, userId: string) {
  const presenceUrl = new URL("/rest/v1/admin_presence", configuration.url);
  presenceUrl.searchParams.set("user_id", `eq.${userId}`);
  presenceUrl.searchParams.set("select", "user_id");
  const presenceResponse = await fetch(presenceUrl, { headers: serviceHeaders(configuration.serviceRoleKey) });
  if (!presenceResponse.ok) throw new Error("No se pudo verificar la cuenta seleccionada.");
  const presenceRows = await presenceResponse.json();
  if (!Array.isArray(presenceRows) || presenceRows.length !== 1) return null;

  const userUrl = new URL(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, configuration.url);
  const userResponse = await fetch(userUrl, { headers: serviceHeaders(configuration.serviceRoleKey) });
  if (!userResponse.ok) throw new Error("No se pudo verificar el usuario en Supabase Auth.");
  const targetUser = await userResponse.json();
  const role = targetUser?.app_metadata?.role;
  if (!isAppRole(role)) return null;
  const isPending = Boolean(targetUser.invited_at && !targetUser.confirmed_at);
  return { user: targetUser, role, is_pending: isPending };
}

async function deleteAuthorizedAccount(configuration: ReturnType<typeof getConfiguration>, userId: string) {
  const authorizedAccount = await getAuthorizedAccount(configuration, userId);
  if (!authorizedAccount) throw new Error("La cuenta seleccionada ya no está autorizada.");

  const userUrl = new URL(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, configuration.url);
  const response = await fetch(userUrl, {
    method: "DELETE",
    headers: serviceHeaders(configuration.serviceRoleKey),
  });
  if (!response.ok) throw new Error("Supabase no pudo eliminar la cuenta seleccionada.");
}

async function updateAuthorizedAccountRole(
  configuration: ReturnType<typeof getConfiguration>,
  userId: string,
  role: string,
) {
  const authorizedAccount = await getAuthorizedAccount(configuration, userId);
  if (!authorizedAccount) throw new Error("La cuenta seleccionada ya no está autorizada.");

  const userUrl = new URL(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, configuration.url);
  const response = await fetch(userUrl, {
    method: "PUT",
    headers: { ...serviceHeaders(configuration.serviceRoleKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      app_metadata: { ...authorizedAccount.user.app_metadata, role },
    }),
  });
  if (!response.ok) throw new Error("Supabase no pudo actualizar el rol de la cuenta.");
}

async function recordAdminActivity(
  configuration: ReturnType<typeof getConfiguration>,
  actorUserId: string,
  actorEmail: string,
  action: string,
  message: string,
) {
  const response = await fetch(new URL("/rest/v1/admin_activity_logs", configuration.url), {
    method: "POST",
    headers: {
      ...serviceHeaders(configuration.serviceRoleKey),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      action,
      message,
      actor_user_id: actorUserId,
      actor_email: actorEmail,
    }),
  });
  if (!response.ok) {
    throw new Error("La operación de cuenta se realizó, pero no se pudo registrar en Logs. Revisa la migración de actividad.");
  }
}

async function inviteAccount(configuration: ReturnType<typeof getConfiguration>, email: string, role: string) {
  const inviteUrl = new URL("/auth/v1/invite", configuration.url);
  const redirectUrl = new URL("/Admin/admin.html", siteUrl);
  redirectUrl.searchParams.set("password_setup", "1");
  inviteUrl.searchParams.set("redirect_to", redirectUrl.href);
  const inviteResponse = await fetch(inviteUrl, {
    method: "POST",
    headers: { ...serviceHeaders(configuration.serviceRoleKey), "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const invitedUser = await inviteResponse.json().catch(() => null);
  if (!inviteResponse.ok || !invitedUser?.id) {
    throw new Error("No se pudo enviar la invitación. Verifica el correo y la configuración de correo de Supabase.");
  }

  const updateUrl = new URL(`/auth/v1/admin/users/${encodeURIComponent(invitedUser.id)}`, configuration.url);
  const updateResponse = await fetch(updateUrl, {
    method: "PUT",
    headers: { ...serviceHeaders(configuration.serviceRoleKey), "Content-Type": "application/json" },
    body: JSON.stringify({ app_metadata: { ...invitedUser.app_metadata, role } }),
  });
  if (!updateResponse.ok) {
    await deleteInvitedAccount(configuration, invitedUser.id);
    throw new Error("Supabase no pudo asignar el rol. La invitación se canceló.");
  }

  const presenceUrl = new URL("/rest/v1/admin_presence?on_conflict=user_id", configuration.url);
  const presenceResponse = await fetch(presenceUrl, {
    method: "POST",
    headers: {
      ...serviceHeaders(configuration.serviceRoleKey),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ user_id: invitedUser.id, email, last_seen_at: null }),
  });
  if (!presenceResponse.ok) {
    await deleteInvitedAccount(configuration, invitedUser.id);
    throw new Error("No se pudo registrar la cuenta. La invitación se canceló.");
  }
  return invitedUser;
}

async function deleteInvitedAccount(configuration: ReturnType<typeof getConfiguration>, userId: string) {
  const response = await fetch(
    new URL(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, configuration.url),
    { method: "DELETE", headers: serviceHeaders(configuration.serviceRoleKey) },
  );
  if (!response.ok) {
    throw new Error("No se pudo cancelar la invitación incompleta en Supabase Auth.");
  }
}

function getTokenIssuedAt(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const issuedAt = JSON.parse(decoded).iat;
    return Number.isInteger(issuedAt) ? issuedAt as number : null;
  } catch {
    return null;
  }
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUserId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && ALLOWED_ROLES.includes(value as AppRole);
}

function serviceHeaders(serviceRoleKey: string) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return Response.json(body, { status, headers });
}
