import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Equivalent of the old Alert.alert(title, message) helper.
Future<void> showAlert(
  BuildContext context, {
  required String title,
  String? message,
  String okLabel = 'OK',
  VoidCallback? onOk,
}) {
  return showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: message == null ? null : Text(message),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(ctx).pop();
            onOk?.call();
          },
          child: Text(okLabel),
        ),
      ],
    ),
  );
}

/// Two-button confirmation. Resolves to true when the confirm action was
/// chosen.
Future<bool> showConfirm(
  BuildContext context, {
  required String title,
  required String message,
  String cancelLabel = 'Annuler',
  required String confirmLabel,
  bool destructive = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(cancelLabel),
        ),
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          style: destructive
              ? TextButton.styleFrom(foregroundColor: AppColors.danger)
              : null,
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}
