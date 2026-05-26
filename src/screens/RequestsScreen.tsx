import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Req = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string;
  created_at: string | null;
};

const PRIORITY_TINT: Record<string, string> = {
  urgent: colors.danger,
  high: colors.warning,
  normal: colors.info,
  low: colors.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'À traiter',
  seen: 'Vu',
  partially_completed: 'Partiel',
  completed: 'Terminé',
  overdue: 'En retard',
  cancelled: 'Annulé',
};

export function RequestsScreen() {
  const { clientAccount } = useAuth();
  const nav = useNavigation<Nav>();
  const clientId = clientAccount?.client_id;

  const q = useQuery({
    enabled: !!clientId,
    queryKey: ['requests', clientId],
    queryFn: async (): Promise<Req[]> => {
      const { data, error } = await supabase
        .from('document_requests')
        .select('id, title, description, due_date, priority, status, created_at')
        .eq('client_id', clientId!)
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
        ListEmptyComponent={
          !q.isFetching ? (
            <Text style={styles.empty}>Aucune demande pour le moment.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => nav.navigate('RequestDetail', { requestId: item.id })}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: PRIORITY_TINT[item.priority ?? 'normal'] ?? colors.info },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.due_date ? `À fournir avant ${item.due_date}` : 'Sans échéance'}
              </Text>
            </View>
            <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  list: { padding: spacing(3), gap: spacing(2) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { color: colors.text, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: spacing(1) },
  status: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing(8) },
});
