part of 'messages_bloc.dart';

sealed class MessagesEvent extends Equatable {
  const MessagesEvent();

  @override
  List<Object?> get props => [];
}

/// Load history and subscribe to realtime inserts.
final class MessagesStarted extends MessagesEvent {
  const MessagesStarted();
}

/// Internal: a realtime INSERT arrived.
final class _MessageReceived extends MessagesEvent {
  const _MessageReceived(this.message);

  final Message message;

  @override
  List<Object?> get props => [message];
}

final class MessageSendRequested extends MessagesEvent {
  const MessageSendRequested(this.body);

  final String body;

  @override
  List<Object?> get props => [body];
}
