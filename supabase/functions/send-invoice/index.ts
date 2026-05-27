import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const { invoice_id } = await req.json();
    if (!invoice_id) return jsonResponse({ error: "invoice_id est obligatoire" }, 400);

    const service = getServiceClient();
    const { data: invoice } = await service.from("invoices")
      .select("id, status, pdf_storage_path, client_id")
      .eq("id", invoice_id).single();

    if (!invoice) return jsonResponse({ error: "Facture introuvable" }, 404);
    if (!["validated", "sent"].includes(invoice.status)) {
      return jsonResponse({ error: "La facture doit être validée avant l'envoi" }, 400);
    }

    await service.from("invoices").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      visible_to_client: true,
    }).eq("id", invoice_id);

    // Notify client
    const { data: account } = await service.from("client_accounts").select("user_id").eq("client_id", invoice.client_id).maybeSingle();
    if (account) {
      await service.from("notifications").insert({
        user_id: account.user_id,
        type: "invoice",
        title: "Nouvelle facture disponible",
        body: "Une nouvelle facture est disponible dans votre espace.",
        related_invoice_id: invoice.id,
        related_client_id: invoice.client_id,
      });
    }

    await writeAuditLog(auth.userId, "invoice_sent", "invoice", invoice_id);

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
