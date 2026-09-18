part of 'auth_bloc.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Restore the persisted session on app launch and start listening.
final class AuthStarted extends AuthEvent {
  const AuthStarted();
}

/// Internal: forwarded from Supabase's `onAuthStateChange` stream.
final class _AuthSessionChanged extends AuthEvent {
  const _AuthSessionChanged(this.event, this.session);

  final AuthChangeEvent event;
  final Session? session;

  @override
  List<Object?> get props => [event, session?.accessToken];
}

final class AuthSignInRequested extends AuthEvent {
  const AuthSignInRequested({required this.email, required this.password});

  final String email;
  final String password;

  @override
  List<Object?> get props => [email, password];
}

final class AuthSignOutRequested extends AuthEvent {
  const AuthSignOutRequested();
}

final class AuthClientAccountRefreshRequested extends AuthEvent {
  const AuthClientAccountRefreshRequested();
}
