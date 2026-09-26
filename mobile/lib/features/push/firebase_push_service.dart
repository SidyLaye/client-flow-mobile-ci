import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' show Color;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../core/api/api_client.dart';
import '../../core/config/env.dart';
import 'push_service.dart';

/// FCM-backed [PushService]. The FCM registration token of the device is
/// stored by the backend (`/api/v1/client-portal/push-tokens/`) so the server
/// can deliver notifications through FCM HTTP v1.
///
/// If Firebase isn't configured (no `google-services.json` /
/// `GoogleService-Info.plist` / `firebase_options.dart`), initialization logs
/// a warning and every other method becomes a no-op.
class FirebasePushService implements PushService {
  FirebasePushService(this._api);

  final ApiClient _api;
  final _local = FlutterLocalNotificationsPlugin();
  final _taps = StreamController<PushTapPayload>.broadcast();

  bool _enabled = false;

  static const _channel = AndroidNotificationChannel(
    'default',
    'Notifications',
    importance: Importance.high,
    ledColor: Color(0xFF1E5BCC),
  );

  /// Firebase options passed with `--dart-define`, or null to let the native
  /// config files (`google-services.json` / `GoogleService-Info.plist`) apply.
  static FirebaseOptions? _optionsFromEnv() {
    final appId = Platform.isIOS ? Env.firebaseIosAppId : Env.firebaseAndroidAppId;
    if (Env.firebaseProjectId.isEmpty || Env.firebaseApiKey.isEmpty || appId.isEmpty) {
      return null;
    }
    return FirebaseOptions(
      apiKey: Env.firebaseApiKey,
      appId: appId,
      messagingSenderId: Env.firebaseSenderId,
      projectId: Env.firebaseProjectId,
      iosBundleId: Platform.isIOS ? 'com.comptaflow.client' : null,
    );
  }

  @override
  Stream<PushTapPayload> get onNotificationTap => _taps.stream;

  @override
  Future<void> initialize() async {
    try {
      await Firebase.initializeApp(options: _optionsFromEnv());
      _enabled = true;
    } catch (e) {
      debugPrint(
        '[push] Firebase not configured, push disabled. '
        'Run `flutterfire configure` to enable it. ($e)',
      );
      return;
    }

    try {
      await _setupLocalNotifications();

      final messaging = FirebaseMessaging.instance;

      // Show banners + sounds for foreground notifications too (iOS).
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // Android needs a local notification to surface a foreground message.
      FirebaseMessaging.onMessage.listen(_showForegroundNotification);

      FirebaseMessaging.onMessageOpenedApp.listen(
        (m) => _emitTap(PushTapPayload.fromData(m.data)),
      );

      final initial = await messaging.getInitialMessage();
      if (initial != null) _emitTap(PushTapPayload.fromData(initial.data));
    } catch (e) {
      debugPrint('[push] setup failed ${e.toString()}');
    }
  }

  Future<void> _setupLocalNotifications() async {
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );
    await _local.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: (response) {
        final raw = response.payload;
        if (raw == null || raw.isEmpty) return;
        try {
          final data = jsonDecode(raw) as Map<String, dynamic>;
          _emitTap(PushTapPayload.fromData(data));
        } catch (_) {}
      },
    );

    final launch = await _local.getNotificationAppLaunchDetails();
    final payload = launch?.notificationResponse?.payload;
    if (launch?.didNotificationLaunchApp == true && payload != null) {
      try {
        _emitTap(
          PushTapPayload.fromData(jsonDecode(payload) as Map<String, dynamic>),
        );
      } catch (_) {}
    }

    if (Platform.isAndroid) {
      await _local
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
    }
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    if (!Platform.isAndroid) return;
    final n = message.notification;
    if (n == null) return;
    await _local.show(
      id: message.hashCode,
      title: n.title,
      body: n.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          importance: Importance.high,
          priority: Priority.high,
          vibrationPattern: Int64List.fromList([0, 250, 250, 250]),
          color: const Color(0xFF1E5BCC),
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  void _emitTap(PushTapPayload payload) {
    if (!payload.isEmpty) _taps.add(payload);
  }

  Future<String?> _getToken() async {
    if (!_enabled) return null;
    final messaging = FirebaseMessaging.instance;

    var settings = await messaging.getNotificationSettings();
    if (settings.authorizationStatus == AuthorizationStatus.notDetermined) {
      settings = await messaging.requestPermission();
    }
    final granted = settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
    if (!granted) {
      debugPrint('[push] Permission denied');
      return null;
    }
    return messaging.getToken();
  }

  Future<String?> _deviceName() async {
    try {
      final info = DeviceInfoPlugin();
      if (Platform.isAndroid) return (await info.androidInfo).model;
      if (Platform.isIOS) return (await info.iosInfo).name;
    } catch (_) {}
    return null;
  }

  @override
  Future<void> register(String userId) async {
    if (!_enabled) return;
    try {
      final token = await _getToken();
      if (token == null) return;
      await _api.post('/api/v1/client-portal/push-tokens/', body: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
        'device_name': (await _deviceName()) ?? '',
      });
    } catch (e) {
      debugPrint('[push] registration failed ${e.toString()}');
    }
  }

  @override
  Future<void> unregister(String userId) async {
    if (!_enabled) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await _api.delete(
        '/api/v1/client-portal/push-tokens/',
        body: {'token': token},
      );
    } catch (e) {
      debugPrint('[push] unregister failed ${e.toString()}');
    }
  }
}
