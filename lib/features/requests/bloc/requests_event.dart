part of 'requests_bloc.dart';

sealed class RequestsEvent extends Equatable {
  const RequestsEvent();

  @override
  List<Object?> get props => [];
}

final class RequestsRequested extends RequestsEvent {
  const RequestsRequested();
}
