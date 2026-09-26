import 'dart:io';

import '../../../core/api/api_client.dart';
import '../../../core/utils/formatters.dart';
import '../../documents/data/models/document.dart';
import 'local_document_store.dart';
import 'pdf_builder.dart';

/// Outcome of a successful submission.
class UploadResult {
  const UploadResult({required this.fileName, required this.savedPath});

  final String fileName;

  /// Durable on-device copy of the sent PDF.
  final String savedPath;
}

class UploadRepository {
  UploadRepository(
    this._api, {
    PdfBuilder pdfBuilder = const PdfBuilder(),
    LocalDocumentStore localStore = const LocalDocumentStore(),
  })  : _pdf = pdfBuilder,
        _local = localStore;

  final ApiClient _api;
  final PdfBuilder _pdf;
  final LocalDocumentStore _local;

  static const _uploadPath = '/api/v1/client-portal/documents/upload/';

  /// Server-side limit (see backend `MAX_UPLOAD_BYTES`).
  static const maxBytes = 25 * 1024 * 1024;

  /// Full flow: build (or pass through) the PDF, send it to the cabinet
  /// (optionally as the answer to [requestId]), then keep a copy on the
  /// device. [clientId] / [userId] are implied by the session.
  Future<UploadResult> submit({
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
    if (size > maxBytes) {
      throw const ApiException(
        'Le document dépasse 25 Mo. Réduisez le nombre de pages et réessayez.',
      );
    }

    // 2. Send it: the backend stores it, links it to the request and
    //    notifies the cabinet.
    final trimmedComment = comment?.trim() ?? '';
    await _api.postFile(
      _uploadPath,
      fileField: 'file',
      filePath: filePath,
      filename: fileName,
      contentType: 'application/pdf',
      fields: {
        'title': cleanTitle,
        'category': DocumentCategory.codeFor(category),
        if (trimmedComment.isNotEmpty) 'client_comment': trimmedComment,
        if (requestId != null && requestId.isNotEmpty) 'document_request': requestId,
      },
    );

    // 3. Keep a durable copy on the device (temp files can be purged).
    final saved = await _local.saveCopy(filePath, fileName);
    return UploadResult(fileName: fileName, savedPath: saved.path);
  }

  static bool isSinglePdf(List<String> pageUris) =>
      pageUris.length == 1 && pageUris.first.toLowerCase().endsWith('.pdf');
}
