'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { Home, BarChart, Users, TrendingUp, LogOut, ArrowLeft, Settings } from '../../lib/icons'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']
const nav = [
  { href:'/admin',            Icon:Home,       label:'Dashboard' },
  { href:'/admin/contratos',  Icon:Settings,   label:'Contratos' },
  { href:'/admin/analytics',  Icon:TrendingUp, label:'Analytics' },
  { href:'/admin/admins',     Icon:Users,      label:'Admins' },
]

export default function AdminLayout({ children }) {
  const [ok, setOk]     = useState(false)
  const [email, setEmail] = useState('')
  const pathname = usePathname()
  const router   = useRouter()
  const sb = createClient()

  useEffect(() => {
    if (pathname === '/admin/login') { setOk(true); return }
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user || !ADMIN_EMAILS.includes(user.email)) { router.push('/admin/login'); return }
      setEmail(user.email.split('@')[0]); setOk(true)
    })
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>
  if (!ok) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC' }}><div style={{ color:'#94A3B8', fontSize:14 }}>Verificando acesso...</div></div>

  const isActive = (href) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F8FAFC', fontFamily:"'Inter',-apple-system,sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width:220, background:'#0B1E3D', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', flexShrink:0 }}>
        {/* Brand */}
        <div style={{ padding:'22px 20px 16px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontFamily:'Dancing Script,cursive', fontSize:22, fontWeight:700, color:'#fff', lineHeight:1 }}>Meu Salão</div>
          <div style={{ fontFamily:'Dancing Script,cursive', fontSize:12, color:'rgba(255,255,255,.35)', marginBottom:10 }}>by Whatsale</div>
          <div style={{ display:'inline-block', fontSize:9, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', color:'#D97706', background:'rgba(217,119,6,.12)', border:'1px solid rgba(217,119,6,.25)', padding:'3px 10px', borderRadius:20 }}>
            PAINEL ADMIN
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'12px 8px', flex:1 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'1px', padding:'0 10px', marginBottom:6, marginTop:4 }}>MENU</div>
          {nav.map(({ href, Icon, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, margin:'2px 0',
                textDecoration:'none', fontWeight: active ? 700 : 400, fontSize:13,
                background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,.5)',
                transition:'all .15s',
              }}>
                <Icon size={15} color={active ? '#fff' : 'rgba(255,255,255,.4)'} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ padding:'6px 12px 10px' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px' }}>Logado como</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', fontWeight:600, marginTop:2 }}>{email}</div>
          </div>
          <button onClick={() => sb.auth.signOut().then(() => router.push('/admin/login'))}
            style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 12px', width:'100%', border:'none', background:'transparent', color:'rgba(255,255,255,.4)', fontSize:12, cursor:'pointer', borderRadius:8 }}>
            <LogOut size={14} color="rgba(255,255,255,.4)"/> Sair
          </button>
          <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 12px', color:'rgba(255,255,255,.35)', fontSize:12, textDecoration:'none', borderRadius:8 }}>
            <ArrowLeft size={14} color="rgba(255,255,255,.35)"/> Voltar ao app
          </Link>
        </div>
      </aside>

      {/* Conteúdo */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto' }}>
        {/* Top bar */}
        <div style={{ height:54, background:'#fff', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', padding:'0 32px', position:'sticky', top:0, zIndex:30, boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
          <div style={{ flex:1, fontSize:14, fontWeight:700, color:'#0B1E3D' }}>
            {nav.find(n => isActive(n.href))?.label || 'Admin'}
          </div>
          <div style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'rgba(217,119,6,.08)', color:'#B45309', border:'1px solid rgba(217,119,6,.2)', fontWeight:700 }}>
            Admin
          </div>
        </div>
        <div style={{ padding:'28px 32px', maxWidth:1200, width:'100%' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
