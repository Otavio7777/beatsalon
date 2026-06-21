'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'

const C = { bg:'#F8FAFC', white:'#fff', border:'#E2E8F0', navy:'#0B1E3D', navy2:'#1E3A6E', navy3:'#2451A0', text:'#1E293B', muted:'#64748B', light:'#94A3B8', green:'#059669', red:'#DC2626', warn:'#D97706', blue:'#2451A0', purple:'#7C3AED' }
const PLAN_COR = { trial:'#D97706', basic:'#2451A0', pro:'#7C3AED', enterprise:'#059669' }
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

/* Gráfico de barras SVG */
function BarChart({ data, color='#2451A0', height=120 }) {
  const max = Math.max(...data.map(d=>d.v), 1)
  const w = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width:'100%', height }} preserveAspectRatio="none">
      {data.map((d,i) => {
        const h = (d.v/max)*80
        const x = i*w + w*0.1
        const barW = w*0.8
        const y = height - h - 20
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={2} fill={i===data.length-1?color:`${color}55`}/>
            <text x={x+barW/2} y={height-4} textAnchor="middle" fontSize={5} fill={C.muted}>{d.l}</text>
            {d.v > 0 && <text x={x+barW/2} y={y-2} textAnchor="middle" fontSize={5} fill={color} fontWeight="700">{d.v}</text>}
          </g>
        )
      })}
    </svg>
  )
}

/* Gráfico de linha SVG */
function LineChart({ data, color='#2451A0', height=100 }) {
  const max = Math.max(...data.map(d=>d.v), 1)
  const pts = data.map((d,i) => ({
    x: (i/(data.length-1||1))*90 + 5,
    y: height - (d.v/max)*(height-20) - 10
  }))
  const path = pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ')
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width:'100%', height }}>
      {max > 0 && <>
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={`${path} L${pts[pts.length-1].x},${height} L${pts[0].x},${height} Z`} fill={color} fillOpacity=".1"/>
        {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?2.5:1.5} fill={color}/>)}
      </>}
    </svg>
  )
}

/* Donut chart SVG */
function DonutChart({ segments }) {
  const total = segments.reduce((s,d)=>s+d.v,0)||1
  let offset = 0
  const R = 15.915 // raio
  return (
    <svg viewBox="0 0 42 42" style={{ width:120, height:120 }}>
      <circle cx="21" cy="21" r={R} fill="none" stroke={C.border} strokeWidth="6"/>
      {segments.map((s,i) => {
        const pct = s.v/total*100
        const d = offset
        offset += pct
        return (
          <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={s.color}
            strokeWidth="6" strokeDasharray={`${pct} ${100-pct}`}
            strokeDashoffset={25-d} strokeLinecap="round" style={{ transition:'all .5s' }}/>
        )
      })}
      <text x="21" y="21" textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="800" fill={C.navy}>{total}</text>
    </svg>
  )
}

function Card({ title, sub, children, action }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.navy }}>{title}</div>
        {action}
      </div>
      {sub && <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>{sub}</div>}
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const [views,    setViews]    = useState({ hoje:0, semana:0, mes:0, ano:0, chart7:[], chart30:[] })
  const [appts,    setAppts]    = useState({ total:0, mes:0, chart7:[] })
  const [clients,  setClients]  = useState({ total:0, mes:0, chart7:[] })
  const [planos,   setPlanos]   = useState([])
  const [servers,  setServers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [range,    setRange]    = useState('7d')
  const sb = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const hojeStr = now.toISOString().slice(0,10)
    const mesStr  = now.toISOString().slice(0,7)
    const anoStr  = String(now.getFullYear())

    const [
      { data: pvAll },
      { data: apAll },
      { data: clAll },
      { data: salons },
    ] = await Promise.all([
      sb.from('page_views').select('created_at,salon_id'),
      sb.from('appointments').select('id,created_at,value,status'),
      sb.from('clients').select('id,created_at'),
      sb.from('salons').select('id,plan').is('deleted_at',null),
    ])

    const pv = pvAll||[], ap = apAll||[], cl = clAll||[], sl = salons||[]

    // Gera últimos N dias
    const lastDays = (n) => Array.from({length:n},(_,i)=>{
      const d = new Date(now); d.setDate(d.getDate()-(n-1)+i)
      const ds = d.toISOString().slice(0,10)
      return { l: d.getDate()+'', ds }
    })

    const chart7 = lastDays(7)

    // Page views
    setViews({
      hoje:   pv.filter(v=>v.created_at?.startsWith(hojeStr)).length,
      semana: pv.filter(v=>{ const d=new Date(v.created_at); return (now-d)/86400000<=7 }).length,
      mes:    pv.filter(v=>v.created_at?.startsWith(mesStr)).length,
      ano:    pv.filter(v=>v.created_at?.startsWith(anoStr)).length,
      chart7: chart7.map(d=>({ l:d.l, v:pv.filter(v=>v.created_at?.startsWith(d.ds)).length })),
      chart30: lastDays(30).map(d=>({ l:d.l, v:pv.filter(v=>v.created_at?.startsWith(d.ds)).length })),
    })

    // Appointments
    setAppts({
      total: ap.length,
      mes:   ap.filter(a=>a.created_at?.startsWith(mesStr)).length,
      chart7: chart7.map(d=>({ l:d.l, v:ap.filter(a=>a.created_at?.startsWith(d.ds)).length })),
    })

    // Clients
    setClients({
      total: cl.length,
      mes:   cl.filter(c=>c.created_at?.startsWith(mesStr)).length,
      chart7: chart7.map(d=>({ l:d.l, v:cl.filter(c=>c.created_at?.startsWith(d.ds)).length })),
    })

    // Planos distribuição
    const planCount = { trial:0, basic:0, pro:0, enterprise:0 }
    sl.forEach(s=>{ if(planCount[s.plan||'trial']!==undefined) planCount[s.plan||'trial']++ })
    setPlanos(Object.entries(planCount).filter(([,v])=>v>0).map(([k,v])=>({ label:k.charAt(0).toUpperCase()+k.slice(1), v, color:PLAN_COR[k] })))

    // Servidores
    const checks = await Promise.allSettled([
      fetch('https://plhbpzpzyqrfkhujerar.supabase.co/rest/v1/',{headers:{apikey:'sb_publishable_j663_Up4cZOQO7Xz7HidJw_9l07DZBz'}}).then(r=>({name:'Supabase (banco)',ok:r.status<500,code:r.status})),
      fetch('https://beatsalon.vercel.app/').then(r=>({name:'App principal (Vercel)',ok:r.status<500,code:r.status})),
      fetch('https://beatsalon.vercel.app/agendar/3e125ae9-8865-4411-ae81-18c50433716e').then(r=>({name:'Link de agendamento',ok:r.status<500,code:r.status})),
      fetch('https://beatsalon.vercel.app/login').then(r=>({name:'Página de login',ok:r.status<500,code:r.status})),
    ])
    setServers(checks.map(c => c.status==='fulfilled' ? c.value : { name:'Servidor', ok:false, code:'timeout' }))

    setLoading(false)
  },[])

  useEffect(()=>{ load() },[load])

  const chartData = range==='7d' ? views.chart7 : views.chart30

  if (loading) return <div style={{ padding:40, textAlign:'center', color:C.muted }}>Carregando analytics...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:800, color:C.navy, marginBottom:4 }}>Analytics</div>
          <div style={{ fontSize:13, color:C.muted }}>Dados em tempo real · {new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
        <button onClick={load} style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, color:C.muted, fontSize:12, fontWeight:600, cursor:'pointer' }}>
          Atualizar
        </button>
      </div>

      {/* KPIs de acessos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          ['Acessos hoje',     views.hoje,   C.navy3,  'links de agendamento'],
          ['Acessos na semana',views.semana, C.blue,   'últimos 7 dias'],
          ['Acessos no mês',   views.mes,    C.green,  'mês atual'],
          ['Acessos no ano',   views.ano,    C.purple, 'ano atual'],
        ].map(([l,v,c,s])=>(
          <div key={l} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:28, fontWeight:800, color:c }}>{v}</div>
            <div style={{ fontSize:11, color:C.light, marginTop:4 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de acessos */}
      <Card title="Acessos ao link de agendamento" sub="Visitas registradas por dia"
        action={
          <div style={{ display:'flex', gap:6 }}>
            {[['7d','7 dias'],['30d','30 dias']].map(([k,l])=>(
              <button key={k} onClick={()=>setRange(k)}
                style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${range===k?C.navy3:C.border}`, background:range===k?C.navy3:C.white, color:range===k?'#fff':C.muted, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        }>
        <BarChart data={chartData} color={C.navy3}/>
      </Card>

      {/* Agendamentos e Clientes */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, margin:'16px 0' }}>
        <Card title="Agendamentos criados" sub="Novos agendamentos por dia (7d)">
          <div style={{ display:'flex', gap:16, marginBottom:12 }}>
            {[['Total',appts.total,C.navy],['Este mês',appts.mes,C.blue]].map(([l,v,c])=>(
              <div key={l}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:22, fontWeight:800, color:c }}>{v}</div>
              </div>
            ))}
          </div>
          <LineChart data={appts.chart7} color={C.blue}/>
        </Card>

        <Card title="Novos clientes" sub="Clientes cadastrados por dia (7d)">
          <div style={{ display:'flex', gap:16, marginBottom:12 }}>
            {[['Total',clients.total,C.navy],['Este mês',clients.mes,C.green]].map(([l,v,c])=>(
              <div key={l}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:22, fontWeight:800, color:c }}>{v}</div>
              </div>
            ))}
          </div>
          <LineChart data={clients.chart7} color={C.green}/>
        </Card>
      </div>

      {/* Distribuição de planos + Status servidores */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Planos */}
        <Card title="Distribuição de planos" sub="Contratos ativos por tipo de plano">
          <div style={{ display:'flex', alignItems:'center', gap:24, marginTop:8 }}>
            <DonutChart segments={planos.length ? planos : [{ label:'Sem dados', v:1, color:C.border }]}/>
            <div style={{ flex:1 }}>
              {planos.map(p=>(
                <div key={p.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:p.color, flexShrink:0 }}/>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{p.label}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:p.color }}>{p.v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Status detalhado dos servidores */}
        <Card title="Status dos servidores" sub="Situação de cada endpoint em tempo real">
          {servers.map((s,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:i<servers.length-1?`1px solid ${C.border}`:'none' }}>
              <div style={{ width:10, height:10, borderRadius:5, flexShrink:0, background:s.ok?'#10B981':'#EF4444', boxShadow:`0 0 0 3px ${s.ok?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'}` }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.name}</div>
                <div style={{ fontSize:11, color:C.light }}>HTTP {s.code}</div>
              </div>
              <span style={{ fontSize:11, padding:'4px 12px', borderRadius:20, fontWeight:700, background:s.ok?'#D1FAE5':'#FEE2E2', color:s.ok?C.green:C.red, border:`1px solid ${s.ok?'#6EE7B7':'#FCA5A5'}` }}>
                {s.ok?'Online':'Offline'}
              </span>
            </div>
          ))}
          <div style={{ marginTop:14, fontSize:11, color:C.light, textAlign:'center' }}>
            Última verificação: {new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </div>
        </Card>
      </div>
    </div>
  )
}
