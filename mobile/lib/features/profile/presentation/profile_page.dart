import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialogs.dart';
import '../../../core/widgets/states.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/profile_bloc.dart';
import '../data/notifications_repository.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthBloc>().state;
    return BlocProvider(
      create: (context) => ProfileBloc(
        repository: context.read<NotificationsRepository>(),
        clientId: auth.clientId!,
        userId: auth.user!.id,
      )..add(const ProfileStarted()),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  Future<void> _confirmSignOut(BuildContext context) async {
    final ok = await showConfirm(
      context,
      title: 'Se déconnecter ?',
      message: 'Vous devrez resaisir vos identifiants.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
    );
    if (ok && context.mounted) {
      context.read<AuthBloc>().add(const AuthSignOutRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = context.read<AuthBloc>().state.user?.email;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          final notifs = state.notifications;
          return ListView.separated(
            padding: EdgeInsets.all(spacing(3)),
            itemCount: notifs.length + 1,
            separatorBuilder: (_, _) => SizedBox(height: spacing(2)),
            itemBuilder: (context, i) {
              if (i == 0) {
                return _Header(
                  company: state.companyName,
                  email: email,
                  onSignOut: () => _confirmSignOut(context),
                  showEmpty: notifs.isEmpty &&
                      state.status != ProfileStatus.loading,
                );
              }
              final n = notifs[i - 1];
              return _NotificationRow(
                notification: n,
                onTap: () {
                  context.read<ProfileBloc>().add(NotificationReadRequested(n.id));
                  // Open what the notification is about.
                  if (n.documentId case final id?) {
                    context.push(AppRoutes.documentDetail(id));
                  } else if (n.requestId case final id?) {
                    context.push(AppRoutes.requestDetail(id));
                  } else if (n.link == 'messages') {
                    context.go(AppRoutes.messages);
                  }
                },
              );
            },
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.company,
    required this.email,
    required this.onSignOut,
    required this.showEmpty,
  });

  final String company;
  final String? email;
  final VoidCallback onSignOut;
  final bool showEmpty;

  @override
  Widget build(BuildContext context) {
    final initial = (company.isNotEmpty ? company : (email ?? '?'))
        .substring(0, 1)
        .toUpperCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Column(
            children: [
              SizedBox(height: spacing(2)),
              CircleAvatar(
                radius: 36,
                backgroundColor: AppColors.primary,
                child: Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              SizedBox(height: spacing(2)),
              Text(
                company.isEmpty ? '—' : company,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                ),
              ),
              SizedBox(height: spacing(2)),
              Text(
                email ?? '',
                style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
              SizedBox(height: spacing(4)),
              OutlinedButton(
                onPressed: onSignOut,
                style: OutlinedButton.styleFrom(
                  backgroundColor: AppColors.surface,
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.danger),
                  padding: EdgeInsets.symmetric(
                    vertical: spacing(2),
                    horizontal: spacing(4),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                ),
                child: const Text(
                  'Se déconnecter',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: spacing(6)),
        const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text),
        ),
        if (showEmpty) const EmptyMessage('Aucune notification.', topMargin: 6),
      ],
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final unread = notification.unread;
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          padding: EdgeInsets.all(spacing(3)),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: unread
                ? const Border(
                    left: BorderSide(color: AppColors.primary, width: 3),
                  )
                : null,
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.text,
                      ),
                    ),
                    if (notification.body case final body? when body.isNotEmpty)
                      Padding(
                        padding: EdgeInsets.only(top: spacing(1)),
                        child: Text(
                          body,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (unread) ...[
                SizedBox(width: spacing(2)),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
