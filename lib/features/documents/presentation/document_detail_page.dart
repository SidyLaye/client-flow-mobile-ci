import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_dialogs.dart';
import '../../../core/widgets/key_value_row.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/states.dart';
import '../bloc/document_detail_bloc.dart';
import '../data/documents_repository.dart';
import '../data/models/document.dart';

class DocumentDetailPage extends StatelessWidget {
  const DocumentDetailPage({super.key, required this.documentId});

  final String documentId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => DocumentDetailBloc(
        repository: context.read<DocumentsRepository>(),
        documentId: documentId,
      )..add(const DocumentDetailRequested()),
      child: const _DocumentDetailView(),
    );
  }
}

class _DocumentDetailView extends StatelessWidget {
  const _DocumentDetailView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Document')),
      body: BlocConsumer<DocumentDetailBloc, DocumentDetailState>(
        listenWhen: (prev, curr) =>
            (curr.openError != null && prev.openError != curr.openError) ||
            (curr.error != null && prev.error != curr.error),
        listener: (context, state) {
          if (state.openError != null) {
            showAlert(
              context,
              title: 'Ouverture impossible',
              message: state.openError,
            );
          } else if (state.error != null) {
            showAlert(context, title: 'Erreur', message: state.error);
          }
        },
        builder: (context, state) {
          switch (state.status) {
            case DocumentDetailStatus.initial:
            case DocumentDetailStatus.loading:
              return const LoadingCenter();
            case DocumentDetailStatus.notFound:
            case DocumentDetailStatus.failure:
              return const Center(
                child: Text(
                  'Document introuvable.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              );
            case DocumentDetailStatus.success:
              return _Body(doc: state.document!, downloading: state.downloading);
          }
        },
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.doc, required this.downloading});

  final Document doc;
  final bool downloading;

  @override
  Widget build(BuildContext context) {
    final period = doc.periodMonth != null && doc.periodYear != null
        ? formatPeriod(doc.periodMonth, doc.periodYear)!
        : doc.periodYear?.toString() ?? '—';

    return ListView(
      padding: EdgeInsets.all(spacing(4)),
      children: [
        Text(
          doc.displayName,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
        ),
        SizedBox(height: spacing(4)),
        _gap(KeyValueRow(label: 'Catégorie', value: doc.category ?? '—')),
        _gap(KeyValueRow(label: 'Période', value: period)),
        _gap(KeyValueRow(label: 'Statut', value: doc.status)),
        _gap(KeyValueRow(label: 'Type', value: doc.mimeType ?? '—')),
        _gap(KeyValueRow(label: 'Taille', value: formatKb(doc.sizeBytes))),
        if (doc.clientComment case final note? when note.isNotEmpty)
          _gap(_Note(title: 'Votre note', body: note)),
        if (doc.internalComment case final note? when note.isNotEmpty)
          _gap(_Note(
            title: 'Note du cabinet',
            body: note,
            borderColor: AppColors.warning,
          )),
        SizedBox(height: spacing(2)),
        PrimaryButton(
          label: 'Ouvrir le fichier',
          busy: downloading,
          onPressed: () => context
              .read<DocumentDetailBloc>()
              .add(const DocumentOpenRequested()),
        ),
      ],
    );
  }

  Widget _gap(Widget child) => Padding(
        padding: EdgeInsets.only(bottom: spacing(2)),
        child: child,
      );
}

class _Note extends StatelessWidget {
  const _Note({
    required this.title,
    required this.body,
    this.borderColor = AppColors.border,
  });

  final String title;
  final String body;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      border: Border.all(color: borderColor),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          SizedBox(height: spacing(1)),
          Text(body, style: const TextStyle(color: AppColors.text)),
        ],
      ),
    );
  }
}
