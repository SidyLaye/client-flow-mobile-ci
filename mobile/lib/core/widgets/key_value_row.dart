import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Label / value row used on detail screens.
class KeyValueRow extends StatelessWidget {
  const KeyValueRow({
    super.key,
    required this.label,
    required this.value,
    this.card = true,
  });

  final String label;
  final String value;

  /// When true the row is wrapped in its own white card (document detail);
  /// when false it is a bare row meant to sit inside a shared card.
  final bool card;

  @override
  Widget build(BuildContext context) {
    final row = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted)),
        SizedBox(width: spacing(3)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
    if (!card) return row;
    return Container(
      padding: EdgeInsets.all(spacing(3)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: row,
    );
  }
}
