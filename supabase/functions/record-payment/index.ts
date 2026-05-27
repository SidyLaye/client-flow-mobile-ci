import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const { invoice_id, amount, payment_date, payment_method, reference, notes } = await req.json();

    if (!invoice_id) return jsonResponse({ error: "invoice_id est obligatoire" }, 400);
    if (!amount || amount <= 0) return jsonResponse({ error: "Le montant doit être > 0" }, 400);
    if (!payment_date) return jsonResponse({ error: "La date de paiement est obligatoire" }, 400);

    const service = getServiceClient();

    const { data: invoice } = await service.from("invoices")
      .select("id, total_ttc, amount_paid, amount_due, client_id")
      .eq("id", invoice_id).single();

    if (!invoice) return jsonResponse({ error: "Facture introuvable" }, 404);

    const { error } = await service.from("invoice_payments").insert({
      invoice_id,
      amount: r2(amount),
      payment_date,
      payment_method: payment_method || null,
      reference: reference || null,
      notes: notes?.trim() || null,
      created_by: auth.userId,
    });

    if (error) return jsonResponse({ error: "Erreur d'enregistrement", details: error.message }, 500);

    // Recalculate
    const newAmountPaid = r2((Number(invoice.amount_paid) || 0) + amount);
    const newAmountDue = r2((Number(invoice.total_ttc) || 0) - newAmountPaid);
    let paymentStatus = "unpaid";
    if (newAmountDue <= 0) paymentStatus = "paid";
    else if (newAmountPaid > 0) paymentStatus = "partial";

    let invoiceStatus: string | undefined;
    if (paymentStatus === "paid") invoiceStatus = "paid";
    else if (paymentStatus === "partial") invoiceStatus = "partially_paid";

    const updateData: Record<string, unknown> = {
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      payment_status: paymentStatus,
    };
    if (invoiceStatus) updateData.status = invoiceStatus;

    await service.from("invoices").update(updateData).eq("id", invoice_id);

    await writeAuditLog(auth.userId, "payment_recorded", "invoice", invoice_id, { amount: r2(amount), payment_status: paymentStatus });

    return jsonResponse({ success: true, amount_paid: newAmountPaid, amount_due: Math.max(0, newAmountDue), payment_status: paymentStatus });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
