'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'
import { useEffect, useState } from 'react'
import { Home, Calendar, Users, DollarSign, Scissors, Clock, Package, Settings, LogOut, X, ArrowLeft, MessageSquare } from '../../lib/icons'

const navItems = [
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
const bottomNav = [
  { href:'/dashboard',               Icon:Home,     label:'Início' },
  { href:'/dashboard/agenda',        Icon:Calendar, label:'Agenda' },
  { href:'/dashboard/clientes',      Icon:Users,    label:'Clientes' },
  { href:'/dashboard/financeiro',    Icon:DollarSign,label:'Financeiro'},
  { href:'/dashboard/configuracoes', Icon:Settings, label:'Config' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { salon, user, loading, isAdmin, adminLevel, maintenanceMode, maintenanceName, exitMaintenance } = useSalon()
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(true)

  useEffect(() => {
    const check = () => { const m = window.innerWidth < 769; setMobile(m); setOpen(!m) }
    check(); window.addEventListener('resize', check)
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

  const isActive = (href) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  const cur = navItems.find(n => isActive(n.href)) || navItems[0]

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{color:'var(--muted)',fontSize:14}}>Carregando...</div>
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh',position:'relative'}}>
      {mobile&&open && <div className="sidebar-backdrop" onClick={()=>setOpen(false)}/>}

      <aside className={`sidebar ${open?'open':'closed'}`}>
        <div className="sidebar-brand" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div>
            <div className="sidebar-logo">Meu Salão</div>
            <div className="sidebar-tagline">by Whatsale</div>
          </div>
          {mobile&&<button onClick={()=>setOpen(false)} style={{background:'rgba(255,255,255,.08)',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.6)',marginTop:2,flexShrink:0}}>
            <X size={15} color="currentColor"/>
          </button>}
        </div>

        {/* Nome / modo manutenção */}
        <div style={{padding:'5px 16px 4px',display:'flex',alignItems:'center',gap:6}}>
          {maintenanceMode && <div style={{width:6,height:6,borderRadius:3,background:'#F59E0B',flexShrink:0}}/>}
          <span style={{fontSize:11,color:'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {maintenanceMode ? maintenanceName : (salon?.name||'')}
          </span>
        </div>

        <nav style={{padding:'6px 0',flex:1,overflowY:'auto'}}>
          <div className="nav-section-label">Menu</div>
          {navItems.map(({href,Icon,label})=>(
            <Link href={href} key={href} className={`nav-item${isActive(href)?' active':''}`} onClick={()=>mobile&&setOpen(false)}>
              <Icon size={15}/>{label}
            </Link>
          ))}
          {isAdmin&&(
            <>
              <div className="nav-section-label" style={{marginTop:8}}>Admin</div>
              {maintenanceMode ? (
                <button onClick={exitMaintenance} className="nav-item"
                  style={{border:'none',background:'rgba(245,158,11,.1)',color:'#F59E0B',width:'100%',cursor:'pointer',borderRadius:8,textAlign:'left'}}>
                  <ArrowLeft size={14} color="#F59E0B"/> Sair manutenção
                </button>
              ) : (
                <Link href="/admin" className="nav-item" onClick={()=>mobile&&setOpen(false)} style={{color:'rgba(245,158,11,.8)'}}>
                  <Settings size={14} color="rgba(245,158,11,.8)"/> Painel Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div style={{padding:'10px 8px',borderTop:'1px solid rgba(255,255,255,.07)'}}>
          <button onClick={logout} className="nav-item" style={{border:'none',background:'transparent',width:'100%'}}>
            <LogOut size={14}/> Sair
          </button>
        </div>
      </aside>

      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,maxWidth:'100%'}}>
        {/* Banner manutenção */}
        {maintenanceMode&&(
          <div style={{background:'#78350F',borderBottom:'2px solid #D97706',padding:'8px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:8,height:8,borderRadius:4,background:'#F59E0B',flexShrink:0}}/>
            <div style={{flex:1,fontSize:13,color:'#FDE68A',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              Manutenção — <strong style={{color:'#fff'}}>{maintenanceName}</strong>
            </div>
            <button onClick={exitMaintenance}
              style={{padding:'5px 12px',background:'rgba(245,158,11,.2)',border:'1px solid rgba(245,158,11,.35)',borderRadius:8,color:'#FDE68A',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>
              <ArrowLeft size={11} color="#FDE68A" style={{marginRight:4}}/>Voltar
            </button>
          </div>
        )}

        <header className="top-header">
          <button className="hamburger" onClick={()=>setOpen(o=>!o)} aria-label="Menu" style={{display:'flex',flexDirection:'column',gap:4,background:'none',border:'none',padding:'6px',cursor:'pointer',borderRadius:8}}>
            <span style={{display:'block',width:20,height:2,background:'var(--navy-600)',borderRadius:1}}/>
            <span style={{display:'block',width:14,height:2,background:'var(--navy-600)',borderRadius:1}}/>
            <span style={{display:'block',width:20,height:2,background:'var(--navy-600)',borderRadius:1}}/>
          </button>
          <div className="header-title">
            <cur.Icon size={14} color="var(--navy-600)" style={{marginRight:6,flexShrink:0}}/>{cur.label}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {isAdmin&&!maintenanceMode&&(
              <Link href="/admin" style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:'rgba(245,158,11,.1)',color:'#D97706',border:'1px solid rgba(245,158,11,.2)',textDecoration:'none',whiteSpace:'nowrap'}}>
                Admin
              </Link>
            )}
            <div className="header-avatar">{salon?.name?.charAt(0)?.toUpperCase()||'M'}</div>
          </div>
        </header>

        <main className="main-content" style={{flex:1,overflow:'auto',background:'var(--bg)',minWidth:0}}>
          {children}
        </main>
      </div>

      <nav className="bottom-nav">
        {bottomNav.map(({href,Icon,label})=>(
          <Link key={href} href={href} className={`bottom-nav-item${isActive(href)?' active':''}`}>
            <span className="bottom-nav-icon"><Icon size={20} color={isActive(href)?'var(--navy-600)':'var(--gray-400)'}/></span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
