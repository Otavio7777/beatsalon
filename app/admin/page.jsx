'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'
import { Users, Calendar, DollarSign, TrendingUp, Check, AlertCircle } from '../../lib/icons'

function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div className="mc">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div className="mc-label">{label}</div>
        {Icon&&<div style={{width:32,height:32,borderRadius:8,background:color+'15',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon size={16} color={color}/>
        </div>}
      </div>
      <div className="mc-value" style={{color:color||'var(--text)'}}>{value}</div>
      {sub&&<div className="mc-desc">{sub}</div>}
    </div>
  )
}

function MiniBar({ data, color='var(--navy-600)' }) {
  const max = Math.max(...data.map(d=>d.v),1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:64,marginTop:8}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
          <div style={{width:'100%',background:i===data.length-1?color:'var(--navy-200)',borderRadius:'3px 3px 0 0',height:`${Math.max(d.v/max*100,3)}%`,transition:'height .3s'}}/>
          <span style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>{d.l}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats,    setStats]    = useState({ contratos:0,ativos:0,clientes:0,appts:0 })
  const [views,    setViews]    = useState({ hoje:0,mes:0,ano:0 })
  const [viewChart,setViewChart]= useState([])
  const [servers,  setServers]  = useState([])
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const sb = createClient()

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const hojeStr = now.toISOString().slice(0,10)
      const mesStr  = now.toISOString().slice(0,7)
      const anoStr  = String(now.getFullYear())

      const [
        { data: salons },
        { count: c1 },
        { count: c2 },
        { data: pv },
      ] = await Promise.all([
        sb.from('salons').select('id,name,is_active,plan,created_at,logo_url,city,billing_period').is('deleted_at',null).order('created_at',{ascending:false}),
        sb.from('clients').select('*',{count:'exact',head:true}),
        sb.from('appointments').select('*',{count:'exact',head:true}),
        sb.from('page_views').select('created_at,salon_id').order('created_at',{ascending:false}),
      ])

      const list = salons||[]
      setStats({ contratos:list.length, ativos:list.filter(s=>s.is_active!==false).length, clientes:c1||0, appts:c2||0 })
      setRecent(list.slice(0,5))

      const pvList = pv||[]
      setViews({
        hoje: pvList.filter(v=>v.created_at?.startsWith(hojeStr)).length,
        mes:  pvList.filter(v=>v.created_at?.startsWith(mesStr)).length,
        ano:  pvList.filter(v=>v.created_at?.startsWith(anoStr)).length,
      })

      // Gráfico últimos 7 dias
      const dias = Array.from({length:7},(_,i)=>{
        const d = new Date(now); d.setDate(d.getDate()-6+i)
        const ds = d.toISOString().slice(0,10)
        return { l:d.getDate()+'', v:pvList.filter(v=>v.created_at?.startsWith(ds)).length }
      })
      setViewChart(dias)

      // Status dos servidores
      const checks = await Promise.allSettled([
        fetch('https://plhbpzpzyqrfkhujerar.supabase.co/rest/v1/',{ headers:{'apikey':'sb_publishable_j663_Up4cZOQO7Xz7HidJw_9l07DZBz'} }).then(r=>({name:'Supabase (banco)',ok:r.ok||r.status===200,status:r.status})),
        fetch('https://beatsalon.vercel.app/').then(r=>({name:'App principal',ok:r.ok,status:r.status})),
        fetch('https://beatsalon.vercel.app/agendar/3e125ae9-8865-4411-ae81-18c50433716e').then(r=>({name:'Link de agendamento',ok:r.ok,status:r.status})),
        fetch('https://api.supabase.com/v1/projects/plhbpzpzyqrfkhujerar',{headers:{'Authorization':'Bearer '+localStorage.getItem('sb-token')||''}}).then(r=>({name:'Supabase API',ok:r.status<500,status:r.status})),
      ])

      setServers(checks.map((c,i)=>{
        const names = ['Supabase (banco)','App principal','Link de agendamento','Supabase API']
        if (c.status==='fulfilled') return { name:names[i], ok:c.value.ok, status:c.value.status }
        return { name:names[i], ok:false, status:'offline' }
      }))

      setLoading(false)
    }
    load()
  },[])

  const MS7 = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  return (
    <div>
      <div className="pg-h1">Dashboard</div>
      <div className="pg-sub" style={{marginBottom:28}}>Visão geral da plataforma Meu Salão by Whatsale</div>

      {/* KPIs principais */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <StatCard label="Contratos" value={stats.contratos} sub="na plataforma" Icon={Users} color="var(--navy-600)"/>
        <StatCard label="Contratos ativos" value={stats.ativos} sub="com acesso" Icon={Check} color="var(--success)"/>
        <StatCard label="Total de clientes" value={stats.clientes} sub="em todos os salões" Icon={Users} color="var(--navy-400)"/>
        <StatCard label="Agendamentos" value={stats.appts} sub="histórico total" Icon={Calendar} color="var(--navy-300)"/>
      </div>

      {/* Analytics de acessos */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <div className="card">
          <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Acessos ao link de agendamento</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Total de visitas registradas</div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:8}}>
            {[['Hoje',views.hoje,'var(--navy-600)'],['Este mês',views.mes,'var(--success)'],['Este ano',views.ano,'var(--navy-400)']].map(([l,v,c])=>(
              <div key={l} style={{textAlign:'center',padding:'12px 8px',background:'var(--gray-50)',borderRadius:10,border:'1px solid var(--border)'}}>
                <div style={{fontSize:22,fontWeight:800,color:c}}>{loading?'—':v}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:12,color:'var(--muted)',fontWeight:600,marginBottom:4}}>Últimos 7 dias</div>
          {loading ? <div style={{height:64,background:'var(--gray-50)',borderRadius:8}}/> : <MiniBar data={viewChart}/>}
        </div>

        {/* Status dos servidores */}
        <div className="card">
          <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Status dos servidores</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Situação em tempo real</div>

          {loading ? <div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:20}}>Verificando...</div>
          : servers.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<servers.length-1?'1px solid var(--gray-100)':'none'}}>
              <div style={{width:10,height:10,borderRadius:5,background:s.ok?'var(--success)':'var(--danger)',flexShrink:0,boxShadow:s.ok?'0 0 6px rgba(5,150,105,.5)':'0 0 6px rgba(220,38,38,.5)'}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--navy-900)'}}>{s.name}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>HTTP {s.status}</div>
              </div>
              <span className={`badge ${s.ok?'badge-green':'badge-red'}`}>
                {s.ok?'Online':'Offline'}
              </span>
            </div>
          ))}

          <div style={{marginTop:12,fontSize:11,color:'var(--muted)',textAlign:'center'}}>
            Verificado às {new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
      </div>

      {/* Contratos recentes */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)'}}>Contratos recentes</div>
          <Link href="/admin/contratos" className="sec-link" style={{display:'flex',alignItems:'center',gap:4,fontSize:12}}>Ver todos</Link>
        </div>
        {recent.map((s,i)=>{
          const ativo = s.is_active!==false
          return (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<recent.length-1?'1px solid var(--gray-100)':'none'}}>
              {s.logo_url ? (
                <img src={s.logo_url} style={{width:36,height:36,borderRadius:9,objectFit:'cover',flexShrink:0}}/>
              ) : (
                <div style={{width:36,height:36,borderRadius:9,background:'var(--navy-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,flexShrink:0}}>
                  {s.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--navy-900)'}}>{s.name}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{s.city||'—'} · {s.plan||'trial'}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span className={`badge ${ativo?'badge-green':'badge-red'}`}>{ativo?'Ativo':'Suspenso'}</span>
                <Link href={`/admin/contratos/${s.id}`} className="btn-ghost" style={{fontSize:11}}>Ver</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
