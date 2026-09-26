import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Equivalent of React Navigation's popToTop(): pops every pushed full-screen
/// route so the bottom-tab shell is on top again (whichever tab was active).
void popToTop(BuildContext context) {
  final router = GoRouter.of(context);
  while (router.canPop()) {
    router.pop();
  }
}
