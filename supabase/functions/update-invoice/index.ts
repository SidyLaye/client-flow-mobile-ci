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
    const { invoice_id, issue_date, due_date, notes, terms, footer, items } = body;

    if (!invoice_id) return jsonResponse({ error: "invoice_id est obligatoire" }, 400);

    const service = getServiceClient();

    // Check invoice is editable
    const { data: invoice } = await service.from("invoices").select("id, status").eq("id", invoice_id).single();
    if (!invoice) return jsonResponse({ error: "Facture introuvable" }, 404);
    if (invoice.status !== "draft") return jsonResponse({ error: "Seuls les brouillons peuvent être modifiés" }, 400);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: "Au moins une ligne est requise" }, 400);
    }

    // Recalculate
    let subtotalHt = 0, totalDiscountHt = 0, totalVat = 0;
    const calculatedItems = items.map((item: any, i: number) => {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price_ht);
      const discountPct = Number(item.discount_percent || 0);
      const vatRate = Number(item.vat_rate || 0);
      const grossHt = r2(qty * price);
      const discount = r2(grossHt * discountPct / 100);
      const netHt = r2(grossHt - discount);
      const vat = r2(netHt * vatRate / 100);
      subtotalHt += grossHt;
      totalDiscountHt += discount;
      totalVat += vat;
      return {
        position: i + 1, label: item.label.trim(), description: item.description?.trim() || null,
        quantity: qty, unit: item.unit || null, unit_price_ht: price,
        discount_percent: discountPct, vat_rate: vatRate,
        line_total_ht: netHt, line_total_ttc: r2(netHt + vat),
      };
    });

    subtotalHt = r2(subtotalHt);
    totalDiscountHt = r2(totalDiscountHt);
    totalVat = r2(totalVat);
    const totalTtc = r2(subtotalHt - totalDiscountHt + totalVat);

    // Update invoice
    await service.from("invoices").update({
      issue_date: issue_date || undefined,
      due_date: due_date || null,
      subtotal_ht: subtotalHt, total_discount_ht: totalDiscountHt,
      total_vat: totalVat, total_ttc: totalTtc,
      amount_due: r2(totalTtc - (invoice as any).amount_paid || 0),
      notes: notes?.trim() || null, terms: terms?.trim() || null, footer: footer?.trim() || null,
    }).eq("id", invoice_id);

    // Replace items
    await service.from("invoice_items").delete().eq("invoice_id", invoice_id);
    await service.from("invoice_items").insert(calculatedItems.map((item: any) => ({ ...item, invoice_id })));

    await writeAuditLog(auth.userId, "invoice_updated", "invoice", invoice_id, { total_ttc: totalTtc });

    return jsonResponse({ success: true, total_ttc: totalTtc });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 400);
  }
});
