import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Keeps a durable copy of every PDF the client sends, under the app's
/// Documents directory (`<Documents>/scans/`). On iOS this folder is exposed
/// in the Files app ("Sur mon iPhone › ComptaFlow Client") thanks to
/// `UIFileSharingEnabled`; on Android it lives in the app's private storage
/// and can be exported through the share sheet.
class LocalDocumentStore {
  const LocalDocumentStore();

  static const folder = 'scans';

  Future<Directory> _dir() async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory('${base.path}${Platform.pathSeparator}$folder');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Copies [sourcePath] to `<Documents>/scans/<fileName>` and returns the
  /// saved file. The temp source is left untouched.
  Future<File> saveCopy(String sourcePath, String fileName) async {
    final dir = await _dir();
    final target = File('${dir.path}${Platform.pathSeparator}$fileName');
    return File(sourcePath).copy(target.path);
  }
}
