'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import {
  Home, Calendar, Users, DollarSign, Scissors,
  Clock, Package, Settings, LogOut, Menu, X
} from '../../lib/icons'

const navItems = [
  { href: '/dashboard',            Icon: Home,       label: 'Início' },
  { href: '/dashboard/agenda',     Icon: Calendar,   label: 'Agenda' },
  { href: '/dashboard/clientes',   Icon: Users,      label: 'Clientes' },
  { href: '/dashboard/financeiro', Icon: DollarSign, label: 'Financeiro' },
  { href: '/dashboard/servicos',   Icon: Scissors,   label: 'Serviços' },
  { href: '/dashboard/horarios',   Icon: Clock,      label: 'Horários' },
  { href: '/dashboard/produtos',   Icon: Package,    label: 'Produtos' },
  { href: '/dashboard/configuracoes', Icon: Settings, label: 'Configurações' },
]

const bottomNav = [
  { href: '/dashboard',            Icon: Home,       label: 'Início' },
  { href: '/dashboard/agenda',     Icon: Calendar,   label: 'Agenda' },
  { href: '/dashboard/clientes',   Icon: Users,      label: 'Clientes' },
  { href: '/dashboard/financeiro', Icon: DollarSign, label: 'Financeiro' },
  { href: '/dashboard/configuracoes', Icon: Settings, label: 'Config' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen]   = useState(false)
  const [mobile, setMobile] = useState(true)

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 769
      setMobile(m)
      setOpen(!m)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const logout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const currentItem = navItems.find(n => isActive(n.href)) || navItems[0]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Backdrop mobile */}
      {mobile && open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : 'closed'}`}>

        {/* Brand */}
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="sidebar-logo">Meu Salão</div>
            <div className="sidebar-tagline">by Whatsale</div>
          </div>
          {mobile && (
            <button onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: '8px', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
              <X size={15} color="currentColor" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 0', flex: 1, overflowY: 'auto' }}>
          <div className="nav-section-label">Menu</div>
          {navItems.map(({ href, Icon, label }) => (
            <Link
              href={href} key={href}
              className={`nav-item${isActive(href) ? ' active' : ''}`}
              onClick={() => mobile && setOpen(false)}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button onClick={logout} className="nav-item" style={{ border: 'none', background: 'transparent', width: '100%' }}>
            <LogOut size={15} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top header */}
        <header className="top-header">
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
            <span style={{ width: open && !mobile ? '16px' : '20px' }} />
            <span style={{ width: '13px' }} />
            <span style={{ width: open && !mobile ? '16px' : '20px' }} />
          </button>

          <div className="header-title">
            <currentItem.Icon size={15} color="var(--navy-600)" style={{ marginRight: 6 }} />
            {currentItem.label}
          </div>

          <div className="header-avatar">MS</div>
        </header>

        {/* Conteúdo */}
        <main className="main-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {bottomNav.map(({ href, Icon, label }) => (
          <Link key={href} href={href} className={`bottom-nav-item${isActive(href) ? ' active' : ''}`}>
            <span className="bottom-nav-icon">
              <Icon size={20} color={isActive(href) ? 'var(--navy-600)' : 'var(--gray-400)'} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
