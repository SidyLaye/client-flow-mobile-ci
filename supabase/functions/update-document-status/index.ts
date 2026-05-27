import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const { document_id, status, internal_comment, client_comment } = await req.json();
    if (!document_id) return jsonResponse({ error: "document_id est obligatoire" }, 400);

    const validStatuses = ["received", "under_review", "validated", "rejected", "incomplete", "archived"];
    if (!validStatuses.includes(status)) {
      return jsonResponse({ error: `Statut invalide. Valeurs: ${validStatuses.join(", ")}` }, 400);
    }

    if (status === "rejected" && !client_comment?.trim()) {
      return jsonResponse({ error: "Un commentaire client est obligatoire pour un rejet" }, 400);
    }

    const service = getServiceClient();

    // Verify admin owns the client for this document
    const { data: docCheck } = await service.from("documents")
      .select("id, client_id, clients!inner(assigned_admin_id)")
      .eq("id", document_id)
      .single();

    if (!docCheck) return jsonResponse({ error: "Document introuvable" }, 404);

    const assignedAdmin = (docCheck as any).clients?.assigned_admin_id;
    if (assignedAdmin !== auth.userId) {
      return jsonResponse({ error: "Accès refusé" }, 403);
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (internal_comment !== undefined) updateData.internal_comment = internal_comment?.trim() || null;
    if (client_comment !== undefined) updateData.client_comment = client_comment?.trim() || null;

    const { data: doc, error } = await service.from("documents")
      .update(updateData)
      .eq("id", document_id)
      .select("id, client_id, file_name")
      .single();

    if (error || !doc) return jsonResponse({ error: "Erreur mise à jour" }, 500);

    // Notify client if rejected, validated, or incomplete
    if (["rejected", "validated", "incomplete"].includes(status)) {
      const { data: account } = await service.from("client_accounts").select("user_id").eq("client_id", doc.client_id).maybeSingle();
      if (account) {
        const titles: Record<string, string> = {
          validated: "Document validé",
          rejected: "Document refusé",
          incomplete: "Document incomplet",
        };
        await service.from("notifications").insert({
          user_id: account.user_id,
          type: "document_status",
          title: titles[status],
          body: doc.file_name,
          related_document_id: doc.id,
          related_client_id: doc.client_id,
        });
      }
    }

    await writeAuditLog(auth.userId, `document_${status}`, "document", document_id, { status });

    return jsonResponse({ success: true, document: doc });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
