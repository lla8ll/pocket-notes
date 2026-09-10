import { getTitle } from './notes.ts';

export interface SharingPlatform {
  share?: (data: { title: string; text: string }) => Promise<void>;
  canShare?: (data: { title: string; text: string }) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export async function shareNote(content: string, platform: SharingPlatform): Promise<'shared' | 'cancelled' | 'copy'> {
  const data = { title: getTitle(content), text: content };
  if (typeof platform.share !== 'function') return 'copy';
  try {
    if (platform.canShare && !platform.canShare(data)) return 'copy';
    // Called from the button event, before any other asynchronous operation.
    await platform.share(data);
    return 'shared';
  } catch (error) {
    return error && typeof error === 'object' && 'name' in error && error.name === 'AbortError' ? 'cancelled' : 'copy';
  }
}

export async function copyNote(content: string, platform: SharingPlatform): Promise<'copied' | 'manual'> {
  try {
    if (!platform.clipboard?.writeText) return 'manual';
    await platform.clipboard.writeText(content);
    return 'copied';
  } catch {
    return 'manual';
  }
}
