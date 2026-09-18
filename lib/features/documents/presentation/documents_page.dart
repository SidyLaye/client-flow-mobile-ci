import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/refresh_on_focus.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/states.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/documents_bloc.dart';
import '../data/documents_repository.dart';
import '../data/models/document.dart';

class DocumentsPage extends StatelessWidget {
  const DocumentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final clientId = context.read<AuthBloc>().state.clientId!;
    return BlocProvider(
      create: (context) => DocumentsBloc(
        repository: context.read<DocumentsRepository>(),
        clientId: clientId,
      )..add(const DocumentsRequested()),
      child: Builder(
        builder: (context) => RefreshOnFocus(
          path: AppRoutes.documents,
          onFocus: () =>
              context.read<DocumentsBloc>().add(const DocumentsRequested()),
          child: const _DocumentsView(),
        ),
      ),
    );
  }
}

class _DocumentsView extends StatelessWidget {
  const _DocumentsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: BlocBuilder<DocumentsBloc, DocumentsState>(
        builder: (context, state) {
          final docs = state.documents;
          return RefreshIndicator(
            onRefresh: () async {
              final bloc = context.read<DocumentsBloc>();
              bloc.add(const DocumentsRequested());
              await bloc.stream.firstWhere((s) => !s.isLoading);
            },
            child: ListView.separated(
              padding: EdgeInsets.all(spacing(3)),
              itemCount: docs.length + 1,
              separatorBuilder: (_, _) => SizedBox(height: spacing(2)),
              itemBuilder: (context, i) {
                if (i == 0) {
                  return Column(
                    children: [
                      PrimaryButton(
                        label: '📷  Scanner / téléverser un document',
                        onPressed: () => context.push(AppRoutes.scan),
                      ),
                      if (state.status == DocumentsStatus.failure)
                        ErrorMessage(state.error ?? 'Erreur')
                      else if (docs.isEmpty && state.isLoading)
                        Padding(
                          padding: EdgeInsets.only(top: spacing(8)),
                          child: const LoadingCenter(),
                        )
                      else if (docs.isEmpty)
                        const EmptyMessage('Aucun document pour le moment.'),
                    ],
                  );
                }
                final doc = docs[i - 1];
                return _DocumentRow(
                  doc: doc,
                  onTap: () => context.push(AppRoutes.documentDetail(doc.id)),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({required this.doc, required this.onTap});

  final Document doc;
  final VoidCallback onTap;

  static const _tints = <String, Color>{
    'received': AppColors.info,
    'under_review': AppColors.warning,
    'validated': AppColors.success,
    'rejected': AppColors.danger,
    'incomplete': AppColors.warning,
    'archived': AppColors.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    final sub = [doc.category, formatPeriod(doc.periodMonth, doc.periodYear)]
        .whereType<String>()
        .where((s) => s.isNotEmpty)
        .join(' • ');

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Padding(
          padding: EdgeInsets.all(spacing(3)),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.text,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    SizedBox(height: spacing(1)),
                    Text(
                      sub.isEmpty ? '—' : sub,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: spacing(2)),
              StatusBadge(
                label: DocumentStatus.label(doc.status),
                color: _tints[doc.status] ?? AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
