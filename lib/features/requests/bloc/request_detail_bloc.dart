import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/models/document_request.dart';
import '../data/requests_repository.dart';

part 'request_detail_event.dart';
part 'request_detail_state.dart';

class RequestDetailBloc extends Bloc<RequestDetailEvent, RequestDetailState> {
  RequestDetailBloc({
    required RequestsRepository repository,
    required this._requestId,
  })  : _repo = repository,
        super(const RequestDetailState()) {
    on<RequestDetailRequested>(_onRequested);
  }

  final RequestsRepository _repo;
  final String _requestId;

  Future<void> _onRequested(
    RequestDetailRequested event,
    Emitter<RequestDetailState> emit,
  ) async {
    emit(state.copyWith(status: RequestDetailStatus.loading));
    try {
      final req = await _repo.getById(_requestId);
      emit(state.copyWith(
        status: req == null
            ? RequestDetailStatus.notFound
            : RequestDetailStatus.success,
        request: () => req,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: RequestDetailStatus.failure,
        error: e.toString(),
      ));
    }
  }
}
