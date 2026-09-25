import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';

import '../../../core/api/api_client.dart';
import '../../../core/config/env.dart';

class Message extends Equatable {
  const Message({
    required this.id,
    required this.clientId,
    required this.body,
    this.senderId,
    this.senderName,
    this.isInternal,
    this.createdAt,
  });

  final String id;
  final String clientId;

  /// The current user's id when the client wrote it, `null` for the cabinet.
  final String? senderId;
  final String? senderName;
  final String body;
  final bool? isInternal;
  final DateTime? createdAt;

  /// [currentUserId] identifies the client's own messages (`is_mine`).
  factory Message.fromPortalJson(
    Map<String, dynamic> json, {
    required String clientId,
    required String currentUserId,
  }) =>
      Message(
        id: json['id'] as String,
        clientId: clientId,
        senderId: json['is_mine'] == true ? currentUserId : null,
        senderName: json['sender_name'] as String?,
        body: (json['body'] as String?) ?? '',
        isInternal: false,
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props =>
      [id, clientId, senderId, senderName, body, isInternal, createdAt];
}

class MessagesRepository {
  MessagesRepository(this._api, {Duration? pollInterval})
      : _poll = pollInterval ?? const Duration(seconds: Env.pollSeconds);

  final ApiClient _api;
  final Duration _poll;

  static const _base = '/api/v1/client-portal/messages/';

  /// Set by the app once signed in; used to tell the client's own messages
  /// apart from the cabinet's.
  String currentUserId = '';

  /// Newest server timestamp seen per conversation: polling asks for what is
  /// newer (server clock, so a wrong phone clock cannot hide messages).
  final _lastSeen = <String, DateTime>{};
  final _live = <String, Set<StreamController<Message>>>{};

  /// Latest 100 messages, oldest first. Opening the conversation marks the
  /// cabinet's messages as read.
  Future<List<Message>> listConversation(String clientId) async {
    final data = await _api.get(_base, query: const {'page_size': '100'})
        as Map<String, dynamic>;
    final rows = (data['results'] as List).cast<Map<String, dynamic>>();
    final list = rows
        .map((r) => Message.fromPortalJson(r, clientId: clientId, currentUserId: currentUserId))
        .toList()
        .reversed
        .toList();
    final newest = list.isEmpty ? null : list.last.createdAt;
    if (newest != null) _lastSeen[clientId] = newest;
    unawaited(_markAllRead());
    return list;
  }

  /// New messages while the conversation is open (REST polling: the backend
  /// has no realtime channel). Stops when the listener cancels.
  Stream<Message> watchInserts(String clientId) {
    late final StreamController<Message> controller;
    Timer? timer;
    var busy = false;

    Future<void> tick() async {
      if (busy || controller.isClosed) return;
      busy = true;
      try {
        final since = _lastSeen[clientId] ?? DateTime.utc(1970);
        final data = await _api.get(
          _base,
          query: {'since': since.toUtc().toIso8601String()},
        ) as Map<String, dynamic>;
        final rows = (data['results'] as List).cast<Map<String, dynamic>>();
        var fromCabinet = false;
        for (final r in rows) {
          final m = Message.fromPortalJson(
            r,
            clientId: clientId,
            currentUserId: currentUserId,
          );
          _remember(clientId, m);
          if (m.senderId == null) fromCabinet = true;
          if (!controller.isClosed) controller.add(m);
        }
        if (fromCabinet) unawaited(_markAllRead());
      } catch (e) {
        debugPrint('[messages] poll failed $e'); // retried at the next tick
      } finally {
        busy = false;
      }
    }

    controller = StreamController<Message>(
      onListen: () {
        _live.putIfAbsent(clientId, () => {}).add(controller);
        timer = Timer.periodic(_poll, (_) => tick());
      },
      // Do not close the controller from its own onCancel: awaiting that
      // close would wait for this very cancel to finish (deadlock).
      onCancel: () {
        timer?.cancel();
        _live[clientId]?.remove(controller);
      },
    );
    return controller.stream;
  }

  void _remember(String clientId, Message m) {
    final created = m.createdAt;
    final last = _lastSeen[clientId];
    if (created != null && (last == null || created.isAfter(last))) {
      _lastSeen[clientId] = created;
    }
  }

  /// Sends a message to the cabinet. [clientId] / [senderId] are implied by
  /// the session; they stay in the signature for the bloc.
  Future<void> send({
    required String clientId,
    required String senderId,
    required String body,
  }) async {
    final data = await _api.post(_base, body: {'body': body});
    if (data is Map<String, dynamic>) {
      // Show it right away instead of waiting for the next poll.
      final m = Message.fromPortalJson(
        data,
        clientId: clientId,
        currentUserId: currentUserId.isNotEmpty ? currentUserId : senderId,
      );
      // Not remembered as "last seen": a cabinet message written just before
      // must still come with the next poll (the bloc ignores duplicates).
      for (final c in List.of(_live[clientId] ?? const <StreamController<Message>>{})) {
        if (!c.isClosed) c.add(m);
      }
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _api.post('${_base}mark-all-read/');
    } catch (e) {
      debugPrint('[messages] mark-all-read failed $e');
    }
  }
}
