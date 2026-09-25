import '../../../core/api/api_client.dart';
import 'models/document_request.dart';

class RequestsRepository {
  RequestsRepository(this._api);

  final ApiClient _api;

  static const _base = '/api/v1/client-portal/requests/';

  /// Requests the cabinet sent to this client (drafts and cancelled excluded).
  Future<List<DocumentRequest>> listForClient(String clientId) async {
    final data = await _api.get(_base, query: const {'page_size': '100'})
        as Map<String, dynamic>;
    final rows = (data['results'] as List).cast<Map<String, dynamic>>();
    return rows.map(DocumentRequest.fromJson).toList();
  }

  /// Opening a request marks it as seen for the cabinet.
  Future<DocumentRequest?> getById(String id) async {
    try {
      final data = await _api.get('$_base$id/') as Map<String, dynamic>;
      return DocumentRequest.fromJson(data);
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }
}
