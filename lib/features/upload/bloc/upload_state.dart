part of 'upload_bloc.dart';

enum UploadStatus { idle, submitting, success, failure }

final class UploadState extends Equatable {
  const UploadState({this.status = UploadStatus.idle, this.error});

  final UploadStatus status;
  final String? error;

  bool get isSubmitting => status == UploadStatus.submitting;

  UploadState copyWith({UploadStatus? status, String? Function()? error}) {
    return UploadState(
      status: status ?? this.status,
      error: error != null ? error() : this.error,
    );
  }

  @override
  List<Object?> get props => [status, error];
}
