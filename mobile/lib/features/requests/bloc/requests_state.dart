part of 'requests_bloc.dart';

enum RequestsStatus { initial, loading, success, failure }

final class RequestsState extends Equatable {
  const RequestsState({
    this.status = RequestsStatus.initial,
    this.requests = const [],
    this.error,
  });

  final RequestsStatus status;
  final List<DocumentRequest> requests;
  final String? error;

  bool get isLoading => status == RequestsStatus.loading;

  RequestsState copyWith({
    RequestsStatus? status,
    List<DocumentRequest>? requests,
    String? error,
  }) {
    return RequestsState(
      status: status ?? this.status,
      requests: requests ?? this.requests,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, requests, error];
}
