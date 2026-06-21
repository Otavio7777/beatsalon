'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'

const C = { bg:'#F8FAFC', white:'#fff', border:'#E2E8F0', navy:'#0B1E3D', navy2:'#1E3A6E', text:'#1E293B', muted:'#64748B', light:'#94A3B8', green:'#059669', greenBg:'#D1FAE5', greenBd:'#6EE7B7', red:'#DC2626', redBg:'#FEE2E2', redBd:'#FCA5A5', warn:'#D97706', warnBg:'#FEF3C7', warnBd:'#FCD34D', blue:'#2451A0', blueBg:'#DBEAFE', blueBd:'#93C5FD' }

function Kpi({ label, value, color, sub, border }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${border||C.border}`, borderRadius:14, padding:'18px 20px', borderTop:`3px solid ${color||C.blue}` }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:color||C.navy }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.light, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function Alert({ type, children }) {
  const s = type === 'red' ? { bg:C.redBg, bd:C.redBd, color:C.red } : { bg:C.warnBg, bd:C.warnBd, color:C.warn }
  return <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', background:s.bg, border:`1px solid ${s.bd}`, borderRadius:10, color:s.color, fontSize:13, fontWeight:600, marginBottom:12 }}>{children}</div>
}

export default function AdminDashboard() {
  const [data, setData] = useState({ contratos:0, ativos:0, suspensos:0, clientes:0, vencendo:[], suspensosList:[], recentes:[] })
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const em7 = new Date(now); em7.setDate(em7.getDate()+7)

      const { data: salons } = await sb.from('salons').select('id,name,is_active,plan,plan_expires_at,created_at,logo_url,city').is('deleted_at',null).order('created_at',{ascending:false})
      const list = salons||[]

      // Verificação rápida dos servidores
      const checks = await Promise.allSettled([
        fetch('https://plhbpzpzyqrfkhujerar.supabase.co/rest/v1/',{ headers:{ apikey:'sb_publishable_j663_Up4cZOQO7Xz7HidJw_9l07DZBz' } }).then(r=>({ name:'Supabase', ok:r.status<500 })),
        fetch('https://beatsalon.vercel.app/').then(r=>({ name:'App', ok:r.status<500 })),
        fetch('https://beatsalon.vercel.app/agendar/3e125ae9-8865-4411-ae81-18c50433716e').then(r=>({ name:'Agendamento', ok:r.status<500 })),
      ])
      setServers(checks.map(c => c.status==='fulfilled' ? c.value : { name:'?', ok:false }))

      setData({
        contratos: list.length,
        ativos:    list.filter(s=>s.is_active!==false).length,
        suspensos: list.filter(s=>s.is_active===false).length,
        clientes:  (await sb.from('clients').select('*',{count:'exact',head:true})).count || 0,
        vencendo:  list.filter(s=>s.plan_expires_at && new Date(s.plan_expires_at)<=em7 && new Date(s.plan_expires_at)>now && s.is_active!==false),
        suspensosList: list.filter(s=>s.is_active===false),
        recentes:  list.slice(0,5),
      })
      setLoading(false)
    }
    load()
  },[])

  if (loading) return <div style={{ padding:40, color:C.muted, textAlign:'center' }}>Carregando...</div>

  const PLANOS = { trial:'Trial', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:24, fontWeight:800, color:C.navy, marginBottom:4 }}>Dashboard</div>
        <div style={{ fontSize:13, color:C.muted }}>Visão executiva da plataforma · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      {/* Alertas críticos */}
      {data.suspensos > 0 && (
        <Alert type="red">
          <span>⚠</span>
          <div>
            <strong>{data.suspensos} contrato{data.suspensos>1?'s':''} suspenso{data.suspensos>1?'s':''}</strong>
            {' '}— os salões não conseguem mais acessar o sistema.{' '}
            <Link href="/admin/contratos?filtro=suspensos" style={{ color:C.red, fontWeight:800 }}>Gerenciar →</Link>
          </div>
        </Alert>
      )}
      {data.vencendo.length > 0 && (
        <Alert type="warn">
          <span>⏰</span>
          <div>
            <strong>{data.vencendo.length} contrato{data.vencendo.length>1?'s':''}</strong>{' '}vence{data.vencendo.length===1?'':'m'} nos próximos 7 dias.{' '}
            <Link href="/admin/contratos" style={{ color:C.warn, fontWeight:800 }}>Renovar →</Link>
          </div>
        </Alert>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        <Kpi label="Total contratos" value={data.contratos} sub="na plataforma" color={C.blue}/>
        <Kpi label="Ativos" value={data.ativos} sub="com acesso" color={C.green} border={C.greenBd}/>
        <Kpi label="Suspensos" value={data.suspensos} sub="sem acesso" color={data.suspensos>0?C.red:C.light} border={data.suspensos>0?C.redBd:C.border}/>
        <Kpi label="Total clientes" value={data.clientes} sub="em todos os salões" color={C.navy}/>
      </div>

      {/* Status dos servidores + contratos suspensos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* Servidores */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.navy, marginBottom:4 }}>Status dos servidores</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>Verificação em tempo real</div>
          {servers.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<servers.length-1?`1px solid ${C.border}`:'none' }}>
              <div style={{ width:10, height:10, borderRadius:5, background:s.ok?'#10B981':'#EF4444', boxShadow:`0 0 0 3px ${s.ok?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'}`, flexShrink:0 }}/>
              <div style={{ flex:1, fontSize:13, fontWeight:600, color:C.text }}>{s.name}</div>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:s.ok?C.greenBg:C.redBg, color:s.ok?C.green:C.red, border:`1px solid ${s.ok?C.greenBd:C.redBd}` }}>
                {s.ok ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
          <div style={{ marginTop:12, fontSize:11, color:C.light, textAlign:'center' }}>
            Verificado às {new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
          </div>
          <div style={{ marginTop:8, textAlign:'center' }}>
            <Link href="/admin/analytics" style={{ fontSize:12, color:C.blue, fontWeight:700, textDecoration:'none' }}>Ver analytics completo →</Link>
          </div>
        </div>

        {/* Contas suspensas */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.navy, marginBottom:4 }}>Contas suspensas</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Acesso bloqueado</div>
          {data.suspensosList.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>✓</div>
              Nenhuma conta suspensa
            </div>
          ) : data.suspensosList.map((s,i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<data.suspensosList.length-1?`1px solid ${C.border}`:'none' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:C.navy2, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                {s.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>{s.city||'—'} · {PLANOS[s.plan||'trial']}</div>
              </div>
              <Link href={`/admin/contratos/${s.id}`} style={{ fontSize:11, color:C.blue, fontWeight:700, textDecoration:'none', padding:'4px 10px', border:`1px solid ${C.blueBd}`, borderRadius:7, background:C.blueBg }}>
                Reativar
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Contratos recentes */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.navy }}>Contratos recentes</div>
          <Link href="/admin/contratos" style={{ fontSize:12, color:C.blue, fontWeight:700, textDecoration:'none' }}>Ver todos →</Link>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Salão','Plano','Status','Desde',''].map(h=><th key={h} style={{ padding:'8px 12px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.4px', textAlign:'left', background:C.bg, borderBottom:`2px solid ${C.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.recentes.map((s,i)=>{
              const ativo = s.is_active !== false
              return (
                <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:'11px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:C.navy2, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{s.city||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 12px' }}><span style={{ fontSize:11, fontWeight:700, color:C.blue }}>{PLANOS[s.plan||'trial']}</span></td>
                  <td style={{ padding:'11px 12px' }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:ativo?C.greenBg:C.redBg, color:ativo?C.green:C.red, border:`1px solid ${ativo?C.greenBd:C.redBd}` }}>
                      {ativo?'Ativo':'Suspenso'}
                    </span>
                  </td>
                  <td style={{ padding:'11px 12px', fontSize:12, color:C.muted }}>{s.created_at?new Date(s.created_at).toLocaleDateString('pt-BR'):'—'}</td>
                  <td style={{ padding:'11px 12px' }}>
                    <Link href={`/admin/contratos/${s.id}`} style={{ fontSize:11, color:C.blue, fontWeight:700, textDecoration:'none' }}>Ver →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
