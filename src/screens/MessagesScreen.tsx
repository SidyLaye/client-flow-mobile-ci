import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, invokeFunction } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/lib/theme';

type Message = {
  id: string;
  client_id: string;
  sender_id: string | null;
  body: string;
  is_internal: boolean | null;
  created_at: string | null;
};

export function MessagesScreen() {
  const { clientAccount, user } = useAuth();
  const clientId = clientAccount?.client_id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, client_id, sender_id, body, is_internal, created_at')
        .eq('client_id', clientId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        if (error) console.warn(error.message);
        setMessages((data as Message[] | null) ?? []);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`messages:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (m.is_internal) return;
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  async function send() {
    if (!body.trim() || !clientId || !user) return;
    setSending(true);
    const text = body.trim();
    setBody('');
    try {
      // Try the edge function first (audit log + notification on the admin side).
      try {
        await invokeFunction('send-message', {
          client_id: clientId,
          body: text,
          is_internal: false,
        });
      } catch {
        // Fallback to direct insert (RLS allows authenticated INSERT on messages).
        const { error } = await supabase.from('messages').insert({
          client_id: clientId,
          sender_id: user.id,
          body: text,
          is_internal: false,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setBody(text);
      console.warn('send failed', e?.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{item.body}</Text>
                <Text style={[styles.time, mine && { color: '#DCE6F8' }]}>
                  {item.created_at ? new Date(item.created_at).toLocaleTimeString().slice(0, 5) : ''}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder="Écrire au cabinet..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, (!body.trim() || sending) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!body.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Envoyer</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing(3), gap: spacing(2) },
  bubble: { padding: spacing(3), borderRadius: radius.md, maxWidth: '80%' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  bubbleText: { color: colors.text, fontSize: 14 },
  time: { fontSize: 10, color: colors.textMuted, marginTop: spacing(1), alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing(2),
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});
