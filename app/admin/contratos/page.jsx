'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase'

const PLANOS = { trial:'Trial', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }
const PLANO_COR = { trial:'#D97706', basic:'#2451A0', pro:'#7C3AED', enterprise:'#059669' }

/* ── Modal: editar email do contrato ── */
function EditEmailModal({ contrato, onClose, onSaved }) {
  const [novoEmail, setNovoEmail] = useState(contrato.owner_email || '')
  const [novaSenha, setNovaSenha] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [erro,      setErro]      = useState('')
  const sb = createClient()

  const salvar = async () => {
    if (!novoEmail.includes('@')) { setErro('E-mail inválido.'); return }
    setSaving(true); setErro('')

    const tk = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')||'{}')?.access_token

    // Atualiza via Management API
    const payload = { email: novoEmail, email_confirm: true }
    if (novaSenha.length >= 6) payload.password = novaSenha

    try {
      const r = await fetch(
        `https://api.supabase.com/v1/projects/plhbpzpzyqrfkhujerar/auth/users/${contrato.owner_id}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const d = await r.json()
      if (d.error || d.msg) throw new Error(d.msg || d.error)
      onSaved()
      onClose()
    } catch(e) {
      setErro(e.message || 'Erro ao atualizar. Verifique o e-mail.')
    }
    setSaving(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#0B1E3D',border:'1px solid rgba(255,255,255,.12)',borderRadius:18,padding:'28px',width:'100%',maxWidth:420,boxShadow:'0 24px 60px rgba(0,0,0,.6)'}}>
        <div style={{fontSize:17,fontWeight:800,color:'#fff',marginBottom:4}}>Editar acesso</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginBottom:20}}>
          Salão: <strong style={{color:'rgba(255,255,255,.7)'}}>{contrato.name}</strong>
        </div>

        <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>
          Novo e-mail de acesso *
        </label>
        <input
          value={novoEmail}
          onChange={e=>setNovoEmail(e.target.value)}
          placeholder="novo@email.com"
          style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.07)',color:'#fff',fontSize:14,outline:'none',marginBottom:14,boxSizing:'border-box'}}
        />

        <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>
          Nova senha <span style={{fontWeight:400,textTransform:'none',color:'rgba(255,255,255,.25)'}}>(deixe em branco para manter)</span>
        </label>
        <input
          type="password"
          value={novaSenha}
          onChange={e=>setNovaSenha(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.07)',color:'#fff',fontSize:14,outline:'none',marginBottom:20,boxSizing:'border-box'}}
        />

        {erro && (
          <div style={{background:'rgba(220,38,38,.12)',border:'1px solid rgba(220,38,38,.25)',borderRadius:8,padding:'9px 13px',marginBottom:14,fontSize:13,color:'#FCA5A5'}}>
            {erro}
          </div>
        )}

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose}
            style={{padding:'9px 18px',borderRadius:9,border:'1px solid rgba(255,255,255,.12)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving}
            style={{padding:'9px 20px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1E3A6E,#2451A0)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(36,81,160,.4)'}}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtro,    setFiltro]    = useState('todos')
  const [toggling,  setToggling]  = useState(null)
  const [editPlan,  setEditPlan]  = useState(null)
  const [editEmail, setEditEmail] = useState(null) // contrato sendo editado
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

  const toggleAtivo = async (contrato) => {
    setToggling(contrato.id)
    await sb.from('salons').update({ is_active: contrato.is_active === false ? true : false }).eq('id', contrato.id)
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
    const mf = filtro==='todos' || (filtro==='ativos'&&c.is_active!==false) || (filtro==='suspensos'&&c.is_active===false)
    return ms && mf
  })

  const n_ativos    = contratos.filter(c=>c.is_active!==false).length
  const n_suspensos = contratos.filter(c=>c.is_active===false).length

  const s = {
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
    fBtn:(a)=>({ padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',
      background:a?'rgba(255,255,255,.1)':'transparent',color:a?'#fff':'rgba(255,255,255,.4)' }),
    act: { padding:'5px 12px',borderRadius:7,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:11,cursor:'pointer',fontWeight:600 },
    planSel: { background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',padding:'4px 8px',borderRadius:6,fontSize:11,cursor:'pointer' },
    togBtn:(ativo,load)=>({
      padding:'5px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',
      background:load?'rgba(255,255,255,.05)':ativo===false?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)',
      color:load?'rgba(255,255,255,.3)':ativo===false?'#6EE7B7':'#FCA5A5',
    }),
    emailBtn: { padding:'5px 12px',borderRadius:7,border:'1px solid rgba(110,231,183,.25)',background:'rgba(5,150,105,.08)',color:'#6EE7B7',fontSize:11,cursor:'pointer',fontWeight:600 },
  }

  return (
    <div>
      {/* Header com botão destaque */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Contratos</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.35)'}}>Gestão de clientes da plataforma</div>
        </div>
        <Link href="/admin/contratos/novo" style={{
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'11px 22px',
          background:'linear-gradient(135deg,#1E3A6E,#2451A0)',
          color:'#fff',borderRadius:12,textDecoration:'none',
          fontWeight:700,fontSize:14,
          boxShadow:'0 4px 20px rgba(36,81,160,.45)',
          border:'1px solid rgba(255,255,255,.12)',
        }}>
          <span style={{fontSize:18,lineHeight:1}}>＋</span> Novo contrato
        </Link>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
        <div style={s.kpi}><div style={s.kl}>Total</div><div style={s.kv}>{contratos.length}</div></div>
        <div style={s.kpi}><div style={s.kl}>Ativos</div><div style={{...s.kv,color:'#6EE7B7'}}>{n_ativos}</div></div>
        <div style={s.kpi}><div style={s.kl}>Suspensos</div><div style={{...s.kv,color:'#FCA5A5'}}>{n_suspensos}</div></div>
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
            <button key={k} style={s.fBtn(filtro===k)} onClick={()=>setFiltro(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div style={s.card}>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'rgba(255,255,255,.3)'}}>Carregando contratos...</div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Contrato','Plano','Clientes','Agend.','Status','Email / Login','Ações'].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length===0 ? (
                <tr><td colSpan={7} style={{...s.td,textAlign:'center',padding:40,color:'rgba(255,255,255,.2)'}}>Nenhum contrato encontrado.</td></tr>
              ) : filtrados.map(c => {
                const ativo = c.is_active !== false
                return (
                  <tr key={c.id} style={{opacity:ativo?1:.65}}>

                    {/* Nome */}
                    <td style={s.td}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" style={{width:32,height:32,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
                        ) : (
                          <div style={{width:32,height:32,borderRadius:8,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff',fontWeight:800,flexShrink:0}}>
                            {c.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{fontWeight:700,color:'#fff',fontSize:13}}>{c.name}</div>
                          {c.city && <div style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>{c.city}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Plano */}
                    <td style={s.td}>
                      {editPlan===c.id ? (
                        <div style={{display:'flex',gap:5,alignItems:'center'}}>
                          <select id={`p-${c.id}`} defaultValue={c.plan||'trial'} style={s.planSel}>
                            {Object.entries(PLANOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                          </select>
                          <button style={{...s.act,color:'#6EE7B7'}} onClick={()=>savePlano(c.id,document.getElementById(`p-${c.id}`).value)}>✓</button>
                          <button style={s.act} onClick={()=>setEditPlan(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:700,background:`${PLANO_COR[c.plan||'trial']}22`,color:PLANO_COR[c.plan||'trial']}}>{PLANOS[c.plan||'trial']}</span>
                          <button style={{...s.act,fontSize:10,padding:'2px 7px'}} onClick={()=>setEditPlan(c.id)}>✏</button>
                        </div>
                      )}
                    </td>

                    {/* Stats */}
                    <td style={{...s.td,color:'#6EE7B7',fontWeight:700}}>{c.n_clientes}</td>
                    <td style={s.td}>{c.n_appts}</td>

                    {/* Status */}
                    <td style={s.td}>
                      <span style={s.badge(c.is_active)}>{ativo?'Ativo':'Suspenso'}</span>
                    </td>

                    {/* Email / Login */}
                    <td style={s.td}>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontFamily:'monospace',marginBottom:4}}>
                        {c.owner_id?.slice(0,12)}...
                      </div>
                      <button style={s.emailBtn} onClick={()=>setEditEmail(c)}>
                        ✏ Alterar email/senha
                      </button>
                    </td>

                    {/* Ações */}
                    <td style={s.td}>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button
                          style={s.togBtn(c.is_active, toggling===c.id)}
                          disabled={toggling===c.id}
                          onClick={()=>toggleAtivo(c)}>
                          {toggling===c.id?'...':ativo?'Suspender':'Reativar'}
                        </button>
                        <Link href={`/admin/contratos/${c.id}`}
                          style={{...s.act,textDecoration:'none',display:'inline-block',padding:'5px 12px'}}>
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de edição de email */}
      {editEmail && (
        <EditEmailModal
          contrato={editEmail}
          onClose={()=>setEditEmail(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
