import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/documents_repository.dart';
import '../data/models/document.dart';

part 'documents_event.dart';
part 'documents_state.dart';

/// List of documents visible to the signed-in client.
class DocumentsBloc extends Bloc<DocumentsEvent, DocumentsState> {
  DocumentsBloc({
    required DocumentsRepository repository,
    required this._clientId,
  })  : _repo = repository,
        super(const DocumentsState()) {
    on<DocumentsRequested>(_onRequested);
  }

  final DocumentsRepository _repo;
  final String _clientId;

  Future<void> _onRequested(
    DocumentsRequested event,
    Emitter<DocumentsState> emit,
  ) async {
    emit(state.copyWith(status: DocumentsStatus.loading));
    try {
      final docs = await _repo.listVisible(_clientId);
      emit(state.copyWith(status: DocumentsStatus.success, documents: docs));
    } catch (e) {
      emit(state.copyWith(
        status: DocumentsStatus.failure,
        error: e.toString(),
      ));
    }
  }
}
