import { handleCors, requireAdmin, getServiceClient, getAuthClient, writeAuditLog, jsonResponse, corsHeaders } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Non autorisé" }, 401);
    }

    const supabase = getAuthClient(authHeader);
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return jsonResponse({ error: "Token invalide" }, 401);

    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { client_id, body: messageBody, is_internal, related_document_id, related_request_id } = body;

    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);
    if (!messageBody?.trim()) return jsonResponse({ error: "Le message ne peut pas être vide" }, 400);

    const service = getServiceClient();

    // Check role
    const { data: role } = await service.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const isAdmin = role?.role === "admin";

    // Clients cannot send internal messages
    if (!isAdmin && is_internal) {
      return jsonResponse({ error: "Les clients ne peuvent pas envoyer de messages internes" }, 403);
    }

    // Clients can only message their own client_id
    if (!isAdmin) {
      const { data: account } = await service.from("client_accounts").select("client_id").eq("user_id", userId).maybeSingle();
      if (!account || account.client_id !== client_id) {
        return jsonResponse({ error: "Accès non autorisé" }, 403);
      }
    }

    const { data: message, error } = await service.from("messages").insert({
      client_id,
      sender_id: userId,
      body: messageBody.trim(),
      is_internal: isAdmin ? (is_internal || false) : false,
      related_document_id: related_document_id || null,
      related_request_id: related_request_id || null,
    }).select().single();

    if (error) return jsonResponse({ error: "Erreur lors de l'envoi", details: error.message }, 500);

    // Create notification for recipient
    if (isAdmin && !is_internal) {
      // Notify client
      const { data: account } = await service.from("client_accounts").select("user_id").eq("client_id", client_id).maybeSingle();
      if (account) {
        await service.from("notifications").insert({
          user_id: account.user_id,
          type: "message",
          title: "Nouveau message de votre comptable",
          body: messageBody.trim().substring(0, 100),
          related_message_id: message.id,
          related_client_id: client_id,
        });
      }
    }
    // If client sends, we could notify admin(s) — skipping for now

    await writeAuditLog(userId, "message_sent", "message", message.id, { client_id, is_internal: is_internal || false });

    return jsonResponse({ message });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
