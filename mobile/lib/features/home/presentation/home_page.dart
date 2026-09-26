import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/states.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/home_bloc.dart';
import '../data/home_repository.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthBloc>().state;
    return BlocProvider(
      create: (context) => HomeBloc(
        repository: context.read<HomeRepository>(),
        clientId: auth.clientId!,
        userId: auth.user!.id,
      )..add(const HomeSummaryRequested()),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Accueil')),
      body: BlocBuilder<HomeBloc, HomeState>(
        builder: (context, state) {
          final s = state.summary;
          return RefreshIndicator(
            onRefresh: () async {
              final bloc = context.read<HomeBloc>();
              bloc.add(const HomeSummaryRequested());
              await bloc.stream.firstWhere((s) => !s.isLoading);
            },
            child: ListView(
              padding: EdgeInsets.all(spacing(4)),
              children: [
                const Text(
                  'Bonjour 👋',
                  style: TextStyle(fontSize: 14, color: AppColors.textMuted),
                ),
                Text(
                  state.status == HomeStatus.success ? s.companyName : '...',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                SizedBox(height: spacing(6)),
                Row(
                  children: [
                    _Kpi(
                      label: 'Demandes ouvertes',
                      value: s.openRequests,
                      tint: AppColors.warning,
                    ),
                    SizedBox(width: spacing(2)),
                    _Kpi(
                      label: 'Documents en attente',
                      value: s.pendingDocuments,
                      tint: AppColors.info,
                    ),
                    SizedBox(width: spacing(2)),
                    _Kpi(
                      label: 'Notifications',
                      value: s.unreadNotifications,
                      tint: AppColors.primary,
                    ),
                  ],
                ),
                SizedBox(height: spacing(4)),
                _ScanCta(onTap: () => context.push(AppRoutes.scan)),
                SizedBox(height: spacing(4)),
                const _TipCard(),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, required this.tint});

  final String label;
  final int value;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(spacing(3)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border(top: BorderSide(color: tint, width: 3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            SizedBox(height: spacing(1)),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScanCta extends StatelessWidget {
  const _ScanCta({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Padding(
          padding: EdgeInsets.all(spacing(4)),
          child: Row(
            children: [
              const Text('📷', style: TextStyle(fontSize: 28)),
              SizedBox(width: spacing(3)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Scanner un document',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: spacing(1)),
                    const Text(
                      'Prenez en photo vos justificatifs et générez un PDF à envoyer au cabinet.',
                      style: TextStyle(
                        color: AppColors.onPrimaryMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: spacing(3)),
              const Text(
                '›',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w300,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  const _TipCard();

  static const _lines = [
    '• Recevez des demandes de documents de votre comptable',
    '• Scannez ou téléversez les pièces depuis votre téléphone',
    '• Échangez par messagerie avec votre cabinet',
  ];

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      padding: EdgeInsets.all(spacing(4)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Comment ça marche ?',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          SizedBox(height: spacing(2)),
          for (final line in _lines)
            Padding(
              padding: EdgeInsets.only(bottom: spacing(1)),
              child: Text(
                line,
                style:
                    const TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }
}
