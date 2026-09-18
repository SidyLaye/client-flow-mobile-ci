import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_service.dart';

class Message extends Equatable {
  const Message({
    required this.id,
    required this.clientId,
    required this.body,
    this.senderId,
    this.isInternal,
    this.createdAt,
  });

  final String id;
  final String clientId;
  final String? senderId;
  final String body;
  final bool? isInternal;
  final DateTime? createdAt;

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        clientId: (json['client_id'] as String?) ?? '',
        senderId: json['sender_id'] as String?,
        body: (json['body'] as String?) ?? '',
        isInternal: json['is_internal'] as bool?,
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props =>
      [id, clientId, senderId, body, isInternal, createdAt];
}

class MessagesRepository {
  MessagesRepository(this._supabase);

  final SupabaseService _supabase;

  Future<List<Message>> listConversation(String clientId) async {
    final rows = await _supabase
        .from('messages')
        .select('id, client_id, sender_id, body, is_internal, created_at')
        .eq('client_id', clientId)
        .eq('is_internal', false)
        .order('created_at', ascending: true);
    return rows.map(Message.fromJson).toList();
  }

  /// Realtime INSERTs for this client's conversation. Internal staff notes
  /// are filtered out.
  Stream<Message> watchInserts(String clientId) {
    late final RealtimeChannel channel;
    final controller = StreamController<Message>(
      onCancel: () => _supabase.client.removeChannel(channel),
    );

    channel = _supabase.client
        .channel('messages:$clientId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'client_id',
            value: clientId,
          ),
          callback: (payload) {
            final m = Message.fromJson(payload.newRecord);
            if (m.isInternal == true) return;
            if (!controller.isClosed) controller.add(m);
          },
        )
        .subscribe();

    return controller.stream;
  }

  /// Sends through the `send-message` Edge Function (audit log + admin
  /// notification) and falls back to a direct RLS-checked insert.
  Future<void> send({
    required String clientId,
    required String senderId,
    required String body,
  }) async {
    try {
      await _supabase.invokeFunction<dynamic>('send-message', {
        'client_id': clientId,
        'body': body,
        'is_internal': false,
      });
    } catch (e) {
      debugPrint('[messages] edge function failed, direct insert: $e');
      await _supabase.from('messages').insert({
        'client_id': clientId,
        'sender_id': senderId,
        'body': body,
        'is_internal': false,
      });
    }
  }
}
