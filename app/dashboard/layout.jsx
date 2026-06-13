'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const navItems = [
  { href: '/dashboard/clientes',  icon: '👥', label: 'Clientes (CRM)' },
  { href: '/dashboard/agenda',    icon: '📅', label: 'Agenda' },
  { href: '/dashboard/relatorio', icon: '📊', label: 'Relatórios' },
  { href: '/dashboard/produtos',  icon: '📦', label: 'Produtos' },
]

export default function DashboardLayout({ children }) {
  const path   = usePathname()
  const router = useRouter()

  const logout = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  const sb = {
    wrap:    { display:'flex', minHeight:'100vh' },
    sidebar: { width:220, minWidth:220, background:'#16112B', display:'flex', flexDirection:'column' },
    brand:   { padding:'20px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' },
    brandLg: { fontSize:18, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:8 },
    brandSg: { fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:3, letterSpacing:'.3px' },
    nav:     { padding:'12px 6px', flex:1 },
    sct:     { padding:'10px 12px 4px', fontSize:9, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'1px' },
    main:    { flex:1, overflow:'auto', background:'#F2F1F8' },
    logout:  { padding:'16px 12px', borderTop:'1px solid rgba(255,255,255,0.07)' },
    logoutBtn: { display:'flex', alignItems:'center', gap:9, padding:'8px 12px', color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer', borderRadius:6, border:'none', background:'transparent', width:'100%' },
  }

  return (
    <div style={sb.wrap}>
      <aside style={sb.sidebar}>
        <div style={sb.brand}>
          <div style={sb.brandLg}><span>✂</span> BeatSalon</div>
          <div style={sb.brandSg}>Gestão de relacionamento</div>
        </div>

        <nav style={sb.nav}>
          <div style={sb.sct}>Menu</div>
          {navItems.map(item => {
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                display:'flex', alignItems:'center', gap:9,
                padding:'8px 14px', cursor:'pointer',
                borderRadius:6, margin:'1px 0',
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                background: active ? '#534AB7' : 'transparent',
                fontWeight: active ? 600 : 400,
                fontSize:13, textDecoration:'none',
                transition:'all .15s',
              }}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={sb.logout}>
          <button style={sb.logoutBtn} onClick={logout}>
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      <main style={sb.main}>{children}</main>
    </div>
  )
}
