import 'package:equatable/equatable.dart';

/// The signed-in portal user.
class AuthUser extends Equatable {
  const AuthUser({required this.id, required this.email});

  final String id;
  final String email;

  @override
  List<Object?> get props => [id, email];
}

/// The client record (company) the portal account belongs to, as returned by
/// `GET /api/v1/client-portal/me/`.
class ClientAccount extends Equatable {
  const ClientAccount({
    required this.id,
    required this.clientId,
    required this.userId,
    required this.accessStatus,
    this.canAccessMobile,
    this.companyName = '',
    this.cabinetName = '',
  });

  final String id;
  final String clientId;
  final String userId;

  /// `active` when the backend lets this account in. A suspended account
  /// cannot authenticate at all, so the server never returns anything else.
  final String accessStatus;
  final bool? canAccessMobile;
  final String companyName;
  final String cabinetName;

  bool get isActive => accessStatus == 'active';

  /// Builds the account from the `/client-portal/me/` payload.
  factory ClientAccount.fromMe(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    final client = json['client'] as Map<String, dynamic>;
    final company = (client['company_name'] as String?) ?? '';
    final person =
        '${client['first_name'] ?? ''} ${client['last_name'] ?? ''}'.trim();
    return ClientAccount(
      id: client['id'] as String,
      clientId: client['id'] as String,
      userId: user['id'] as String,
      accessStatus: 'active',
      canAccessMobile: true,
      companyName: company.isNotEmpty ? company : person,
      cabinetName: (client['cabinet_name'] as String?) ?? '',
    );
  }

  static AuthUser userFromMe(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return AuthUser(
      id: user['id'] as String,
      email: (user['email'] as String?) ?? '',
    );
  }

  @override
  List<Object?> get props => [
        id,
        clientId,
        userId,
        accessStatus,
        canAccessMobile,
        companyName,
        cabinetName,
      ];
}
