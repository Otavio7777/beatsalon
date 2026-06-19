'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard',            icon: '🏠', label: 'Início' },
  { href: '/dashboard/agenda',     icon: '📅', label: 'Agenda' },
  { href: '/dashboard/clientes',   icon: '👥', label: 'Clientes' },
  { href: '/dashboard/financeiro', icon: '💰', label: 'Financeiro' },
  { href: '/dashboard/servicos',   icon: '✂️', label: 'Serviços' },
  { href: '/dashboard/horarios',   icon: '🕐', label: 'Horários' },
  { href: '/dashboard/produtos',   icon: '📦', label: 'Produtos' },
  { href: '/dashboard/relatorio',  icon: '📊', label: 'Relatórios' },
  { href: '/dashboard/configuracoes', icon: '⚙️', label: 'Configurações' },
]

// Bottom nav — só 5 itens mais usados
const bottomNav = [
  { href: '/dashboard',            icon: '🏠', label: 'Início' },
  { href: '/dashboard/agenda',     icon: '📅', label: 'Agenda' },
  { href: '/dashboard/clientes',   icon: '👥', label: 'Clientes' },
  { href: '/dashboard/financeiro', icon: '💰', label: 'Financeiro' },
  { href: '/dashboard/configuracoes', icon: '⚙️', label: 'Config' },
]

export default function DashboardLayout({ children }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen]   = useState(false)
  const [mobile, setMobile] = useState(true)

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 769
      setMobile(m)
      if (!m) setOpen(true)
      else    setOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const logout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const currentItem = navItems.find(n => isActive(n.href)) || navItems[0]

  return (
    <div style={{ display:'flex', minHeight:'100vh', position:'relative' }}>

      {/* Backdrop mobile */}
      {mobile && open && (
        <div onClick={()=>setOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
          zIndex:40, backdropFilter:'blur(2px)',
        }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width:240, minWidth:240, background:'var(--sb)',
        display:'flex', flexDirection:'column',
        position: mobile?'fixed':'sticky',
        top:0, left:0, height:'100vh', zIndex:50,
        transform: open?'translateX(0)':'translateX(-100%)',
        transition:'transform .25s cubic-bezier(.4,0,.2,1)',
        flexShrink:0,
      }}>
        <div style={{padding:'18px 18px 14px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:8}}>✂️ BeatSalon</div>
            <div style={{fontSize:10, color:'rgba(255,255,255,.35)', marginTop:2}}>Gestão de relacionamento</div>
          </div>
          {mobile && (
            <button onClick={()=>setOpen(false)} style={{background:'rgba(255,255,255,.08)', border:'none', color:'rgba(255,255,255,.6)', fontSize:16, cursor:'pointer', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
          )}
        </div>

        <nav style={{padding:'8px 6px', flex:1, overflowY:'auto'}}>
          <div style={{padding:'8px 12px 4px', fontSize:9, color:'rgba(255,255,255,.28)', textTransform:'uppercase', letterSpacing:'1px'}}>MENU</div>
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link href={item.href} key={item.href} onClick={()=>mobile&&setOpen(false)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                cursor:'pointer', borderRadius:8, margin:'1px 0',
                color: active?'#fff':'rgba(255,255,255,.5)',
                background: active?'var(--acc)':'transparent',
                fontWeight: active?600:400, fontSize:13, textDecoration:'none', transition:'all .15s',
              }}>
                <span style={{fontSize:17}}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{padding:'12px', borderTop:'1px solid rgba(255,255,255,.07)'}}>
          <button onClick={logout} style={{display:'flex', alignItems:'center', gap:9, padding:'10px 14px', color:'rgba(255,255,255,.4)', fontSize:13, cursor:'pointer', borderRadius:8, border:'none', background:'transparent', width:'100%'}}>
            <span>🚪</span> Sair da conta
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>

        {/* Top header */}
        <header className="top-header">
          <button className="hamburger" onClick={()=>setOpen(o=>!o)} aria-label="Menu">
            <span style={{width: open&&!mobile?'16px':'20px'}}/>
            <span style={{width:'14px'}}/>
            <span style={{width: open&&!mobile?'16px':'20px'}}/>
          </button>
          <div style={{flex:1, fontSize:15, fontWeight:700, color:'var(--text)'}}>
            <span style={{marginRight:6}}>{currentItem.icon}</span>
            {currentItem.label}
          </div>
          <div style={{width:32, height:32, borderRadius:'50%', background:'var(--acc)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800}}>BS</div>
        </header>

        {/* Conteúdo */}
        <main className="main-content" style={{flex:1, overflow:'auto', background:'var(--bg)'}}>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {bottomNav.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item${active?' active':''}`}>
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
