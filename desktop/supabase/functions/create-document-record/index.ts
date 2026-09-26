import { handleCors, getServiceClient, getAuthClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

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
    const service = getServiceClient();

    // Determine caller type: admin or client
    const { data: adminRole } = await service.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const isAdmin = !!adminRole;

    const body = await req.json();
    const { client_id, storage_path, original_file_name, file_name, mime_type, size_bytes, category, period_month, period_year, document_request_id, client_comment } = body;

    if (!storage_path?.trim()) return jsonResponse({ error: "storage_path est obligatoire" }, 400);
    if (!file_name?.trim()) return jsonResponse({ error: "file_name est obligatoire" }, 400);

    let resolvedClientId = client_id;

    if (!isAdmin) {
      // Client: resolve client_id from client_accounts
      const { data: account } = await service.from("client_accounts").select("client_id").eq("user_id", userId).maybeSingle();
      if (!account) return jsonResponse({ error: "Compte client introuvable" }, 403);
      resolvedClientId = account.client_id;
    } else {
      if (!client_id) return jsonResponse({ error: "client_id est obligatoire pour un admin" }, 400);
      // Verify admin owns client
      const { data: client } = await service.from("clients").select("id").eq("id", client_id).eq("assigned_admin_id", userId).maybeSingle();
      if (!client) return jsonResponse({ error: "Client introuvable ou non assigné" }, 404);
    }

    // Verify request belongs to same client if provided
    if (document_request_id) {
      const { data: request } = await service.from("document_requests").select("id, client_id").eq("id", document_request_id).maybeSingle();
      if (!request || request.client_id !== resolvedClientId) {
        return jsonResponse({ error: "Demande introuvable ou ne correspond pas au client" }, 400);
      }
    }

    const { data: doc, error } = await service.from("documents").insert({
      client_id: resolvedClientId,
      uploaded_by: userId,
      storage_path: storage_path.trim(),
      storage_bucket: "client-documents",
      file_name: file_name.trim(),
      original_file_name: original_file_name?.trim() || file_name.trim(),
      mime_type: mime_type || null,
      size_bytes: size_bytes || null,
      category: category || null,
      period_month: period_month || null,
      period_year: period_year || null,
      document_request_id: document_request_id || null,
      client_comment: client_comment?.trim() || null,
      status: "received",
      visible_to_client: true,
    }).select().single();

    if (error) return jsonResponse({ error: "Erreur lors de la création", details: error.message }, 500);

    // Notify admin if client uploaded
    if (!isAdmin) {
      const { data: client } = await service.from("clients").select("assigned_admin_id").eq("id", resolvedClientId).maybeSingle();
      if (client?.assigned_admin_id) {
        await service.from("notifications").insert({
          user_id: client.assigned_admin_id,
          type: "document_uploaded",
          title: "Nouveau document uploadé",
          body: file_name.trim(),
          related_document_id: doc.id,
          related_client_id: resolvedClientId,
        });
      }
    }

    await writeAuditLog(userId, "document_created", "document", doc.id, { file_name: file_name.trim() });

    return jsonResponse({ document: doc });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
