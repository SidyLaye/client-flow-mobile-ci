part of 'home_bloc.dart';

enum HomeStatus { initial, loading, success, failure }

final class HomeState extends Equatable {
  const HomeState({
    this.status = HomeStatus.initial,
    this.summary = const HomeSummary(),
    this.error,
  });

  final HomeStatus status;
  final HomeSummary summary;
  final String? error;

  bool get isLoading => status == HomeStatus.loading;

  HomeState copyWith({HomeStatus? status, HomeSummary? summary, String? error}) {
    return HomeState(
      status: status ?? this.status,
      summary: summary ?? this.summary,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, summary, error];
}
