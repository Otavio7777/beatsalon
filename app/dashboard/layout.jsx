'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'
import { useState, useEffect } from 'react'
import {
  Home, Calendar, Users, DollarSign, Scissors,
  Clock, Package, Settings, LogOut, X
} from '../../lib/icons'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']

const navItems = [
  { href:'/dashboard',               Icon:Home,       label:'Início' },
  { href:'/dashboard/agenda',        Icon:Calendar,   label:'Agenda' },
  { href:'/dashboard/clientes',      Icon:Users,      label:'Clientes' },
  { href:'/dashboard/financeiro',    Icon:DollarSign, label:'Financeiro' },
  { href:'/dashboard/servicos',      Icon:Scissors,   label:'Serviços' },
  { href:'/dashboard/horarios',      Icon:Clock,      label:'Horários' },
  { href:'/dashboard/produtos',      Icon:Package,    label:'Produtos' },
  { href:'/dashboard/configuracoes', Icon:Settings,   label:'Configurações' },
]

const bottomNav = [
  { href:'/dashboard',               Icon:Home,       label:'Início' },
  { href:'/dashboard/agenda',        Icon:Calendar,   label:'Agenda' },
  { href:'/dashboard/clientes',      Icon:Users,      label:'Clientes' },
  { href:'/dashboard/financeiro',    Icon:DollarSign, label:'Financeiro' },
  { href:'/dashboard/configuracoes', Icon:Settings,   label:'Config' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { salon, user, loading: salonLoading, isAdmin, maintenanceMode, exitMaintenance } = useSalon()
  const [open,   setOpen]   = useState(false)
  const [mobile, setMobile] = useState(true)

  useEffect(() => {
    const check = () => { const m = window.innerWidth < 769; setMobile(m); setOpen(!m) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!salonLoading && !user) { router.push('/login'); return }
    if (!salonLoading && user && salon && !salon.onboarding_complete && !maintenanceMode) {
      router.push('/onboarding')
    }
  }, [salonLoading, user, salon, maintenanceMode])

  // Auto-complete de agendamentos passados
  useEffect(() => {
    if (salon?.id) {
      const sb = createClient()
      sb.rpc('auto_complete_past_appointments').catch(() => null)
    }
  }, [salon?.id])

  const logout = async () => {
    await createClient().auth.signOut()
    sessionStorage.removeItem('ms_maintenance')
    router.push('/login')
  }

  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const currentItem = navItems.find(n => isActive(n.href)) || navItems[0]

  if (salonLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ color:'var(--muted)', fontSize:14 }}>Carregando...</div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', position:'relative' }}>

      {/* Backdrop mobile */}
      {mobile && open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : 'closed'}`}>

        {/* Brand */}
        <div className="sidebar-brand" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div className="sidebar-logo">Meu Salão</div>
            <div className="sidebar-tagline">by Whatsale</div>
          </div>
          {mobile && (
            <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,.6)', marginTop:2 }}>
              <X size={15} color="currentColor" />
            </button>
          )}
        </div>

        {/* Nome do salão atual */}
        {salon?.name && (
          <div style={{ padding:'6px 16px 2px', fontSize:11, color:'rgba(255,255,255,.3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {maintenanceMode && <span style={{ color:'#F59E0B', marginRight:4 }}>🔧</span>}
            {salon.name}
          </div>
        )}

        {/* Nav */}
        <nav style={{ padding:'8px 0', flex:1, overflowY:'auto' }}>
          <div className="nav-section-label">Menu</div>
          {navItems.map(({ href, Icon, label }) => (
            <Link href={href} key={href} className={`nav-item${isActive(href) ? ' active' : ''}`}
              onClick={() => mobile && setOpen(false)}>
              <Icon size={16} />{label}
            </Link>
          ))}

          {/* Acesso ao admin — só para admins */}
          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop:12 }}>Administrador</div>
              <Link href="/admin" className="nav-item" onClick={() => mobile && setOpen(false)}
                style={{ color:'#F59E0B' }}>
                <span style={{ fontSize:15 }}>🔐</span>
                Painel Admin
              </Link>
              {maintenanceMode && (
                <button onClick={exitMaintenance} className="nav-item"
                  style={{ border:'none', background:'rgba(245,158,11,.12)', color:'#F59E0B', width:'100%', cursor:'pointer', borderRadius:8 }}>
                  <span style={{ fontSize:15 }}>↩</span>
                  Sair da manutenção
                </button>
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
          <button onClick={logout} className="nav-item" style={{ border:'none', background:'transparent', width:'100%' }}>
            <LogOut size={15} /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Banner de manutenção */}
        {maintenanceMode && (
          <div style={{
            background:'#78350F',
            borderBottom:'2px solid #F59E0B',
            padding:'8px 16px',
            display:'flex', alignItems:'center', gap:12,
          }}>
            <span style={{ fontSize:16 }}>🔧</span>
            <div style={{ flex:1, fontSize:13, color:'#FDE68A', fontWeight:600 }}>
              Modo manutenção — visualizando: <strong style={{ color:'#fff' }}>{salon?.name}</strong>
              <span style={{ fontSize:11, fontWeight:400, color:'rgba(253,230,138,.6)', marginLeft:8 }}>
                Alterações feitas aqui afetam este salão.
              </span>
            </div>
            <button onClick={exitMaintenance}
              style={{ padding:'5px 14px', background:'rgba(245,158,11,.25)', border:'1px solid rgba(245,158,11,.4)', borderRadius:8, color:'#FDE68A', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ↩ Voltar ao Admin
            </button>
          </div>
        )}

        {/* Top header */}
        <header className="top-header">
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
            <span style={{ width: open && !mobile ? '16px' : '20px' }} />
            <span style={{ width:'13px' }} />
            <span style={{ width: open && !mobile ? '16px' : '20px' }} />
          </button>
          <div className="header-title">
            <currentItem.Icon size={15} color="var(--navy-600)" style={{ marginRight:6 }} />
            {currentItem.label}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {isAdmin && !maintenanceMode && (
              <Link href="/admin" style={{
                fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
                background:'rgba(245,158,11,.12)', color:'#D97706',
                border:'1px solid rgba(245,158,11,.2)', textDecoration:'none',
              }}>
                Admin →
              </Link>
            )}
            <div className="header-avatar">{salon?.name?.charAt(0)?.toUpperCase() || 'MS'}</div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="main-content" style={{ flex:1, overflow:'auto', background:'var(--bg)' }}>
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
