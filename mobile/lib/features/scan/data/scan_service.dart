import 'dart:io';

import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:equatable/equatable.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

/// Result of the "Fichier" picker: either a ready-made PDF or an image page.
sealed class PickedFile extends Equatable {
  const PickedFile(this.path);

  final String path;

  @override
  List<Object?> get props => [path];
}

final class PickedPdf extends PickedFile {
  const PickedPdf(super.path, {required this.name});

  /// File name without the `.pdf` extension.
  final String name;

  @override
  List<Object?> get props => [path, name];
}

final class PickedImage extends PickedFile {
  const PickedImage(super.path);
}

/// Wraps the native scanner (ML Kit / VisionKit), the gallery and the file
/// picker, and normalizes every image to a ≤1600px JPEG for upload.
class ScanService {
  ScanService({ImagePicker? imagePicker})
      : _imagePicker = imagePicker ?? ImagePicker();

  final ImagePicker _imagePicker;

  static const maxPages = 25;
  static const targetWidth = 1600;
  static const jpegQuality = 80;

  /// Opens the CamScanner-style native flow (edge detection + perspective
  /// correction, user-adjustable crop). Returns `null` when cancelled.
  Future<List<String>?> scanDocuments() async {
    final images = await CunningDocumentScanner.getPictures(
      noOfPages: maxPages,
      scannerSource: ScannerSource.camera,
      androidScannerMode: AndroidScannerMode.full,
      iosScannerOptions: IosScannerOptions(
        imageFormat: IosImageFormat.jpg,
        jpgCompressionQuality: 0.8,
      ),
    );
    if (images == null || images.isEmpty) return null;
    return _compressAll(images);
  }

  /// Multi-select from the photo library. Empty list when cancelled.
  Future<List<String>> pickFromLibrary() async {
    final assets = await _imagePicker.pickMultiImage(imageQuality: jpegQuality);
    if (assets.isEmpty) return const [];
    return _compressAll(assets.map((a) => a.path).toList());
  }

  /// PDF or image from the document picker. `null` when cancelled.
  Future<PickedFile?> pickFile() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp'],
    );
    final path = file?.path;
    if (file == null || path == null) return null;

    final isPdf = file.extension?.toLowerCase() == 'pdf' ||
        path.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      final name = file.name.replaceAll(RegExp(r'\.pdf$', caseSensitive: false), '');
      return PickedPdf(path, name: name.isEmpty ? 'Document' : name);
    }
    return PickedImage(path);
  }

  Future<List<String>> _compressAll(List<String> paths) =>
      Future.wait(paths.map(compress));

  /// Resizes to ~[targetWidth] on the short side and re-encodes as JPEG 80.
  Future<String> compress(String path) async {
    final dir = await getTemporaryDirectory();
    final target =
        '${dir.path}${Platform.pathSeparator}page_${DateTime.now().microsecondsSinceEpoch}.jpg';
    final out = await FlutterImageCompress.compressAndGetFile(
      path,
      target,
      minWidth: targetWidth,
      minHeight: targetWidth,
      quality: jpegQuality,
      format: CompressFormat.jpeg,
    );
    return out?.path ?? path;
  }
}
