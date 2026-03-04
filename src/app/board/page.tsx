"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { authedFetch } from "@/lib/fetcher";

type Listing={id:string;price_cents:number;dining_location:string;expires_at:string;seller_username:string;seller_rating:number;tags:string[]};

export default function Board(){
  const [rows,setRows]=useState<Listing[]>([]);
  const [msg,setMsg]=useState('');

  const load = async()=>{const r=await authedFetch('/api/listings'); const d=await r.json(); setRows(d.listings||[])};
  useEffect(()=>{load(); const t=setInterval(load,8000); return ()=>clearInterval(t);},[]);

  const claim = async(id:string)=>{
    const r=await authedFetch(`/api/listings/${id}/lock`,{method:'POST'});
    const d=await r.json();
    if(!r.ok) return setMsg(d.error||'Could not lock');
    setMsg(`Locked ✅ Order ${d.order.id}`);
    load();
  };

  return <main style={{display:'grid',gap:12}}>
    <h1 style={{fontSize:34,margin:0}}>Live Meal Board</h1>
    <p style={{color:'#93c5fd'}}>Grab food fast. Lock first, then pay and coordinate QR in order thread.</p>
    {rows.map(x=><Card key={x.id}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h3 style={{margin:'0 0 6px 0'}}>${(x.price_cents/100).toFixed(2)} • {x.dining_location}</h3><p style={{margin:0,color:'#bfdbfe'}}>@{x.seller_username} • {x.seller_rating.toFixed(1)}★</p><p style={{margin:'6px 0 0 0',fontSize:13}}>Expires: {new Date(x.expires_at).toLocaleTimeString()}</p></div><button onClick={()=>claim(x.id)} style={btn}>Claim</button></div><div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>{(x.tags||[]).map(t=><span key={t} style={chip}>{t}</span>)}</div></Card>)}
    {rows.length===0 && <Card>No listings right now.</Card>}
    <p>{msg}</p>
  </main>
}
const btn: React.CSSProperties={padding:'10px 14px',borderRadius:10,border:'1px solid #60a5fa',background:'#2563eb',color:'#fff',fontWeight:700};
const chip: React.CSSProperties={fontSize:12,padding:'4px 8px',borderRadius:999,border:'1px solid #334155',background:'#0f172a'};
