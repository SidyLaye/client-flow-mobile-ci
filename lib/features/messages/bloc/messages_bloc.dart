import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/messages_repository.dart';

part 'messages_event.dart';
part 'messages_state.dart';

/// Per-client conversation with the accounting firm.
class MessagesBloc extends Bloc<MessagesEvent, MessagesState> {
  MessagesBloc({
    required MessagesRepository repository,
    required this._clientId,
    required this._userId,
  })  : _repo = repository,
        super(const MessagesState()) {
    on<MessagesStarted>(_onStarted);
    on<_MessageReceived>(_onReceived);
    on<MessageSendRequested>(_onSendRequested);
  }

  final MessagesRepository _repo;
  final String _clientId;
  final String _userId;
  StreamSubscription<Message>? _sub;

  Future<void> _onStarted(
    MessagesStarted event,
    Emitter<MessagesState> emit,
  ) async {
    emit(state.copyWith(status: MessagesStatus.loading));
    try {
      final history = await _repo.listConversation(_clientId);
      emit(state.copyWith(status: MessagesStatus.success, messages: history));
    } catch (e) {
      debugPrint('[messages] load failed $e');
      emit(state.copyWith(
        status: MessagesStatus.failure,
        error: () => e.toString(),
      ));
    }

    await _sub?.cancel();
    _sub = _repo
        .watchInserts(_clientId)
        .listen((m) => add(_MessageReceived(m)));
  }

  void _onReceived(_MessageReceived event, Emitter<MessagesState> emit) {
    if (state.messages.any((m) => m.id == event.message.id)) return;
    emit(state.copyWith(messages: [...state.messages, event.message]));
  }

  Future<void> _onSendRequested(
    MessageSendRequested event,
    Emitter<MessagesState> emit,
  ) async {
    final text = event.body.trim();
    if (text.isEmpty || state.sending) return;

    emit(state.copyWith(sending: true, failedBody: () => null));
    try {
      await _repo.send(clientId: _clientId, senderId: _userId, body: text);
      emit(state.copyWith(sending: false));
    } catch (e) {
      debugPrint('[messages] send failed $e');
      emit(state.copyWith(sending: false, failedBody: () => text));
    }
  }

  @override
  Future<void> close() async {
    await _sub?.cancel();
    return super.close();
  }
}
