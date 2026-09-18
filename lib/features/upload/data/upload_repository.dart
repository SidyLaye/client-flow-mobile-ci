import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_service.dart';
import '../../../core/utils/formatters.dart';
import 'pdf_builder.dart';

class UploadRepository {
  UploadRepository(this._supabase, {PdfBuilder pdfBuilder = const PdfBuilder()})
      : _pdf = pdfBuilder;

  final SupabaseService _supabase;
  final PdfBuilder _pdf;

  static const bucket = 'client-documents';

  /// Full flow: build (or pass through) the PDF, upload it to the client's
  /// storage folder, then register the `documents` row.
  Future<void> submit({
    required String clientId,
    required String userId,
    required List<String> pageUris,
    required String title,
    required String category,
    String? comment,
    String? requestId,
  }) async {
    final cleanTitle = title.trim();
    final safe = safeFileBase(cleanTitle);

    // 1. Build the PDF (or pass through the existing one).
    final String filePath;
    final String fileName;
    final int size;
    if (isSinglePdf(pageUris)) {
      filePath = pageUris.first;
      fileName = '${safe}_${DateTime.now().millisecondsSinceEpoch}.pdf';
      size = await File(filePath).length();
    } else {
      final built = await _pdf.fromImages(pageUris, safe);
      filePath = built.path;
      fileName = built.fileName;
      size = built.size;
    }

    // 2. Upload to the client-documents bucket ({client_id}/...).
    final storagePath =
        '$clientId/${DateTime.now().millisecondsSinceEpoch}_$fileName';
    await _supabase.storage.from(bucket).upload(
          storagePath,
          File(filePath),
          fileOptions: const FileOptions(
            contentType: 'application/pdf',
            upsert: false,
          ),
        );

    // 3. Register metadata via the edge function (privileged insert + audit),
    //    falling back to a direct RLS-checked insert.
    final originalFileName = '$cleanTitle.pdf';
    final trimmedComment = comment?.trim();
    final clientComment =
        trimmedComment == null || trimmedComment.isEmpty ? null : trimmedComment;

    try {
      await _supabase.invokeFunction<dynamic>('create-document-record', {
        'client_id': clientId,
        'file_name': fileName,
        'original_file_name': originalFileName,
        'storage_path': storagePath,
        'mime_type': 'application/pdf',
        'size_bytes': size,
        'category': category,
        'client_comment': clientComment,
        'request_id': requestId,
      });
    } catch (e) {
      debugPrint('[upload] edge function failed, direct insert fallback: $e');
      await _supabase.from('documents').insert({
        'client_id': clientId,
        'uploaded_by': userId,
        'file_name': fileName,
        'original_file_name': originalFileName,
        'storage_path': storagePath,
        'mime_type': 'application/pdf',
        'size_bytes': size,
        'category': category,
        'client_comment': clientComment,
        'status': 'received',
        'visible_to_client': true,
      });
    }
  }

  static bool isSinglePdf(List<String> pageUris) =>
      pageUris.length == 1 && pageUris.first.toLowerCase().endsWith('.pdf');
}
