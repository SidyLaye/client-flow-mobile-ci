import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:client_flow_mobile/core/api/api_client.dart';
import 'package:client_flow_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:client_flow_mobile/features/auth/data/models/client_account.dart';
import 'package:client_flow_mobile/features/auth/data/repositories/auth_repository.dart';
import 'package:client_flow_mobile/features/push/push_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockPushService extends Mock implements PushService {}

const _identity = PortalIdentity(
  user: AuthUser(id: 'user-1', email: 'jean@client.fr'),
  account: ClientAccount(
    id: 'client-1',
    clientId: 'client-1',
    userId: 'user-1',
    accessStatus: 'active',
    companyName: 'Client SARL',
  ),
);

void main() {
  late _MockAuthRepository repo;
  late _MockPushService push;
  late StreamController<void> expired;

  setUp(() {
    repo = _MockAuthRepository();
    push = _MockPushService();
    expired = StreamController<void>.broadcast();
    when(() => repo.onSessionExpired).thenAnswer((_) => expired.stream);
    when(() => repo.signOut()).thenAnswer((_) async {});
    when(() => push.register(any())).thenAnswer((_) async {});
    when(() => push.unregister(any())).thenAnswer((_) async {});
  });

  tearDown(() => expired.close());

  AuthBloc build() => AuthBloc(authRepository: repo, pushService: push);

  group('AuthStarted', () {
    blocTest<AuthBloc, AuthState>(
      'goes unauthenticated when nothing is stored',
      build: () {
        when(() => repo.hasStoredSession()).thenAnswer((_) async => false);
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
      'restores the session from the server and registers push',
      build: () {
        when(() => repo.hasStoredSession()).thenAnswer((_) async => true);
        when(() => repo.cachedIdentity()).thenAnswer((_) async => null);
        when(() => repo.fetchIdentity()).thenAnswer((_) async => _identity);
        return build();
      },
      act: (b) => b.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.authenticated)
            .having((s) => s.clientId, 'clientId', 'client-1')
            .having((s) => s.user?.email, 'email', 'jean@client.fr')
            .having((s) => s.isAuthed, 'isAuthed', true),
      ],
      verify: (_) => verify(() => push.register('user-1')).called(1),
    );

    blocTest<AuthBloc, AuthState>(
      'opens offline with the cached identity',
      build: () {
        when(() => repo.hasStoredSession()).thenAnswer((_) async => true);
        when(() => repo.cachedIdentity()).thenAnswer((_) async => _identity);
        when(() => repo.fetchIdentity())
            .thenThrow(const ApiException('Pas de connexion internet.'));
        return build();
      },
      act: (b) => b.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>().having((s) => s.isAuthed, 'isAuthed', true),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'a revoked session (401) signs out even with a cache',
      build: () {
        when(() => repo.hasStoredSession()).thenAnswer((_) async => true);
        when(() => repo.cachedIdentity()).thenAnswer((_) async => _identity);
        when(() => repo.fetchIdentity()).thenThrow(
          const ApiException('Votre session a expiré.', statusCode: 401),
        );
        return build();
      },
      act: (b) => b.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>().having((s) => s.isAuthed, 'isAuthed', true),
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated)
            .having((s) => s.user, 'user', isNull),
      ],
    );
  });

  blocTest<AuthBloc, AuthState>(
    'session expiry from the API client signs out with a message',
    build: () {
      when(() => repo.hasStoredSession()).thenAnswer((_) async => true);
      when(() => repo.cachedIdentity()).thenAnswer((_) async => null);
      when(() => repo.fetchIdentity()).thenAnswer((_) async => _identity);
      return build();
    },
    act: (b) async {
      b.add(const AuthStarted());
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expired.add(null);
    },
    skip: 1,
    expect: () => [
      isA<AuthState>()
          .having((s) => s.status, 'status', AuthStatus.unauthenticated)
          .having((s) => s.signInError, 'signInError', isNotNull),
    ],
  );

  group('AuthSignInRequested', () {
    blocTest<AuthBloc, AuthState>(
      'toggles signingIn and surfaces the API message',
      build: () {
        when(() => repo.signIn(email: 'a@b.fr', password: 'bad')).thenThrow(
          const ApiException('Email ou mot de passe incorrect.', statusCode: 401),
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
                'Email ou mot de passe incorrect.'),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'a cabinet (staff) account is refused',
      build: () {
        when(() => repo.signIn(email: 'staff@cab.fr', password: 'ok'))
            .thenThrow(const NotAClientAccountException());
        return build();
      },
      act: (b) => b.add(
        const AuthSignInRequested(email: 'staff@cab.fr', password: 'ok'),
      ),
      expect: () => [
        isA<AuthState>().having((s) => s.signingIn, 'signingIn', true),
        isA<AuthState>()
            .having((s) => s.isAuthed, 'isAuthed', false)
            .having((s) => s.signInError, 'signInError', contains('espace client')),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'succeeds, authenticates and registers push',
      build: () {
        when(() => repo.signIn(email: 'a@b.fr', password: 'ok'))
            .thenAnswer((_) async => _identity);
        return build();
      },
      act: (b) =>
          b.add(const AuthSignInRequested(email: 'a@b.fr', password: 'ok')),
      expect: () => [
        isA<AuthState>().having((s) => s.signingIn, 'signingIn', true),
        isA<AuthState>()
            .having((s) => s.signingIn, 'signingIn', false)
            .having((s) => s.isAuthed, 'isAuthed', true),
      ],
      verify: (_) => verify(() => push.register('user-1')).called(1),
    );
  });

  blocTest<AuthBloc, AuthState>(
    'AuthSignOutRequested unregisters push before signing out',
    build: () {
      when(() => repo.signIn(email: 'a@b.fr', password: 'ok'))
          .thenAnswer((_) async => _identity);
      return build();
    },
    act: (b) async {
      b.add(const AuthSignInRequested(email: 'a@b.fr', password: 'ok'));
      await Future<void>.delayed(const Duration(milliseconds: 10));
      b.add(const AuthSignOutRequested());
    },
    verify: (b) {
      verifyInOrder([
        () => push.unregister('user-1'),
        () => repo.signOut(),
      ]);
      expect(b.state.status, AuthStatus.unauthenticated);
    },
  );
}
