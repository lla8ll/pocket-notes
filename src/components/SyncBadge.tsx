import type { SyncStatus } from '../cloud/useCloudSync';

const LABEL: Record<SyncStatus, string> = {
  offline: 'Offline',
  idle: 'Synced',
  syncing: 'Syncing…',
  error: 'Sync error',
};

export function SyncBadge({ status, online, signedIn, onTap }: {
  status: SyncStatus; online: boolean; signedIn: boolean; onTap: () => void;
}) {
  // Connectivity overrides the sync state for the user-facing dot.
  const state = !online ? 'offline' : status;
  const label = signedIn ? LABEL[state] : 'Local only';
  return (
    <button type="button" className={`sync-badge sync-badge--${state}`} onClick={onTap}
      aria-label={signedIn ? `Sync status: ${label}. Tap for account.` : 'Sign in to sync'} title={label}>
      <span className="sync-badge__dot" aria-hidden="true" />
      <span className="sync-badge__label">{label}</span>
    </button>
  );
}
