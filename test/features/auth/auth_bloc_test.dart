import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:client_flow_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:client_flow_mobile/features/auth/data/models/client_account.dart';
import 'package:client_flow_mobile/features/auth/data/repositories/auth_repository.dart';
import 'package:client_flow_mobile/features/push/push_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supa;

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockPushService extends Mock implements PushService {}

supa.Session _session(String userId) => supa.Session(
      accessToken: 'token-$userId',
      tokenType: 'bearer',
      user: supa.User(
        id: userId,
        appMetadata: const {},
        userMetadata: const {},
        aud: 'authenticated',
        createdAt: '2026-01-01T00:00:00Z',
      ),
    );

const _activeAccount = ClientAccount(
  id: 'ca-1',
  clientId: 'client-1',
  userId: 'user-1',
  accessStatus: 'active',
);

const _suspendedAccount = ClientAccount(
  id: 'ca-2',
  clientId: 'client-1',
  userId: 'user-1',
  accessStatus: 'suspended',
);

void main() {
  late _MockAuthRepository repo;
  late _MockPushService push;
  late StreamController<supa.AuthState> authChanges;

  setUp(() {
    repo = _MockAuthRepository();
    push = _MockPushService();
    authChanges = StreamController<supa.AuthState>.broadcast();
    when(() => repo.onAuthStateChange).thenAnswer((_) => authChanges.stream);
    when(() => push.register(any())).thenAnswer((_) async {});
    when(() => push.unregister(any())).thenAnswer((_) async {});
  });

  tearDown(() => authChanges.close());

  AuthBloc build() => AuthBloc(authRepository: repo, pushService: push);

  group('AuthStarted', () {
    blocTest<AuthBloc, AuthState>(
      'goes unauthenticated when no persisted session',
      build: () {
        when(() => repo.currentSession).thenReturn(null);
        return build();
      },
      act: (b) => b.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated)
            .having((s) => s.isAuthed, 'isAuthed', false),
      ],
      verify: (_) => verifyNever(() => push.register(any())),
    );

    blocTest<AuthBloc, AuthState>(
      'restores session, loads client account and registers push',
      build: () {
        when(() => repo.currentSession).thenReturn(_session('user-1'));
        when(() => repo.loadClientAccount('user-1'))
            .thenAnswer((_) async => _activeAccount);
        return build();
      },
      act: (b) => b.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.authenticated)
            .having((s) => s.clientId, 'clientId', 'client-1')
            .having((s) => s.isAuthed, 'isAuthed', true),
      ],
      verify: (_) => verify(() => push.register('user-1')).called(1),
    );

    blocTest<AuthBloc, AuthState>(
      'a session with a non-active client account is NOT authed',
      build: () {
        when(() => repo.currentSession).thenReturn(_session('user-1'));
        when(() => repo.loadClientAccount('user-1'))
            .thenAnswer((_) async => _suspendedAccount);
        return build();
      },
      act: (b) => b.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.authenticated)
            .having((s) => s.isAuthed, 'isAuthed', false),
      ],
    );
  });

  group('auth state changes', () {
    blocTest<AuthBloc, AuthState>(
      'SIGNED_IN loads the account and registers push',
      build: () {
        when(() => repo.currentSession).thenReturn(null);
        when(() => repo.loadClientAccount('user-1'))
            .thenAnswer((_) async => _activeAccount);
        return build();
      },
      act: (b) async {
        b.add(const AuthStarted());
        await Future<void>.delayed(Duration.zero);
        authChanges.add(
          supa.AuthState(supa.AuthChangeEvent.signedIn, _session('user-1')),
        );
      },
      skip: 1,
      expect: () => [
        isA<AuthState>().having((s) => s.isAuthed, 'isAuthed', true),
      ],
      verify: (_) => verify(() => push.register('user-1')).called(1),
    );

    blocTest<AuthBloc, AuthState>(
      'SIGNED_OUT clears session and account',
      build: () {
        when(() => repo.currentSession).thenReturn(_session('user-1'));
        when(() => repo.loadClientAccount('user-1'))
            .thenAnswer((_) async => _activeAccount);
        return build();
      },
      act: (b) async {
        b.add(const AuthStarted());
        await Future<void>.delayed(Duration.zero);
        authChanges.add(
          const supa.AuthState(supa.AuthChangeEvent.signedOut, null),
        );
      },
      skip: 1,
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated)
            .having((s) => s.session, 'session', isNull)
            .having((s) => s.clientAccount, 'clientAccount', isNull),
      ],
    );
  });

  group('AuthSignInRequested', () {
    blocTest<AuthBloc, AuthState>(
      'toggles signingIn and surfaces AuthException message',
      build: () {
        when(() => repo.signIn(email: 'a@b.fr', password: 'bad')).thenThrow(
          const supa.AuthException('Invalid login credentials'),
        );
        return build();
      },
      act: (b) =>
          b.add(const AuthSignInRequested(email: 'a@b.fr', password: 'bad')),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.signingIn, 'signingIn', true)
            .having((s) => s.signInError, 'signInError', isNull),
        isA<AuthState>()
            .having((s) => s.signingIn, 'signingIn', false)
            .having((s) => s.signInError, 'signInError',
                'Invalid login credentials'),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'succeeds silently (session arrives through onAuthStateChange)',
      build: () {
        when(() => repo.signIn(email: 'a@b.fr', password: 'ok'))
            .thenAnswer((_) async {});
        return build();
      },
      act: (b) =>
          b.add(const AuthSignInRequested(email: 'a@b.fr', password: 'ok')),
      expect: () => [
        isA<AuthState>().having((s) => s.signingIn, 'signingIn', true),
        isA<AuthState>()
            .having((s) => s.signingIn, 'signingIn', false)
            .having((s) => s.signInError, 'signInError', isNull),
      ],
    );
  });

  blocTest<AuthBloc, AuthState>(
    'AuthSignOutRequested unregisters push before signing out',
    build: () {
      when(() => repo.currentSession).thenReturn(_session('user-1'));
      when(() => repo.loadClientAccount('user-1'))
          .thenAnswer((_) async => _activeAccount);
      when(() => repo.signOut()).thenAnswer((_) async {});
      return build();
    },
    act: (b) async {
      b.add(const AuthStarted());
      await Future<void>.delayed(Duration.zero);
      b.add(const AuthSignOutRequested());
    },
    verify: (_) {
      verifyInOrder([
        () => push.unregister('user-1'),
        () => repo.signOut(),
      ]);
    },
  );
}
