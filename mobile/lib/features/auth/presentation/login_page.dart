import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialogs.dart';
import '../../../core/widgets/primary_button.dart';
import '../bloc/auth_bloc.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty) {
      showAlert(
        context,
        title: 'Champs requis',
        message: 'Veuillez saisir votre identifiant et votre mot de passe.',
      );
      return;
    }
    FocusScope.of(context).unfocus();
    context
        .read<AuthBloc>()
        .add(AuthSignInRequested(email: email, password: password));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listenWhen: (prev, curr) =>
          curr.signInError != null && prev.signInError != curr.signInError,
      listener: (context, state) => showAlert(
        context,
        title: 'Connexion impossible',
        message: state.signInError,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(spacing(6)),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const _Brand(),
                  SizedBox(height: spacing(8)),
                  _LoginCard(
                    email: _email,
                    password: _password,
                    onSubmit: _submit,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Text(
          'ComptaFlow',
          style: TextStyle(
            color: Colors.white,
            fontSize: 32,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
        SizedBox(height: spacing(1)),
        const Text(
          'Espace client',
          style: TextStyle(color: AppColors.brandSubtitle, fontSize: 16),
        ),
      ],
    );
  }
}

class _LoginCard extends StatelessWidget {
  const _LoginCard({
    required this.email,
    required this.password,
    required this.onSubmit,
  });

  final TextEditingController email;
  final TextEditingController password;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final signingIn =
        context.select((AuthBloc b) => b.state.signingIn);

    return Container(
      padding: EdgeInsets.all(spacing(5)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _Label('Identifiant (email)'),
          SizedBox(height: spacing(2)),
          TextField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            textCapitalization: TextCapitalization.none,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(hintText: 'vous@exemple.fr'),
          ),
          SizedBox(height: spacing(4)),
          const _Label('Mot de passe'),
          SizedBox(height: spacing(2)),
          TextField(
            controller: password,
            obscureText: true,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onSubmit(),
            decoration: const InputDecoration(hintText: '••••••••'),
          ),
          SizedBox(height: spacing(6)),
          PrimaryButton(
            label: 'Se connecter',
            busy: signingIn,
            onPressed: onSubmit,
          ),
          SizedBox(height: spacing(3)),
          const Text(
            'Identifiants fournis par votre cabinet comptable.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(
          color: AppColors.text,
          fontWeight: FontWeight.w600,
        ),
      );
}
