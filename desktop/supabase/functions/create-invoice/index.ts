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

    const body = await req.json();
    const { client_id, type, issue_date, due_date, notes, terms, footer, items, source_quote_id } = body;

    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);
    if (!["invoice", "quote", "credit_note"].includes(type)) return jsonResponse({ error: "Type invalide" }, 400);
    if (!issue_date) return jsonResponse({ error: "La date d'émission est obligatoire" }, 400);
    if (!items || !Array.isArray(items) || items.length === 0) return jsonResponse({ error: "Au moins une ligne est requise" }, 400);

    // Validate and calculate items
    let subtotalHt = 0;
    let totalDiscountHt = 0;
    let totalVat = 0;

    const calculatedItems = items.map((item: any, i: number) => {
      if (!item.label?.trim()) throw new Error(`Ligne ${i + 1}: désignation obligatoire`);
      if (!item.quantity || item.quantity <= 0) throw new Error(`Ligne ${i + 1}: quantité > 0 requise`);
      if (item.unit_price_ht == null || item.unit_price_ht < 0) throw new Error(`Ligne ${i + 1}: prix unitaire ≥ 0 requis`);

      const qty = Number(item.quantity);
      const price = Number(item.unit_price_ht);
      const discountPct = Number(item.discount_percent || 0);
      const vatRate = Number(item.vat_rate || 0);

      const grossHt = r2(qty * price);
      const discount = r2(grossHt * discountPct / 100);
      const netHt = r2(grossHt - discount);
      const vat = r2(netHt * vatRate / 100);
      const ttc = r2(netHt + vat);

      subtotalHt += grossHt;
      totalDiscountHt += discount;
      totalVat += vat;

      return {
        position: i + 1,
        label: item.label.trim(),
        description: item.description?.trim() || null,
        quantity: qty,
        unit: item.unit || null,
        unit_price_ht: price,
        discount_percent: discountPct,
        vat_rate: vatRate,
        line_total_ht: netHt,
        line_total_ttc: ttc,
      };
    });

    subtotalHt = r2(subtotalHt);
    totalDiscountHt = r2(totalDiscountHt);
    totalVat = r2(totalVat);
    const totalTtc = r2(subtotalHt - totalDiscountHt + totalVat);

    const service = getServiceClient();

    const { data: invoice, error } = await service.from("invoices").insert({
      client_id,
      type,
      status: "draft",
      issue_date,
      due_date: due_date || null,
      subtotal_ht: subtotalHt,
      total_discount_ht: totalDiscountHt,
      total_vat: totalVat,
      total_ttc: totalTtc,
      amount_paid: 0,
      amount_due: totalTtc,
      payment_status: "unpaid",
      notes: notes?.trim() || null,
      terms: terms?.trim() || null,
      footer: footer?.trim() || null,
      source_quote_id: source_quote_id || null,
      created_by: auth.userId,
    }).select().single();

    if (error) return jsonResponse({ error: "Erreur lors de la création", details: error.message }, 500);

    // Insert items
    const itemsToInsert = calculatedItems.map((item: any) => ({ ...item, invoice_id: invoice.id }));
    const { error: itemsError } = await service.from("invoice_items").insert(itemsToInsert);
    if (itemsError) {
      await service.from("invoices").delete().eq("id", invoice.id);
      return jsonResponse({ error: "Erreur lors de l'ajout des lignes", details: itemsError.message }, 500);
    }

    await writeAuditLog(auth.userId, "invoice_created", "invoice", invoice.id, { type, total_ttc: totalTtc });

    return jsonResponse({ invoice, items: calculatedItems });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 400);
  }
});
