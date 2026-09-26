import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/refresh_on_focus.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/states.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/requests_bloc.dart';
import '../data/models/document_request.dart';
import '../data/requests_repository.dart';

class RequestsPage extends StatelessWidget {
  const RequestsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final clientId = context.read<AuthBloc>().state.clientId!;
    return BlocProvider(
      create: (context) => RequestsBloc(
        repository: context.read<RequestsRepository>(),
        clientId: clientId,
      )..add(const RequestsRequested()),
      child: Builder(
        builder: (context) => RefreshOnFocus(
          path: AppRoutes.requests,
          onFocus: () =>
              context.read<RequestsBloc>().add(const RequestsRequested()),
          child: const _RequestsView(),
        ),
      ),
    );
  }
}

class _RequestsView extends StatelessWidget {
  const _RequestsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Demandes')),
      body: BlocBuilder<RequestsBloc, RequestsState>(
        builder: (context, state) {
          final items = state.requests;
          return RefreshIndicator(
            onRefresh: () async {
              final bloc = context.read<RequestsBloc>();
              bloc.add(const RequestsRequested());
              await bloc.stream.firstWhere((s) => !s.isLoading);
            },
            child: items.isEmpty
                ? ListView(
                    padding: EdgeInsets.all(spacing(3)),
                    children: [
                      if (state.status == RequestsStatus.failure)
                        ErrorMessage(state.error ?? 'Erreur')
                      else if (state.isLoading)
                        Padding(
                          padding: EdgeInsets.only(top: spacing(8)),
                          child: const LoadingCenter(),
                        )
                      else
                        const EmptyMessage('Aucune demande pour le moment.'),
                    ],
                  )
                : ListView.separated(
                    padding: EdgeInsets.all(spacing(3)),
                    itemCount: items.length,
                    separatorBuilder: (_, _) => SizedBox(height: spacing(2)),
                    itemBuilder: (context, i) => _RequestRow(
                      req: items[i],
                      onTap: () =>
                          context.push(AppRoutes.requestDetail(items[i].id)),
                    ),
                  ),
          );
        },
      ),
    );
  }
}

class _RequestRow extends StatelessWidget {
  const _RequestRow({required this.req, required this.onTap});

  final DocumentRequest req;
  final VoidCallback onTap;

  static const _priorityTint = <String, Color>{
    'urgent': AppColors.danger,
    'high': AppColors.warning,
    'normal': AppColors.info,
    'low': AppColors.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    final tint = _priorityTint[req.priority ?? 'normal'] ?? AppColors.info;
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
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
              ),
              SizedBox(width: spacing(3)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      req.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.text,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    SizedBox(height: spacing(1)),
                    Text(
                      req.dueDate != null
                          ? 'À fournir avant ${formatIsoDate(req.dueDate)}'
                          : 'Sans échéance',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: spacing(3)),
              Text(
                RequestStatus.label(req.status),
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
