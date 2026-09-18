part of 'request_detail_bloc.dart';

sealed class RequestDetailEvent extends Equatable {
  const RequestDetailEvent();

  @override
  List<Object?> get props => [];
}

final class RequestDetailRequested extends RequestDetailEvent {
  const RequestDetailRequested();
}
