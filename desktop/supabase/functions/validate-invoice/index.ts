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
      .select("id, status, type, client_id")
      .eq("id", invoice_id).single();

    if (!invoice) return jsonResponse({ error: "Facture introuvable" }, 404);
    if (invoice.status !== "draft") return jsonResponse({ error: "Seuls les brouillons peuvent être validés" }, 400);

    // Generate number
    const prefixMap: Record<string, string> = { invoice: "FAC", quote: "DEV", credit_note: "AV" };
    const { data: settings } = await service.from("settings").select("invoice_prefix, quote_prefix, credit_note_prefix").limit(1).maybeSingle();

    let prefix = prefixMap[invoice.type];
    if (settings) {
      if (invoice.type === "invoice" && settings.invoice_prefix) prefix = settings.invoice_prefix;
      if (invoice.type === "quote" && settings.quote_prefix) prefix = settings.quote_prefix;
      if (invoice.type === "credit_note" && settings.credit_note_prefix) prefix = settings.credit_note_prefix;
    }

    const year = new Date().getFullYear();
    const { count } = await service.from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("type", invoice.type)
      .neq("status", "draft")
      .gte("created_at", `${year}-01-01`);

    const seq = String((count || 0) + 1).padStart(4, "0");
    const number = `${prefix}-${year}-${seq}`;

    const { error } = await service.from("invoices").update({
      number,
      status: "validated",
      validated_at: new Date().toISOString(),
    }).eq("id", invoice_id);

    if (error) return jsonResponse({ error: "Erreur de validation", details: error.message }, 500);

    await writeAuditLog(auth.userId, "invoice_validated", "invoice", invoice_id, { number });

    return jsonResponse({ success: true, number });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
