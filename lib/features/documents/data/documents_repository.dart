import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../../../core/supabase/supabase_service.dart';
import 'models/document.dart';

class DocumentsRepository {
  DocumentsRepository(this._supabase, {http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  final SupabaseService _supabase;
  final http.Client _http;

  static const bucket = 'client-documents';

  static const _listColumns =
      'id, file_name, original_file_name, category, status, period_month, '
      'period_year, created_at';

  static const _detailColumns =
      'id, file_name, original_file_name, storage_path, mime_type, size_bytes, '
      'category, status, period_month, period_year, internal_comment, '
      'client_comment, created_at';

  Future<List<Document>> listVisible(String clientId) async {
    final rows = await _supabase
        .from('documents')
        .select(_listColumns)
        .eq('client_id', clientId)
        .eq('visible_to_client', true)
        .order('created_at', ascending: false);
    return rows.map(Document.fromJson).toList();
  }

  Future<Document?> getById(String id) async {
    final row = await _supabase
        .from('documents')
        .select(_detailColumns)
        .eq('id', id)
        .maybeSingle();
    return row == null ? null : Document.fromJson(row);
  }

  /// Downloads the file through a short-lived signed URL into the cache
  /// directory and returns the local file.
  Future<File> downloadToCache(Document doc) async {
    final path = doc.storagePath;
    if (path == null || path.isEmpty) {
      throw StateError('Lien indisponible');
    }
    final signedUrl =
        await _supabase.storage.from(bucket).createSignedUrl(path, 60);

    final res = await _http.get(Uri.parse(signedUrl));
    if (res.statusCode != 200) {
      throw HttpException('Téléchargement échoué (${res.statusCode})');
    }

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}${Platform.pathSeparator}${doc.fileName}');
    await file.writeAsBytes(res.bodyBytes, flush: true);
    return file;
  }
}
