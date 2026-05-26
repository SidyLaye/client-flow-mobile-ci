import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

// Lazy-load: the plugin is a native module that doesn't exist in Expo Go.
// Requiring it at module scope crashes the app at boot.
function loadDocumentScanner(): any | null {
  try {
    return require('react-native-document-scanner-plugin').default;
  } catch {
    return null;
  }
}
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'Scan'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ScanDocumentScreen() {
  const route = useRoute<R>();
  const nav = useNavigation<Nav>();
  const requestId = route.params?.requestId;
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const launchedOnce = useRef(false);

  // Open the native scanner automatically the first time the screen mounts.
  // The user can re-launch it with the "Scanner" button afterwards.
  useEffect(() => {
    if (launchedOnce.current) return;
    launchedOnce.current = true;
    launchScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function launchScanner() {
    if (busy) return;
    const DocumentScanner = loadDocumentScanner();
    if (!DocumentScanner) {
      Alert.alert(
        'Scanner indisponible',
        "Le scanner natif n'est pas disponible dans Expo Go. Utilisez « Galerie » ou « Fichier », ou lancez un development build."
      );
      return;
    }
    setBusy(true);
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        letUserAdjustCrop: true,
        croppedImageQuality: 80,
        maxNumDocuments: 25,
      });
      if (status !== 'success' || !scannedImages?.length) return;

      // The plugin already crops + perspective-corrects. Resize for upload size.
      const compressed = await Promise.all(
        scannedImages.map((uri: string) =>
          ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1600 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          ).then((m) => m.uri)
        )
      );
      setPages((prev) => [...prev, ...compressed]);
    } catch (e: any) {
      Alert.alert('Erreur scanner', e?.message ?? 'Impossible de lancer le scanner.');
    } finally {
      setBusy(false);
    }
  }

  async function pickFromLibrary() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (r.canceled) return;
    const compressed = await Promise.all(
      r.assets.map((a) =>
        ImageManipulator.manipulateAsync(
          a.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        ).then((m) => m.uri)
      )
    );
    setPages((prev) => [...prev, ...compressed]);
  }

  async function pickPdf() {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (r.canceled) return;
    const asset = r.assets[0];
    if (!asset) return;

    if (asset.mimeType === 'application/pdf') {
      nav.replace('UploadReview', {
        pageUris: [asset.uri],
        suggestedTitle: asset.name?.replace(/\.pdf$/i, '') ?? 'Document',
        requestId,
      });
      return;
    }
    setPages((prev) => [...prev, asset.uri]);
  }

  function removePage(idx: number) {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  }

  function continueToReview() {
    if (pages.length === 0) {
      Alert.alert('Aucune page', 'Ajoutez au moins une page avant de continuer.');
      return;
    }
    nav.navigate('UploadReview', { pageUris: pages, requestId });
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Scanner un document</Text>
        <Text style={styles.heroBody}>
          Le scanner détecte automatiquement les bords du document et corrige la perspective.
          Vous pouvez ajouter plusieurs pages avant d'envoyer.
        </Text>
      </View>

      <FlatList
        data={pages}
        keyExtractor={(_, i) => String(i)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing(2) }}
        ListHeaderComponent={
          pages.length === 0 ? (
            <Text style={styles.empty}>Aucune page pour l'instant.</Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Pressable onLongPress={() => removePage(index)} style={styles.tile}>
            <Image source={{ uri: item }} style={styles.tileImage} />
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{index + 1}</Text>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={launchScanner} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>📷  Scanner</Text>
          )}
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable style={styles.secondary} onPress={pickFromLibrary}>
            <Text style={styles.secondaryText}>Galerie</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={pickPdf}>
            <Text style={styles.secondaryText}>Fichier</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.continueBtn, pages.length === 0 && styles.continueDisabled]}
          onPress={continueToReview}
          disabled={pages.length === 0}
        >
          <Text style={styles.continueText}>
            Continuer ({pages.length} page{pages.length > 1 ? 's' : ''})
          </Text>
        </Pressable>
        <Text style={styles.hint}>Astuce : appui long sur une page pour la supprimer.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  heroCard: {
    margin: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing(3),
    gap: spacing(1),
  },
  heroTitle: { fontWeight: '700', color: colors.text, fontSize: 16 },
  heroBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  grid: { padding: spacing(3), gap: spacing(2) },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing(6) },
  tile: {
    flex: 1 / 3,
    aspectRatio: 0.75,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  tileImage: { width: '100%', height: '100%' },
  pageBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actions: {
    padding: spacing(3),
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing(3.5),
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryRow: { flexDirection: 'row', gap: spacing(2) },
  secondary: {
    flex: 1,
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontWeight: '600' },
  continueBtn: {
    paddingVertical: spacing(3),
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.text,
  },
  continueDisabled: { opacity: 0.3 },
  continueText: { color: '#fff', fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
