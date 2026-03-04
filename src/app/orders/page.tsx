"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { authedFetch } from "@/lib/fetcher";

type Order=any; type Msg=any;

export default function Orders(){
  const [orders,setOrders]=useState<Order[]>([]);
  const [sel,setSel]=useState<Order|null>(null);
  const [msgs,setMsgs]=useState<Msg[]>([]);
  const [text,setText]=useState('');
  const [note,setNote]=useState('No onions pls');
  const [msg,setMsg]=useState('');
  const [qr,setQr]=useState('');

  const loadOrders=async()=>{const r=await authedFetch('/api/orders'); const d=await r.json(); setOrders(d.orders||[]);};
  useEffect(()=>{loadOrders();},[]);

  const open=async(o:Order)=>{setSel(o); const r=await authedFetch(`/api/orders/${o.id}/messages`); const d=await r.json(); setMsgs(d.messages||[]);};
  const refreshThread=async()=>{ if(!sel) return; const r=await authedFetch(`/api/orders/${sel.id}`); const d=await r.json(); setSel(d.order); const m=await authedFetch(`/api/orders/${sel.id}/messages`); const md=await m.json(); setMsgs(md.messages||[]); };

  const customize=async()=>{ if(!sel) return; const r=await authedFetch(`/api/orders/${sel.id}/pay`,{method:'POST',body:JSON.stringify({customizations:note})}); const d=await r.json(); setMsg(r.ok?'Paid (MVP simulated) ✅':(d.error||'Failed')); refreshThread(); loadOrders(); };
  const accept=async()=>{ if(!sel) return; const r=await authedFetch(`/api/orders/${sel.id}/seller-accept`,{method:'POST'}); const d=await r.json(); setMsg(r.ok?'Seller accepted ✅':(d.error||'Failed')); refreshThread(); loadOrders(); };
  const complete=async()=>{ if(!sel) return; const r=await authedFetch(`/api/orders/${sel.id}/complete`,{method:'POST'}); const d=await r.json(); setMsg(r.ok?'Completed ✅':(d.error||'Failed')); refreshThread(); loadOrders(); };
  const send=async()=>{ if(!sel||!text) return; await authedFetch(`/api/orders/${sel.id}/messages`,{method:'POST',body:JSON.stringify({content:text})}); setText(''); refreshThread(); };
  const onFile=(f?:File)=>{ if(!f) return; const rd=new FileReader(); rd.onload=()=>setQr(String(rd.result||'')); rd.readAsDataURL(f); };
  const uploadQR=async()=>{ if(!sel) return; const r=await authedFetch(`/api/orders/${sel.id}/upload-qr`,{method:'POST',body:JSON.stringify({qr_image_url:qr})}); const d=await r.json(); setMsg(r.ok?'QR uploaded ✅':(d.error||'Failed')); refreshThread(); loadOrders(); };

  return <main style={{display:'grid',gap:12}}>
    <h1 style={{fontSize:34,margin:0}}>Orders</h1>
    <Card>{orders.length===0?'No orders yet.':orders.map(o=><div key={o.id} style={{border:'1px solid #334155',padding:10,borderRadius:10,marginBottom:8}}><p style={{margin:'0 0 4px 0'}}><b>{o.status}</b></p><p style={{margin:'0 0 8px 0'}}>Order {o.id.slice(0,8)}...</p><button onClick={()=>open(o)}>Open thread</button></div>)}</Card>
    {sel && <Card>
      <h3 style={{marginTop:0}}>Thread ({sel.status})</h3>
      {sel.qr_image_url && <img src={sel.qr_image_url} alt='QR' style={{maxWidth:240,borderRadius:8,border:'1px solid #334155'}}/>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'10px 0'}}>
        <button onClick={customize}>Pay + submit note</button>
        <button onClick={accept}>Seller accept</button>
        <button onClick={complete}>Confirm complete</button>
      </div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} style={{width:'100%',minHeight:60,marginBottom:8}}/>
      <input type='file' accept='image/*' onChange={e=>onFile(e.target.files?.[0])}/>
      <button onClick={uploadQR}>Upload QR</button>
      <div style={{maxHeight:220,overflow:'auto',border:'1px solid #334155',padding:8,borderRadius:8,marginTop:10}}>{msgs.map(m=><p key={m.id} style={{margin:'0 0 6px 0'}}>{m.is_system?'🔔 ':''}{m.content}</p>)}</div>
      <input value={text} onChange={e=>setText(e.target.value)} placeholder='message' style={{width:'100%',padding:10,marginTop:8}}/>
      <button onClick={send}>Send</button>
    </Card>}
    <p>{msg}</p>
  </main>
}
