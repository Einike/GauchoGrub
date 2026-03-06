"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authedFetch, jsonOrThrow } from '@/lib/fetcher';

type Profile = { id: string; username: string; email: string; created_at: string };

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await jsonOrThrow<{ profile: Profile }>(await authedFetch('/api/profile'));
        setProfile(d.profile);
      } catch (e: any) { setErr(e.message ?? 'Failed to load profile'); }
      finally { setLoading(false); }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) return (
    <div className="flex justify-center p-10">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">👤 Profile</h1>

      {err && <p className="text-rose-400 text-sm">{err}</p>}

      {profile && (
        <>
          <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-blue-900/40 border border-blue-700 flex items-center justify-center text-3xl mx-auto">🌮</div>
            <div>
              <p className="text-xl font-black text-white">@{profile.username}</p>
              <p className="text-slate-400 text-sm">{profile.email}</p>
            </div>
            <p className="text-slate-600 text-xs">
              Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Username</span>
              <span className="font-mono text-white">@{profile.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email</span>
              <span className="text-slate-300">{profile.email}</span>
            </div>
          </section>

          <button onClick={signOut}
            className="w-full py-3 rounded-xl border border-rose-800 text-rose-400 hover:bg-rose-950/30 font-medium text-sm transition">
            Sign out
          </button>

          <a href="/admin/audit"
            className="block w-full py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-medium text-sm transition text-center">
            📊 Admin Audit Dashboard
          </a>
        </>
      )}
    </div>
  );
}
