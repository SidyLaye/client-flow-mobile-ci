import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/home_repository.dart';

part 'home_event.dart';
part 'home_state.dart';

class HomeBloc extends Bloc<HomeEvent, HomeState> {
  HomeBloc({
    required HomeRepository repository,
    required this._clientId,
    required this._userId,
  })  : _repo = repository,
        super(const HomeState()) {
    on<HomeSummaryRequested>(_onRequested);
  }

  final HomeRepository _repo;
  final String _clientId;
  final String _userId;

  Future<void> _onRequested(
    HomeSummaryRequested event,
    Emitter<HomeState> emit,
  ) async {
    emit(state.copyWith(status: HomeStatus.loading));
    try {
      final summary =
          await _repo.loadSummary(clientId: _clientId, userId: _userId);
      emit(state.copyWith(status: HomeStatus.success, summary: summary));
    } catch (e) {
      emit(state.copyWith(status: HomeStatus.failure, error: e.toString()));
    }
  }
}
