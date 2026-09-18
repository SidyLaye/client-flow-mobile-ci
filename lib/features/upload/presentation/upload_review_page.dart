import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/router/navigation.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_dialogs.dart';
import '../../../core/widgets/primary_button.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/upload_bloc.dart';
import '../data/upload_repository.dart';

const kDocumentCategories = [
  'Facture',
  'Relevé bancaire',
  'Note de frais',
  'Contrat',
  'Autre',
];

class UploadReviewPage extends StatelessWidget {
  const UploadReviewPage({super.key, required this.args});

  final UploadReviewArgs args;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthBloc>().state;
    return BlocProvider(
      create: (context) => UploadBloc(
        repository: context.read<UploadRepository>(),
        clientId: auth.clientId!,
        userId: auth.user!.id,
        pageUris: args.pageUris,
        requestId: args.requestId,
      ),
      child: _UploadReviewView(args: args),
    );
  }
}

class _UploadReviewView extends StatefulWidget {
  const _UploadReviewView({required this.args});

  final UploadReviewArgs args;

  @override
  State<_UploadReviewView> createState() => _UploadReviewViewState();
}

class _UploadReviewViewState extends State<_UploadReviewView> {
  late final TextEditingController _title;
  final _comment = TextEditingController();
  String _category = 'Autre';

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(
      text: widget.args.suggestedTitle ?? 'Document',
    );
  }

  @override
  void dispose() {
    _title.dispose();
    _comment.dispose();
    super.dispose();
  }

  void _submit() {
    FocusScope.of(context).unfocus();
    context.read<UploadBloc>().add(UploadSubmitted(
          title: _title.text,
          category: _category,
          comment: _comment.text,
        ));
  }

  Future<void> _showSuccess(BuildContext context, String? savedPath) async {
    final share = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Envoyé ✅'),
        content: Text(
          savedPath == null
              ? 'Votre document a été transmis au cabinet.'
              : 'Votre document a été transmis au cabinet.\n\n'
                  'Une copie PDF a été enregistrée sur votre appareil.',
        ),
        actions: [
          if (savedPath != null)
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Partager'),
            ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    if (share == true && savedPath != null) {
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(savedPath, mimeType: 'application/pdf')],
          title: _title.text.trim(),
        ),
      );
    }
    if (context.mounted) popToTop(context);
  }

  @override
  Widget build(BuildContext context) {
    final pages = widget.args.pageUris;
    final isPdf = UploadRepository.isSinglePdf(pages);

    return BlocListener<UploadBloc, UploadState>(
      listenWhen: (prev, curr) => prev.status != curr.status,
      listener: (context, state) {
        switch (state.status) {
          case UploadStatus.success:
            _showSuccess(context, state.savedPath);
          case UploadStatus.failure:
            context.read<UploadBloc>().add(const UploadErrorConsumed());
            showAlert(
              context,
              title: "Échec de l'envoi",
              message: state.error ?? 'Erreur inconnue.',
            );
          case UploadStatus.idle:
          case UploadStatus.submitting:
            break;
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Vérifier et envoyer')),
        body: ListView(
          padding: EdgeInsets.all(spacing(4)),
          children: [
            Text(
              'Aperçu (${pluralPages(pages.length)})',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            SizedBox(height: spacing(2)),
            SizedBox(
              height: 150,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: pages.length,
                separatorBuilder: (_, _) => SizedBox(width: spacing(2)),
                itemBuilder: (context, i) =>
                    isPdf ? const _PdfPreview() : _ImagePreview(path: pages[i]),
              ),
            ),
            SizedBox(height: spacing(4)),
            const _Label('Nom du document'),
            SizedBox(height: spacing(2)),
            TextField(
              controller: _title,
              textCapitalization: TextCapitalization.sentences,
            ),
            SizedBox(height: spacing(4)),
            const _Label('Catégorie'),
            SizedBox(height: spacing(2)),
            Wrap(
              spacing: spacing(2),
              runSpacing: spacing(2),
              children: [
                for (final c in kDocumentCategories)
                  _Chip(
                    label: c,
                    active: c == _category,
                    onTap: () => setState(() => _category = c),
                  ),
              ],
            ),
            SizedBox(height: spacing(4)),
            const _Label('Commentaire (facultatif)'),
            SizedBox(height: spacing(2)),
            TextField(
              controller: _comment,
              minLines: 3,
              maxLines: 5,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                hintText: 'Une précision pour le comptable ?',
              ),
            ),
            SizedBox(height: spacing(6)),
            BlocBuilder<UploadBloc, UploadState>(
              builder: (context, state) => PrimaryButton(
                label: 'Envoyer au cabinet',
                busy: state.isSubmitting,
                verticalPadding: spacing(4),
                onPressed: _submit,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          color: AppColors.text,
        ),
      );
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({required this.path});

  final String path;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: Container(
        width: 110,
        height: 150,
        color: const Color(0xFFDDDDDD),
        child: Image.file(File(path), fit: BoxFit.cover),
      ),
    );
  }
}

class _PdfPreview extends StatelessWidget {
  const _PdfPreview();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      height: 150,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.border),
      ),
      child: const Text('📄 PDF', style: TextStyle(fontSize: 24)),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.active, required this.onTap});

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: spacing(3),
          vertical: spacing(2),
        ),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? Colors.white : AppColors.text,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
