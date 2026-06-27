'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'
import { useEffect, useState } from 'react'
import { Home, Calendar, Users, DollarSign, Scissors, Clock, Package, Settings, LogOut, X, ArrowLeft, MessageSquare } from '../../lib/icons'

const MULTI_BARBER_PLANS = ['equipe','supremo','pro','enterprise']

function useNavItems(salon, isBarber) {
  // Barbeiros têm menu reduzido
  if (isBarber) {
    return [
      { href:'/dashboard',            Icon:Home,      label:'Início' },
      { href:'/dashboard/agenda',     Icon:Calendar,  label:'Agenda' },
      { href:'/dashboard/servicos',   Icon:Scissors,  label:'Serviços' },
      { href:'/dashboard/produtos',   Icon:Package,   label:'Produtos' },
    ]
  }
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

const bottomNavBarber = [
  { href:'/dashboard',            Icon:Home,     label:'Início' },
  { href:'/dashboard/agenda',     Icon:Calendar, label:'Agenda' },
  { href:'/dashboard/servicos',   Icon:Scissors, label:'Serviços' },
  { href:'/dashboard/produtos',   Icon:Package,  label:'Produtos' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const {
    salon, user, loading, isAdmin, adminLevel,
    maintenanceMode, maintenanceName, exitMaintenance,
    isBarber, barberData, barberViewMode, barberViewName, exitBarberView,
  } = useSalon()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const dynamicNav = useNavItems(salon, isBarber)
  const curBottomNav = isBarber ? bottomNavBarber : bottomNav

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
    if (salon && !salon.onboarding_complete && !maintenanceMode && !barberViewMode) router.push('/onboarding')
  }, [loading, user, salon, maintenanceMode, barberViewMode])

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
    sessionStorage.removeItem('ms_barber_view')
    await createClient().auth.signOut()
    router.push('/login')
  }

  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const curNav = dynamicNav.find(n => isActive(n.href)) || dynamicNav[0]

  if (loading) return (
    <div className="layout-loading">
      <div className="layout-loading-dot"/>
    </div>
  )

  // Nome exibido na sidebar
  const sidebarName = barberViewMode
    ? barberViewName
    : maintenanceMode
      ? maintenanceName
      : isBarber
        ? (barberData?.name || salon?.name || '')
        : (salon?.name || '')

  return (
    <div className="layout-root">

      {isMobile && open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar${open ? ' open' : ' closed'}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <img src="/logo-full.svg" alt="Meu Salão" className="sidebar-logo-img" />
          </div>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Nome do salão / barbeiro */}
        <div className="sidebar-salon-name">
          {(maintenanceMode || barberViewMode) && <span className="sidebar-maintenance-dot"/>}
          <span className="sidebar-salon-label">{sidebarName}</span>
        </div>

        {/* Identidade do barbeiro logado */}
        {isBarber && barberData && !barberViewMode && (
          <div style={{ margin:'0 12px 8px', padding:'9px 12px', background:'rgba(36,81,160,.15)', borderRadius:10, border:'1px solid rgba(36,81,160,.25)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>Você</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{barberData.name}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{barberData.role === 'owner' ? 'Proprietário' : 'Barbeiro'}</div>
          </div>
        )}

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

          {isAdmin && !isBarber && (
            <>
              <div className="nav-section-label" style={{ marginTop: 8 }}>Admin</div>
              {maintenanceMode ? (
                <button onClick={exitMaintenance} className="nav-item nav-item-maintenance">
                  <ArrowLeft size={14} />
                  <span>Sair manutenção</span>
                </button>
              ) : (
                <Link href="/admin" className="nav-item nav-item-admin" onClick={() => isMobile && setOpen(false)}>
                  <Settings size={14} />
                  <span>Painel Admin</span>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="nav-item nav-item-logout">
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="layout-main">

        {/* Banner manutenção */}
        {maintenanceMode && (
          <div className="maintenance-banner">
            <div className="maintenance-dot" />
            <div className="maintenance-label">Manutenção — <strong>{maintenanceName}</strong></div>
            <button onClick={exitMaintenance} className="maintenance-exit-btn">
              <ArrowLeft size={11} /> Voltar
            </button>
          </div>
        )}

        {/* Banner visualizando como barbeiro */}
        {barberViewMode && (
          <div className="maintenance-banner" style={{ background:'#1B3057', borderColor:'#2451A0' }}>
            <div className="maintenance-dot" style={{ background:'#4B7FFF' }} />
            <div className="maintenance-label">Visualizando como: <strong>{barberViewName}</strong></div>
            <button onClick={exitBarberView} className="maintenance-exit-btn">
              <ArrowLeft size={11} /> Sair
            </button>
          </div>
        )}

        <header className="top-header">
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
            <span style={{ width: 20 }} />
            <span style={{ width: 14 }} />
            <span style={{ width: 20 }} />
          </button>

          <div className="header-logo-wrap">
            <img src="/logo-full.svg" alt="Meu Salão" className="header-logo-img" />
          </div>

          <div className="header-title">
            <curNav.Icon size={14} style={{ marginRight: 6, flexShrink: 0 }} />
            {curNav.label}
          </div>

          <div className="header-actions">
            {isAdmin && !maintenanceMode && !isBarber && (
              <Link href="/admin" className="header-admin-badge">Admin</Link>
            )}
            {isBarber && barberData && !barberViewMode && (
              <div style={{ fontSize:12, fontWeight:700, color:'#4B7FFF', padding:'4px 10px', borderRadius:8, border:'1px solid #4B7FFF22', background:'#4B7FFF11' }}>
                {barberData.name}
              </div>
            )}
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {curBottomNav.map(({ href, Icon, label }) => (
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
