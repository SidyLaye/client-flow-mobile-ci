part of 'upload_bloc.dart';

enum UploadStatus { idle, submitting, success, failure }

final class UploadState extends Equatable {
  const UploadState({
    this.status = UploadStatus.idle,
    this.error,
    this.savedPath,
  });

  final UploadStatus status;
  final String? error;

  /// On-device copy of the sent PDF; set on [UploadStatus.success].
  final String? savedPath;

  bool get isSubmitting => status == UploadStatus.submitting;

  UploadState copyWith({
    UploadStatus? status,
    String? Function()? error,
    String? savedPath,
  }) {
    return UploadState(
      status: status ?? this.status,
      error: error != null ? error() : this.error,
      savedPath: savedPath ?? this.savedPath,
    );
  }

  @override
  List<Object?> get props => [status, error, savedPath];
}
