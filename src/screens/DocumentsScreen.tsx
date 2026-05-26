import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Doc = {
  id: string;
  file_name: string;
  original_file_name: string | null;
  category: string | null;
  status: string;
  period_month: number | null;
  period_year: number | null;
  created_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  received: 'Reçu',
  under_review: 'En revue',
  validated: 'Validé',
  rejected: 'Rejeté',
  incomplete: 'Incomplet',
  archived: 'Archivé',
};

const STATUS_COLORS: Record<string, string> = {
  received: colors.info,
  under_review: colors.warning,
  validated: colors.success,
  rejected: colors.danger,
  incomplete: colors.warning,
  archived: colors.textMuted,
};

export function DocumentsScreen() {
  const { clientAccount } = useAuth();
  const nav = useNavigation<Nav>();
  const clientId = clientAccount?.client_id;

  const q = useQuery({
    enabled: !!clientId,
    queryKey: ['documents', clientId],
    queryFn: async (): Promise<Doc[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, original_file_name, category, status, period_month, period_year, created_at')
        .eq('client_id', clientId!)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useFocusEffect(
    useCallback(() => {
      q.refetch();
    }, [q])
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
        ListHeaderComponent={
          <Pressable style={styles.scanBtn} onPress={() => nav.navigate('Scan')}>
            <Text style={styles.scanBtnText}>📷  Scanner / téléverser un document</Text>
          </Pressable>
        }
        ListEmptyComponent={
          !q.isFetching ? (
            <Text style={styles.empty}>Aucun document pour le moment.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => nav.navigate('DocumentDetail', { documentId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.original_file_name ?? item.file_name}
              </Text>
              <Text style={styles.sub}>
                {[item.category, formatPeriod(item.period_month, item.period_year)]
                  .filter(Boolean)
                  .join(' • ') || '—'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: STATUS_COLORS[item.status] ?? colors.textMuted },
              ]}
            >
              <Text style={styles.badgeText}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function formatPeriod(m: number | null, y: number | null) {
  if (!m && !y) return null;
  if (m && y) return `${String(m).padStart(2, '0')}/${y}`;
  return String(y ?? m);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  list: { padding: spacing(3), gap: spacing(2) },
  scanBtn: {
    backgroundColor: colors.primary,
    padding: spacing(3.5),
    borderRadius: radius.md,
    marginBottom: spacing(2),
    alignItems: 'center',
  },
  scanBtnText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.md,
  },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: spacing(1) },
  badge: { paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing(8) },
});
