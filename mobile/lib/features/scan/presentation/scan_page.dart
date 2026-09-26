import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_dialogs.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/states.dart';
import '../bloc/scan_bloc.dart';
import '../data/scan_service.dart';

class ScanPage extends StatelessWidget {
  const ScanPage({super.key, this.requestId});

  /// Set when answering a document request ("Répondre avec un document").
  final String? requestId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      // Open the native scanner automatically the first time the screen
      // mounts; the user can re-launch it with the "Scanner" button.
      create: (context) => ScanBloc(service: context.read<ScanService>())
        ..add(const ScanLaunchRequested()),
      child: _ScanView(requestId: requestId),
    );
  }
}

class _ScanView extends StatelessWidget {
  const _ScanView({this.requestId});

  final String? requestId;

  void _continue(BuildContext context, List<String> pages) {
    if (pages.isEmpty) {
      showAlert(
        context,
        title: 'Aucune page',
        message: 'Ajoutez au moins une page avant de continuer.',
      );
      return;
    }
    context.push(
      AppRoutes.uploadReview,
      extra: UploadReviewArgs(pageUris: pages, requestId: requestId),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ScanBloc, ScanState>(
      listenWhen: (prev, curr) =>
          (curr.error != null && prev.error != curr.error) ||
          (curr.pickedPdf != null && prev.pickedPdf != curr.pickedPdf),
      listener: (context, state) {
        final bloc = context.read<ScanBloc>();
        if (state.pickedPdf case final pdf?) {
          bloc.add(const ScanEffectConsumed());
          context.pushReplacement(
            AppRoutes.uploadReview,
            extra: UploadReviewArgs(
              pageUris: [pdf.path],
              suggestedTitle: pdf.name,
              requestId: requestId,
            ),
          );
        } else if (state.error case final err?) {
          bloc.add(const ScanEffectConsumed());
          showAlert(context, title: err.title, message: err.message);
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Scanner un document')),
        body: Column(
          children: [
            Padding(
              padding: EdgeInsets.all(spacing(3)),
              child: const _HeroCard(),
            ),
            const Expanded(child: _PagesGrid()),
            BlocBuilder<ScanBloc, ScanState>(
              builder: (context, state) => _ActionBar(
                busy: state.busy,
                pageCount: state.pages.length,
                onScan: () =>
                    context.read<ScanBloc>().add(const ScanLaunchRequested()),
                onLibrary: () => context
                    .read<ScanBloc>()
                    .add(const ScanLibraryPickRequested()),
                onFile: () =>
                    context.read<ScanBloc>().add(const ScanFilePickRequested()),
                onContinue: () => _continue(context, state.pages),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Scanner un document',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.text,
              fontSize: 16,
            ),
          ),
          SizedBox(height: spacing(1)),
          const Text(
            'Le scanner détecte automatiquement les bords du document et '
            'corrige la perspective. Vous pouvez ajouter plusieurs pages '
            "avant d'envoyer.",
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _PagesGrid extends StatelessWidget {
  const _PagesGrid();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ScanBloc, ScanState>(
      buildWhen: (prev, curr) => prev.pages != curr.pages,
      builder: (context, state) {
        if (state.pages.isEmpty) {
          return const EmptyMessage("Aucune page pour l'instant.", topMargin: 6);
        }
        return GridView.builder(
          padding: EdgeInsets.all(spacing(3)),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: spacing(2),
            crossAxisSpacing: spacing(2),
            childAspectRatio: 0.75,
          ),
          itemCount: state.pages.length,
          itemBuilder: (context, i) => _PageTile(
            path: state.pages[i],
            index: i,
            onLongPress: () =>
                context.read<ScanBloc>().add(ScanPageRemoved(i)),
          ),
        );
      },
    );
  }
}

class _PageTile extends StatelessWidget {
  const _PageTile({
    required this.path,
    required this.index,
    required this.onLongPress,
  });

  final String path;
  final int index;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: onLongPress,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: AppColors.surface,
              child: Image.file(File(path), fit: BoxFit.cover),
            ),
            Positioned(
              top: 6,
              left: 6,
              child: Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '${index + 1}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.busy,
    required this.pageCount,
    required this.onScan,
    required this.onLibrary,
    required this.onFile,
    required this.onContinue,
  });

  final bool busy;
  final int pageCount;
  final VoidCallback onScan;
  final VoidCallback onLibrary;
  final VoidCallback onFile;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(spacing(3)),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            PrimaryButton(label: '📷  Scanner', busy: busy, onPressed: onScan),
            SizedBox(height: spacing(2)),
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(
                    label: 'Galerie',
                    onPressed: busy ? null : onLibrary,
                  ),
                ),
                SizedBox(width: spacing(2)),
                Expanded(
                  child: SecondaryButton(
                    label: 'Fichier',
                    onPressed: busy ? null : onFile,
                  ),
                ),
              ],
            ),
            SizedBox(height: spacing(2)),
            Opacity(
              opacity: pageCount == 0 ? 0.3 : 1,
              child: PrimaryButton(
                label: 'Continuer (${pluralPages(pageCount)})',
                color: AppColors.text,
                verticalPadding: spacing(3),
                onPressed: pageCount == 0 ? null : onContinue,
              ),
            ),
            SizedBox(height: spacing(2)),
            const Text(
              'Astuce : appui long sur une page pour la supprimer.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
