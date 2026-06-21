'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'
import { useSalon } from '../../../../lib/useSalon'
import { ArrowLeft, Settings, Check, X, AlertCircle } from '../../../../lib/icons'

const PLANOS  = { trial:'Trial', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }
const PLANO_COR = { trial:'#D97706', basic:'#2451A0', pro:'#7C3AED', enterprise:'#059669' }
const PERIODOS = { monthly:'Mensal', quarterly:'Trimestral', annual:'Anual' }
const DIAS_PERIODO = { monthly:30, quarterly:90, annual:365 }
const STATUS_C = { agendado:'#3B82F6', concluido:'#059669', cancelado:'#DC2626', faltou:'#D97706' }

function calcExpiry(period) {
  const d = new Date()
  d.setDate(d.getDate() + (DIAS_PERIODO[period] || 30))
  return d.toISOString()
}

export default function ContratoDetalhe({ params }) {
  const { id }   = params
  const { adminLevel } = useSalon()
  const [data,   setData]   = useState(null)
  const [loading,setLoading]= useState(true)
  const [saving, setSaving] = useState({})
  const [msg,    setMsg]    = useState({ type:'', text:'' })

  // Estados de edição
  const [editEmail, setEditEmail]   = useState(false)
  const [novoEmail, setNovoEmail]   = useState('')
  const [novaSenha, setNovaSenha]   = useState('')

  const [editPlan, setEditPlan]     = useState(false)
  const [planForm, setPlanForm]     = useState({ plan:'trial', billing_period:'monthly' })

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

  const showMsg = (type, text) => {
    setMsg({type,text})
    setTimeout(()=>setMsg({type:'',text:''}), 3500)
  }

  const canEdit = adminLevel === 'gestor' || adminLevel === 'dev'
  const isGestor = adminLevel === 'gestor'

  /* Suspender / Reativar */
  const toggleAtivo = async () => {
    if (!canEdit) return
    setSaving(s=>({...s,toggle:true}))
    const novoStatus = data.salon.is_active === false ? true : false
    await sb.from('salons').update({ is_active:novoStatus }).eq('id',id)
    await load()
    setSaving(s=>({...s,toggle:false}))
    showMsg('ok', novoStatus ? 'Contrato reativado.' : 'Contrato suspenso.')
  }

  /* Excluir (soft delete) */
  const excluir = async () => {
    if (!isGestor) return
    if (!window.confirm(`Excluir permanentemente o contrato "${data.salon.name}"? Esta ação não pode ser desfeita.`)) return
    setSaving(s=>({...s,del:true}))
    await sb.from('salons').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id',id)
    window.location.href = '/admin/contratos'
  }

  /* Salvar plano + assinatura */
  const savePlan = async () => {
    if (!canEdit) return
    setSaving(s=>({...s,plan:true}))
    const expires = calcExpiry(planForm.billing_period)
    await sb.from('salons').update({
      plan: planForm.plan,
      billing_period: planForm.billing_period,
      plan_expires_at: expires,
    }).eq('id',id)
    await load()
    setSaving(s=>({...s,plan:false}))
    setEditPlan(false)
    showMsg('ok', `Plano ${PLANOS[planForm.plan]} ${PERIODOS[planForm.billing_period]} ativado até ${new Date(expires).toLocaleDateString('pt-BR')}.`)
  }

  /* Alterar email/senha */
  const salvarEmail = async () => {
    if (!canEdit) return
    if (!novoEmail.includes('@')) { showMsg('err','E-mail inválido.'); return }
    setSaving(s=>({...s,email:true}))
    const tk = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')||'{}')?.access_token
    const payload = { email:novoEmail, email_confirm:true }
    if (novaSenha.length>=6) payload.password = novaSenha
    try {
      const r = await fetch(
        `https://api.supabase.com/v1/projects/plhbpzpzyqrfkhujerar/auth/users/${data.salon.owner_id}`,
        { method:'PUT', headers:{'Authorization':'Bearer '+tk,'Content-Type':'application/json'}, body:JSON.stringify(payload) }
      )
      const d = await r.json()
      if (d.error||d.msg) throw new Error(d.msg||d.error)
      setEditEmail(false); setNovoEmail(''); setNovaSenha('')
      showMsg('ok','Acesso atualizado com sucesso.')
    } catch(e) { showMsg('err', e.message||'Erro ao atualizar.') }
    setSaving(s=>({...s,email:false}))
  }

  /* Entrar como manutenção */
  const entrarManutencao = () => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('ms_maintenance', JSON.stringify({
      salonId: id,
      salonName: data.salon.name,
      timestamp: Date.now(),
    }))
    window.location.href = '/dashboard'
  }

  if (loading) return <div style={{color:'rgba(255,255,255,.3)',padding:40,textAlign:'center'}}>Carregando...</div>
  if (!data?.salon) return <div style={{color:'#fff',padding:40}}>Não encontrado. <Link href="/admin/contratos" style={{color:'#6EE7B7'}}>← Voltar</Link></div>

  const { salon, clients, appts } = data
  const ativo   = salon.is_active !== false && !salon.deleted_at
  const excluido = !!salon.deleted_at
  const expires  = salon.plan_expires_at ? new Date(salon.plan_expires_at) : null
  const diasRestantes = expires ? Math.ceil((expires.getTime()-Date.now())/86400000) : null
  const receita  = appts.filter(a=>a.status==='concluido').reduce((s,a)=>s+(a.value||0),0)

  const s = {
    card:{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'20px',marginBottom:14 },
    h:   { fontSize:14,fontWeight:800,color:'#fff',marginBottom:12 },
    row: { display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:13 },
    lbl: { color:'rgba(255,255,255,.35)' },
    val: { color:'rgba(255,255,255,.8)',fontWeight:600,textAlign:'right',maxWidth:'60%',wordBreak:'break-all',fontSize:12 },
    inp: { width:'100%',padding:'9px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',marginTop:6 },
    btn: (color,bg) => ({ padding:'8px 16px',borderRadius:9,fontWeight:700,fontSize:12,cursor:'pointer',border:`1px solid ${color}33`,background:bg,color:color,transition:'all .15s',display:'inline-flex',alignItems:'center',gap:6 }),
    th:  { padding:'8px 12px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.25)',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,.05)',textAlign:'left' },
    td:  { padding:'9px 12px',fontSize:12,color:'rgba(255,255,255,.7)',borderBottom:'1px solid rgba(255,255,255,.04)' },
    planBox:(sel)=>({ padding:'10px 14px',borderRadius:10,border:`2px solid ${sel?'#2451A0':'rgba(255,255,255,.1)'}`,background:sel?'rgba(36,81,160,.15)':'rgba(255,255,255,.03)',cursor:'pointer',transition:'all .15s',textAlign:'center' }),
  }

  return (
    <div>
      <Link href="/admin/contratos" style={{color:'rgba(255,255,255,.4)',fontSize:13,textDecoration:'none',display:'flex',alignItems:'center',gap:6,marginBottom:16}}>
        <ArrowLeft size={13} color="rgba(255,255,255,.4)"/> Contratos
      </Link>

      {/* Mensagem feedback */}
      {msg.text && (
        <div style={{background:msg.type==='ok'?'rgba(5,150,105,.15)':'rgba(220,38,38,.15)',border:`1px solid ${msg.type==='ok'?'rgba(5,150,105,.3)':'rgba(220,38,38,.3)'}`,borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13,color:msg.type==='ok'?'#6EE7B7':'#FCA5A5',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
          {msg.type==='ok'?<Check size={14} color="#6EE7B7"/>:<AlertCircle size={14} color="#FCA5A5"/>} {msg.text}
        </div>
      )}

      {/* Header do contrato */}
      <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:20,flexWrap:'wrap'}}>
        {salon.logo_url ? (
          <img src={salon.logo_url} alt="" style={{width:56,height:56,borderRadius:14,objectFit:'cover',flexShrink:0}}/>
        ) : (
          <div style={{width:56,height:56,borderRadius:14,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#fff',fontWeight:800,flexShrink:0}}>
            {salon.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:3}}>{salon.name}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:10}}>
            {salon.city||'Sem cidade'} · {PLANOS[salon.plan||'trial']||salon.plan}
            {expires&&<span style={{marginLeft:8,fontSize:11,color:diasRestantes<7?'#FCA5A5':'rgba(255,255,255,.3)'}}>· vence em {diasRestantes}d</span>}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {/* Manutenção */}
            {!excluido&&<button onClick={entrarManutencao}
              style={s.btn('#FCD34D','rgba(245,158,11,.12)')}>
              <Settings size={13} color="#FCD34D"/> Acessar como manutenção
            </button>}

            {/* Suspender/Reativar */}
            {canEdit&&!excluido&&(
              <button onClick={toggleAtivo} disabled={saving.toggle}
                style={s.btn(ativo?'#FCA5A5':'#6EE7B7', ativo?'rgba(220,38,38,.1)':'rgba(5,150,105,.12)')}>
                {saving.toggle?'...' : ativo?'Suspender':'Reativar'}
              </button>
            )}

            {/* Excluir — só Gestor */}
            {isGestor&&!excluido&&(
              <button onClick={excluir} disabled={saving.del}
                style={s.btn('#F87171','rgba(220,38,38,.08)')}>
                {saving.del?'Excluindo...':'Excluir contrato'}
              </button>
            )}
          </div>
        </div>
        <span style={{fontSize:13,padding:'5px 14px',borderRadius:20,fontWeight:700,
          background:excluido?'rgba(100,116,139,.15)':ativo?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)',
          color:excluido?'#94A3B8':ativo?'#6EE7B7':'#FCA5A5',border:`1px solid ${excluido?'rgba(100,116,139,.2)':ativo?'rgba(5,150,105,.25)':'rgba(220,38,38,.25)'}`}}>
          {excluido?'Excluído':ativo?'Ativo':'Suspenso'}
        </span>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
        {[['Clientes',clients.length,''],['Agendamentos',appts.length,''],['Receita',`R$${receita.toLocaleString('pt-BR')}`,receita>0]].map(([l,v,green])=>(
          <div key={l} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'14px'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.3)',textTransform:'uppercase',fontWeight:700,marginBottom:4}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:green?'#6EE7B7':'#fff'}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Plano e assinatura */}
      <div style={s.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:editPlan?14:0}}>
          <div style={s.h}>Plano e assinatura</div>
          {!editPlan&&canEdit&&<button onClick={()=>setEditPlan(true)}
            style={s.btn('#6EE7B7','rgba(5,150,105,.08)')}>
            Editar plano
          </button>}
        </div>

        {!editPlan ? (
          <div>
            {[
              ['Plano atual', PLANOS[salon.plan||'trial']||salon.plan],
              ['Período', PERIODOS[salon.billing_period||'monthly']||'—'],
              ['Validade', expires?expires.toLocaleDateString('pt-BR'):'Sem data definida'],
              ['Dias restantes', diasRestantes!==null?(diasRestantes<0?'Expirado':`${diasRestantes} dias`):('Indefinido')],
            ].map(([l,v])=>(
              <div key={l} style={s.row}><span style={s.lbl}>{l}</span><span style={s.val}>{v}</span></div>
            ))}
          </div>
        ) : (
          <div>
            {/* Seleção de plano */}
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:10}}>Plano</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
              {Object.entries(PLANOS).map(([k,v])=>(
                <div key={k} style={s.planBox(planForm.plan===k)} onClick={()=>setPlanForm(f=>({...f,plan:k}))}>
                  <div style={{fontSize:10,fontWeight:800,color:PLANO_COR[k],marginBottom:2}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Período de cobrança */}
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:10}}>Período de cobrança</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              {Object.entries(PERIODOS).map(([k,v])=>{
                const dias = DIAS_PERIODO[k]
                const desconto = k==='quarterly'?'(~17% desc.)':k==='annual'?'(~33% desc.)':''
                return (
                  <div key={k} style={s.planBox(planForm.billing_period===k)} onClick={()=>setPlanForm(f=>({...f,billing_period:k}))}>
                    <div style={{fontSize:13,fontWeight:800,color:planForm.billing_period===k?'#fff':'rgba(255,255,255,.6)',marginBottom:2}}>{v}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>{dias} dias{desconto&&<><br/><span style={{color:'#6EE7B7',fontSize:9}}>{desconto}</span></>}</div>
                  </div>
                )
              })}
            </div>

            {/* Preview da validade */}
            <div style={{background:'rgba(36,81,160,.12)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'rgba(255,255,255,.6)'}}>
              Validade calculada: <strong style={{color:'#fff'}}>{new Date(calcExpiry(planForm.billing_period)).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</strong>
              <span style={{marginLeft:6,color:'rgba(255,255,255,.3)'}}>({DIAS_PERIODO[planForm.billing_period]} dias a partir de hoje)</span>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={savePlan} disabled={saving.plan}
                style={{...s.btn('#6EE7B7','rgba(5,150,105,.15)'), padding:'9px 20px'}}>
                <Check size={14} color="#6EE7B7"/> {saving.plan?'Salvando...':'Ativar plano'}
              </button>
              <button onClick={()=>setEditPlan(false)}
                style={{...s.btn('rgba(255,255,255,.4)','transparent'), padding:'9px 16px'}}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email e acesso */}
      <div style={s.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:editEmail?12:0}}>
          <div style={s.h}>Email e acesso</div>
          {!editEmail&&canEdit&&<button onClick={()=>setEditEmail(true)}
            style={s.btn('#6EE7B7','rgba(5,150,105,.08)')}>
            Alterar email / senha
          </button>}
        </div>

        {!editEmail ? (
          <div>
            <div style={s.row}><span style={s.lbl}>Owner ID</span><span style={{...s.val,fontFamily:'monospace'}}>{salon.owner_id?.slice(0,20)}...</span></div>
            <div style={{...s.row,borderBottom:'none'}}><span style={s.lbl}>Plano</span><span style={s.val}>{PLANOS[salon.plan||'trial']}</span></div>
          </div>
        ) : (
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',display:'block'}}>Novo e-mail *</label>
            <input style={s.inp} type="email" placeholder="novo@email.com" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} />
            <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',display:'block',marginTop:10}}>
              Nova senha <span style={{fontWeight:400,textTransform:'none',color:'rgba(255,255,255,.2)'}}>(vazio = mantém atual)</span>
            </label>
            <input style={s.inp} type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={salvarEmail} disabled={saving.email} style={{...s.btn('#6EE7B7','rgba(5,150,105,.12)'), padding:'9px 18px'}}>
                <Check size={14} color="#6EE7B7"/> {saving.email?'Salvando...':'Salvar'}
              </button>
              <button onClick={()=>{setEditEmail(false);setNovaSenha('');setNovoEmail('')}} style={{...s.btn('rgba(255,255,255,.4)','transparent'), padding:'9px 14px'}}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dados */}
      <div style={s.card}>
        <div style={s.h}>Dados cadastrais</div>
        {[['Nome',salon.name],['Telefone',salon.phone||'—'],['Cidade',salon.city||'—'],['Endereço',salon.address||'—'],['Status',excluido?'Excluído':ativo?'Ativo':'Suspenso'],['Criado em',salon.created_at?new Date(salon.created_at).toLocaleDateString('pt-BR'):'—']].map(([l,v])=>(
          <div key={l} style={s.row}><span style={s.lbl}>{l}</span><span style={s.val}>{v}</span></div>
        ))}
      </div>

      {/* Agendamentos */}
      <div style={s.card}>
        <div style={s.h}>Últimos agendamentos</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Cliente','Serviço','Data','Valor','Status'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {appts.map(a=>{
              const dt=a.date?new Date(a.date):null
              return (
                <tr key={a.id}>
                  <td style={s.td}>{a.client_name}</td>
                  <td style={s.td}>{a.service_name||'—'}</td>
                  <td style={s.td}>{dt?`${dt.getDate()}/${dt.getMonth()+1} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`:'—'}</td>
                  <td style={{...s.td,color:'#6EE7B7',fontWeight:700}}>{a.value?`R$${a.value}`:'—'}</td>
                  <td style={s.td}><span style={{color:STATUS_C[a.status]||'#aaa',fontWeight:600}}>{a.status}</span></td>
                </tr>
              )
            })}
            {appts.length===0&&<tr><td colSpan={5} style={{...s.td,textAlign:'center',color:'rgba(255,255,255,.2)',padding:20}}>Sem agendamentos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
