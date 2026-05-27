import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const { client_id, new_password } = await req.json();
    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);
    if (!new_password || new_password.length < 8) return jsonResponse({ error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);

    const service = getServiceClient();
    const { data: account } = await service.from("client_accounts").select("user_id").eq("client_id", client_id).single();
    if (!account) return jsonResponse({ error: "Aucun compte d'accès trouvé pour ce client" }, 404);

    const { error } = await service.auth.admin.updateUserById(account.user_id, { password: new_password });
    if (error) return jsonResponse({ error: "Erreur lors de la réinitialisation", details: error.message }, 500);

    await writeAuditLog(auth.userId, "client_password_reset", "client_account", client_id);

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
