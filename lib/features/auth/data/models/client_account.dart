import 'package:equatable/equatable.dart';

/// Row of the `client_accounts` table linking an auth user to a client.
class ClientAccount extends Equatable {
  const ClientAccount({
    required this.id,
    required this.clientId,
    required this.userId,
    required this.accessStatus,
    this.canAccessMobile,
  });

  final String id;
  final String clientId;
  final String userId;

  /// `active` | `suspended` | `disabled` | other.
  final String accessStatus;
  final bool? canAccessMobile;

  bool get isActive => accessStatus == 'active';

  factory ClientAccount.fromJson(Map<String, dynamic> json) => ClientAccount(
        id: json['id'] as String,
        clientId: json['client_id'] as String,
        userId: json['user_id'] as String,
        accessStatus: (json['access_status'] as String?) ?? '',
        canAccessMobile: json['can_access_mobile'] as bool?,
      );

  @override
  List<Object?> get props =>
      [id, clientId, userId, accessStatus, canAccessMobile];
}
