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

  /// Firebase (push notifications). Values from the Firebase console →
  /// Project settings → Your apps. When empty, the app falls back to
  /// `google-services.json` / `GoogleService-Info.plist`, and without those
  /// push is disabled.
  static const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const firebaseSenderId = String.fromEnvironment('FIREBASE_SENDER_ID');
  static const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const firebaseAndroidAppId = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  static const firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
}
