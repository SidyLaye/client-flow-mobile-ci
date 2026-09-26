import 'package:equatable/equatable.dart';

/// Deep-link payload carried by a tapped notification.
class PushTapPayload extends Equatable {
  const PushTapPayload({this.documentId, this.requestId});

  final String? documentId;
  final String? requestId;

  bool get isEmpty => documentId == null && requestId == null;

  /// Accepts `document_id` / `request_id` keys or a backend notification
  /// `link` (`document:<id>`, `request:<id>`).
  factory PushTapPayload.fromData(Map<String, dynamic> data) {
    final link = data['link']?.toString() ?? '';
    String? fromLink(String kind) =>
        link.startsWith('$kind:') && link.length > kind.length + 1
            ? link.substring(kind.length + 1)
            : null;
    return PushTapPayload(
      documentId: data['document_id']?.toString() ?? fromLink('document'),
      requestId: data['request_id']?.toString() ?? fromLink('request'),
    );
  }

  @override
  List<Object?> get props => [documentId, requestId];
}

/// Abstraction over the push provider so the AuthBloc (and tests) never touch
/// Firebase directly.
abstract class PushService {
  /// Wire up the provider. Must never throw — an unconfigured provider simply
  /// disables push.
  Future<void> initialize();

  /// Registers this device for [userId] and stores the token in `push_tokens`.
  /// Idempotent — safe to call on every sign-in.
  Future<void> register(String userId);

  /// Removes this device's token for [userId] on sign-out.
  Future<void> unregister(String userId);

  /// Emits when the user taps a notification (foreground, background or from
  /// a cold start).
  Stream<PushTapPayload> get onNotificationTap;
}

/// No-op provider used in tests or when push is intentionally disabled.
class NoopPushService implements PushService {
  const NoopPushService();

  @override
  Future<void> initialize() async {}

  @override
  Future<void> register(String userId) async {}

  @override
  Future<void> unregister(String userId) async {}

  @override
  Stream<PushTapPayload> get onNotificationTap => const Stream.empty();
}
