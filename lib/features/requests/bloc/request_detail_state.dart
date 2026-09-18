part of 'request_detail_bloc.dart';

enum RequestDetailStatus { initial, loading, success, notFound, failure }

final class RequestDetailState extends Equatable {
  const RequestDetailState({
    this.status = RequestDetailStatus.initial,
    this.request,
    this.error,
  });

  final RequestDetailStatus status;
  final DocumentRequest? request;
  final String? error;

  RequestDetailState copyWith({
    RequestDetailStatus? status,
    DocumentRequest? Function()? request,
    String? error,
  }) {
    return RequestDetailState(
      status: status ?? this.status,
      request: request != null ? request() : this.request,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, request, error];
}
