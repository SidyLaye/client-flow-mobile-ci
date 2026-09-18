part of 'document_detail_bloc.dart';

enum DocumentDetailStatus { initial, loading, success, notFound, failure }

final class DocumentDetailState extends Equatable {
  const DocumentDetailState({
    this.status = DocumentDetailStatus.initial,
    this.document,
    this.downloading = false,
    this.error,
    this.openError,
  });

  final DocumentDetailStatus status;
  final Document? document;
  final bool downloading;

  /// Error while loading metadata.
  final String? error;

  /// Error while downloading / opening the file (shown as an alert).
  final String? openError;

  DocumentDetailState copyWith({
    DocumentDetailStatus? status,
    Document? Function()? document,
    bool? downloading,
    String? Function()? error,
    String? Function()? openError,
  }) {
    return DocumentDetailState(
      status: status ?? this.status,
      document: document != null ? document() : this.document,
      downloading: downloading ?? this.downloading,
      error: error != null ? error() : this.error,
      openError: openError != null ? openError() : this.openError,
    );
  }

  @override
  List<Object?> get props => [status, document, downloading, error, openError];
}
