part of 'auth_bloc.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

final class AuthState extends Equatable {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.session,
    this.clientAccount,
    this.signingIn = false,
    this.signInError,
  });

  final AuthStatus status;
  final Session? session;
  final ClientAccount? clientAccount;
  final bool signingIn;

  /// Last sign-in failure message; cleared on the next attempt.
  final String? signInError;

  User? get user => session?.user;
  String? get clientId => clientAccount?.clientId;

  /// The app is usable only with a session AND an active client account.
  bool get isAuthed =>
      status == AuthStatus.authenticated &&
      session != null &&
      (clientAccount?.isActive ?? false);

  AuthState copyWith({
    AuthStatus? status,
    Session? Function()? session,
    ClientAccount? Function()? clientAccount,
    bool? signingIn,
    String? Function()? signInError,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: session != null ? session() : this.session,
      clientAccount:
          clientAccount != null ? clientAccount() : this.clientAccount,
      signingIn: signingIn ?? this.signingIn,
      signInError: signInError != null ? signInError() : this.signInError,
    );
  }

  @override
  List<Object?> get props =>
      [status, session?.accessToken, clientAccount, signingIn, signInError];
}
