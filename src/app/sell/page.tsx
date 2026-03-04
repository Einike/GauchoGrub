"use client";
import { useMemo, useState } from "react";
import Card from "@/components/Card";
import { authedFetch } from "@/lib/fetcher";

const MIN_PRICE = 0;
const MAX_PRICE = 6;

export default function Sell(){
  const [price,setPrice]=useState(4);
  const [minutes,setMinutes]=useState(30);
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);

  const chips = useMemo(() => {
    const tags: string[] = [];
    if (price === 0) tags.push('FREE_MEAL');
    if (minutes <= 20) tags.push('EXPIRING_SOON');
    return tags;
  }, [price, minutes]);

  const create = async()=>{
    setBusy(true);
    setMsg('');
    const expires = new Date(Date.now() + Number(minutes)*60*1000).toISOString();
    const r = await authedFetch('/api/listings',{
      method:'POST',
      body:JSON.stringify({
        price_cents:Math.round(Number(price)*100),
        dining_location:'Ortega',
        expires_at:expires,
        tags:chips
      })
    });
    const d = await r.json();
    setMsg(r.ok?`Listing live ✅ (${price === 0 ? 'Free' : `$${price.toFixed(2)}`})`:(d.error||'Failed'));
    setBusy(false);
  };

  return <main style={{display:'grid',gap:12}}>
    <h1 style={{fontSize:34,margin:0}}>Sell Meals</h1>
    <Card>
      <label style={label}>Price: <b>{price === 0 ? 'Free' : `$${price.toFixed(2)}`}</b></label>
      <input
        type='range'
        min={MIN_PRICE}
        max={MAX_PRICE}
        step={0.5}
        value={price}
        onChange={e=>setPrice(Number(e.target.value))}
        style={{width:'100%',marginBottom:14}}
      />

      <p style={{margin:'2px 0 12px 0',color:'#bfdbfe'}}>Quantity is fixed to <b>1 meal</b> (Ortega timing policy).</p>

      <label style={label}>Expires in (minutes)</label>
      <input type='number' min={10} max={120} value={minutes} onChange={e=>setMinutes(Math.max(10, Math.min(120, Number(e.target.value)||30)))} style={inp}/>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        {chips.map(c => <span key={c} style={chip}>{c.replace('_',' ')}</span>)}
      </div>

      <button onClick={create} disabled={busy} style={btn}>{busy ? 'Creating...' : 'Create listing'}</button>
      <p style={{marginTop:10,color:msg.includes('✅')?'#86efac':'#fca5a5'}}>{msg}</p>
    </Card>
  </main>
}

const label: React.CSSProperties={display:'block',marginBottom:6,fontSize:14,color:'#bfdbfe'};
const inp: React.CSSProperties={width:'100%',padding:12,borderRadius:10,border:'1px solid #33507f',background:'#081224',color:'#e2e8f0',marginBottom:12};
const btn: React.CSSProperties={padding:'10px 14px',borderRadius:10,border:'1px solid #60a5fa',background:'#2563eb',color:'#fff',fontWeight:700};
const chip: React.CSSProperties={fontSize:12,padding:'4px 8px',borderRadius:999,border:'1px solid #334155',background:'#0f172a'};