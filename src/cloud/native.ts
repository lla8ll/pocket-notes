import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { getTitle } from '../utils/notes';

export const isNative = Capacitor.isNativePlatform();

// Native iOS share sheet. Falls back to the caller's copy flow when the
// platform can't share (handled by returning 'copy').
export async function nativeShare(content: string): Promise<'shared' | 'copy'> {
  if (!isNative) return 'copy';
  try {
    await Share.share({ title: getTitle(content), text: content, dialogTitle: 'Share note' });
    return 'shared';
  } catch {
    // User cancelled or share unavailable — let the caller offer copy.
    return 'copy';
  }
}

// Light haptic feedback on meaningful actions. Silent no-op on web.
export async function tapFeedback(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable */
  }
}

export async function successFeedback(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* haptics unavailable */
  }
}

// Live online/offline state, used to drive the sync indicator and to
// trigger a sync when connectivity returns.
export function watchNetwork(onChange: (online: boolean) => void): () => void {
  let handle: { remove: () => void } | null = null;
  Network.getStatus().then((status) => onChange(status.connected));
  Network.addListener('networkStatusChange', (status) => onChange(status.connected)).then((h) => {
    handle = h;
  });
  // Also listen to the browser events (covers web and gives a faster signal).
  const online = () => onChange(true);
  const offline = () => onChange(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    handle?.remove();
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}
