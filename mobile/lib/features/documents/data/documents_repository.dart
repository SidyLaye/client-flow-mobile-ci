import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../../../core/api/api_client.dart';
import 'models/document.dart';

class DocumentsRepository {
  DocumentsRepository(this._api);

  final ApiClient _api;

  static const _base = '/api/v1/client-portal/documents/';

  /// Documents the cabinet made visible to this client, newest first.
  Future<List<Document>> listVisible(String clientId) async {
    final data = await _api.get(_base, query: const {'page_size': '100'})
        as Map<String, dynamic>;
    final rows = (data['results'] as List).cast<Map<String, dynamic>>();
    return rows.map(Document.fromJson).toList();
  }

  Future<Document?> getById(String id) async {
    try {
      final data = await _api.get('$_base$id/') as Map<String, dynamic>;
      return Document.fromJson(data);
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Downloads the file (JWT-protected) into the cache directory.
  Future<File> downloadToCache(Document doc) async {
    final url = doc.downloadUrl;
    if (url == null || url.isEmpty) {
      throw const ApiException('Fichier indisponible.');
    }
    final bytes = await _api.getBytes(url);
    final dir = await getTemporaryDirectory();
    final safeName = _safeFileName(doc.displayName, doc.id);
    final file = File('${dir.path}${Platform.pathSeparator}$safeName');
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  static String _safeFileName(String name, String fallback) {
    final cleaned = name.replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1F]'), '_').trim();
    return cleaned.isEmpty ? fallback : cleaned;
  }
}
