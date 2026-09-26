import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const body = await req.json();
    const { company_name, contact_first_name, contact_last_name, email, phone, address, siren, siret, vat_number, legal_form, business_activity, tax_regime, vat_regime, vat_frequency, fiscal_year_end } = body;

    if (!company_name?.trim()) {
      return jsonResponse({ error: "La raison sociale est obligatoire" }, 400);
    }

    const service = getServiceClient();
    const { data: client, error } = await service.from("clients").insert({
      company_name: company_name.trim(),
      contact_first_name: contact_first_name?.trim() || null,
      contact_last_name: contact_last_name?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      siren: siren?.trim() || null,
      siret: siret?.trim() || null,
      vat_number: vat_number?.trim() || null,
      legal_form: legal_form?.trim() || null,
      business_activity: business_activity?.trim() || null,
      tax_regime: tax_regime || null,
      vat_regime: vat_regime || null,
      vat_frequency: vat_frequency || null,
      fiscal_year_end: fiscal_year_end || null,
      created_by: auth.userId,
      assigned_admin_id: auth.userId,
      status: "active",
    }).select().single();

    if (error) {
      return jsonResponse({ error: "Erreur lors de la création du client", details: error.message }, 500);
    }

    await writeAuditLog(auth.userId, "client_created", "client", client.id, { company_name: client.company_name });

    return jsonResponse({ client });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
