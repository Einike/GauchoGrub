"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Login(){
  const [msg,setMsg] = useState("");
  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:`${window.location.origin}/board` } });
    if(error) setMsg(error.message);
  };
  return <main style={{maxWidth:520,margin:'44px auto',padding:24,border:'1px solid #33507f',borderRadius:18,background:'#0a1731'}}>
    <h1 style={{marginTop:0,fontSize:36}}>GauchoGrub</h1>
    <p>UCSB students only. Sign in with Google.</p>
    <button onClick={login} style={btn}>Continue with Google</button>
    <p style={{color:'#fca5a5'}}>{msg}</p>
  </main>
}
const btn: React.CSSProperties = {padding:'12px 16px',borderRadius:10,border:'1px solid #60a5fa',background:'#2563eb',color:'#fff',fontWeight:700};
