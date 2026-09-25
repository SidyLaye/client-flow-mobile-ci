import 'package:equatable/equatable.dart';

import '../../../core/api/api_client.dart';

class HomeSummary extends Equatable {
  const HomeSummary({
    this.openRequests = 0,
    this.unreadNotifications = 0,
    this.pendingDocuments = 0,
    this.unreadMessages = 0,
    this.companyName = '',
    this.cabinetName = '',
  });

  final int openRequests;
  final int unreadNotifications;
  final int pendingDocuments;
  final int unreadMessages;
  final String companyName;
  final String cabinetName;

  factory HomeSummary.fromJson(Map<String, dynamic> json) => HomeSummary(
        openRequests: (json['open_requests'] as num?)?.toInt() ?? 0,
        unreadNotifications: (json['unread_notifications'] as num?)?.toInt() ?? 0,
        pendingDocuments: (json['pending_documents'] as num?)?.toInt() ?? 0,
        unreadMessages: (json['unread_messages'] as num?)?.toInt() ?? 0,
        companyName: (json['company_name'] as String?) ?? '',
        cabinetName: (json['cabinet_name'] as String?) ?? '',
      );

  @override
  List<Object?> get props => [
        openRequests,
        unreadNotifications,
        pendingDocuments,
        unreadMessages,
        companyName,
        cabinetName,
      ];
}

class HomeRepository {
  HomeRepository(this._api);

  final ApiClient _api;

  /// All home counters in a single request. [clientId] / [userId] are implied
  /// by the session; they stay in the signature for the blocs.
  Future<HomeSummary> loadSummary({
    required String clientId,
    required String userId,
  }) async {
    final data = await _api.get('/api/v1/client-portal/summary/');
    return HomeSummary.fromJson(data as Map<String, dynamic>);
  }
}
