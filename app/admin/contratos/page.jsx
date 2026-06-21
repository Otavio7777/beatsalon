'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase'
import { Search, Plus, Check, X, AlertCircle, ChevronRight } from '../../../lib/icons'

const PLANOS   = { trial:'Trial', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }
const PLANO_COR= { trial:'#D97706', basic:'#2451A0', pro:'#7C3AED', enterprise:'#059669' }
const PERIODOS = { monthly:'Mensal', quarterly:'Trimestral', annual:'Anual' }

export default function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtro,    setFiltro]    = useState('todos')
  const [toggling,  setToggling]  = useState(null)
  const [msg,       setMsg]       = useState({type:'',text:''})
  const sb = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('salons').select('*').is('deleted_at', null).order('created_at',{ascending:false})
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

  const showMsg = (type, text) => { setMsg({type,text}); setTimeout(()=>setMsg({type:'',text:''}),3000) }

  const toggleAtivo = async (contrato) => {
    setToggling(contrato.id)
    const novoStatus = contrato.is_active === false ? true : false
    const { error } = await sb.from('salons').update({ is_active: novoStatus }).eq('id', contrato.id)
    if (error) { showMsg('err', error.message); setToggling(null); return }
    await load()
    setToggling(null)
    showMsg('ok', novoStatus ? 'Contrato reativado.' : 'Contrato suspenso.')
  }

  const diasRestantes = (s) => {
    if (!s.plan_expires_at) return null
    return Math.ceil((new Date(s.plan_expires_at).getTime()-Date.now())/86400000)
  }

  const filtrados = contratos.filter(c => {
    const ms = c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.city?.toLowerCase().includes(search.toLowerCase())
    const mf = filtro==='todos' || (filtro==='ativos'&&c.is_active!==false) || (filtro==='suspensos'&&c.is_active===false)
    return ms && mf
  })

  const n_ativos    = contratos.filter(c=>c.is_active!==false).length
  const n_suspensos = contratos.filter(c=>c.is_active===false).length

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div className="pg-h1">Contratos</div>
          <div className="pg-sub">Gestão de clientes da plataforma</div>
        </div>
        <Link href="/admin/contratos/novo" className="btn-primary" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14,padding:'11px 22px'}}>
          <Plus size={16} color="#fff"/> Novo contrato
        </Link>
      </div>

      {/* Msg */}
      {msg.text && (
        <div className={msg.type==='ok'?'alert-info':'alert-warn'} style={{marginBottom:16,alignItems:'center',gap:8}}>
          {msg.type==='ok'?<Check size={14} color="var(--navy-700)"/>:<AlertCircle size={14} color="var(--warning)"/>} {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        <div className="mc"><div className="mc-label">Total contratos</div><div className="mc-value">{contratos.length}</div></div>
        <div className="mc"><div className="mc-label">Ativos</div><div className="mc-value" style={{color:'var(--success)'}}>{n_ativos}</div></div>
        <div className="mc"><div className="mc-label">Suspensos</div><div className="mc-value" style={{color:'var(--danger)'}}>{n_suspensos}</div></div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap" style={{flex:1}}>
          <Search size={14} color="var(--muted)"/>
          <input className="search-inp" placeholder="Buscar por nome, cidade ou telefone..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['todos','ativos','suspensos'].map(k=>(
          <button key={k} className={`filter-btn${filtro===k?' active':''}`} onClick={()=>setFiltro(k)}>
            {k.charAt(0).toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              {['Contrato','Plano / Período','Validade','Clientes','Agendamentos','Status','Ações'].map(h=>(
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="tbl-td" style={{textAlign:'center',color:'var(--muted)',padding:40}}>Carregando...</td></tr>
            ) : filtrados.length===0 ? (
              <tr><td colSpan={7} className="tbl-td" style={{textAlign:'center',color:'var(--muted)',padding:40}}>Nenhum contrato.</td></tr>
            ) : filtrados.map(c => {
              const ativo = c.is_active !== false
              const dias  = diasRestantes(c)
              const planColor = PLANO_COR[c.plan||'trial']
              return (
                <tr key={c.id} className="tbl-tr" style={{opacity:ativo?1:.6}}>

                  {/* Contrato */}
                  <td className="tbl-td">
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      {c.logo_url ? (
                        <img src={c.logo_url} style={{width:32,height:32,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
                      ) : (
                        <div style={{width:32,height:32,borderRadius:8,background:'var(--navy-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0}}>
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:'var(--navy-900)'}}>{c.name}</div>
                        {c.city&&<div style={{fontSize:11,color:'var(--muted)'}}>{c.city}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Plano + Período */}
                  <td className="tbl-td">
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      <span className="badge" style={{background:`${planColor}15`,color:planColor,border:`1px solid ${planColor}25`,display:'inline-block',width:'fit-content'}}>
                        {PLANOS[c.plan||'trial']}
                      </span>
                      <span style={{fontSize:11,color:'var(--muted)'}}>
                        {PERIODOS[c.billing_period||'monthly']||'Mensal'}
                      </span>
                    </div>
                  </td>

                  {/* Validade */}
                  <td className="tbl-td">
                    {c.plan_expires_at ? (
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:dias<7?'var(--danger)':dias<30?'var(--warning)':'var(--text)'}}>
                          {new Date(c.plan_expires_at).toLocaleDateString('pt-BR')}
                        </div>
                        <div style={{fontSize:11,color:dias<7?'var(--danger)':'var(--muted)'}}>
                          {dias<0?'Expirado':dias===0?'Vence hoje':`${dias}d restantes`}
                        </div>
                      </div>
                    ) : (
                      <span style={{fontSize:12,color:'var(--muted)'}}>Sem validade</span>
                    )}
                  </td>

                  {/* Stats */}
                  <td className="tbl-td"><span style={{fontWeight:700,color:'var(--success)'}}>{c.n_clientes}</span></td>
                  <td className="tbl-td">{c.n_appts}</td>

                  {/* Status */}
                  <td className="tbl-td">
                    <span className={`badge ${ativo?'badge-green':'badge-red'}`}>
                      {ativo?'Ativo':'Suspenso'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="tbl-td">
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <button
                        onClick={()=>toggleAtivo(c)}
                        disabled={toggling===c.id}
                        className={ativo?'btn-danger':'btn-success'}
                        style={{fontSize:11,padding:'5px 12px',fontWeight:700}}>
                        {toggling===c.id ? '...' : ativo ? 'Suspender' : 'Reativar'}
                      </button>
                      <Link href={`/admin/contratos/${c.id}`} className="btn-ghost" style={{fontSize:11,display:'inline-flex',alignItems:'center',gap:4}}>
                        Ver <ChevronRight size={11} color="var(--muted)"/>
                      </Link>
                    </div>
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
