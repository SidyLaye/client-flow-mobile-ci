import { handleCors, requireAdmin, getServiceClient, writeAuditLog, jsonResponse } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await requireAdmin(req.headers.get("Authorization"));
    if (auth.error) return auth.error;

    const body = await req.json();
    const { client_id, username, email, password, can_access_mobile, can_access_web, access_status } = body;

    // Validate
    if (!client_id) return jsonResponse({ error: "client_id est obligatoire" }, 400);
    if (!username?.trim()) return jsonResponse({ error: "L'identifiant est obligatoire" }, 400);
    if (!email?.trim()) return jsonResponse({ error: "L'email est obligatoire" }, 400);
    if (!password || password.length < 8) return jsonResponse({ error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);

    const usernameClean = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{4,30}$/.test(usernameClean)) {
      return jsonResponse({ error: "Identifiant invalide: 4-30 car., minuscules, chiffres, . - _ uniquement" }, 400);
    }

    const service = getServiceClient();

    // Check client exists
    const { data: client } = await service.from("clients").select("id, company_name").eq("id", client_id).single();
    if (!client) return jsonResponse({ error: "Client introuvable" }, 404);

    // Check no existing account
    const { data: existingAccount } = await service.from("client_accounts").select("id").eq("client_id", client_id).maybeSingle();
    if (existingAccount) return jsonResponse({ error: "Ce client a déjà un compte d'accès" }, 409);

    // Check username uniqueness
    const { data: existingUsername } = await service.from("profiles").select("id").eq("username", usernameClean).maybeSingle();
    if (existingUsername) return jsonResponse({ error: "Cet identifiant est déjà utilisé" }, 409);

    // Create auth user
    const { data: authUser, error: authError } = await service.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });
    if (authError) {
      return jsonResponse({ error: "Erreur lors de la création du compte", details: authError.message }, 500);
    }

    const userId = authUser.user.id;

    // Update profile with username
    await service.from("profiles").update({
      username: usernameClean,
      first_name: null,
      last_name: null,
    }).eq("user_id", userId);

    // Assign client role
    await service.from("user_roles").insert({ user_id: userId, role: "client" });

    // Create client_accounts link
    const { error: accountError } = await service.from("client_accounts").insert({
      client_id,
      user_id: userId,
      access_status: access_status || "active",
      can_access_mobile: can_access_mobile ?? true,
      can_access_web: can_access_web ?? false,
      created_by: auth.userId,
    });

    if (accountError) {
      // Rollback: delete auth user
      await service.auth.admin.deleteUser(userId);
      return jsonResponse({ error: "Erreur lors de la liaison du compte", details: accountError.message }, 500);
    }

    await writeAuditLog(auth.userId, "client_access_created", "client_account", client_id, {
      username: usernameClean,
      email: email.trim(),
      company_name: client.company_name,
    });

    return jsonResponse({
      success: true,
      username: usernameClean,
      email: email.trim(),
      user_id: userId,
    });
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur", details: (e as Error).message }, 500);
  }
});
