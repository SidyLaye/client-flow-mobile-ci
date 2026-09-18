import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_service.dart';

class HomeSummary extends Equatable {
  const HomeSummary({
    this.openRequests = 0,
    this.unreadNotifications = 0,
    this.pendingDocuments = 0,
    this.companyName = '',
  });

  final int openRequests;
  final int unreadNotifications;
  final int pendingDocuments;
  final String companyName;

  @override
  List<Object?> get props =>
      [openRequests, unreadNotifications, pendingDocuments, companyName];
}

class HomeRepository {
  HomeRepository(this._supabase);

  final SupabaseService _supabase;

  static const openRequestStatuses = [
    'sent',
    'seen',
    'partially_completed',
    'overdue',
  ];
  static const pendingDocumentStatuses = ['received', 'under_review'];

  Future<HomeSummary> loadSummary({
    required String clientId,
    required String userId,
  }) async {
    final results = await Future.wait<dynamic>([
      _supabase
          .from('document_requests')
          .count(CountOption.exact)
          .eq('client_id', clientId)
          .inFilter('status', openRequestStatuses),
      _supabase
          .from('notifications')
          .count(CountOption.exact)
          .eq('user_id', userId)
          .eq('is_read', false),
      _supabase
          .from('documents')
          .count(CountOption.exact)
          .eq('client_id', clientId)
          .inFilter('status', pendingDocumentStatuses),
      _supabase
          .from('clients')
          .select('company_name')
          .eq('id', clientId)
          .maybeSingle(),
    ]);

    final client = results[3] as Map<String, dynamic>?;
    return HomeSummary(
      openRequests: results[0] as int,
      unreadNotifications: results[1] as int,
      pendingDocuments: results[2] as int,
      companyName: (client?['company_name'] as String?) ?? '',
    );
  }
}
