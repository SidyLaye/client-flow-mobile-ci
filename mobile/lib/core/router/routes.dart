/// Route paths. Detail routes are functions so call sites never hand-build
/// strings.
abstract final class AppRoutes {
  static const login = '/login';

  // Bottom-tab branches.
  static const home = '/home';
  static const documents = '/documents';
  static const requests = '/requests';
  static const messages = '/messages';
  static const profile = '/profile';

  // Root-level (full screen) routes.
  static const scan = '/scan';
  static const uploadReview = '/upload-review';

  static String documentDetail(String id) => '$documents/$id';
  static String requestDetail(String id) => '$requests/$id';

  static String scanFor(String? requestId) => requestId == null || requestId.isEmpty
      ? scan
      : Uri(path: scan, queryParameters: {'requestId': requestId}).toString();
}

/// Typed `extra` for the upload review route.
class UploadReviewArgs {
  const UploadReviewArgs({
    required this.pageUris,
    this.suggestedTitle,
    this.requestId,
  });

  /// Local file paths — either N images (one per page) or a single PDF.
  final List<String> pageUris;
  final String? suggestedTitle;
  final String? requestId;
}
