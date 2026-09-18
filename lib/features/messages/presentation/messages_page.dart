import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/states.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../bloc/messages_bloc.dart';
import '../data/messages_repository.dart';

class MessagesPage extends StatelessWidget {
  const MessagesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthBloc>().state;
    return BlocProvider(
      create: (context) => MessagesBloc(
        repository: context.read<MessagesRepository>(),
        clientId: auth.clientId!,
        userId: auth.user!.id,
      )..add(const MessagesStarted()),
      child: const _MessagesView(),
    );
  }
}

class _MessagesView extends StatefulWidget {
  const _MessagesView();

  @override
  State<_MessagesView> createState() => _MessagesViewState();
}

class _MessagesViewState extends State<_MessagesView> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  int _renderedCount = 0;

  @override
  void initState() {
    super.initState();
    _input.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      final max = _scroll.position.maxScrollExtent;
      if (animated) {
        _scroll.animateTo(
          max,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      } else {
        _scroll.jumpTo(max);
      }
    });
  }

  void _send() {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    _input.clear();
    context.read<MessagesBloc>().add(MessageSendRequested(text));
  }

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthBloc>().state.user?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: BlocConsumer<MessagesBloc, MessagesState>(
        listenWhen: (prev, curr) =>
            prev.messages.length != curr.messages.length ||
            (curr.failedBody != null && prev.failedBody != curr.failedBody) ||
            (prev.status != curr.status && curr.status == MessagesStatus.success),
        listener: (context, state) {
          if (state.failedBody != null && _input.text.isEmpty) {
            _input.text = state.failedBody!;
          }
          if (state.messages.length != _renderedCount) {
            // First render jumps straight to the bottom; later inserts animate.
            _scrollToEnd(animated: _renderedCount > 0);
            _renderedCount = state.messages.length;
          }
        },
        builder: (context, state) {
          if (state.status == MessagesStatus.initial ||
              state.status == MessagesStatus.loading) {
            return const LoadingCenter();
          }

          final canSend = _input.text.trim().isNotEmpty && !state.sending;

          return Column(
            children: [
              Expanded(
                child: ListView.separated(
                  controller: _scroll,
                  padding: EdgeInsets.all(spacing(3)),
                  itemCount: state.messages.length,
                  separatorBuilder: (_, _) => SizedBox(height: spacing(2)),
                  itemBuilder: (context, i) => _Bubble(
                    message: state.messages[i],
                    mine: state.messages[i].senderId == userId,
                  ),
                ),
              ),
              _Composer(
                controller: _input,
                sending: state.sending,
                canSend: canSend,
                onSend: _send,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine});

  final Message message;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        child: Container(
          padding: EdgeInsets.all(spacing(3)),
          decoration: BoxDecoration(
            color: mine ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                child: Text(
                  message.body,
                  style: TextStyle(
                    color: mine ? Colors.white : AppColors.text,
                    fontSize: 14,
                  ),
                ),
              ),
              SizedBox(height: spacing(1)),
              Text(
                formatTime(message.createdAt),
                style: TextStyle(
                  fontSize: 10,
                  color: mine ? AppColors.onPrimaryMuted : AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.canSend,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final bool canSend;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(spacing(2)),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 120),
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: null,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    hintText: 'Écrire au cabinet...',
                    filled: true,
                    fillColor: AppColors.surfaceMuted,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: spacing(3),
                      vertical: spacing(2),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
            ),
            SizedBox(width: spacing(2)),
            Opacity(
              opacity: canSend ? 1 : 0.4,
              child: FilledButton(
                onPressed: canSend ? onSend : null,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.primary,
                  padding: EdgeInsets.symmetric(
                    horizontal: spacing(3),
                    vertical: spacing(2.5),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                ),
                child: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Envoyer',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
