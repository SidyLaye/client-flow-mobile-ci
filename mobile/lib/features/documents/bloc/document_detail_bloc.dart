import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';

import '../data/documents_repository.dart';
import '../data/models/document.dart';

part 'document_detail_event.dart';
part 'document_detail_state.dart';

/// Single document: metadata + "open file" (signed URL → share sheet).
class DocumentDetailBloc
    extends Bloc<DocumentDetailEvent, DocumentDetailState> {
  DocumentDetailBloc({
    required DocumentsRepository repository,
    required this._documentId,
  })  : _repo = repository,
        super(const DocumentDetailState()) {
    on<DocumentDetailRequested>(_onRequested);
    on<DocumentOpenRequested>(_onOpenRequested);
  }

  final DocumentsRepository _repo;
  final String _documentId;

  Future<void> _onRequested(
    DocumentDetailRequested event,
    Emitter<DocumentDetailState> emit,
  ) async {
    emit(state.copyWith(status: DocumentDetailStatus.loading));
    try {
      final doc = await _repo.getById(_documentId);
      emit(state.copyWith(
        status: doc == null
            ? DocumentDetailStatus.notFound
            : DocumentDetailStatus.success,
        document: () => doc,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: DocumentDetailStatus.failure,
        error: () => e.toString(),
      ));
    }
  }

  Future<void> _onOpenRequested(
    DocumentOpenRequested event,
    Emitter<DocumentDetailState> emit,
  ) async {
    final doc = state.document;
    if (doc == null || state.downloading) return;
    emit(state.copyWith(downloading: true, openError: () => null));
    try {
      final file = await _repo.downloadToCache(doc);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: doc.mimeType)],
          title: doc.displayName,
        ),
      );
      emit(state.copyWith(downloading: false));
    } catch (e) {
      emit(state.copyWith(downloading: false, openError: () => e.toString()));
    }
  }
}
