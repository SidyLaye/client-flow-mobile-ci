import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const { client_id, action } = await req.json();
    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);

    const validActions = ["suspend", "reactivate", "disable"];
    if (!validActions.includes(action)) {
      return jsonResponse({ error: "Action invalide. Valeurs possibles: suspend, reactivate, disable" }, 400);
    }

    const statusMap: Record<string, string> = {
      suspend: "suspended",
      reactivate: "active",
      disable: "disabled",
    };
    const newStatus = statusMap[action];

    const service = getServiceClient();
    const { data: account, error } = await service
      .from("client_accounts")
      .update({ access_status: newStatus })
      .eq("client_id", client_id)
      .select()
      .single();

    if (error || !account) {
      return jsonResponse({ error: "Compte introuvable ou erreur de mise à jour" }, 404);
    }

    const actionLabels: Record<string, string> = {
      suspend: "client_access_suspended",
      reactivate: "client_access_reactivated",
      disable: "client_access_disabled",
    };

    await writeAuditLog(auth.userId, actionLabels[action], "client_account", client_id);

    return jsonResponse({ success: true, access_status: newStatus });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
