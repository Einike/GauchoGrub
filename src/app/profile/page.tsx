"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/fetcher";

export default function Profile(){
  const [email,setEmail]=useState('');
  const [username,setUsername]=useState('');
  const [mode,setMode]=useState<'buyer'|'seller'>('buyer');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{(async()=>{
    const { data } = await supabase.auth.getUser();
    const u = data.user; if(!u) return;
    setEmail(u.email || '');
    const r = await authedFetch('/api/profile');
    const d = await r.json();
    if (d.profile) {
      setUsername(d.profile.username || '');
      setMode((d.profile.role_mode || 'buyer') as any);
    }
  })();},[]);

  const save = async () => {
    setBusy(true);
    const r = await authedFetch('/api/auth/register',{method:'POST',body:JSON.stringify({username,role_mode:mode})});
    const d = await r.json();
    setMsg(r.ok ? 'Saved ✅' : (d.error || 'Failed'));
    setBusy(false);
  };

  const signOut = async()=>{ await supabase.auth.signOut(); location.href='/login'; };

  return <main style={{display:'grid',gap:12}}>
    <h1 style={{fontSize:32,margin:0}}>Profile</h1>
    <Card>
      <p style={{marginTop:0,color:'#93c5fd'}}>1) Pick a username 2) Pick your current mode 3) Save</p>
      <label style={label}>UCSB Email</label>
      <input value={email} disabled style={inp}/>

      <label style={label}>Username</label>
      <input value={username} onChange={e=>setUsername(e.target.value)} placeholder='example: gauchojane' style={inp}/>

      <label style={label}>Current mode</label>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <button onClick={()=>setMode('buyer')} style={mode==='buyer'?btn:ghost}>Buyer</button>
        <button onClick={()=>setMode('seller')} style={mode==='seller'?btn:ghost}>Seller</button>
      </div>

      <button onClick={save} disabled={busy} style={btn}>{busy?'Saving...':'Save profile'}</button>
      <button onClick={signOut} style={ghost}>Log out</button>
      <p style={{marginBottom:0,color:msg.includes('✅')?'#86efac':'#fca5a5'}}>{msg}</p>
    </Card>
  </main>
}

const label: React.CSSProperties={display:'block',marginBottom:6,fontSize:14,color:'#bfdbfe'};
const inp: React.CSSProperties={width:'100%',padding:12,borderRadius:10,border:'1px solid #33507f',background:'#081224',color:'#e2e8f0',marginBottom:10};
const btn: React.CSSProperties={padding:'10px 14px',borderRadius:10,border:'1px solid #60a5fa',background:'#2563eb',color:'#fff',fontWeight:700,marginRight:8};
const ghost: React.CSSProperties={...btn,background:'#0f172a',border:'1px solid #475569'};