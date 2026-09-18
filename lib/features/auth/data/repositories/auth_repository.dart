import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/supabase/supabase_service.dart';
import '../models/client_account.dart';

class AuthRepository {
  AuthRepository(this._supabase);

  final SupabaseService _supabase;

  Session? get currentSession => _supabase.auth.currentSession;

  Stream<AuthState> get onAuthStateChange => _supabase.auth.onAuthStateChange;

  Future<void> signIn({required String email, required String password}) {
    return _supabase.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> signOut() => _supabase.auth.signOut();

  /// Loads the `client_accounts` row for [userId]; `null` if none or on error.
  Future<ClientAccount?> loadClientAccount(String userId) async {
    try {
      final data = await _supabase
          .from('client_accounts')
          .select('id, client_id, user_id, access_status, can_access_mobile')
          .eq('user_id', userId)
          .maybeSingle();
      if (data == null) return null;
      return ClientAccount.fromJson(data);
    } on PostgrestException catch (e) {
      debugPrint('[auth] load client_account failed ${e.message}');
      return null;
    } catch (e) {
      // Network errors etc. — treat as "no account" so the router can still
      // settle on the login screen instead of hanging on the splash.
      debugPrint('[auth] load client_account failed $e');
      return null;
    }
  }
}
