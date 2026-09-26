import 'dart:io';
import 'dart:isolate';

import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../../core/utils/formatters.dart';

class BuiltPdf {
  const BuiltPdf({required this.path, required this.fileName, required this.size});

  final String path;
  final String fileName;
  final int size;
}

/// Builds an A4 PDF from a list of local image paths (one per page), each
/// image centered and contained with zero margins — the same layout the
/// old HTML → expo-print pipeline produced.
class PdfBuilder {
  const PdfBuilder();

  Future<BuiltPdf> fromImages(List<String> imagePaths, String baseName) async {
    if (imagePaths.isEmpty) throw StateError('Aucune page à exporter');

    // Pure-Dart encoding: keep it off the UI thread.
    final bytes = await Isolate.run(() => _encode(imagePaths));

    final fileName =
        '${safeFileBase(baseName)}_${DateTime.now().millisecondsSinceEpoch}.pdf';
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}${Platform.pathSeparator}$fileName');
    await file.writeAsBytes(bytes, flush: true);

    return BuiltPdf(path: file.path, fileName: fileName, size: bytes.length);
  }

  static Future<List<int>> _encode(List<String> imagePaths) async {
    final doc = pw.Document();
    for (final path in imagePaths) {
      final image = pw.MemoryImage(await File(path).readAsBytes());
      doc.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          margin: pw.EdgeInsets.zero,
          build: (_) => pw.Center(
            child: pw.Image(image, fit: pw.BoxFit.contain),
          ),
        ),
      );
    }
    return doc.save();
  }
}
