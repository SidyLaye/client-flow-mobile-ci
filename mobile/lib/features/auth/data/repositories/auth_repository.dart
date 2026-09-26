import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../../core/api/api_client.dart';
import '../models/client_account.dart';

/// Identity of a signed-in client: the user plus its client record.
class PortalIdentity {
  const PortalIdentity({required this.user, required this.account});

  final AuthUser user;
  final ClientAccount account;
}

/// Signals that the stored credentials are not usable any more.
class NotAClientAccountException implements Exception {
  const NotAClientAccountException();

  @override
  String toString() =>
      "Ce compte n'a pas accès à l'espace client. Contactez votre cabinet.";
}

class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  static const mePath = '/api/v1/client-portal/me/';

  /// Fires when the backend refuses the session (expired, password reset or
  /// access suspended by the cabinet).
  Stream<void> get onSessionExpired => _api.onSessionExpired;

  Future<bool> hasStoredSession() => _api.hasSession();

  /// Identity saved at the last successful sign-in / refresh, if any.
  Future<PortalIdentity?> cachedIdentity() async {
    final raw = await _api.tokens.profile;
    if (raw == null) return null;
    try {
      return _identityFrom(jsonDecode(raw) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[auth] cached profile unreadable $e');
      return null;
    }
  }

  /// Loads the identity from the server and caches it.
  /// Throws [NotAClientAccountException] for a cabinet (staff) account.
  Future<PortalIdentity> fetchIdentity() async {
    try {
      final data = await _api.get(mePath) as Map<String, dynamic>;
      await _api.tokens.saveProfile(jsonEncode(data));
      return _identityFrom(data);
    } on ApiException catch (e) {
      if (e.statusCode == 403) throw const NotAClientAccountException();
      rethrow;
    }
  }

  /// Signs in and returns the identity. A staff account is rejected and its
  /// tokens discarded immediately.
  Future<PortalIdentity> signIn({
    required String email,
    required String password,
  }) async {
    await _api.login(email, password);
    try {
      return await fetchIdentity();
    } on NotAClientAccountException {
      await _api.logout();
      rethrow;
    }
  }

  Future<void> signOut() => _api.logout();

  PortalIdentity _identityFrom(Map<String, dynamic> data) => PortalIdentity(
        user: ClientAccount.userFromMe(data),
        account: ClientAccount.fromMe(data),
      );
}
