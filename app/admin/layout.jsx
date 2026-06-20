'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']

export default function AdminLayout({ children }) {
  const [checked,    setChecked]    = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [adminName,  setAdminName]  = useState('')
  const router   = useRouter()
  const pathname = usePathname()
  const sb = createClient()

  useEffect(() => {
    const check = async () => {
      // Página de login não precisa checar
      if (pathname === '/admin/login') { setChecked(true); return }

      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/admin/login'); return }
      if (!ADMIN_EMAILS.includes(user.email)) { router.push('/admin/login'); return }

      setAdminName(user.email.split('@')[0])
      setAuthorized(true)
      setChecked(true)
    }
    check()
  }, [pathname])

  const logout = async () => {
    await sb.auth.signOut()
    router.push('/admin/login')
  }

  // Página de login renderiza direto (sem wrapper)
  if (pathname === '/admin/login') return <>{children}</>

  if (!checked) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0B1E3D'}}>
      <div style={{color:'rgba(255,255,255,.4)',fontFamily:'sans-serif',fontSize:14}}>Verificando acesso...</div>
    </div>
  )

  if (!authorized) return null

  const nav = [
    { href:'/admin',          label:'Dashboard', icon:'⊞' },
    { href:'/admin/contratos',label:'Contratos',  icon:'📋' },
    { href:'/admin/admins',   label:'Admins',     icon:'🔐' },
  ]

  const isActive = (href) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div style={{minHeight:'100vh',background:'#060e1f',fontFamily:"'Inter',-apple-system,sans-serif"}}>

      {/* Sidebar */}
      <div style={{display:'flex',minHeight:'100vh'}}>
        <aside style={{
          width:220,background:'#0B1E3D',
          display:'flex',flexDirection:'column',
          borderRight:'1px solid rgba(255,255,255,.06)',
          position:'sticky',top:0,height:'100vh',flexShrink:0,
        }}>
          {/* Brand */}
          <div style={{padding:'22px 18px 18px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{fontFamily:'Dancing Script,cursive',fontSize:20,color:'#fff',fontWeight:700}}>Meu Salão</div>
            <div style={{fontFamily:'Dancing Script,cursive',fontSize:11,color:'rgba(255,255,255,.3)'}}>by Whatsale</div>
            <div style={{marginTop:8,display:'inline-block',fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',color:'#D97706',background:'rgba(217,119,6,.12)',border:'1px solid rgba(217,119,6,.2)',padding:'3px 10px',borderRadius:20}}>ADMIN</div>
          </div>

          {/* Nav */}
          <nav style={{padding:'12px 8px',flex:1}}>
            {nav.map(n => (
              <Link key={n.href} href={n.href} style={{
                display:'flex',alignItems:'center',gap:9,padding:'9px 12px',
                borderRadius:8,margin:'2px 0',textDecoration:'none',
                background: isActive(n.href) ? 'rgba(255,255,255,.08)' : 'transparent',
                color: isActive(n.href) ? '#fff' : 'rgba(255,255,255,.45)',
                fontSize:13,fontWeight: isActive(n.href) ? 600 : 400,
                transition:'all .15s',
              }}>
                <span style={{fontSize:15}}>{n.icon}</span>
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Admin info + logout */}
          <div style={{padding:'12px 8px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{padding:'8px 12px',marginBottom:4}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.3)',fontWeight:600}}>Logado como</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.6)',fontWeight:600,marginTop:2}}>{adminName}</div>
            </div>
            <button onClick={logout} style={{
              display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
              width:'100%',border:'none',background:'transparent',
              color:'rgba(255,255,255,.3)',fontSize:12,cursor:'pointer',borderRadius:8,
            }}>
              🚪 Sair do admin
            </button>
            <Link href="/dashboard" style={{
              display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
              color:'rgba(255,255,255,.3)',fontSize:12,textDecoration:'none',borderRadius:8,
            }}>
              ← Voltar ao app
            </Link>
          </div>
        </aside>

        {/* Conteúdo */}
        <main style={{flex:1,padding:'32px 28px',maxWidth:1100,overflowX:'auto'}}>
          {children}
        </main>
      </div>
    </div>
  )
}
