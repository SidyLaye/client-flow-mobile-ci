part of 'messages_bloc.dart';

enum MessagesStatus { initial, loading, success, failure }

final class MessagesState extends Equatable {
  const MessagesState({
    this.status = MessagesStatus.initial,
    this.messages = const [],
    this.sending = false,
    this.failedBody,
    this.error,
  });

  final MessagesStatus status;
  final List<Message> messages;
  final bool sending;

  /// Body of the last message that failed to send, so the composer can
  /// restore it. Cleared on the next send attempt.
  final String? failedBody;
  final String? error;

  MessagesState copyWith({
    MessagesStatus? status,
    List<Message>? messages,
    bool? sending,
    String? Function()? failedBody,
    String? Function()? error,
  }) {
    return MessagesState(
      status: status ?? this.status,
      messages: messages ?? this.messages,
      sending: sending ?? this.sending,
      failedBody: failedBody != null ? failedBody() : this.failedBody,
      error: error != null ? error() : this.error,
    );
  }

  @override
  List<Object?> get props => [status, messages, sending, failedBody, error];
}
