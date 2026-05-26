import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// Show banners + sounds for foreground notifications too. Without this they
// would be delivered silently while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1E5BCC',
  });
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[push] Push notifications require a physical device.');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let granted = existing === 'granted';
  if (!granted) {
    const { status } = await Notifications.requestPermissionsAsync();
    granted = status === 'granted';
  }
  if (!granted) {
    console.warn('[push] Permission denied');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  const tokenRes = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenRes.data ?? null;
}

/**
 * Registers the current device for push and stores the token in `push_tokens`
 * scoped to the authenticated user. Idempotent — safe to call on every sign-in.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    await ensureAndroidChannel();
    const token = await getExpoPushToken();
    if (!token) return;

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          device_name: Device.deviceName ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

    if (error) console.warn('[push] upsert failed', error.message);
  } catch (e) {
    console.warn('[push] registration failed', (e as Error).message);
  }
}

/**
 * Removes the current device's token on sign-out so Expo no longer ships
 * notifications meant for the previous user to this handset.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    ).catch(() => null);
    const token = tokenRes?.data;
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  } catch (e) {
    console.warn('[push] unregister failed', (e as Error).message);
  }
}

export { Notifications };
