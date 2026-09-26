import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const { client_id } = await req.json();
    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);

    const service = getServiceClient();

    // Verify client exists and the admin owns it.
    const { data: client, error: clientErr } = await service
      .from("clients")
      .select("id, company_name, assigned_admin_id")
      .eq("id", client_id)
      .maybeSingle();

    if (clientErr) return jsonResponse({ error: "Erreur lecture client", details: clientErr.message }, 500);
    if (!client) return jsonResponse({ error: "Client introuvable" }, 404);
    if (client.assigned_admin_id !== auth.userId) {
      return jsonResponse({ error: "Vous n'êtes pas propriétaire de ce client" }, 403);
    }

    // Find all auth users linked via client_accounts to delete them too.
    const { data: accounts } = await service
      .from("client_accounts")
      .select("user_id")
      .eq("client_id", client_id);

    const userIds = (accounts ?? []).map((a: { user_id: string }) => a.user_id).filter(Boolean);

    // Delete auth users (cascades to client_accounts, profiles, user_roles, etc.).
    for (const uid of userIds) {
      try {
        await service.auth.admin.deleteUser(uid);
      } catch (err) {
        console.error(`Failed to delete auth user ${uid}:`, err);
        // continue — we'll still delete the client; orphan auth users can be cleaned manually.
      }
    }

    // Delete the client (cascades to documents, messages, requests, invoices, etc.).
    const { error: delErr } = await service.from("clients").delete().eq("id", client_id);
    if (delErr) {
      return jsonResponse({ error: "Erreur suppression client", details: delErr.message }, 500);
    }

    await writeAuditLog(auth.userId, "client_deleted", "client", client_id, {
      company_name: client.company_name,
      auth_users_deleted: userIds.length,
    });

    return jsonResponse({ success: true, auth_users_deleted: userIds.length });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
