import Link from "next/link";
import AuthGate from "@/components/AuthGate";

const link: React.CSSProperties = { color:'#dbeafe', textDecoration:'none', fontWeight:700, textAlign:'center' };

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="en">
      <body style={{margin:0,fontFamily:'Inter,system-ui',background:'#071226',color:'#e2e8f0'}}>
        <AuthGate>
          <main style={{maxWidth:820,margin:'0 auto',padding:'14px 14px 90px'}}>{children}</main>
          <nav style={{position:'fixed',bottom:0,left:0,right:0,display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:12,gap:8,background:'#0a1731',borderTop:'1px solid #223458'}}>
            <Link href="/board" style={link}>Board</Link>
            <Link href="/sell" style={link}>Sell</Link>
            <Link href="/orders" style={link}>Orders</Link>
            <Link href="/profile" style={link}>Profile</Link>
          </nav>
        </AuthGate>
      </body>
    </html>
  );
}
