/// Compile-time configuration.
///
/// Injected with `--dart-define` / `--dart-define-from-file=.env`
/// (see `.env.example`). Defaults to the deployed A2T Expertise backend so a
/// plain `flutter run` works.
abstract final class Env {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://test.allinone.ovh',
  );

  /// Interval between two checks for new messages / notifications while the
  /// matching screen is open (the REST backend has no push channel).
  static const pollSeconds = int.fromEnvironment('POLL_SECONDS', defaultValue: 10);
}
