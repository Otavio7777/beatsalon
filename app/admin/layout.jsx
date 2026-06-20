'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']

export default function AdminLayout({ children }) {
  const [checked, setChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const router  = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(user.email)) { router.push('/dashboard'); return }
      setAuthorized(true)
      setChecked(true)
    }
    check()
  }, [])

  if (!checked) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0B1E3D'}}>
      <div style={{color:'#fff',fontFamily:'sans-serif',textAlign:'center'}}>
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:32,marginBottom:16}}>Meu Salão</div>
        <div style={{fontSize:14,opacity:.5}}>Verificando acesso admin...</div>
      </div>
    </div>
  )

  if (!authorized) return null

  const nav = [
    { href:'/admin',           label:'Dashboard' },
    { href:'/admin/saloes',    label:'Salões' },
    { href:'/admin/usuarios',  label:'Usuários' },
  ]

  return (
    <div style={{minHeight:'100vh',background:'#0B1E3D',fontFamily:"'Inter',-apple-system,sans-serif"}}>
      {/* Top bar */}
      <header style={{background:'#091629',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'0 24px',height:56,display:'flex',alignItems:'center',gap:16}}>
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:20,color:'#fff',fontWeight:700}}>Meu Salão</div>
        <span style={{fontSize:10,background:'#D97706',color:'#fff',padding:'2px 8px',borderRadius:20,fontWeight:700,letterSpacing:'.5px'}}>ADMIN</span>
        <div style={{flex:1}}/>
        {nav.map(n=>(
          <Link key={n.href} href={n.href} style={{
            fontSize:13,fontWeight:600,textDecoration:'none',padding:'6px 14px',borderRadius:8,
            background:pathname===n.href?'rgba(255,255,255,.12)':'transparent',
            color:pathname===n.href?'#fff':'rgba(255,255,255,.5)',
          }}>{n.label}</Link>
        ))}
        <Link href="/dashboard" style={{fontSize:12,color:'rgba(255,255,255,.4)',textDecoration:'none',marginLeft:8}}>← App</Link>
      </header>
      <main style={{padding:'28px 24px',maxWidth:1200,margin:'0 auto'}}>
        {children}
      </main>
    </div>
  )
}
