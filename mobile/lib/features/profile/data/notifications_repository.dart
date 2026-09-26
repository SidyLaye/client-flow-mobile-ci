import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';

import '../../../core/api/api_client.dart';
import '../../../core/config/env.dart';

class AppNotification extends Equatable {
  const AppNotification({
    required this.id,
    required this.title,
    this.body,
    this.isRead,
    this.link,
    this.createdAt,
  });

  final String id;
  final String title;
  final String? body;
  final bool? isRead;

  /// `document:<id>`, `request:<id>` or `messages` — where a tap should go.
  final String? link;
  final DateTime? createdAt;

  bool get unread => isRead != true;

  String? get documentId => _target('document');
  String? get requestId => _target('request');

  String? _target(String kind) {
    final l = link;
    if (l == null || !l.startsWith('$kind:')) return null;
    final id = l.substring(kind.length + 1);
    return id.isEmpty ? null : id;
  }

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id: id,
        title: title,
        body: body,
        isRead: isRead ?? this.isRead,
        link: link,
        createdAt: createdAt,
      );

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? '',
        body: json['message'] as String?,
        isRead: json['is_read'] as bool?,
        link: json['link'] as String?,
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props => [id, title, body, isRead, link, createdAt];
}

class NotificationsRepository {
  NotificationsRepository(this._api, {Duration? pollInterval})
      : _poll = pollInterval ?? Duration(seconds: Env.pollSeconds * 3);

  final ApiClient _api;
  final Duration _poll;

  static const _base = '/api/v1/client-portal/notifications/';

  Future<String> loadCompanyName(String clientId) async {
    final data = await _api.get('/api/v1/client-portal/me/') as Map<String, dynamic>;
    final client = data['client'] as Map<String, dynamic>;
    final company = (client['company_name'] as String?) ?? '';
    if (company.isNotEmpty) return company;
    return '${client['first_name'] ?? ''} ${client['last_name'] ?? ''}'.trim();
  }

  Future<List<AppNotification>> listRecent(String userId, {int limit = 20}) async {
    final data = await _api.get(_base, query: {'page_size': '$limit'})
        as Map<String, dynamic>;
    final rows = (data['results'] as List).cast<Map<String, dynamic>>();
    return rows.map(AppNotification.fromJson).toList();
  }

  Future<void> markRead(String id) async {
    await _api.post('$_base$id/read/');
  }

  Future<void> markAllRead() async {
    await _api.post('${_base}mark-all-read/');
  }

  /// New notifications while the screen is open (REST polling).
  Stream<AppNotification> watchInserts(String userId) {
    late final StreamController<AppNotification> controller;
    Timer? timer;
    final seen = <String>{};
    var busy = false;

    Future<void> tick() async {
      if (busy || controller.isClosed) return;
      busy = true;
      try {
        final latest = await listRecent(userId, limit: 10);
        // Oldest first so the bloc prepends in the right order; it also
        // ignores ids it already has.
        for (final n in latest.reversed) {
          if (seen.add(n.id) && !controller.isClosed) controller.add(n);
        }
      } catch (e) {
        debugPrint('[notifications] poll failed $e');
      } finally {
        busy = false;
      }
    }

    controller = StreamController<AppNotification>(
      onListen: () {
        unawaited(tick());
        timer = Timer.periodic(_poll, (_) => tick());
      },
      // Not closing here on purpose (see MessagesRepository.watchInserts).
      onCancel: () {
        timer?.cancel();
      },
    );
    return controller.stream;
  }
}
