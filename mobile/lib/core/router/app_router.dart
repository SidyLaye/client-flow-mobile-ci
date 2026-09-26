import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/documents/presentation/document_detail_page.dart';
import '../../features/documents/presentation/documents_page.dart';
import '../../features/home/presentation/home_page.dart';
import '../../features/messages/presentation/messages_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/requests/presentation/request_detail_page.dart';
import '../../features/requests/presentation/requests_page.dart';
import '../../features/scan/presentation/scan_page.dart';
import '../../features/upload/presentation/upload_review_page.dart';
import '../theme/app_theme.dart';
import 'main_shell.dart';
import 'routes.dart';

/// Bridges a Bloc stream to go_router's `refreshListenable`.
class BlocRouterRefresh extends ChangeNotifier {
  BlocRouterRefresh(Stream<Object?> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<Object?> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

GoRouter buildRouter(AuthBloc authBloc) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.home,
    refreshListenable: BlocRouterRefresh(authBloc.stream),
    redirect: (context, state) {
      final auth = authBloc.state;
      final loc = state.matchedLocation;

      // Session restore still in flight → hold on the splash.
      if (auth.status == AuthStatus.unknown) {
        return loc == _splash ? null : _splash;
      }
      if (!auth.isAuthed) {
        return loc == AppRoutes.login ? null : AppRoutes.login;
      }
      if (loc == AppRoutes.login || loc == _splash) return AppRoutes.home;
      return null;
    },
    routes: [
      GoRoute(
        path: _splash,
        builder: (_, _) => const _SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (_, _) => const LoginPage(),
      ),

      // Bottom tabs — each branch keeps its own navigator + scroll state.
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => MainShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (_, _) => const HomePage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: AppRoutes.documents,
              builder: (_, _) => const DocumentsPage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: AppRoutes.requests,
              builder: (_, _) => const RequestsPage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: AppRoutes.messages,
              builder: (_, _) => const MessagesPage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: AppRoutes.profile,
              builder: (_, _) => const ProfilePage(),
            ),
          ]),
        ],
      ),

      // Full-screen routes pushed over the tab bar (root navigator).
      GoRoute(
        path: '${AppRoutes.documents}/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) =>
            DocumentDetailPage(documentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '${AppRoutes.requests}/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) =>
            RequestDetailPage(requestId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.scan,
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) =>
            ScanPage(requestId: state.uri.queryParameters['requestId']),
      ),
      GoRoute(
        path: AppRoutes.uploadReview,
        parentNavigatorKey: rootNavigatorKey,
        redirect: (_, state) =>
            state.extra is UploadReviewArgs ? null : AppRoutes.scan,
        builder: (_, state) =>
            UploadReviewPage(args: state.extra! as UploadReviewArgs),
      ),
    ],
  );
}

const _splash = '/splash';

class _SplashPage extends StatelessWidget {
  const _SplashPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.background,
      body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
    );
  }
}
