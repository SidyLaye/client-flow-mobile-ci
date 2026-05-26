import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'DocumentDetail'>;

type Doc = {
  id: string;
  file_name: string;
  original_file_name: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  status: string;
  period_month: number | null;
  period_year: number | null;
  internal_comment: string | null;
  client_comment: string | null;
  created_at: string | null;
};

export function DocumentDetailScreen() {
  const route = useRoute<R>();
  const { documentId } = route.params;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(
          'id, file_name, original_file_name, storage_path, mime_type, size_bytes, category, status, period_month, period_year, internal_comment, client_comment, created_at'
        )
        .eq('id', documentId)
        .maybeSingle();

      if (!cancelled) {
        if (error) Alert.alert('Erreur', error.message);
        setDoc(data as Doc | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function handleOpen() {
    if (!doc) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(doc.storage_path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error('Lien indisponible');

      const target = `${FileSystem.cacheDirectory}${doc.file_name}`;
      const dl = await FileSystem.downloadAsync(data.signedUrl, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, { mimeType: doc.mime_type ?? undefined });
      } else {
        Alert.alert('Téléchargé', `Fichier enregistré : ${dl.uri}`);
      }
    } catch (e: any) {
      Alert.alert('Ouverture impossible', e?.message ?? 'Erreur inconnue');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!doc) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Document introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{doc.original_file_name ?? doc.file_name}</Text>

      <Field label="Catégorie" value={doc.category ?? '—'} />
      <Field
        label="Période"
        value={
          doc.period_month && doc.period_year
            ? `${String(doc.period_month).padStart(2, '0')}/${doc.period_year}`
            : doc.period_year?.toString() ?? '—'
        }
      />
      <Field label="Statut" value={doc.status} />
      <Field label="Type" value={doc.mime_type ?? '—'} />
      <Field
        label="Taille"
        value={doc.size_bytes ? `${(doc.size_bytes / 1024).toFixed(1)} ko` : '—'}
      />

      {doc.client_comment ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Votre note</Text>
          <Text style={styles.noteBody}>{doc.client_comment}</Text>
        </View>
      ) : null}

      {doc.internal_comment ? (
        <View style={[styles.note, { borderColor: colors.warning }]}>
          <Text style={styles.noteTitle}>Note du cabinet</Text>
          <Text style={styles.noteBody}>{doc.internal_comment}</Text>
        </View>
      ) : null}

      <Pressable style={styles.button} onPress={handleOpen} disabled={downloading}>
        {downloading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ouvrir le fichier</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: spacing(4), gap: spacing(2) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing(2) },
  field: {
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldLabel: { color: colors.textMuted },
  fieldValue: { color: colors.text, fontWeight: '600' },
  note: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing(3),
    backgroundColor: colors.surface,
  },
  noteTitle: { fontWeight: '700', marginBottom: spacing(1), color: colors.text },
  noteBody: { color: colors.text },
  button: {
    marginTop: spacing(4),
    backgroundColor: colors.primary,
    paddingVertical: spacing(3.5),
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
