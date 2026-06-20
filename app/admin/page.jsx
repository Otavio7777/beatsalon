'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'

export default function AdminDashboard() {
  const [stats,  setStats]  = useState({ contratos:0, ativos:0, inativos:0, clientes:0, appts:0 })
  const [recent, setRecent] = useState([])
  const [loading,setLoading]= useState(true)
  const sb = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: salons } = await sb.from('salons').select('id,name,is_active,plan,created_at').order('created_at',{ascending:false})
      const list = salons || []

      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        sb.from('clients').select('*',{count:'exact',head:true}),
        sb.from('appointments').select('*',{count:'exact',head:true}),
      ])

      setStats({
        contratos: list.length,
        ativos:    list.filter(s=>s.is_active!==false).length,
        inativos:  list.filter(s=>s.is_active===false).length,
        clientes:  c1||0,
        appts:     c2||0,
      })
      setRecent(list.slice(0,5))
      setLoading(false)
    }
    load()
  },[])

  const st = {
    h1:   { fontSize:26,fontWeight:800,color:'#fff',marginBottom:4 },
    sub:  { fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:32 },
    grid: { display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:32 },
    kpi:  { background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'18px 16px' },
    kl:   { fontSize:10,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:700,marginBottom:6 },
    kv:   { fontSize:28,fontWeight:800,color:'#fff' },
    card: { background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'20px' },
    cH:   { fontSize:14,fontWeight:800,color:'#fff',marginBottom:14 },
    row:  { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.05)' },
    badge:(a) => ({ fontSize:10,padding:'3px 10px',borderRadius:20,fontWeight:700,
      background: a===false?'rgba(220,38,38,.15)':'rgba(5,150,105,.15)',
      color: a===false?'#FCA5A5':'#6EE7B7',
      border: `1px solid ${a===false?'rgba(220,38,38,.2)':'rgba(5,150,105,.2)'}`,
    }),
  }

  return (
    <div>
      <div style={st.h1}>Dashboard Administrativo</div>
      <div style={st.sub}>Meu Salão by Whatsale — visão geral da plataforma</div>

      <div style={st.grid}>
        {[
          ['Contratos','/admin/contratos',stats.contratos,'total'],
          ['Ativos',   '/admin/contratos',stats.ativos,   'contratos ativos'],
          ['Suspensos','/admin/contratos',stats.inativos, 'contratos inativos'],
          ['Clientes', '#',               stats.clientes, 'na plataforma'],
          ['Agendamentos','#',            stats.appts,    'registrados'],
        ].map(([l,href,v,d])=>(
          <Link key={l} href={href} style={{textDecoration:'none'}}>
            <div style={{...st.kpi,cursor:'pointer',transition:'background .15s'}}>
              <div style={st.kl}>{l}</div>
              <div style={st.kv}>{loading?'—':v}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.25)',marginTop:4}}>{d}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={st.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={st.cH}>Contratos recentes</div>
          <Link href="/admin/contratos" style={{fontSize:12,color:'#6EE7B7',textDecoration:'none',fontWeight:600}}>Ver todos →</Link>
        </div>
        {recent.map(s=>(
          <div key={s.id} style={st.row}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff',fontWeight:800}}>
                {s.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{s.name}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>{s.created_at?new Date(s.created_at).toLocaleDateString('pt-BR'):''}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={st.badge(s.is_active)}>{s.is_active===false?'Suspenso':'Ativo'}</span>
              <Link href={`/admin/contratos/${s.id}`} style={{fontSize:12,color:'rgba(255,255,255,.4)',textDecoration:'none'}}>Ver →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
