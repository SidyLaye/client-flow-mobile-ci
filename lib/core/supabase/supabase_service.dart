import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';

/// Thin wrapper around the Supabase singleton so repositories depend on an
/// injectable object instead of a global.
class SupabaseService {
  const SupabaseService();

  static Future<void> initialize() async {
    if (!Env.isConfigured) {
      // Surfaces a clear error early instead of cryptic 401s downstream.
      debugPrint(
        '[supabase] Missing SUPABASE_URL / SUPABASE_ANON_KEY. '
        'Run with --dart-define-from-file=.env (see .env.example).',
      );
    }
    await Supabase.initialize(
      url: Env.supabaseUrl,
      publishableKey: Env.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
        autoRefreshToken: true,
      ),
    );
  }

  SupabaseClient get client => Supabase.instance.client;
  GoTrueClient get auth => client.auth;
  SupabaseStorageClient get storage => client.storage;

  SupabaseQueryBuilder from(String table) => client.from(table);

  /// Invokes an Edge Function and returns its decoded JSON body.
  Future<T> invokeFunction<T>(String name, Map<String, dynamic> body) async {
    final res = await client.functions.invoke(name, body: body);
    return res.data as T;
  }
}
