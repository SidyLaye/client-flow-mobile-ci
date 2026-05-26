import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const { clientAccount, user } = useAuth();
  const nav = useNavigation<Nav>();
  const clientId = clientAccount?.client_id;

  const summary = useQuery({
    enabled: !!clientId,
    queryKey: ['home-summary', clientId],
    queryFn: async () => {
      const [openRequests, unreadNotifs, pendingDocs, client] = await Promise.all([
        supabase
          .from('document_requests')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId!)
          .in('status', ['sent', 'seen', 'partially_completed', 'overdue']),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('is_read', false),
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId!)
          .in('status', ['received', 'under_review']),
        supabase.from('clients').select('company_name').eq('id', clientId!).maybeSingle(),
      ]);

      return {
        openRequests: openRequests.count ?? 0,
        unreadNotifs: unreadNotifs.count ?? 0,
        pendingDocs: pendingDocs.count ?? 0,
        company: client.data?.company_name ?? '',
      };
    },
  });

  const onScan = useCallback(() => nav.navigate('Scan'), [nav]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={summary.isFetching} onRefresh={() => summary.refetch()} />
        }
      >
        <Text style={styles.greet}>Bonjour 👋</Text>
        <Text style={styles.company}>{summary.data?.company ?? '...'}</Text>

        <View style={styles.kpiRow}>
          <Kpi label="Demandes ouvertes" value={summary.data?.openRequests ?? 0} tint={colors.warning} />
          <Kpi label="Documents en attente" value={summary.data?.pendingDocs ?? 0} tint={colors.info} />
          <Kpi label="Notifications" value={summary.data?.unreadNotifs ?? 0} tint={colors.primary} />
        </View>

        <Pressable style={styles.scanCta} onPress={onScan}>
          <Text style={styles.scanIcon}>📷</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Scanner un document</Text>
            <Text style={styles.scanSub}>
              Prenez en photo vos justificatifs et générez un PDF à envoyer au cabinet.
            </Text>
          </View>
          <Text style={styles.scanArrow}>›</Text>
        </Pressable>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Comment ça marche ?</Text>
          <Text style={styles.tipLine}>• Recevez des demandes de documents de votre comptable</Text>
          <Text style={styles.tipLine}>• Scannez ou téléversez les pièces depuis votre téléphone</Text>
          <Text style={styles.tipLine}>• Échangez par messagerie avec votre cabinet</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={[styles.kpi, { borderTopColor: tint }]}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: spacing(4), gap: spacing(4) },
  greet: { fontSize: 14, color: colors.textMuted },
  company: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing(2) },
  kpiRow: { flexDirection: 'row', gap: spacing(2) },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.md,
    borderTopWidth: 3,
  },
  kpiValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  kpiLabel: { fontSize: 11, color: colors.textMuted, marginTop: spacing(1) },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing(4),
    borderRadius: radius.lg,
    gap: spacing(3),
  },
  scanIcon: { fontSize: 28 },
  scanTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scanSub: { color: '#DCE6F8', fontSize: 12, marginTop: spacing(1) },
  scanArrow: { color: '#fff', fontSize: 28, fontWeight: '300' },
  tipCard: {
    backgroundColor: colors.surface,
    padding: spacing(4),
    borderRadius: radius.md,
    gap: spacing(1),
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing(1) },
  tipLine: { fontSize: 13, color: colors.textMuted },
});
