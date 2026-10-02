import './globals.css'; import type { Metadata } from 'next';
export const metadata: Metadata={metadataBase:new URL('https://eleven-football.vercel.app'),title:{default:'ELEVEN',template:'%s | ELEVEN'},description:'A football publication with stories, analysis and context.',openGraph:{type:'website',siteName:'ELEVEN'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
