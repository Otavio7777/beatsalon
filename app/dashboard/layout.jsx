'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'
import { useEffect, useState } from 'react'
import { Home, Calendar, Users, DollarSign, Scissors, Clock, Package, Settings, LogOut, X, ArrowLeft, MessageSquare } from '../../lib/icons'

const MULTI_BARBER_PLANS = ['equipe','supremo','pro','enterprise']

function useNavItems(salon) {
  const base = [
    { href:'/dashboard',               Icon:Home,          label:'Início' },
    { href:'/dashboard/agenda',        Icon:Calendar,      label:'Agenda' },
    { href:'/dashboard/clientes',      Icon:Users,         label:'Clientes' },
    { href:'/dashboard/financeiro',    Icon:DollarSign,    label:'Financeiro' },
    { href:'/dashboard/servicos',      Icon:Scissors,      label:'Serviços' },
    { href:'/dashboard/horarios',      Icon:Clock,         label:'Horários' },
    { href:'/dashboard/mensagens',     Icon:MessageSquare, label:'Mensagens' },
    { href:'/dashboard/produtos',      Icon:Package,       label:'Produtos' },
    { href:'/dashboard/configuracoes', Icon:Settings,      label:'Config' },
  ]
  if (salon && MULTI_BARBER_PLANS.includes(salon.plan)) {
    base.splice(3, 0, { href:'/dashboard/equipe', Icon:Users, label:'Equipe' })
  }
  return base
}

const bottomNav = [
  { href:'/dashboard',               Icon:Home,          label:'Início' },
  { href:'/dashboard/agenda',        Icon:Calendar,      label:'Agenda' },
  { href:'/dashboard/clientes',      Icon:Users,         label:'Clientes' },
  { href:'/dashboard/financeiro',    Icon:DollarSign,    label:'Financeiro'},
  { href:'/dashboard/configuracoes', Icon:Settings,      label:'Config' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { salon, user, loading, isAdmin, adminLevel, maintenanceMode, maintenanceName, exitMaintenance } = useSalon()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const dynamicNav = useNavItems(salon)

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 769
      setIsMobile(m)
      setOpen(!m)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    if (salon && !salon.onboarding_complete && !maintenanceMode) router.push('/onboarding')
  }, [loading, user, salon, maintenanceMode])

  useEffect(() => {
    if (!salon?.id) return
    const sb = createClient()
    const run = async () => {
      try { await sb.rpc('auto_complete_past_appointments') } catch(e) {}
    }
    run()
  }, [salon?.id])

  const logout = async () => {
    sessionStorage.removeItem('ms_maintenance')
    await createClient().auth.signOut()
    router.push('/login')
  }

  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const allNav = dynamicNav
  const curNav = allNav.find(n => isActive(n.href)) || allNav[0]

  if (loading) return (
    <div className="layout-loading">
      <div className="layout-loading-dot"/>
    </div>
  )

  return (
    <div className="layout-root">

      {/* Backdrop — mobile only */}
      {isMobile && open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar${open ? ' open' : ' closed'}`}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <Image
              src="/logo-full.svg"
              alt="Meu Salão"
              width={140}
              height={38}
              className="sidebar-logo-img"
              priority
            />
          </div>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Salon name / maintenance indicator */}
        <div className="sidebar-salon-name">
          {maintenanceMode && <span className="sidebar-maintenance-dot"/>}
          <span className="sidebar-salon-label">
            {maintenanceMode ? maintenanceName : (salon?.name || '')}
          </span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {dynamicNav.map(({ href, Icon, label }) => (
            <Link
              href={href}
              key={href}
              className={`nav-item${isActive(href) ? ' active' : ''}`}
              onClick={() => isMobile && setOpen(false)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: 8 }}>Admin</div>
              {maintenanceMode ? (
                <button
                  onClick={exitMaintenance}
                  className="nav-item nav-item-maintenance"
                >
                  <ArrowLeft size={14} />
                  <span>Sair manutenção</span>
                </button>
              ) : (
                <Link
                  href="/admin"
                  className="nav-item nav-item-admin"
                  onClick={() => isMobile && setOpen(false)}
                >
                  <Settings size={14} />
                  <span>Painel Admin</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button onClick={logout} className="nav-item nav-item-logout">
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="layout-main">

        {/* Maintenance banner */}
        {maintenanceMode && (
          <div className="maintenance-banner">
            <div className="maintenance-dot" />
            <div className="maintenance-label">
              Manutenção — <strong>{maintenanceName}</strong>
            </div>
            <button onClick={exitMaintenance} className="maintenance-exit-btn">
              <ArrowLeft size={11} />
              Voltar
            </button>
          </div>
        )}

        {/* Top header */}
        <header className="top-header">
          <button
            className="hamburger"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            <span style={{ width: 20 }} />
            <span style={{ width: 14 }} />
            <span style={{ width: 20 }} />
          </button>

          {/* Logo no header — mobile only */}
          <div className="header-logo-wrap">
            <Image
              src="/logo-full.svg"
              alt="Meu Salão"
              width={100}
              height={27}
              className="header-logo-img"
              priority
            />
          </div>

          <div className="header-title">
            <curNav.Icon size={14} style={{ marginRight: 6, flexShrink: 0 }} />
            {curNav.label}
          </div>

          <div className="header-actions">
            {isAdmin && !maintenanceMode && (
              <Link href="/admin" className="header-admin-badge">Admin</Link>
            )}
            <div className="header-avatar">
              {salon?.name?.charAt(0)?.toUpperCase() || 'M'}
            </div>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="bottom-nav">
        {bottomNav.map(({ href, Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-item${isActive(href) ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon">
              <Icon size={20} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
