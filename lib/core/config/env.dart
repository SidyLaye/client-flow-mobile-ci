/// Compile-time configuration.
///
/// Values are injected with `--dart-define` / `--dart-define-from-file=.env`
/// (see `.env.example`). They must match the Supabase project used by the
/// ComptaFlow web app.
abstract final class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
