import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class LoadingCenter extends StatelessWidget {
  const LoadingCenter({super.key, this.color = AppColors.primary});

  final Color color;

  @override
  Widget build(BuildContext context) =>
      Center(child: CircularProgressIndicator(color: color));
}

class EmptyMessage extends StatelessWidget {
  const EmptyMessage(this.text, {super.key, this.topMargin = 8});

  final String text;
  final double topMargin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: spacing(topMargin)),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(color: AppColors.textMuted),
      ),
    );
  }
}

class ErrorMessage extends StatelessWidget {
  const ErrorMessage(this.text, {super.key, this.onRetry});

  final String text;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(spacing(6)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.danger),
            ),
            if (onRetry != null) ...[
              SizedBox(height: spacing(3)),
              TextButton(onPressed: onRetry, child: const Text('Réessayer')),
            ],
          ],
        ),
      ),
    );
  }
}

/// White rounded card shared by several pages.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({
    super.key,
    required this.child,
    this.padding,
    this.radius = AppRadius.md,
    this.border,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;
  final BoxBorder? border;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding ?? EdgeInsets.all(spacing(3)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(radius),
        border: border,
      ),
      child: child,
    );
  }
}
