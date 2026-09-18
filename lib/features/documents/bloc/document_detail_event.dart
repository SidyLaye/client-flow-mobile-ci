part of 'document_detail_bloc.dart';

sealed class DocumentDetailEvent extends Equatable {
  const DocumentDetailEvent();

  @override
  List<Object?> get props => [];
}

final class DocumentDetailRequested extends DocumentDetailEvent {
  const DocumentDetailRequested();
}

/// Download through a signed URL and hand the file to the share sheet.
final class DocumentOpenRequested extends DocumentDetailEvent {
  const DocumentOpenRequested();
}
