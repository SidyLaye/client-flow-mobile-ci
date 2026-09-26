part of 'auth_bloc.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

final class AuthState extends Equatable {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.clientAccount,
    this.signingIn = false,
    this.signInError,
  });

  final AuthStatus status;
  final AuthUser? user;
  final ClientAccount? clientAccount;
  final bool signingIn;

  /// Last sign-in failure message; cleared on the next attempt.
  final String? signInError;

  String? get clientId => clientAccount?.clientId;

  /// The app is usable only with a user AND an active client account.
  bool get isAuthed =>
      status == AuthStatus.authenticated &&
      user != null &&
      (clientAccount?.isActive ?? false);

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? Function()? user,
    ClientAccount? Function()? clientAccount,
    bool? signingIn,
    String? Function()? signInError,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user != null ? user() : this.user,
      clientAccount:
          clientAccount != null ? clientAccount() : this.clientAccount,
      signingIn: signingIn ?? this.signingIn,
      signInError: signInError != null ? signInError() : this.signInError,
    );
  }

  @override
  List<Object?> get props => [status, user, clientAccount, signingIn, signInError];
}
