part of 'scan_bloc.dart';

final class ScanState extends Equatable {
  const ScanState({
    this.pages = const [],
    this.busy = false,
    this.error,
    this.pickedPdf,
  });

  /// Local paths of the captured pages, in order.
  final List<String> pages;

  /// True while the native scanner / a picker is open or images compress.
  final bool busy;

  /// One-shot error to show as an alert.
  final ScanError? error;

  /// One-shot: the user picked a ready-made PDF — go straight to review.
  final PickedPdf? pickedPdf;

  bool get hasPages => pages.isNotEmpty;

  ScanState copyWith({
    List<String>? pages,
    bool? busy,
    ScanError? Function()? error,
    PickedPdf? Function()? pickedPdf,
  }) {
    return ScanState(
      pages: pages ?? this.pages,
      busy: busy ?? this.busy,
      error: error != null ? error() : this.error,
      pickedPdf: pickedPdf != null ? pickedPdf() : this.pickedPdf,
    );
  }

  @override
  List<Object?> get props => [pages, busy, error, pickedPdf];
}

final class ScanError extends Equatable {
  const ScanError({required this.title, required this.message});

  final String title;
  final String message;

  @override
  List<Object?> get props => [title, message];
}
