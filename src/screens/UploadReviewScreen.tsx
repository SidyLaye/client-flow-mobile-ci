import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase, invokeFunction } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { buildPdfFromImages } from '@/lib/pdf';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'UploadReview'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['Facture', 'Relevé bancaire', 'Note de frais', 'Contrat', 'Autre'];

export function UploadReviewScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const { clientAccount, user } = useAuth();
  const { pageUris, suggestedTitle, requestId } = route.params;

  const initialTitle = useMemo(() => suggestedTitle ?? 'Document', [suggestedTitle]);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<string>('Autre');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPdfInput = pageUris.length === 1 && /\.pdf$/i.test(pageUris[0]);

  async function handleSubmit() {
    if (!clientAccount || !user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Donnez un nom au document.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Build the PDF (or pass through the existing one)
      let fileUri: string;
      let fileName: string;
      let size = 0;
      const safe = title.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'document';

      if (isPdfInput) {
        fileUri = pageUris[0];
        fileName = `${safe}_${Date.now()}.pdf`;
        const info = await FileSystem.getInfoAsync(fileUri);
        size = info.exists && 'size' in info ? (info.size as number) : 0;
      } else {
        const built = await buildPdfFromImages(pageUris, safe);
        fileUri = built.uri;
        fileName = built.fileName;
        size = built.size;
      }

      // 2. Read as base64 and upload to client-documents bucket
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = decodeBase64(base64);

      const storagePath = `${clientAccount.client_id}/${Date.now()}_${fileName}`;
      const { error: upErr } = await supabase.storage
        .from('client-documents')
        .upload(storagePath, bytes, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (upErr) throw upErr;

      // 3. Register the metadata via edge function (privileged insert + audit)
      await invokeFunction('create-document-record', {
        client_id: clientAccount.client_id,
        file_name: fileName,
        original_file_name: `${title.trim()}.pdf`,
        storage_path: storagePath,
        mime_type: 'application/pdf',
        size_bytes: size,
        category,
        client_comment: comment.trim() || null,
        request_id: requestId ?? null,
      }).catch(async (e) => {
        // Fallback: direct insert (RLS policy allows clients to insert own documents).
        const { error: insErr } = await supabase.from('documents').insert({
          client_id: clientAccount.client_id,
          uploaded_by: user.id,
          file_name: fileName,
          original_file_name: `${title.trim()}.pdf`,
          storage_path: storagePath,
          mime_type: 'application/pdf',
          size_bytes: size,
          category,
          client_comment: comment.trim() || null,
          status: 'received',
          visible_to_client: true,
        });
        if (insErr) throw insErr;
        console.warn('[upload] used direct insert fallback', e);
      });

      Alert.alert('Envoyé ✅', 'Votre document a été transmis au cabinet.', [
        { text: 'OK', onPress: () => nav.popToTop() },
      ]);
    } catch (e: any) {
      Alert.alert('Échec de l\'envoi', e?.message ?? 'Erreur inconnue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Aperçu ({pageUris.length} page{pageUris.length > 1 ? 's' : ''})</Text>
      <ScrollView horizontal contentContainerStyle={styles.previewRow}>
        {pageUris.map((uri, i) =>
          isPdfInput ? (
            <View key={i} style={styles.pdfPreview}>
              <Text style={styles.pdfPreviewText}>📄 PDF</Text>
            </View>
          ) : (
            <Image key={i} source={{ uri }} style={styles.preview} />
          )
        )}
      </ScrollView>

      <Text style={styles.label}>Nom du document</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.chipsRow}>
        {CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Commentaire (facultatif)</Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        multiline
        placeholder="Une précision pour le comptable ?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
      />

      <Pressable style={styles.submit} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Envoyer au cabinet</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// Minimal base64 → Uint8Array (avoids extra dependency).
function decodeBase64(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLen = (b64.length * 3) / 4;
  if (b64.endsWith('==')) bufferLen -= 2;
  else if (b64.endsWith('=')) bufferLen -= 1;

  const out = new Uint8Array(bufferLen);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const a = lookup[b64.charCodeAt(i)];
    const b = lookup[b64.charCodeAt(i + 1)];
    const c = lookup[b64.charCodeAt(i + 2)];
    const d = lookup[b64.charCodeAt(i + 3)];
    out[p++] = (a << 2) | (b >> 4);
    if (b64.charCodeAt(i + 2) !== 61) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (b64.charCodeAt(i + 3) !== 61) out[p++] = ((c & 3) << 6) | d;
  }
  return out;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: spacing(4), gap: spacing(2) },
  section: { fontWeight: '700', color: colors.text },
  previewRow: { gap: spacing(2), paddingVertical: spacing(2) },
  preview: { width: 110, height: 150, borderRadius: 8, backgroundColor: '#ddd' },
  pdfPreview: {
    width: 110,
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pdfPreviewText: { fontSize: 24 },
  label: { fontWeight: '600', color: colors.text, marginTop: spacing(2) },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    color: colors.text,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  chip: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  submit: {
    marginTop: spacing(4),
    backgroundColor: colors.primary,
    paddingVertical: spacing(4),
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
