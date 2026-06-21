'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { Home, Calendar, Users, DollarSign, Scissors, Clock, Package, Settings, LogOut, Menu, X } from '../../lib/icons'

const navItems = [
  { href:'/dashboard',            Icon:Home,       label:'Início' },
  { href:'/dashboard/agenda',     Icon:Calendar,   label:'Agenda' },
  { href:'/dashboard/clientes',   Icon:Users,      label:'Clientes' },
  { href:'/dashboard/financeiro', Icon:DollarSign, label:'Financeiro' },
  { href:'/dashboard/servicos',   Icon:Scissors,   label:'Serviços' },
  { href:'/dashboard/horarios',   Icon:Clock,      label:'Horários' },
  { href:'/dashboard/produtos',   Icon:Package,    label:'Produtos' },
  { href:'/dashboard/configuracoes', Icon:Settings, label:'Configurações' },
]
const bottomNav = [
  { href:'/dashboard',            Icon:Home,       label:'Início' },
  { href:'/dashboard/agenda',     Icon:Calendar,   label:'Agenda' },
  { href:'/dashboard/clientes',   Icon:Users,      label:'Clientes' },
  { href:'/dashboard/financeiro', Icon:DollarSign, label:'Financeiro' },
  { href:'/dashboard/configuracoes', Icon:Settings, label:'Config' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open,   setOpen]   = useState(false)
  const [mobile, setMobile] = useState(true)
  const [salonName, setSalonName] = useState('Meu Salão')
  const sb = createClient()

  useEffect(() => {
    const m = () => { const isMob = window.innerWidth < 769; setMobile(isMob); setOpen(!isMob) }
    m(); window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  },[])

  useEffect(() => {
    // Verifica onboarding e carrega nome do salão
    const check = async () => {
      const { data:{ user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data:s } = await sb.from('salons').select('name,onboarding_complete').eq('owner_id', user.id).single()
      if (!s) { router.push('/login'); return }

      setSalonName(s.name || 'Meu Salão')

      // Redireciona para onboarding se não completou
      if (!s.onboarding_complete && pathname !== '/onboarding') {
        router.push('/onboarding')
        return
      }

      // Auto-completa agendamentos passados (mais de 1h atrás)
      autoCompleteAppts(s)
    }
    check()
  },[pathname])

  const autoCompleteAppts = async (salon) => {
    if (!salon) return
    const cutoff = new Date(Date.now() - 60*60*1000).toISOString() // 1h atrás
    await sb.rpc('auto_complete_past_appointments').catch(()=>null)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const isActive = (href) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  const currentItem = navItems.find(n => isActive(n.href)) || navItems[0]

  return (
    <div style={{display:'flex', minHeight:'100vh', position:'relative'}}>
      {mobile && open && (
        <div className="sidebar-backdrop" onClick={()=>setOpen(false)} />
      )}

      <aside className={`sidebar ${open?'open':'closed'}`}>
        <div className="sidebar-brand" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
          <div>
            <div className="sidebar-logo">Meu Salão</div>
            <div className="sidebar-tagline">by Whatsale</div>
          </div>
          {mobile && (
            <button onClick={()=>setOpen(false)} style={{background:'rgba(255,255,255,.08)',border:'none',borderRadius:8,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.6)',marginTop:2}}>
              <X size={15} color="currentColor" />
            </button>
          )}
        </div>

        {/* Nome do salão atual */}
        <div style={{padding:'8px 14px 0',fontSize:11,color:'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {salonName}
        </div>

        <nav style={{padding:'8px 0', flex:1, overflowY:'auto'}}>
          <div className="nav-section-label">Menu</div>
          {navItems.map(({href,Icon,label}) => (
            <Link href={href} key={href} className={`nav-item${isActive(href)?' active':''}`} onClick={()=>mobile&&setOpen(false)}>
              <Icon size={16} />{label}
            </Link>
          ))}
        </nav>

        <div style={{padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,.07)'}}>
          <button onClick={logout} className="nav-item" style={{border:'none',background:'transparent',width:'100%'}}>
            <LogOut size={15} /> Sair da conta
          </button>
        </div>
      </aside>

      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
        <header className="top-header">
          <button className="hamburger" onClick={()=>setOpen(o=>!o)} aria-label="Menu">
            <span style={{width:open&&!mobile?'16px':'20px'}}/><span style={{width:'13px'}}/><span style={{width:open&&!mobile?'16px':'20px'}}/>
          </button>
          <div className="header-title">
            <currentItem.Icon size={15} color="var(--navy-600)" style={{marginRight:6}}/>{currentItem.label}
          </div>
          <div className="header-avatar">MS</div>
        </header>

        <main className="main-content" style={{flex:1, overflow:'auto', background:'var(--bg)'}}>
          {children}
        </main>
      </div>

      <nav className="bottom-nav">
        {bottomNav.map(({href,Icon,label}) => (
          <Link key={href} href={href} className={`bottom-nav-item${isActive(href)?' active':''}`}>
            <span className="bottom-nav-icon"><Icon size={20} color={isActive(href)?'var(--navy-600)':'var(--gray-400)'}/></span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
