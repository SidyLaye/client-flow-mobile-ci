part of 'auth_bloc.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Restore the persisted session on app launch.
final class AuthStarted extends AuthEvent {
  const AuthStarted();
}

/// Internal: the backend refused the refresh token.
final class _AuthSessionExpired extends AuthEvent {
  const _AuthSessionExpired();
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
