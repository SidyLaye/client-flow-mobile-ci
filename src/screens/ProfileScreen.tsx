import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/lib/theme';

type Notif = {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export function ProfileScreen() {
  const { user, clientAccount, signOut } = useAuth();
  const [company, setCompany] = useState('');
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    if (!clientAccount) return;
    let cancelled = false;
    (async () => {
      const [c, n] = await Promise.all([
        supabase
          .from('clients')
          .select('company_name')
          .eq('id', clientAccount.client_id)
          .maybeSingle(),
        supabase
          .from('notifications')
          .select('id, title, body, is_read, created_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (cancelled) return;
      setCompany(c.data?.company_name ?? '');
      setNotifs((n.data as Notif[] | null) ?? []);
    })();

    const channel = supabase
      .channel(`notifications:${user!.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user!.id}`,
        },
        (payload) => {
          setNotifs((prev) => [payload.new as Notif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [clientAccount, user]);

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function handleSignOut() {
    Alert.alert('Se déconnecter ?', 'Vous devrez resaisir vos identifiants.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <FlatList
        data={notifs}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(company || user?.email || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.company}>{company || '—'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Pressable style={styles.signOut} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Se déconnecter</Text>
            </Pressable>
            <Text style={styles.section}>Notifications</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune notification.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.notif, !item.is_read && styles.notifUnread]}
            onPress={() => markRead(item.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              {item.body ? <Text style={styles.notifBody}>{item.body}</Text> : null}
            </View>
            {!item.is_read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  list: { padding: spacing(3), gap: spacing(2) },
  header: { alignItems: 'center', gap: spacing(2), paddingBottom: spacing(4) },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(2),
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  company: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted },
  signOut: {
    marginTop: spacing(2),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radius.md,
  },
  signOutText: { color: colors.danger, fontWeight: '600' },
  section: {
    marginTop: spacing(4),
    fontWeight: '700',
    color: colors.text,
    alignSelf: 'flex-start',
  },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing(6) },
  notif: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.md,
    alignItems: 'center',
    gap: spacing(2),
  },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  notifTitle: { fontWeight: '600', color: colors.text },
  notifBody: { color: colors.textMuted, fontSize: 12, marginTop: spacing(1) },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
