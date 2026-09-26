import { useCallback, useEffect, useRef, useState } from 'react';
import type { Note } from '../utils/notes';
import { pullNotes, pushNotes, subscribeNotes } from './sync';
import { cloudEnabled } from './supabaseClient';
import { watchNetwork } from './native';

export type SyncStatus = 'offline' | 'idle' | 'syncing' | 'error';

interface CloudSyncArgs {
  userId: string | null;
  getCurrent: () => Note[];
  mergeExternal: (notes: Note[]) => void;
  // A monotonically increasing signal that local notes changed (e.g. notes.length
  // or a version counter); pushes are debounced off this.
  localChangeKey: unknown;
}

export function useCloudSync({ userId, getCurrent, mergeExternal, localChangeKey }: CloudSyncArgs) {
  const [status, setStatus] = useState<SyncStatus>(cloudEnabled ? 'idle' : 'offline');
  const [online, setOnline] = useState(true);
  const pushTimer = useRef<number | null>(null);
  const firstSync = useRef(false);

  // Track connectivity for the indicator and to resync when it returns.
  useEffect(() => watchNetwork(setOnline), []);

  // Full two-way sync: pull remote, merge locally, push the merged set back.
  const syncNow = useCallback(async () => {
    if (!cloudEnabled || !userId || !online) return;
    setStatus('syncing');
    try {
      const remote = await pullNotes();
      mergeExternal(remote);
      // Give React a tick to persist the merge before reading it back to push.
      await new Promise((r) => setTimeout(r, 0));
      await pushNotes(getCurrent(), userId);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [userId, online, getCurrent, mergeExternal]);

  // Initial sync on sign-in, and resync whenever connectivity returns.
  useEffect(() => {
    if (!cloudEnabled || !userId) {
      setStatus(cloudEnabled ? 'idle' : 'offline');
      firstSync.current = false;
      return;
    }
    if (online) {
      firstSync.current = true;
      void syncNow();
    }
  }, [userId, online, syncNow]);

  // Realtime: apply remote changes from other devices as they arrive.
  useEffect(() => {
    if (!cloudEnabled || !userId) return;
    return subscribeNotes(userId, (note) => mergeExternal([note]));
  }, [userId, mergeExternal]);

  // Debounced push on local edits (2s after the last change).
  useEffect(() => {
    if (!cloudEnabled || !userId || !online || !firstSync.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      setStatus('syncing');
      pushNotes(getCurrent(), userId).then(() => setStatus('idle')).catch(() => setStatus('error'));
    }, 2000);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [localChangeKey, userId, online, getCurrent]);

  return { status, online, syncNow };
}
