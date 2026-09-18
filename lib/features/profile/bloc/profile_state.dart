part of 'profile_bloc.dart';

enum ProfileStatus { initial, loading, success, failure }

final class ProfileState extends Equatable {
  const ProfileState({
    this.status = ProfileStatus.initial,
    this.companyName = '',
    this.notifications = const [],
  });

  final ProfileStatus status;
  final String companyName;
  final List<AppNotification> notifications;

  ProfileState copyWith({
    ProfileStatus? status,
    String? companyName,
    List<AppNotification>? notifications,
  }) {
    return ProfileState(
      status: status ?? this.status,
      companyName: companyName ?? this.companyName,
      notifications: notifications ?? this.notifications,
    );
  }

  @override
  List<Object?> get props => [status, companyName, notifications];
}
