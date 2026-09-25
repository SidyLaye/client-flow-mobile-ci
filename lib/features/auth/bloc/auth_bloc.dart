import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/api/api_client.dart';
import '../../push/push_service.dart';
import '../data/models/client_account.dart';
import '../data/repositories/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

/// Owns the JWT session and the client identity.
///
/// - On launch, restores the stored session: the cached identity opens the
///   app immediately (even offline) and is refreshed from the server.
/// - Signs out when the backend refuses the session (password reset or
///   access suspended by the cabinet).
/// - (Un)registers the push token around sign-in / sign-out.
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({
    required AuthRepository authRepository,
    required PushService pushService,
  })  : _auth = authRepository,
        _push = pushService,
        super(const AuthState()) {
    on<AuthStarted>(_onStarted);
    on<_AuthSessionExpired>(_onSessionExpired);
    on<AuthSignInRequested>(_onSignInRequested);
    on<AuthSignOutRequested>(_onSignOutRequested);
    on<AuthClientAccountRefreshRequested>(_onRefreshRequested);
  }

  final AuthRepository _auth;
  final PushService _push;
  StreamSubscription<void>? _expiredSub;

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    await _expiredSub?.cancel();
    _expiredSub =
        _auth.onSessionExpired.listen((_) => add(const _AuthSessionExpired()));

    if (!await _auth.hasStoredSession()) {
      emit(_signedOut());
      return;
    }

    final cached = await _auth.cachedIdentity();
    if (cached != null) {
      emit(_signedIn(cached));
      unawaited(_push.register(cached.user.id));
    }

    try {
      final fresh = await _auth.fetchIdentity();
      emit(_signedIn(fresh));
      if (cached == null) unawaited(_push.register(fresh.user.id));
    } on NotAClientAccountException catch (e) {
      await _auth.signOut();
      emit(_signedOut(error: e.toString()));
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await _auth.signOut();
        emit(_signedOut());
      } else if (cached == null) {
        // Offline on first launch after an update: nothing to show yet.
        emit(_signedOut(error: e.message));
      }
      // Otherwise keep the cached identity; screens show their own errors.
    } catch (e) {
      debugPrint('[auth] restore failed $e');
      if (cached == null) emit(_signedOut());
    }
  }

  void _onSessionExpired(_AuthSessionExpired event, Emitter<AuthState> emit) {
    if (state.status == AuthStatus.unauthenticated) return;
    emit(_signedOut(error: 'Votre session a expiré. Reconnectez-vous.'));
  }

  Future<void> _onSignInRequested(
    AuthSignInRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (state.signingIn) return;
    emit(state.copyWith(signingIn: true, signInError: () => null));
    try {
      final identity = await _auth.signIn(
        email: event.email,
        password: event.password,
      );
      emit(_signedIn(identity));
      unawaited(_push.register(identity.user.id));
    } on ApiException catch (e) {
      emit(state.copyWith(signingIn: false, signInError: () => e.message));
    } on NotAClientAccountException catch (e) {
      emit(state.copyWith(signingIn: false, signInError: () => e.toString()));
    } catch (e) {
      debugPrint('[auth] sign-in failed $e');
      emit(state.copyWith(
        signingIn: false,
        signInError: () => 'Connexion impossible. Réessayez.',
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
    emit(_signedOut());
  }

  Future<void> _onRefreshRequested(
    AuthClientAccountRefreshRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (state.user == null) return;
    try {
      emit(_signedIn(await _auth.fetchIdentity()));
    } catch (e) {
      debugPrint('[auth] refresh failed $e');
    }
  }

  AuthState _signedIn(PortalIdentity identity) => AuthState(
        status: AuthStatus.authenticated,
        user: identity.user,
        clientAccount: identity.account,
      );

  AuthState _signedOut({String? error}) => AuthState(
        status: AuthStatus.unauthenticated,
        signInError: error,
      );

  @override
  Future<void> close() async {
    await _expiredSub?.cancel();
    return super.close();
  }
}
