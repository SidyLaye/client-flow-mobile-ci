import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'core/supabase/supabase_service.dart';
import 'features/push/firebase_push_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  await SupabaseService.initialize();
  const supabase = SupabaseService();

  final push = FirebasePushService(supabase);
  await push.initialize();

  runApp(ComptaFlowApp(supabase: supabase, pushService: push));
}
