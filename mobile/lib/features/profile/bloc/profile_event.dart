part of 'profile_bloc.dart';

sealed class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

/// Load company + recent notifications and subscribe to realtime inserts.
final class ProfileStarted extends ProfileEvent {
  const ProfileStarted();
}

/// Internal: a realtime INSERT arrived.
final class _NotificationReceived extends ProfileEvent {
  const _NotificationReceived(this.notification);

  final AppNotification notification;

  @override
  List<Object?> get props => [notification];
}

/// Optimistically mark a notification as read.
final class NotificationReadRequested extends ProfileEvent {
  const NotificationReadRequested(this.id);

  final String id;

  @override
  List<Object?> get props => [id];
}
