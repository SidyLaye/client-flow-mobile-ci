import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_service.dart';

class AppNotification extends Equatable {
  const AppNotification({
    required this.id,
    required this.title,
    this.body,
    this.isRead,
    this.createdAt,
  });

  final String id;
  final String title;
  final String? body;
  final bool? isRead;
  final DateTime? createdAt;

  bool get unread => isRead != true;

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id: id,
        title: title,
        body: body,
        isRead: isRead ?? this.isRead,
        createdAt: createdAt,
      );

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? '',
        body: json['body'] as String?,
        isRead: json['is_read'] as bool?,
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props => [id, title, body, isRead, createdAt];
}

class NotificationsRepository {
  NotificationsRepository(this._supabase);

  final SupabaseService _supabase;

  Future<String> loadCompanyName(String clientId) async {
    final row = await _supabase
        .from('clients')
        .select('company_name')
        .eq('id', clientId)
        .maybeSingle();
    return (row?['company_name'] as String?) ?? '';
  }

  Future<List<AppNotification>> listRecent(String userId, {int limit = 20}) async {
    final rows = await _supabase
        .from('notifications')
        .select('id, title, body, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(limit);
    return rows.map(AppNotification.fromJson).toList();
  }

  Future<void> markRead(String id) =>
      _supabase.from('notifications').update({'is_read': true}).eq('id', id);

  /// Realtime INSERTs on notifications for [userId].
  Stream<AppNotification> watchInserts(String userId) {
    late final RealtimeChannel channel;
    final controller = StreamController<AppNotification>(
      onCancel: () => _supabase.client.removeChannel(channel),
    );

    channel = _supabase.client
        .channel('notifications:$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            if (controller.isClosed) return;
            controller.add(AppNotification.fromJson(payload.newRecord));
          },
        )
        .subscribe();

    return controller.stream;
  }
}
