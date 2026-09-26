import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/upload_repository.dart';

part 'upload_event.dart';
part 'upload_state.dart';

/// Review form → PDF build → storage upload → documents row.
class UploadBloc extends Bloc<UploadEvent, UploadState> {
  UploadBloc({
    required UploadRepository repository,
    required this._clientId,
    required this._userId,
    required this._pageUris,
    this.requestId,
  })  : _repo = repository,
        super(const UploadState()) {
    on<UploadSubmitted>(_onSubmitted);
    on<UploadErrorConsumed>(_onErrorConsumed);
  }

  final UploadRepository _repo;
  final String _clientId;
  final String _userId;
  final List<String> _pageUris;
  final String? requestId;

  Future<void> _onSubmitted(
    UploadSubmitted event,
    Emitter<UploadState> emit,
  ) async {
    if (state.isSubmitting) return;
    if (event.title.trim().isEmpty) {
      emit(state.copyWith(
        status: UploadStatus.failure,
        error: () => 'Titre requis : donnez un nom au document.',
      ));
      return;
    }

    emit(state.copyWith(status: UploadStatus.submitting, error: () => null));
    try {
      final result = await _repo.submit(
        clientId: _clientId,
        userId: _userId,
        pageUris: _pageUris,
        title: event.title,
        category: event.category,
        comment: event.comment,
        requestId: requestId,
      );
      emit(state.copyWith(
        status: UploadStatus.success,
        savedPath: result.savedPath,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: UploadStatus.failure,
        error: () => e.toString(),
      ));
    }
  }

  void _onErrorConsumed(UploadErrorConsumed event, Emitter<UploadState> emit) {
    emit(state.copyWith(status: UploadStatus.idle, error: () => null));
  }
}
