import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Equivalent of React Navigation's useFocusEffect: runs [onFocus] every time
/// the router's current location becomes [path] again (tab re-selected, or a
/// pushed screen popped back onto it). The first focus is skipped because
/// pages already load on creation.
class RefreshOnFocus extends StatefulWidget {
  const RefreshOnFocus({
    super.key,
    required this.path,
    required this.onFocus,
    required this.child,
  });

  final String path;
  final VoidCallback onFocus;
  final Widget child;

  @override
  State<RefreshOnFocus> createState() => _RefreshOnFocusState();
}

class _RefreshOnFocusState extends State<RefreshOnFocus> {
  GoRouter? _router;
  bool _focused = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final router = GoRouter.of(context);
    if (identical(router, _router)) return;
    _router?.routerDelegate.removeListener(_onRouteChanged);
    _router = router..routerDelegate.addListener(_onRouteChanged);
    _focused = _isFocused();
  }

  bool _isFocused() => _router?.state.uri.path == widget.path;

  void _onRouteChanged() {
    final now = _isFocused();
    if (now && !_focused) widget.onFocus();
    _focused = now;
  }

  @override
  void dispose() {
    _router?.routerDelegate.removeListener(_onRouteChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
