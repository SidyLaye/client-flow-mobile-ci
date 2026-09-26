import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:client_flow_mobile/features/messages/bloc/messages_bloc.dart';
import 'package:client_flow_mobile/features/messages/data/messages_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockMessagesRepository extends Mock implements MessagesRepository {}

Message _msg(String id, {String sender = 'staff'}) => Message(
      id: id,
      clientId: 'client-1',
      senderId: sender,
      body: 'body $id',
      isInternal: false,
    );

void main() {
  late _MockMessagesRepository repo;
  late StreamController<Message> inserts;

  setUp(() {
    repo = _MockMessagesRepository();
    inserts = StreamController<Message>.broadcast();
    when(() => repo.watchInserts('client-1')).thenAnswer((_) => inserts.stream);
  });

  tearDown(() => inserts.close());

  MessagesBloc build() =>
      MessagesBloc(repository: repo, clientId: 'client-1', userId: 'user-1');

  blocTest<MessagesBloc, MessagesState>(
    'loads history then appends realtime inserts (deduplicated)',
    build: () {
      when(() => repo.listConversation('client-1'))
          .thenAnswer((_) async => [_msg('1')]);
      return build();
    },
    act: (b) async {
      b.add(const MessagesStarted());
      await Future<void>.delayed(Duration.zero);
      inserts
        ..add(_msg('2'))
        ..add(_msg('2'))
        ..add(_msg('1'));
    },
    expect: () => [
      const MessagesState(status: MessagesStatus.loading),
      MessagesState(status: MessagesStatus.success, messages: [_msg('1')]),
      MessagesState(
        status: MessagesStatus.success,
        messages: [_msg('1'), _msg('2')],
      ),
    ],
  );

  blocTest<MessagesBloc, MessagesState>(
    'sends trimmed text and restores it on failure',
    build: () {
      when(
        () => repo.send(clientId: 'client-1', senderId: 'user-1', body: 'hi'),
      ).thenThrow(Exception('offline'));
      return build();
    },
    seed: () => const MessagesState(status: MessagesStatus.success),
    act: (b) => b.add(const MessageSendRequested('  hi  ')),
    expect: () => [
      const MessagesState(status: MessagesStatus.success, sending: true),
      const MessagesState(status: MessagesStatus.success, failedBody: 'hi'),
    ],
  );

  blocTest<MessagesBloc, MessagesState>(
    'ignores blank sends',
    build: build,
    act: (b) => b.add(const MessageSendRequested('   ')),
    expect: () => const <MessagesState>[],
    verify: (_) => verifyNever(
      () => repo.send(
        clientId: any(named: 'clientId'),
        senderId: any(named: 'senderId'),
        body: any(named: 'body'),
      ),
    ),
  );
}
