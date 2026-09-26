part of 'documents_bloc.dart';

sealed class DocumentsEvent extends Equatable {
  const DocumentsEvent();

  @override
  List<Object?> get props => [];
}

/// Load or refresh the list (also fired when the tab regains focus).
final class DocumentsRequested extends DocumentsEvent {
  const DocumentsRequested();
}
