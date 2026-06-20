'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'

const PLAN_LABELS = { trial:'Trial',basic:'Básico',pro:'Pro',enterprise:'Enterprise' }
const PLAN_COLORS = { trial:'#D97706',basic:'#2451A0',pro:'#7C3AED',enterprise:'#059669' }

function PlanBadge({ plan }) {
  const p = plan || 'trial'
  return (
    <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,
      background:`${PLAN_COLORS[p]}22`,color:PLAN_COLORS[p]}}>
      {PLAN_LABELS[p]||p}
    </span>
  )
}

export default function AdminDashboard() {
  const [salons, setSalons]   = useState([])
  const [stats,  setStats]    = useState({ total:0, ativos:0, clientes:0, appts:0 })
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [editPlan, setEditPlan] = useState(null) // { id, plan }
  const sb = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await sb.rpc('get_all_salons_admin').catch(() => ({ data: null }))

    // Fallback: busca direta (se função não existir)
    const raw = data || (await sb.from('salons').select('*').order('created_at', {ascending:false})).data || []

    // Enriquece com contagens
    const enriched = await Promise.all(raw.map(async s => {
      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        sb.from('clients').select('*', {count:'exact',head:true}).eq('salon_id', s.id),
        sb.from('appointments').select('*', {count:'exact',head:true}).eq('salon_id', s.id),
      ])
      return { ...s, client_count: c1||0, appt_count: c2||0 }
    }))

    setSalons(enriched)
    setStats({
      total:    enriched.length,
      ativos:   enriched.filter(s=>s.plan==='pro'||s.plan==='basic').length,
      clientes: enriched.reduce((a,s)=>a+(s.client_count||0),0),
      appts:    enriched.reduce((a,s)=>a+(s.appt_count||0),0),
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const savePlan = async (id, plan) => {
    await sb.from('salons').update({ plan }).eq('id', id)
    setEditPlan(null)
    load()
  }

  const filtered = salons.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_email?.toLowerCase().includes(search.toLowerCase())
  )

  const st = {
    h1:   { fontSize:26, fontWeight:800, color:'#fff', marginBottom:4 },
    sub:  { fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:28 },
    grid4:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 },
    kpi:  { background:'rgba(255,255,255,.06)', borderRadius:14, padding:'16px 18px', border:'1px solid rgba(255,255,255,.08)' },
    kl:   { fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.6px', fontWeight:700, marginBottom:6 },
    kv:   { fontSize:26, fontWeight:800, color:'#fff' },
    kd:   { fontSize:11, color:'rgba(255,255,255,.3)', marginTop:4 },
    card: { background:'rgba(255,255,255,.04)', borderRadius:14, border:'1px solid rgba(255,255,255,.08)', overflow:'hidden' },
    th:   { padding:'10px 16px', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.5px', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(0,0,0,.2)' },
    td:   { padding:'12px 16px', fontSize:13, borderBottom:'1px solid rgba(255,255,255,.04)', color:'rgba(255,255,255,.8)', verticalAlign:'middle' },
    searchWrap:{ display:'flex', gap:10, marginBottom:16, alignItems:'center' },
    searchInput:{ flex:1, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.06)', color:'#fff', fontSize:13, outline:'none' },
    badge:(c)=>({ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700, background:c+'22', color:c }),
    planSel:{ background:'#1E3A6E', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'4px 8px', borderRadius:6, fontSize:12, cursor:'pointer' },
    actBtn:{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.6)', fontSize:12, cursor:'pointer', fontWeight:600 },
  }

  return (
    <div>
      <div style={st.h1}>Painel Administrativo</div>
      <div style={st.sub}>Meu Salão by Whatsale — gestão da plataforma</div>

      {/* KPIs */}
      <div style={st.grid4}>
        {[
          ['Salões cadastrados', stats.total,    'na plataforma'],
          ['Planos pagos',       stats.ativos,   'basic + pro'],
          ['Total de clientes',  stats.clientes, 'em todos os salões'],
          ['Agendamentos',       stats.appts,    'histórico completo'],
        ].map(([l,v,d])=>(
          <div key={l} style={st.kpi}>
            <div style={st.kl}>{l}</div>
            <div style={st.kv}>{v}</div>
            <div style={st.kd}>{d}</div>
          </div>
        ))}
      </div>

      {/* Tabela de salões */}
      <div style={st.card}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{color:'#fff',fontWeight:800,fontSize:16}}>Salões registrados</div>
          <div style={st.searchWrap}>
            <input style={st.searchInput} placeholder="Buscar por nome..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:'rgba(255,255,255,.4)'}}>Carregando dados da plataforma...</div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Salão','Dono / Email','Plano','Clientes','Agendamentos','Criado em','Ações'].map(h=>(
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s=>{
                const dt = s.created_at ? new Date(s.created_at) : null
                return (
                  <tr key={s.id}>
                    <td style={st.td}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" style={{width:32,height:32,borderRadius:8,objectFit:'cover'}}/>
                        ) : (
                          <div style={{width:32,height:32,borderRadius:8,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#fff',fontWeight:800}}>
                            {s.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{fontWeight:700,color:'#fff'}}>{s.name}</div>
                          {s.city && <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{s.city}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={st.td}>
                      <div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{s.owner_id?.slice(0,8)}...</div>
                    </td>
                    <td style={st.td}>
                      {editPlan?.id===s.id ? (
                        <div style={{display:'flex',gap:6}}>
                          <select style={st.planSel} defaultValue={s.plan||'trial'} id={`plan-${s.id}`}>
                            {['trial','basic','pro','enterprise'].map(p=><option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                          </select>
                          <button style={{...st.actBtn,color:'#6EE7B7'}} onClick={()=>savePlan(s.id, document.getElementById(`plan-${s.id}`).value)}>Salvar</button>
                          <button style={st.actBtn} onClick={()=>setEditPlan(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <PlanBadge plan={s.plan} />
                          <button style={{...st.actBtn,fontSize:11}} onClick={()=>setEditPlan({id:s.id})}>✏</button>
                        </div>
                      )}
                    </td>
                    <td style={st.td}><span style={{fontWeight:700,color:'#6EE7B7'}}>{s.client_count||0}</span></td>
                    <td style={st.td}>{s.appt_count||0}</td>
                    <td style={{...st.td,color:'rgba(255,255,255,.4)',fontSize:12}}>
                      {dt ? `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}` : '—'}
                    </td>
                    <td style={st.td}>
                      <div style={{display:'flex',gap:6}}>
                        <Link href={`/admin/saloes/${s.id}`} style={st.actBtn}>Ver detalhes</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length===0 && (
                <tr><td colSpan={7} style={{...st.td,textAlign:'center',color:'rgba(255,255,255,.3)',padding:32}}>Nenhum salão encontrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
