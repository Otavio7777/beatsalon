'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase'

const PLANOS = { trial:'Trial', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }
const PLANO_COR = { trial:'#D97706', basic:'#2451A0', pro:'#7C3AED', enterprise:'#059669' }

export default function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtro,    setFiltro]    = useState('todos') // todos|ativos|suspensos
  const [toggling,  setToggling]  = useState(null)
  const [editPlan,  setEditPlan]  = useState(null)
  const sb = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('salons').select('*').order('created_at',{ascending:false})
    const list = data || []

    const enriched = await Promise.all(list.map(async s => {
      const [{ count:c1 },{ count:c2 }] = await Promise.all([
        sb.from('clients').select('*',{count:'exact',head:true}).eq('salon_id',s.id),
        sb.from('appointments').select('*',{count:'exact',head:true}).eq('salon_id',s.id),
      ])
      return { ...s, n_clientes:c1||0, n_appts:c2||0 }
    }))

    setContratos(enriched)
    setLoading(false)
  },[])

  useEffect(()=>{ load() },[load])

  /* Ativa ou suspende contrato */
  const toggleAtivo = async (contrato) => {
    setToggling(contrato.id)
    const novoStatus = contrato.is_active === false ? true : false
    await sb.from('salons').update({ is_active: novoStatus }).eq('id', contrato.id)
    await load()
    setToggling(null)
  }

  const savePlano = async (id, plan) => {
    await sb.from('salons').update({ plan }).eq('id', id)
    setEditPlan(null)
    load()
  }

  const filtrados = contratos.filter(c => {
    const ms = c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
    const mf = filtro==='todos' || (filtro==='ativos' && c.is_active!==false) || (filtro==='suspensos' && c.is_active===false)
    return ms && mf
  })

  const n_ativos    = contratos.filter(c=>c.is_active!==false).length
  const n_suspensos = contratos.filter(c=>c.is_active===false).length

  const st = {
    h1:  { fontSize:22,fontWeight:800,color:'#fff',marginBottom:4 },
    sub: { fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:24 },
    grid:{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20 },
    kpi: { background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'14px 16px' },
    kl:  { fontSize:10,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:700,marginBottom:4 },
    kv:  { fontSize:22,fontWeight:800,color:'#fff' },
    card:{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,overflow:'hidden' },
    th:  { padding:'9px 14px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.5px',textAlign:'left',background:'rgba(0,0,0,.2)',borderBottom:'1px solid rgba(255,255,255,.05)' },
    td:  { padding:'12px 14px',fontSize:13,color:'rgba(255,255,255,.75)',borderBottom:'1px solid rgba(255,255,255,.04)',verticalAlign:'middle' },
    badge:(a)=>({ fontSize:10,padding:'3px 10px',borderRadius:20,fontWeight:700,
      background:a===false?'rgba(220,38,38,.12)':'rgba(5,150,105,.12)',
      color:a===false?'#FCA5A5':'#6EE7B7',
      border:`1px solid ${a===false?'rgba(220,38,38,.2)':'rgba(5,150,105,.2)'}`,
    }),
    filterBtn:(a)=>({ padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',
      background:a?'rgba(255,255,255,.1)':'transparent',color:a?'#fff':'rgba(255,255,255,.4)' }),
    toggleBtn:(ativo,loading)=>({ padding:'5px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',
      background: loading?'rgba(255,255,255,.05)': ativo===false?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)',
      color: loading?'rgba(255,255,255,.3)': ativo===false?'#6EE7B7':'#FCA5A5',
      transition:'all .15s',
    }),
    planSel:{ background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',padding:'4px 8px',borderRadius:6,fontSize:11,cursor:'pointer' },
    actBtn:{ padding:'5px 12px',borderRadius:7,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:11,cursor:'pointer',fontWeight:600 },
  }

  return (
    <div>

      <div style={st.grid}>
        <div style={st.kpi}><div style={st.kl}>Total de contratos</div><div style={st.kv}>{contratos.length}</div></div>
        <div style={st.kpi}><div style={st.kl}>Ativos</div><div style={{...st.kv,color:'#6EE7B7'}}>{n_ativos}</div></div>
        <div style={st.kpi}><div style={st.kl}>Suspensos</div><div style={{...st.kv,color:'#FCA5A5'}}>{n_suspensos}</div></div>
      </div>

      {/* Toolbar */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          style={{flex:1,minWidth:200,padding:'8px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:13,outline:'none'}}
        />
        <div style={{display:'flex',gap:6}}>
          {[['todos','Todos'],['ativos','Ativos'],['suspensos','Suspensos']].map(([k,l])=>(
            <button key={k} style={st.filterBtn(filtro===k)} onClick={()=>setFiltro(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={st.card}>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'rgba(255,255,255,.3)'}}>Carregando contratos...</div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Contrato / Salão','Contato','Plano','Clientes','Agendamentos','Status','Ações'].map(h=>(
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const ativo = c.is_active !== false
                return (
                  <tr key={c.id} style={{opacity:ativo?1:.65}}>
                    {/* Nome */}
                    <td style={st.td}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" style={{width:32,height:32,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
                        ) : (
                          <div style={{width:32,height:32,borderRadius:8,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff',fontWeight:800,flexShrink:0}}>
                            {c.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{fontWeight:700,color:'#fff'}}>{c.name}</div>
                          {c.city && <div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>{c.city}</div>}
                          <div style={{fontSize:10,color:'rgba(255,255,255,.2)',fontFamily:'monospace'}}>{c.id.slice(0,12)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td style={st.td}>
                      <div style={{fontSize:12}}>{c.phone||'—'}</div>
                      {c.instagram && <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{c.instagram}</div>}
                    </td>

                    {/* Plano */}
                    <td style={st.td}>
                      {editPlan===c.id ? (
                        <div style={{display:'flex',gap:5,alignItems:'center'}}>
                          <select id={`p-${c.id}`} defaultValue={c.plan||'trial'} style={st.planSel}>
                            {Object.entries(PLANOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                          </select>
                          <button style={{...st.actBtn,color:'#6EE7B7',border:'1px solid rgba(5,150,105,.3)'}} onClick={()=>savePlano(c.id, document.getElementById(`p-${c.id}`).value)}>✓</button>
                          <button style={st.actBtn} onClick={()=>setEditPlan(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:700,background:`${PLANO_COR[c.plan||'trial']}22`,color:PLANO_COR[c.plan||'trial']}}>{PLANOS[c.plan||'trial']||c.plan}</span>
                          <button style={{...st.actBtn,fontSize:10,padding:'2px 7px'}} onClick={()=>setEditPlan(c.id)}>✏</button>
                        </div>
                      )}
                    </td>

                    {/* Stats */}
                    <td style={{...st.td,color:'#6EE7B7',fontWeight:700}}>{c.n_clientes}</td>
                    <td style={st.td}>{c.n_appts}</td>

                    {/* Status */}
                    <td style={st.td}>
                      <span style={st.badge(c.is_active)}>
                        {ativo ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td style={st.td}>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        {/* Toggle ativo/suspenso */}
                        <button
                          style={st.toggleBtn(c.is_active, toggling===c.id)}
                          disabled={toggling===c.id}
                          onClick={()=>toggleAtivo(c)}
                        >
                          {toggling===c.id ? '...' : ativo ? 'Suspender' : 'Reativar'}
                        </button>
                        <Link href={`/admin/contratos/${c.id}`} style={{...st.actBtn,textDecoration:'none',display:'inline-block'}}>Detalhes</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length===0 && (
                <tr><td colSpan={7} style={{...st.td,textAlign:'center',padding:40,color:'rgba(255,255,255,.25)'}}>Nenhum contrato encontrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
