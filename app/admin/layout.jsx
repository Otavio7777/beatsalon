'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { Home, BarChart, Settings, Users, LogOut, ChevronRight, ArrowLeft } from '../../lib/icons'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']

const navItems = [
  { href:'/admin',          Icon:Home,     label:'Dashboard' },
  { href:'/admin/contratos',Icon:BarChart, label:'Contratos' },
  { href:'/admin/admins',   Icon:Users,    label:'Admins' },
]

export default function AdminLayout({ children }) {
  const [checked,  setChecked]  = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [open, setOpen] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(() => {
    const check = async () => {
      if (pathname === '/admin/login') { setChecked(true); return }
      const { data:{ user } } = await sb.auth.getUser()
      if (!user) { router.push('/admin/login'); return }
      if (!ADMIN_EMAILS.includes(user.email)) { router.push('/admin/login'); return }
      setAdminEmail(user.email.split('@')[0])
      setAuthorized(true); setChecked(true)
    }
    check()
  }, [pathname])

  const logout = async () => {
    await sb.auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  if (!checked) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{color:'var(--muted)',fontSize:14}}>Verificando acesso...</div>
    </div>
  )
  if (!authorized) return null

  const isActive = (href) => href==='/admin' ? pathname==='/admin' : pathname.startsWith(href)

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg)',fontFamily:"'Inter',-apple-system,sans-serif"}}>

      {/* Sidebar — mesmo estilo do app */}
      <aside style={{
        width:240, background:'var(--navy-900)', display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh', flexShrink:0,
      }}>
        {/* Brand */}
        <div style={{padding:'22px 20px 18px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <div className="sidebar-logo">Meu Salão</div>
          <div className="sidebar-tagline">by Whatsale</div>
          <div style={{marginTop:10,display:'inline-block',fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',color:'#D97706',background:'rgba(217,119,6,.1)',border:'1px solid rgba(217,119,6,.2)',padding:'3px 10px',borderRadius:20}}>
            ADMIN
          </div>
        </div>

        {/* Nav */}
        <nav style={{padding:'10px 0',flex:1}}>
          <div className="nav-section-label">Menu</div>
          {navItems.map(({href,Icon,label})=>(
            <Link key={href} href={href} className={`nav-item${isActive(href)?' active':''}`}>
              <Icon size={15}/>{label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{padding:'12px 8px',borderTop:'1px solid rgba(255,255,255,.07)'}}>
          <div style={{padding:'8px 14px',marginBottom:4}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>Logado como</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.55)',fontWeight:600,marginTop:2}}>{adminEmail}</div>
          </div>
          <button onClick={logout} className="nav-item" style={{border:'none',background:'transparent',width:'100%'}}>
            <LogOut size={15}/> Sair do admin
          </button>
          <Link href="/dashboard" className="nav-item" style={{color:'rgba(255,255,255,.35)'}}>
            <ArrowLeft size={15}/> Voltar ao app
          </Link>
        </div>
      </aside>

      {/* Conteúdo principal — fundo branco */}
      <div style={{flex:1,overflow:'auto'}}>
        {/* Top bar */}
        <div style={{
          height:56,background:'var(--white)',borderBottom:'1px solid var(--border)',
          display:'flex',alignItems:'center',padding:'0 28px',gap:12,
          position:'sticky',top:0,zIndex:30,boxShadow:'0 1px 3px rgba(0,0,0,.04)',
        }}>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:'var(--navy-900)'}}>
            {navItems.find(n=>isActive(n.href))?.label || 'Admin'}
          </div>
          <div style={{fontSize:11,padding:'4px 12px',borderRadius:20,background:'rgba(217,119,6,.08)',color:'#D97706',border:'1px solid rgba(217,119,6,.15)',fontWeight:700}}>
            Painel Admin
          </div>
        </div>

        {/* Página */}
        <div style={{padding:'28px 32px',maxWidth:1200}}>
          {children}
        </div>
      </div>
    </div>
  )
}
