# Pocket Notes — Cloud Sync + iOS Setup

This build adds cloud sync (Supabase), native iOS features (share sheet,
haptics, network awareness), and an offline-first sync layer on top of the
original localStorage notes app. The app still works fully offline with no
configuration — cloud sync activates only when Supabase keys are present.

## 1. Supabase setup (for cloud sync)

1. Create a free project at https://supabase.com.
2. In the dashboard: **SQL Editor > New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `notes` table with
   Row Level Security so each user sees only their own notes.
3. Get your keys from **Project Settings > API**:
   - Project URL
   - `anon` `public` key (safe to ship in the client; RLS is the real guard)
4. Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```
5. Enable **Email** auth: **Authentication > Providers > Email** (on by
   default). For quick testing you may turn off "Confirm email".
6. (Optional) Enable Realtime for cross-device live updates:
   **Database > Replication**, add the `notes` table to the `supabase_realtime`
   publication.

Without `.env.local`, the app runs in local-only mode: no sign-in screen,
notes stay on the device.

## 2. Run on the web

```bash
npm install
npm run dev      # local dev
npm run build    # production build into dist/
```

## 3. Build the iOS app

Requires macOS + Xcode. `node_modules` must be present (the iOS SPM packages
reference the Capacitor plugins there).

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios     # opens Xcode; or use build-ipa.sh
```

In Xcode: select a Team under **Signing & Capabilities**, then
**Product > Archive > Distribute App**.

## What was added

- `src/cloud/` — Supabase client, auth hook, sync engine, merge logic, native bridge.
- `src/screens/SignIn.tsx`, `src/components/AccountSheet.tsx`, `src/components/SyncBadge.tsx` — cloud UI.
- `supabase/schema.sql` — database schema with RLS.
- Native plugins: @capacitor/share, haptics, network, status-bar, keyboard, app, preferences.

## How sync works

Offline-first. Notes are always written to localStorage first (unchanged from
the original). When signed in and online, the sync layer pulls remote notes,
merges them with local using **last-write-wins on `updatedAt`**, pushes the
merged set back, and subscribes to realtime changes from other devices. On
reconnect it resyncs automatically. Conflicts never lose data silently — the
newer edit wins per note.

## Security notes

- The `anon` key is public by design; server-side RLS restricts every row to
  its owner. Never put the `service_role` key in the client.
- `.env.local` is gitignored — real keys are not committed.
