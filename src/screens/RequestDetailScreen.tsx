import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'RequestDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type Req = {
  id: string;
  title: string;
  description: string | null;
  requested_type: string | null;
  due_date: string | null;
  priority: string | null;
  status: string;
};

export function RequestDetailScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const [req, setReq] = useState<Req | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('document_requests')
        .select('id, title, description, requested_type, due_date, priority, status')
        .eq('id', route.params.requestId)
        .maybeSingle();
      if (!cancelled) {
        setReq(data as Req | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.requestId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!req) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Demande introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{req.title}</Text>
      {req.description ? <Text style={styles.body}>{req.description}</Text> : null}

      <View style={styles.metaCard}>
        <Meta label="Type demandé" value={req.requested_type ?? '—'} />
        <Meta label="Échéance" value={req.due_date ?? 'Aucune'} />
        <Meta label="Priorité" value={req.priority ?? 'normale'} />
        <Meta label="Statut" value={req.status} />
      </View>

      <Pressable
        style={styles.cta}
        onPress={() => nav.navigate('Scan', { requestId: req.id })}
      >
        <Text style={styles.ctaText}>📷  Répondre avec un document</Text>
      </Pressable>
    </ScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: spacing(4), gap: spacing(3) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { color: colors.text, lineHeight: 20 },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing(3),
    gap: spacing(2),
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: colors.textMuted },
  metaValue: { color: colors.text, fontWeight: '600' },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing(3.5),
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
});
