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

  /// Firebase project `mourad-7bf2a` (push notifications). These identify the
  /// app to Firebase and ship inside every APK anyway, so they are not secrets;
  /// override them with `--dart-define` to point at another project.
  static const firebaseProjectId =
      String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: 'mourad-7bf2a');
  static const firebaseSenderId =
      String.fromEnvironment('FIREBASE_SENDER_ID', defaultValue: '936143555424');
  static const firebaseApiKey = String.fromEnvironment(
    'FIREBASE_API_KEY',
    defaultValue: 'AIzaSyBaZNr_G_giCw-RkJuDBMAfOUzSb9s_7TY',
  );
  static const firebaseAndroidAppId = String.fromEnvironment(
    'FIREBASE_ANDROID_APP_ID',
    defaultValue: '1:936143555424:android:51c33969369cc1efab2c05',
  );
  static const firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
}
