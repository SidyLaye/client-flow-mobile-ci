part of 'home_bloc.dart';

sealed class HomeEvent extends Equatable {
  const HomeEvent();

  @override
  List<Object?> get props => [];
}

/// Load (or pull-to-refresh) the dashboard counters.
final class HomeSummaryRequested extends HomeEvent {
  const HomeSummaryRequested();
}
