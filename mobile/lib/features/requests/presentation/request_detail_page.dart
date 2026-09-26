import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/key_value_row.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/states.dart';
import '../bloc/request_detail_bloc.dart';
import '../data/models/document_request.dart';
import '../data/requests_repository.dart';

class RequestDetailPage extends StatelessWidget {
  const RequestDetailPage({super.key, required this.requestId});

  final String requestId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => RequestDetailBloc(
        repository: context.read<RequestsRepository>(),
        requestId: requestId,
      )..add(const RequestDetailRequested()),
      child: const _RequestDetailView(),
    );
  }
}

class _RequestDetailView extends StatelessWidget {
  const _RequestDetailView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Demande')),
      body: BlocBuilder<RequestDetailBloc, RequestDetailState>(
        builder: (context, state) {
          switch (state.status) {
            case RequestDetailStatus.initial:
            case RequestDetailStatus.loading:
              return const LoadingCenter();
            case RequestDetailStatus.notFound:
            case RequestDetailStatus.failure:
              return const Center(
                child: Text(
                  'Demande introuvable.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              );
            case RequestDetailStatus.success:
              return _Body(req: state.request!);
          }
        },
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.req});

  final DocumentRequest req;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.all(spacing(4)),
      children: [
        Text(
          req.title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
        ),
        if (req.description case final desc? when desc.isNotEmpty) ...[
          SizedBox(height: spacing(3)),
          Text(
            desc,
            style: const TextStyle(color: AppColors.text, height: 1.4),
          ),
        ],
        SizedBox(height: spacing(3)),
        SurfaceCard(
          child: Column(
            children: [
              KeyValueRow(
                label: 'Type demandé',
                value: req.requestedType ?? '—',
                card: false,
              ),
              SizedBox(height: spacing(2)),
              KeyValueRow(
                label: 'Échéance',
                value: formatIsoDate(req.dueDate) ?? 'Aucune',
                card: false,
              ),
              SizedBox(height: spacing(2)),
              KeyValueRow(
                label: 'Priorité',
                value: RequestPriority.label(req.priority),
                card: false,
              ),
              SizedBox(height: spacing(2)),
              KeyValueRow(
                label: 'Statut',
                value: RequestStatus.label(req.status),
                card: false,
              ),
            ],
          ),
        ),
        SizedBox(height: spacing(3)),
        PrimaryButton(
          label: '📷  Répondre avec un document',
          onPressed: () => context.push(AppRoutes.scanFor(req.id)),
        ),
      ],
    );
  }
}
