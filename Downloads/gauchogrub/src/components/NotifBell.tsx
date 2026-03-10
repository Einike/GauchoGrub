"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/fetcher';
import { supabase } from '@/lib/supabaseClient';

type N = { id: string; title: string; body: string; link: string|null; read_at: string|null; created_at: string };

export default function NotifBell() {
  const [list,     setList]     = useState<N[]>([]);
  const [open,     setOpen]     = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const unread = list.filter(n => !n.read_at).length;

  // FIX: only poll when we know there is an active session — eliminates 401 spam
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setLoggedIn(!!s);
      if (!s) setList([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  const load = async () => {
    try {
      const res = await authedFetch('/api/notifications');
      if (!res.ok) return; // silently skip (e.g. brief 401 during token refresh)
      const d = await res.json();
      setList(d.notifications ?? []);
    } catch {}
  };

  const markRead = async () => {
    await authedFetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
    setList(p => p.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  useEffect(() => {
    if (!loggedIn) { setList([]); return; }
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [loggedIn]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  if (!loggedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => { if (!o && unread > 0) markRead(); return !o; }) }}
        className="relative p-2 rounded-xl hover:bg-slate-800 transition"
        aria-label="Notifications"
      >
        <span className="text-xl leading-none">🔔</span>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex justify-between">
            <span className="font-semibold text-sm">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
            {list.length === 0
              ? <p className="text-slate-500 text-sm text-center py-6">No notifications yet</p>
              : list.map(n => (
                <div key={n.id} className={`px-4 py-3 ${!n.read_at ? 'bg-blue-950/20' : ''}`}>
                  {n.link
                    ? <Link href={n.link} onClick={() => setOpen(false)} className="block hover:opacity-80">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                      </Link>
                    : <><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-slate-400 mt-0.5">{n.body}</p></>
                  }
                  <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
