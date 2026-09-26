import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/api/token_store.dart';
import 'core/config/env.dart';
import 'features/push/firebase_push_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  final api = ApiClient(baseUrl: Env.apiUrl, tokenStore: SecureTokenStore());

  final push = FirebasePushService(api);
  await push.initialize();

  runApp(ComptaFlowApp(api: api, pushService: push));
}
