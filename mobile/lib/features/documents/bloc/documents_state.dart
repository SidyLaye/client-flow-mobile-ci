part of 'documents_bloc.dart';

enum DocumentsStatus { initial, loading, success, failure }

final class DocumentsState extends Equatable {
  const DocumentsState({
    this.status = DocumentsStatus.initial,
    this.documents = const [],
    this.error,
  });

  final DocumentsStatus status;
  final List<Document> documents;
  final String? error;

  bool get isLoading => status == DocumentsStatus.loading;

  DocumentsState copyWith({
    DocumentsStatus? status,
    List<Document>? documents,
    String? error,
  }) {
    return DocumentsState(
      status: status ?? this.status,
      documents: documents ?? this.documents,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, documents, error];
}
