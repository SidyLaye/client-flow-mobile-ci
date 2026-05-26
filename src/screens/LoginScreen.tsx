import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/lib/theme';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez saisir votre identifiant et votre mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert('Connexion impossible', e?.message ?? 'Identifiants invalides.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>ComptaFlow</Text>
          <Text style={styles.brandSub}>Espace client</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Identifiant (email)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="vous@exemple.fr"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              (pressed || submitting) && { opacity: 0.85 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            Identifiants fournis par votre cabinet comptable.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing(6), justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing(8) },
  brandTitle: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: 0.5 },
  brandSub: { color: '#A8B5CC', fontSize: 16, marginTop: spacing(1) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(5),
    gap: spacing(2),
  },
  label: { color: colors.text, fontWeight: '600', marginTop: spacing(2) },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing(3.5),
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing(4),
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(3),
    textAlign: 'center',
  },
});
