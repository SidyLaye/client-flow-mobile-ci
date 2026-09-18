import '../../../core/supabase/supabase_service.dart';
import 'models/document_request.dart';

class RequestsRepository {
  RequestsRepository(this._supabase);

  final SupabaseService _supabase;

  Future<List<DocumentRequest>> listForClient(String clientId) async {
    final rows = await _supabase
        .from('document_requests')
        .select('id, title, description, due_date, priority, status, created_at')
        .eq('client_id', clientId)
        .order('created_at', ascending: false);
    return rows.map(DocumentRequest.fromJson).toList();
  }

  Future<DocumentRequest?> getById(String id) async {
    final row = await _supabase
        .from('document_requests')
        .select('id, title, description, requested_type, due_date, priority, status')
        .eq('id', id)
        .maybeSingle();
    return row == null ? null : DocumentRequest.fromJson(row);
  }
}
