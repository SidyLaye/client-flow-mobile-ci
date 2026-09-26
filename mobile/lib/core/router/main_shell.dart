import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Bottom-tab scaffold hosting the five StatefulShellRoute branches.
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  static const _tabs = [
    (icon: Icons.home_outlined, active: Icons.home, label: 'Accueil'),
    (icon: Icons.description_outlined, active: Icons.description, label: 'Documents'),
    (icon: Icons.inbox_outlined, active: Icons.inbox, label: 'Demandes'),
    (icon: Icons.chat_bubble_outline, active: Icons.chat_bubble, label: 'Messages'),
    (icon: Icons.person_outline, active: Icons.person, label: 'Profil'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: shell.currentIndex,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        backgroundColor: AppColors.surface,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        onTap: (index) => shell.goBranch(
          index,
          // Re-tapping the active tab pops it to its root (RN behavior).
          initialLocation: index == shell.currentIndex,
        ),
        items: [
          for (final t in _tabs)
            BottomNavigationBarItem(
              icon: Icon(t.icon),
              activeIcon: Icon(t.active),
              label: t.label,
            ),
        ],
      ),
    );
  }
}
