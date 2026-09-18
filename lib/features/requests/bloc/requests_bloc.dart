import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/models/document_request.dart';
import '../data/requests_repository.dart';

part 'requests_event.dart';
part 'requests_state.dart';

class RequestsBloc extends Bloc<RequestsEvent, RequestsState> {
  RequestsBloc({
    required RequestsRepository repository,
    required this._clientId,
  })  : _repo = repository,
        super(const RequestsState()) {
    on<RequestsRequested>(_onRequested);
  }

  final RequestsRepository _repo;
  final String _clientId;

  Future<void> _onRequested(
    RequestsRequested event,
    Emitter<RequestsState> emit,
  ) async {
    emit(state.copyWith(status: RequestsStatus.loading));
    try {
      final items = await _repo.listForClient(_clientId);
      emit(state.copyWith(status: RequestsStatus.success, requests: items));
    } catch (e) {
      emit(state.copyWith(status: RequestsStatus.failure, error: e.toString()));
    }
  }
}
