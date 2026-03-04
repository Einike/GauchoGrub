"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGate({children}:{children:React.ReactNode}) {
  const path = usePathname();
  const router = useRouter();
  const [ready,setReady] = useState(false);
  useEffect(()=>{(async()=>{
    if (path === "/login") return setReady(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace("/login");
    setReady(true);
  })();},[path,router]);
  if(!ready) return <main style={{padding:24}}>Loading...</main>;
  return <>{children}</>;
}
