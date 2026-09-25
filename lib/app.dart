import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'core/router/app_router.dart';
import 'core/router/routes.dart';
import 'core/api/api_client.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/data/repositories/auth_repository.dart';
import 'features/documents/data/documents_repository.dart';
import 'features/home/data/home_repository.dart';
import 'features/messages/data/messages_repository.dart';
import 'features/profile/data/notifications_repository.dart';
import 'features/push/push_service.dart';
import 'features/requests/data/requests_repository.dart';
import 'features/scan/data/scan_service.dart';
import 'features/upload/data/upload_repository.dart';

/// Composition root: repositories → AuthBloc → router.
class ComptaFlowApp extends StatelessWidget {
  const ComptaFlowApp({
    super.key,
    required this.api,
    required this.pushService,
  });

  final ApiClient api;
  final PushService pushService;

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: api),
        RepositoryProvider.value(value: pushService),
        RepositoryProvider(create: (_) => AuthRepository(api)),
        RepositoryProvider(create: (_) => HomeRepository(api)),
        RepositoryProvider(create: (_) => DocumentsRepository(api)),
        RepositoryProvider(create: (_) => RequestsRepository(api)),
        RepositoryProvider(create: (_) => MessagesRepository(api)),
        RepositoryProvider(create: (_) => NotificationsRepository(api)),
        RepositoryProvider(create: (_) => UploadRepository(api)),
        RepositoryProvider(create: (_) => ScanService()),
      ],
      child: BlocProvider(
        create: (context) => AuthBloc(
          authRepository: context.read<AuthRepository>(),
          pushService: pushService,
        )..add(const AuthStarted()),
        child: const _AppView(),
      ),
    );
  }
}

class _AppView extends StatefulWidget {
  const _AppView();

  @override
  State<_AppView> createState() => _AppViewState();
}

class _AppViewState extends State<_AppView> {
  late final GoRouter _router;
  StreamSubscription<PushTapPayload>? _tapSub;

  /// Tap received before the session was restored — replayed once authed.
  PushTapPayload? _pendingTap;

  @override
  void initState() {
    super.initState();
    final authBloc = context.read<AuthBloc>();
    _router = buildRouter(authBloc);
    _tapSub = context.read<PushService>().onNotificationTap.listen(_onTap);
  }

  void _onTap(PushTapPayload payload) {
    if (!context.read<AuthBloc>().state.isAuthed) {
      _pendingTap = payload;
      return;
    }
    _navigateTo(payload);
  }

  void _navigateTo(PushTapPayload payload) {
    if (payload.documentId case final id?) {
      _router.push(AppRoutes.documentDetail(id));
    } else if (payload.requestId case final id?) {
      _router.push(AppRoutes.requestDetail(id));
    }
  }

  @override
  void dispose() {
    _tapSub?.cancel();
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listenWhen: (prev, curr) => prev.user?.id != curr.user?.id || prev.isAuthed != curr.isAuthed,
      listener: (context, state) {
        // Lets the conversation tell the client's own messages apart.
        context.read<MessagesRepository>().currentUserId = state.user?.id ?? '';

        if (!state.isAuthed) return;
        final pending = _pendingTap;
        if (pending == null) return;
        _pendingTap = null;
        // Let the router settle on /home before pushing the detail.
        WidgetsBinding.instance.addPostFrameCallback((_) => _navigateTo(pending));
      },
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: MaterialApp.router(
          title: 'ComptaFlow Client',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          routerConfig: _router,
        ),
      ),
    );
  }
}
