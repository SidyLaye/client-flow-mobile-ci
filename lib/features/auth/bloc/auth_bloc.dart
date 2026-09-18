import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import 'package:supabase_flutter/supabase_flutter.dart' as supa show AuthState;

import '../../push/push_service.dart';
import '../data/models/client_account.dart';
import '../data/repositories/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

/// Owns the Supabase session and the `client_accounts` row. Mirrors the old
/// `AuthContext`: restores the session on launch, reacts to auth changes and
/// (un)registers the push token around sign-in / sign-out.
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({
    required AuthRepository authRepository,
    required PushService pushService,
  })  : _auth = authRepository,
        _push = pushService,
        super(const AuthState()) {
    on<AuthStarted>(_onStarted);
    on<_AuthSessionChanged>(_onSessionChanged);
    on<AuthSignInRequested>(_onSignInRequested);
    on<AuthSignOutRequested>(_onSignOutRequested);
    on<AuthClientAccountRefreshRequested>(_onRefreshRequested);
  }

  final AuthRepository _auth;
  final PushService _push;
  StreamSubscription<supa.AuthState>? _sub;

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    final session = _auth.currentSession;
    if (session != null) {
      final account = await _auth.loadClientAccount(session.user.id);
      emit(state.copyWith(
        status: AuthStatus.authenticated,
        session: () => session,
        clientAccount: () => account,
      ));
      unawaited(_push.register(session.user.id));
    } else {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        session: () => null,
        clientAccount: () => null,
      ));
    }

    await _sub?.cancel();
    _sub = _auth.onAuthStateChange.listen(
      (change) => add(_AuthSessionChanged(change.event, change.session)),
    );
  }

  Future<void> _onSessionChanged(
    _AuthSessionChanged event,
    Emitter<AuthState> emit,
  ) async {
    final session = event.session;
    if (session == null) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        session: () => null,
        clientAccount: () => null,
      ));
      return;
    }

    // Token refreshes carry the same user: keep the cached account row.
    final account = event.event == AuthChangeEvent.tokenRefreshed &&
            state.clientAccount?.userId == session.user.id
        ? state.clientAccount
        : await _auth.loadClientAccount(session.user.id);

    emit(state.copyWith(
      status: AuthStatus.authenticated,
      session: () => session,
      clientAccount: () => account,
    ));

    if (event.event == AuthChangeEvent.signedIn) {
      unawaited(_push.register(session.user.id));
    }
  }

  Future<void> _onSignInRequested(
    AuthSignInRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(signingIn: true, signInError: () => null));
    try {
      await _auth.signIn(email: event.email, password: event.password);
      emit(state.copyWith(signingIn: false));
    } on AuthException catch (e) {
      emit(state.copyWith(signingIn: false, signInError: () => e.message));
    } catch (_) {
      emit(state.copyWith(
        signingIn: false,
        signInError: () => 'Identifiants invalides.',
      ));
    }
  }

  Future<void> _onSignOutRequested(
    AuthSignOutRequested event,
    Emitter<AuthState> emit,
  ) async {
    final uid = state.user?.id;
    if (uid != null) await _push.unregister(uid);
    await _auth.signOut();
  }

  Future<void> _onRefreshRequested(
    AuthClientAccountRefreshRequested event,
    Emitter<AuthState> emit,
  ) async {
    final uid = state.user?.id;
    if (uid == null) return;
    final account = await _auth.loadClientAccount(uid);
    emit(state.copyWith(clientAccount: () => account));
  }

  @override
  Future<void> close() async {
    await _sub?.cancel();
    return super.close();
  }
}
