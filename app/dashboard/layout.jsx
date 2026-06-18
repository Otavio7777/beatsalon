'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard/clientes',      icon: '👥', label: 'Clientes (CRM)' },
  { href: '/dashboard/agenda',        icon: '📅', label: 'Agenda' },
  { href: '/dashboard/relatorio',     icon: '📊', label: 'Relatórios' },
  { href: '/dashboard/produtos',      icon: '📦', label: 'Produtos' },
  { href: '/dashboard/configuracoes', icon: '⚙️', label: 'Configurações' },
]

export default function DashboardLayout({ children }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen]         = useState(false)   // sidebar aberta?
  const [mobile, setMobile]     = useState(true)    // é mobile?

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 769
      setMobile(m)
      if (!m) setOpen(true)   // desktop: abre por padrão
      else    setOpen(false)  // mobile: fechado por padrão
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const logout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const currentLabel = navItems.find(n => pathname.startsWith(n.href))?.label || 'Dashboard'
  const currentIcon  = navItems.find(n => pathname.startsWith(n.href))?.icon  || '✂️'

  const close = () => mobile && setOpen(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* ── Overlay backdrop (mobile only) ── */}
      {mobile && open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          zIndex: 40, backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, minWidth: 240,
        background: 'var(--sb)',
        display: 'flex', flexDirection: 'column',
        position: mobile ? 'fixed' : 'sticky',
        top: 0, left: 0, height: '100vh',
        zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{
          padding: '18px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✂️ BeatSalon
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
              Gestão de relacionamento
            </div>
          </div>
          {/* Botão fechar (mobile) */}
          {mobile && (
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,.08)', border: 'none', color: 'rgba(255,255,255,.6)',
              fontSize: 16, cursor: 'pointer', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ padding: '10px 6px', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 12px 4px', fontSize: 9, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            MENU
          </div>
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link href={item.href} key={item.href} onClick={close} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: 'pointer', borderRadius: 8, margin: '1px 0',
                color: active ? '#fff' : 'rgba(255,255,255,.5)',
                background: active ? 'var(--acc)' : 'transparent',
                fontWeight: active ? 600 : 400,
                fontSize: 13, textDecoration: 'none', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px',
            color: 'rgba(255,255,255,.4)', fontSize: 13, cursor: 'pointer',
            borderRadius: 8, border: 'none', background: 'transparent', width: '100%',
          }}>
            <span>🚪</span> Sair da conta
          </button>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: (!mobile && open) ? 0 : 0 }}>

        {/* Top header */}
        <header className="top-header">
          {/* Hamburguer */}
          <button
            className="hamburger"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            <span style={{ width: open && !mobile ? '16px' : '20px' }} />
            <span style={{ width: '14px' }} />
            <span style={{ width: open && !mobile ? '16px' : '20px' }} />
          </button>

          {/* Título da página atual */}
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            <span style={{ marginRight: 6 }}>{currentIcon}</span>
            {currentLabel}
          </div>

          {/* Avatar / iniciais */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--acc)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>BS</div>
        </header>

        {/* Conteúdo da página */}
        <main className="main-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>

      {/* ── Bottom navigation bar (mobile only) ── */}
      <nav className="bottom-nav">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item${active ? ' active' : ''}`}>
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
