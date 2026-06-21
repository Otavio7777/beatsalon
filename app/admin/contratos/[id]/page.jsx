'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'

const PLANOS   = { trial:'Trial', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }
const PLANO_C  = { trial:'#D97706', basic:'#2451A0', pro:'#7C3AED', enterprise:'#059669' }
const PERIODOS = { monthly:'Mensal (30 dias)', quarterly:'Trimestral (90 dias)', annual:'Anual (365 dias)' }
const DIAS_P   = { monthly:30, quarterly:90, annual:365 }
const STATUS_A = { agendado:'#2451A0', concluido:'#059669', cancelado:'#DC2626', faltou:'#D97706' }

const S = {
  h1:   { fontSize:22, fontWeight:800, color:'#0B1E3D', marginBottom:3 },
  sub:  { fontSize:13, color:'#64748B', marginBottom:0 },
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'20px', marginBottom:14 },
  cH:   { fontSize:15, fontWeight:800, color:'#0B1E3D', marginBottom:12 },
  row:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 },
  lbl:  { color:'#64748B' },
  val:  { color:'#0B1E3D', fontWeight:600, textAlign:'right', maxWidth:'60%', wordBreak:'break-all', fontSize:12 },
  inp:  { width:'100%', padding:'9px 14px', borderRadius:9, border:'1px solid #E2E8F0', fontSize:14, color:'#0B1E3D', outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginTop:5 },
  th:   { padding:'8px 14px', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.4px', textAlign:'left', background:'#F8FAFC', borderBottom:'2px solid #E2E8F0' },
  td:   { padding:'10px 14px', fontSize:12, color:'#1E293B', borderBottom:'1px solid #F1F5F9' },
  btn:  (color, bg, bd) => ({ padding:'8px 16px', borderRadius:9, border:`1px solid ${bd||color+'33'}`, background:bg, color:color, fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }),
  kpi:  (color) => ({ background:'#fff', border:`1px solid #E2E8F0`, borderRadius:12, padding:'14px 16px', borderTop:`3px solid ${color}` }),
  kpiL: { fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 },
  kpiV: (color) => ({ fontSize:22, fontWeight:800, color }),
  msg:  (ok) => ({ display:'flex', gap:8, padding:'9px 14px', background:ok?'#D1FAE5':'#FEE2E2', border:`1px solid ${ok?'#6EE7B7':'#FCA5A5'}`, borderRadius:8, fontSize:13, color:ok?'#065F46':'#991B1B', fontWeight:600, marginBottom:14 }),
  planBox:(sel)=>({ padding:'10px 12px', borderRadius:10, border:`2px solid ${sel?'#0B1E3D':'#E2E8F0'}`, background:sel?'#EFF6FF':'#fff', cursor:'pointer', textAlign:'center', transition:'all .15s' }),
}

export default function ContratoDetalhe({ params }) {
  const { id } = params
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [toggling,   setToggling]   = useState(false)
  const [editEmail,  setEditEmail]  = useState(false)
  const [editPlan,   setEditPlan]   = useState(false)
  const [novoEmail,  setNovoEmail]  = useState('')
  const [novaSenha,  setNovaSenha]  = useState('')
  const [planForm,   setPlanForm]   = useState({ plan:'trial', billing_period:'monthly' })
  const [saving,     setSaving]     = useState({})
  const [msg,        setMsg]        = useState(null)
  const sb = createClient()

  const load = async () => {
    const [{ data:s },{ data:cl },{ data:ap }] = await Promise.all([
      sb.from('salons').select('*').eq('id',id).single(),
      sb.from('clients').select('id').eq('salon_id',id),
      sb.from('appointments').select('*').eq('salon_id',id).order('date',{ascending:false}).limit(10),
    ])
    setData({ salon:s, clients:cl||[], appts:ap||[] })
    if (s) setPlanForm({ plan:s.plan||'trial', billing_period:s.billing_period||'monthly' })
    setLoading(false)
  }

  useEffect(()=>{ load() },[id])

  const showMsg = (ok, text) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3500) }

  const calcExpiry = (period) => {
    const d = new Date(); d.setDate(d.getDate()+(DIAS_P[period]||30)); return d.toISOString()
  }

  const toggleAtivo = async () => {
    setToggling(true)
    const novoStatus = data.salon.is_active === false
    const { error } = await sb.rpc('admin_toggle_salon_status', { p_salon_id:id, p_is_active:novoStatus })
    if (error) await sb.from('salons').update({ is_active:novoStatus }).eq('id',id)
    await load(); setToggling(false)
    showMsg(true, novoStatus ? 'Contrato reativado.' : 'Contrato suspenso. Login bloqueado.')
  }

  const excluir = async () => {
    if (!confirm(`Excluir permanentemente "${data.salon.name}"?`)) return
    setSaving(s=>({...s,del:true}))
    await sb.from('salons').update({ deleted_at:new Date().toISOString(), is_active:false }).eq('id',id)
    window.location.href = '/admin/contratos'
  }

  const savePlan = async () => {
    setSaving(s=>({...s,plan:true}))
    const exp = calcExpiry(planForm.billing_period)
    await sb.from('salons').update({ plan:planForm.plan, billing_period:planForm.billing_period, plan_expires_at:exp }).eq('id',id)
    await load(); setSaving(s=>({...s,plan:false})); setEditPlan(false)
    showMsg(true, `Plano ${PLANOS[planForm.plan]} ${PERIODOS[planForm.billing_period]} ativado.`)
  }

  const salvarEmail = async () => {
    if (!novoEmail.includes('@')) { showMsg(false,'E-mail inválido.'); return }
    setSaving(s=>({...s,email:true}))
    const tk = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')||'{}')?.access_token
    const payload = { email:novoEmail, email_confirm:true }
    if (novaSenha.length>=6) payload.password = novaSenha
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/plhbpzpzyqrfkhujerar/auth/users/${data.salon.owner_id}`, {
        method:'PUT', headers:{'Authorization':'Bearer '+tk,'Content-Type':'application/json'}, body:JSON.stringify(payload)
      })
      const d = await r.json()
      if (d.error||d.msg) throw new Error(d.msg||d.error)
      setEditEmail(false); setNovoEmail(''); setNovaSenha('')
      showMsg(true, 'Acesso atualizado.')
    } catch(e) { showMsg(false, e.message||'Erro ao atualizar.') }
    setSaving(s=>({...s,email:false}))
  }

  const entrarManutencao = () => {
    sessionStorage.setItem('ms_maintenance', JSON.stringify({ salonId:id, salonName:data.salon.name, timestamp:Date.now() }))
    window.location.href = '/dashboard'
  }

  if (loading) return <div style={{color:'#64748B', padding:40, textAlign:'center'}}>Carregando...</div>
  if (!data?.salon) return <div style={{color:'#0B1E3D', padding:40}}>Não encontrado. <Link href="/admin/contratos" style={{color:'#2451A0'}}>← Voltar</Link></div>

  const { salon, clients, appts } = data
  const ativo    = salon.is_active !== false && !salon.deleted_at
  const excluido = !!salon.deleted_at
  const expires  = salon.plan_expires_at ? new Date(salon.plan_expires_at) : null
  const diasR    = expires ? Math.ceil((expires.getTime()-Date.now())/86400000) : null
  const receita  = appts.filter(a=>a.status==='concluido').reduce((s,a)=>s+(a.value||0),0)

  return (
    <div>
      <Link href="/admin/contratos" style={{display:'inline-flex', alignItems:'center', gap:6, color:'#64748B', fontSize:13, textDecoration:'none', marginBottom:20}}>
        ← Todos os contratos
      </Link>

      {msg && <div style={S.msg(msg.ok)}>{msg.text}</div>}

      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-start', gap:16, marginBottom:20, flexWrap:'wrap', background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'20px'}}>
        <div style={{width:56, height:56, borderRadius:14, background:'#0B1E3D', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, flexShrink:0}}>
          {salon.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{flex:1}}>
          <div style={S.h1}>{salon.name}</div>
          <div style={{...S.sub, marginBottom:10}}>{salon.city||'Sem cidade'} · {PLANOS[salon.plan||'trial']}{expires&&` · Vence em ${diasR}d`}</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button onClick={entrarManutencao} style={S.btn('#B45309','#FEF3C7','#FCD34D')}>Entrar como manutenção</button>
            {!excluido && <button onClick={toggleAtivo} disabled={toggling} style={S.btn(ativo?'#DC2626':'#059669', ativo?'#FEF2F2':'#ECFDF5', ativo?'#FCA5A5':'#6EE7B7')}>
              {toggling?'...' : ativo?'Suspender contrato':'Reativar contrato'}
            </button>}
            <button onClick={excluir} disabled={saving.del} style={S.btn('#DC2626','#FEF2F2','#FCA5A5')}>
              {saving.del?'Excluindo...':'Excluir contrato'}
            </button>
          </div>
        </div>
        <span style={{fontSize:12, padding:'5px 14px', borderRadius:20, fontWeight:700, background:excluido?'#F1F5F9':ativo?'#D1FAE5':'#FEE2E2', color:excluido?'#64748B':ativo?'#065F46':'#991B1B', border:`1px solid ${excluido?'#CBD5E1':ativo?'#6EE7B7':'#FCA5A5'}`}}>
          {excluido?'Excluído':ativo?'Ativo':'Suspenso'}
        </span>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14}}>
        <div style={S.kpi('#0B1E3D')}><div style={S.kpiL}>Clientes</div><div style={S.kpiV('#0B1E3D')}>{clients.length}</div></div>
        <div style={S.kpi('#2451A0')}><div style={S.kpiL}>Agendamentos</div><div style={S.kpiV('#2451A0')}>{appts.length}</div></div>
        <div style={S.kpi('#059669')}><div style={S.kpiL}>Receita registrada</div><div style={S.kpiV('#059669')}>R${receita.toLocaleString('pt-BR')}</div></div>
      </div>

      {/* Plano e assinatura */}
      <div style={S.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:editPlan?14:0}}>
          <div style={S.cH}>Plano e assinatura</div>
          {!editPlan && <button onClick={()=>setEditPlan(true)} style={S.btn('#2451A0','#DBEAFE','#93C5FD')}>Editar plano</button>}
        </div>

        {!editPlan ? (
          <div>
            {[['Plano atual',PLANOS[salon.plan||'trial']||salon.plan],['Período',PERIODOS[salon.billing_period||'monthly']||'—'],['Validade',expires?expires.toLocaleDateString('pt-BR'):'Sem data'],['Dias restantes',diasR!==null?(diasR<0?'Expirado':`${diasR} dias`):'—']].map(([l,v])=>(
              <div key={l} style={S.row}><span style={S.lbl}>{l}</span><span style={{...S.val, color: l==='Dias restantes'&&diasR<7?'#DC2626':'#0B1E3D'}}>{v}</span></div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8}}>Plano</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14}}>
              {Object.entries(PLANOS).map(([k,v])=>(
                <div key={k} style={S.planBox(planForm.plan===k)} onClick={()=>setPlanForm(f=>({...f,plan:k}))}>
                  <div style={{fontSize:11, fontWeight:800, color:PLANO_C[k], marginBottom:2}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8}}>Período de cobrança</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14}}>
              {[['monthly','Mensal','30 dias'],['quarterly','Trimestral','90 dias · ~17% desc.'],['annual','Anual','365 dias · ~33% desc.']].map(([k,l,d])=>(
                <div key={k} style={S.planBox(planForm.billing_period===k)} onClick={()=>setPlanForm(f=>({...f,billing_period:k}))}>
                  <div style={{fontSize:13, fontWeight:800, color:'#0B1E3D', marginBottom:3}}>{l}</div>
                  <div style={{fontSize:10, color:'#64748B'}}>{d}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#EFF6FF', borderRadius:9, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#1E3A5F'}}>
              Validade: <strong>{new Date(calcExpiry(planForm.billing_period)).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</strong> ({DIAS_P[planForm.billing_period]} dias a partir de hoje)
            </div>
            <div style={{display:'flex', gap:8}}>
              <button onClick={savePlan} disabled={saving.plan} style={S.btn('#fff','#0B1E3D','transparent')}>
                {saving.plan?'Salvando...':'Ativar plano'}
              </button>
              <button onClick={()=>setEditPlan(false)} style={S.btn('#64748B','#fff','#E2E8F0')}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Email e acesso */}
      <div style={S.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:editEmail?14:0}}>
          <div style={S.cH}>Email e acesso</div>
          {!editEmail && <button onClick={()=>setEditEmail(true)} style={S.btn('#2451A0','#DBEAFE','#93C5FD')}>Alterar email / senha</button>}
        </div>
        {!editEmail ? (
          <div>
            <div style={S.row}><span style={S.lbl}>Owner ID</span><span style={{...S.val, fontFamily:'monospace', fontSize:11}}>{salon.owner_id?.slice(0,20)}...</span></div>
            <div style={{...S.row, borderBottom:'none'}}><span style={S.lbl}>Plano</span><span style={S.val}>{PLANOS[salon.plan||'trial']}</span></div>
          </div>
        ) : (
          <div>
            <label style={{display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px'}}>Novo e-mail *</label>
            <input style={S.inp} type="email" placeholder="novo@email.com" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} />
            <label style={{display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginTop:10}}>
              Nova senha <span style={{fontWeight:400, textTransform:'none', color:'#94A3B8'}}>(vazio = mantém atual)</span>
            </label>
            <input style={S.inp} type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button onClick={salvarEmail} disabled={saving.email} style={S.btn('#fff','#0B1E3D','transparent')}>
                {saving.email?'Salvando...':'Salvar alterações'}
              </button>
              <button onClick={()=>{setEditEmail(false);setNovoEmail('');setNovaSenha('')}} style={S.btn('#64748B','#fff','#E2E8F0')}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Dados */}
      <div style={S.card}>
        <div style={S.cH}>Dados cadastrais</div>
        {[['Nome',salon.name],['Telefone',salon.phone||'—'],['Cidade',salon.city||'—'],['Endereço',salon.address||'—'],['Status',excluido?'Excluído':ativo?'Ativo':'Suspenso'],['Cadastro em',salon.created_at?new Date(salon.created_at).toLocaleDateString('pt-BR'):'—']].map(([l,v])=>(
          <div key={l} style={S.row}><span style={S.lbl}>{l}</span><span style={S.val}>{v}</span></div>
        ))}
      </div>

      {/* Agendamentos */}
      <div style={S.card}>
        <div style={S.cH}>Últimos agendamentos</div>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr>{['Cliente','Serviço','Data','Valor','Pagamento','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {appts.map(a=>{
              const dt = a.date?new Date(a.date):null
              return (
                <tr key={a.id}>
                  <td style={S.td}>{a.client_name}</td>
                  <td style={S.td}>{a.service_name||'—'}</td>
                  <td style={S.td}>{dt?`${dt.getDate()}/${dt.getMonth()+1} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`:'—'}</td>
                  <td style={{...S.td, color:'#059669', fontWeight:700}}>{a.value?`R$${a.value}`:'—'}</td>
                  <td style={{...S.td, color:'#64748B'}}>{a.payment_method||'—'}</td>
                  <td style={S.td}><span style={{fontSize:11, color:STATUS_A[a.status]||'#64748B', fontWeight:700}}>{a.status}</span></td>
                </tr>
              )
            })}
            {appts.length===0&&<tr><td colSpan={6} style={{...S.td, textAlign:'center', color:'#94A3B8', padding:20}}>Sem agendamentos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
