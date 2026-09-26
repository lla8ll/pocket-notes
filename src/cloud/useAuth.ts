import { useCallback, useEffect, useState } from 'react';
import { supabase, cloudEnabled } from './supabaseClient';

export interface AuthState {
  userId: string | null;
  email: string | null;
  ready: boolean; // Initial session check finished.
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ userId: null, email: null, ready: !cloudEnabled });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user ?? null;
      setState({ userId: user?.id ?? null, email: user?.email ?? null, ready: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState({ userId: user?.id ?? null, email: user?.email ?? null, ready: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setError('Check your email to confirm your account, then sign in.');
    setBusy(false);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { ...state, error, busy, cloudEnabled, signIn, signUp, signOut, clearError: () => setError('') };
}
