part of 'upload_bloc.dart';

sealed class UploadEvent extends Equatable {
  const UploadEvent();

  @override
  List<Object?> get props => [];
}

final class UploadSubmitted extends UploadEvent {
  const UploadSubmitted({
    required this.title,
    required this.category,
    required this.comment,
  });

  final String title;
  final String category;
  final String comment;

  @override
  List<Object?> get props => [title, category, comment];
}

/// Acknowledge the failure alert so it is not replayed.
final class UploadErrorConsumed extends UploadEvent {
  const UploadErrorConsumed();
}
