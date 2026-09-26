import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const body = await req.json();
    const { client_id, title, description, requested_type, due_date, priority } = body;

    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);
    if (!title?.trim()) return jsonResponse({ error: "Le titre est obligatoire" }, 400);

    const service = getServiceClient();

    // Verify client exists
    const { data: client } = await service.from("clients").select("id, status").eq("id", client_id).single();
    if (!client) return jsonResponse({ error: "Client introuvable" }, 404);
    if (client.status === "archived") return jsonResponse({ error: "Impossible d'envoyer une demande à un client archivé" }, 400);

    const { data: request, error } = await service.from("document_requests").insert({
      client_id,
      created_by: auth.userId,
      title: title.trim(),
      description: description?.trim() || null,
      requested_type: requested_type || null,
      due_date: due_date || null,
      priority: priority || "normal",
      status: "sent",
    }).select().single();

    if (error) return jsonResponse({ error: "Erreur lors de la création", details: error.message }, 500);

    // Create notification for client
    const { data: account } = await service.from("client_accounts").select("user_id").eq("client_id", client_id).maybeSingle();
    if (account) {
      await service.from("notifications").insert({
        user_id: account.user_id,
        type: "document_request",
        title: "Nouvelle demande de document",
        body: title.trim(),
        related_client_id: client_id,
      });
    }

    await writeAuditLog(auth.userId, "document_request_sent", "document_request", request.id, { title: title.trim() });

    return jsonResponse({ request });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
