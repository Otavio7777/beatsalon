'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'

const PLANOS = {
  individual: {
    label:'Individual', cor:'#059669', bg:'#D1FAE5', bd:'#6EE7B7',
    desc:'Para MEI e barbeiros autônomos',
    limite_barbeiros:1,
    features:['1 barbeiro','Agenda própria','CRM básico','Link de agendamento','Mensagens WhatsApp','Agendamento online'],
  },
  equipe: {
    label:'Equipe', cor:'#2451A0', bg:'#DBEAFE', bd:'#93C5FD',
    desc:'Para barbearias com até 4 barbeiros',
    limite_barbeiros:4,
    features:['Até 4 barbeiros','Login individual por barbeiro','Dashboard gerencial','Comissões por barbeiro','Relatórios de performance','Link geral de agendamento','Vendas de produtos'],
  },
  supremo: {
    label:'Supremo', cor:'#7C3AED', bg:'#EDE9FE', bd:'#C4B5FD',
    desc:'Para barbearias de grande porte',
    limite_barbeiros:10,
    features:['Até 10 barbeiros','Tudo do Equipe','Relatórios avançados','Suporte prioritário','Multi-unidade em breve'],
  },
  trial: {
    label:'Trial', cor:'#D97706', bg:'#FEF3C7', bd:'#FCD34D',
    desc:'Período gratuito de avaliação',
    limite_barbeiros:1,
    features:['1 barbeiro','Funcionalidades básicas','14 dias gratuitos'],
  },
}
const PERIODOS = { monthly:{label:'Mensal',dias:30}, quarterly:{label:'Trimestral',dias:90}, annual:{label:'Anual',dias:365} }
const STATUS_A = { agendado:'#2451A0', concluido:'#059669', cancelado:'#DC2626', faltou:'#D97706' }

const S = {
  card:{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'20px', marginBottom:14 },
  h:   { fontSize:15, fontWeight:800, color:'#0B1E3D', marginBottom:12 },
  row: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 },
  lbl: { color:'#64748B' },
  val: { color:'#0B1E3D', fontWeight:600, fontSize:12 },
  inp: { width:'100%', padding:'9px 14px', borderRadius:9, border:'1px solid #E2E8F0', fontSize:14, color:'#0B1E3D', outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginTop:5 },
  btn: (c,bg,bd)=>({ padding:'8px 16px', borderRadius:9, border:`1px solid ${bd||c+'33'}`, background:bg, color:c, fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }),
  kpi: (c)=>({ background:'#fff', border:`1px solid #E2E8F0`, borderRadius:12, padding:'14px 16px', borderTop:`3px solid ${c}` }),
}

export default function ContratoDetalhe({ params }) {
  const { id } = params
  const [salon,    setSalon]    = useState(null)
  const [clients,  setClients]  = useState([])
  const [appts,    setAppts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState({})
  const [msg,      setMsg]      = useState(null)
  const [editEmail,setEditEmail]= useState(false)
  const [editPlan, setEditPlan] = useState(false)
  const [novoEmail,setNovoEmail]= useState('')
  const [novaSenha,setNovaSenha]= useState('')
  const [planForm, setPlanForm] = useState({ plan:'trial', billing_period:'monthly' })
  const sb = createClient()

  const load = async () => {
    const [{ data:s },{ data:cl },{ data:ap }] = await Promise.all([
      sb.from('salons').select('*').eq('id',id).single(),
      sb.from('clients').select('id').eq('salon_id',id),
      sb.from('appointments').select('*').eq('salon_id',id).order('date',{ascending:false}).limit(10),
    ])
    setSalon(s); setClients(cl||[]); setAppts(ap||[])
    if (s) setPlanForm({ plan:s.plan||'trial', billing_period:s.billing_period||'monthly' })
    setLoading(false)
  }
  useEffect(()=>{ load() },[id])

  const showMsg = (ok,text) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3500) }
  const calcExpiry = (p) => { const d=new Date(); d.setDate(d.getDate()+(PERIODOS[p]?.dias||30)); return d.toISOString() }

  const toggleAtivo = async () => {
    setSaving(s=>({...s,toggle:true}))
    const novo = salon.is_active===false
    await sb.rpc('admin_toggle_salon_status',{p_salon_id:id,p_is_active:novo}).catch(()=>
      sb.from('salons').update({is_active:novo}).eq('id',id)
    )
    await load(); setSaving(s=>({...s,toggle:false}))
    showMsg(true, novo?'Contrato reativado.':'Contrato suspenso.')
  }

  const excluir = async () => {
    if (!confirm(`Excluir "${salon.name}"?`)) return
    await sb.from('salons').update({deleted_at:new Date().toISOString(),is_active:false}).eq('id',id)
    window.location.href='/admin/contratos'
  }

  const savePlan = async () => {
    setSaving(s=>({...s,plan:true}))
    const exp = calcExpiry(planForm.billing_period)
    await sb.from('salons').update({
      plan: planForm.plan,
      billing_period: planForm.billing_period,
      plan_expires_at: exp,
    }).eq('id',id)
    await load(); setSaving(s=>({...s,plan:false})); setEditPlan(false)
    showMsg(true,`Plano ${PLANOS[planForm.plan]?.label} ${PERIODOS[planForm.billing_period]?.label} ativo até ${new Date(exp).toLocaleDateString('pt-BR')}.`)
  }

  const salvarEmail = async () => {
    if (!novoEmail.includes('@')) { showMsg(false,'E-mail inválido.'); return }
    setSaving(s=>({...s,email:true}))
    const tk = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')||'{}')?.access_token
    const payload = { email:novoEmail, email_confirm:true }
    if (novaSenha.length>=6) payload.password=novaSenha
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/plhbpzpzyqrfkhujerar/auth/users/${salon.owner_id}`,{
        method:'PUT', headers:{'Authorization':'Bearer '+tk,'Content-Type':'application/json'}, body:JSON.stringify(payload)
      })
      const d=await r.json(); if(d.error||d.msg) throw new Error(d.msg||d.error)
      setEditEmail(false); setNovoEmail(''); setNovaSenha('')
      showMsg(true,'Acesso atualizado.')
    } catch(e) { showMsg(false,e.message||'Erro.') }
    setSaving(s=>({...s,email:false}))
  }

  const entrarManutencao = () => {
    sessionStorage.setItem('ms_maintenance', JSON.stringify({salonId:id,salonName:salon.name,timestamp:Date.now()}))
    window.location.href='/dashboard'
  }

  if (loading) return <div style={{color:'#64748B',padding:40,textAlign:'center'}}>Carregando...</div>
  if (!salon) return <div style={{color:'#0B1E3D',padding:40}}>Não encontrado. <Link href="/admin/contratos" style={{color:'#2451A0'}}>← Voltar</Link></div>

  const ativo    = salon.is_active!==false && !salon.deleted_at
  const excluido = !!salon.deleted_at
  const plano    = PLANOS[salon.plan||'trial'] || PLANOS.trial
  const expires  = salon.plan_expires_at ? new Date(salon.plan_expires_at) : null
  const diasR    = expires ? Math.ceil((expires.getTime()-Date.now())/86400000) : null
  const receita  = appts.filter(a=>a.status==='concluido').reduce((s,a)=>s+(a.value||0),0)

  return (
    <div>
      <Link href="/admin/contratos" style={{display:'inline-flex',alignItems:'center',gap:6,color:'#64748B',fontSize:13,textDecoration:'none',marginBottom:20}}>
        ← Contratos
      </Link>

      {msg&&<div style={{padding:'9px 14px',borderRadius:9,marginBottom:14,fontSize:13,fontWeight:600,
        background:msg.ok?'#D1FAE5':'#FEE2E2',color:msg.ok?'#065F46':'#991B1B',
        border:`1px solid ${msg.ok?'#6EE7B7':'#FCA5A5'}`}}>{msg.text}</div>}

      {/* Header */}
      <div style={{...S.card,display:'flex',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
        <div style={{width:56,height:56,borderRadius:14,background:'#0B1E3D',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,flexShrink:0}}>
          {salon.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:3}}>{salon.name}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:10}}>
            <span style={{fontSize:12,padding:'3px 10px',borderRadius:20,fontWeight:700,background:plano.bg,color:plano.cor,border:`1px solid ${plano.bd}`}}>
              {plano.label}
            </span>
            <span style={{fontSize:12,color:'#64748B'}}>{salon.city||'Sem cidade'}</span>
            {expires&&<span style={{fontSize:11,color:diasR<7?'#DC2626':'#64748B'}}>· Vence em {diasR}d</span>}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={entrarManutencao} style={S.btn('#B45309','#FEF3C7','#FCD34D')}>Acessar como manutenção</button>
            {!excluido&&<button onClick={toggleAtivo} disabled={saving.toggle} style={S.btn(ativo?'#DC2626':'#059669',ativo?'#FEF2F2':'#ECFDF5',ativo?'#FCA5A5':'#6EE7B7')}>
              {saving.toggle?'...' : ativo?'Suspender':'Reativar'}
            </button>}
            <button onClick={excluir} style={S.btn('#DC2626','#FEF2F2','#FCA5A5')}>Excluir</button>
          </div>
        </div>
        <span style={{fontSize:12,padding:'5px 14px',borderRadius:20,fontWeight:700,
          background:excluido?'#F1F5F9':ativo?'#D1FAE5':'#FEE2E2',
          color:excluido?'#64748B':ativo?'#065F46':'#991B1B',
          border:`1px solid ${excluido?'#CBD5E1':ativo?'#6EE7B7':'#FCA5A5'}`}}>
          {excluido?'Excluído':ativo?'Ativo':'Suspenso'}
        </span>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
        <div style={S.kpi('#0B1E3D')}><div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',marginBottom:6}}>Clientes</div><div style={{fontSize:22,fontWeight:800,color:'#0B1E3D'}}>{clients.length}</div></div>
        <div style={S.kpi('#2451A0')}><div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',marginBottom:6}}>Agendamentos</div><div style={{fontSize:22,fontWeight:800,color:'#2451A0'}}>{appts.length}</div></div>
        <div style={S.kpi('#059669')}><div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',marginBottom:6}}>Receita</div><div style={{fontSize:22,fontWeight:800,color:'#059669'}}>R${receita.toLocaleString('pt-BR')}</div></div>
      </div>

      {/* Plano e assinatura — ATUALIZAÇÃO AUTOMÁTICA NA PLATAFORMA */}
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:editPlan?16:0}}>
          <div style={S.h}>Plano e assinatura</div>
          {!editPlan&&<button onClick={()=>setEditPlan(true)} style={S.btn('#2451A0','#DBEAFE','#93C5FD')}>Alterar plano</button>}
        </div>

        {!editPlan ? (
          <div>
            {/* Info do plano atual */}
            <div style={{padding:'12px 14px',background:plano.bg,borderRadius:12,border:`1px solid ${plano.bd}`,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:plano.cor}}>{plano.label}</div>
                  <div style={{fontSize:12,color:'#64748B',marginTop:2}}>{plano.desc}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12,color:'#64748B'}}>Até {plano.limite_barbeiros} barbeiro{plano.limite_barbeiros>1?'s':''}</div>
                  <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{PERIODOS[salon.billing_period||'monthly']?.label}</div>
                </div>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {plano.features.map(f=>(
                  <span key={f} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'rgba(0,0,0,.06)',color:plano.cor,fontWeight:600}}>✓ {f}</span>
                ))}
              </div>
            </div>
            {[
              ['Período',PERIODOS[salon.billing_period||'monthly']?.label||'Mensal'],
              ['Validade',expires?expires.toLocaleDateString('pt-BR'):'Sem validade'],
              ['Dias restantes',diasR!==null?(diasR<0?'Expirado':`${diasR} dias`):'—'],
            ].map(([l,v])=>(
              <div key={l} style={S.row}><span style={S.lbl}>{l}</span><span style={S.val}>{v}</span></div>
            ))}
          </div>
        ) : (
          <div>
            {/* Seletor de planos */}
            <div style={{fontSize:12,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Tipo de plano</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {Object.entries(PLANOS).map(([k,p])=>{
                const sel = planForm.plan===k
                return (
                  <div key={k} onClick={()=>setPlanForm(f=>({...f,plan:k}))}
                    style={{padding:'14px',borderRadius:12,border:`2px solid ${sel?p.cor:'#E2E8F0'}`,
                      background:sel?p.bg:'#fff',cursor:'pointer',transition:'all .15s'}}>
                    <div style={{fontWeight:800,fontSize:14,color:p.cor,marginBottom:3}}>{p.label}</div>
                    <div style={{fontSize:11,color:'#64748B',marginBottom:6}}>{p.desc}</div>
                    <div style={{fontSize:10,color:p.cor,fontWeight:700}}>Até {p.limite_barbeiros} barbeiro{p.limite_barbeiros>1?'s':''}</div>
                    {sel&&<div style={{fontSize:10,color:p.cor,marginTop:4}}>✓ {p.features.length} funcionalidades</div>}
                  </div>
                )
              })}
            </div>

            {/* Período */}
            <div style={{fontSize:12,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Período</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
              {Object.entries(PERIODOS).map(([k,{label,dias}])=>{
                const sel=planForm.billing_period===k
                return (
                  <div key={k} onClick={()=>setPlanForm(f=>({...f,billing_period:k}))}
                    style={{padding:'10px',borderRadius:10,border:`2px solid ${sel?'#0B1E3D':'#E2E8F0'}`,
                      background:sel?'#0B1E3D':'#fff',cursor:'pointer',textAlign:'center'}}>
                    <div style={{fontSize:13,fontWeight:800,color:sel?'#fff':'#0B1E3D'}}>{label}</div>
                    <div style={{fontSize:10,color:sel?'rgba(255,255,255,.6)':'#94A3B8'}}>{dias} dias</div>
                  </div>
                )
              })}
            </div>

            {/* Preview features do plano selecionado */}
            {planForm.plan && PLANOS[planForm.plan] && (
              <div style={{background:'#F8FAFC',borderRadius:10,padding:'12px 14px',marginBottom:14,border:'1px solid #E2E8F0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',marginBottom:6}}>
                  Funcionalidades do {PLANOS[planForm.plan].label}
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {PLANOS[planForm.plan].features.map(f=>(
                    <span key={f} style={{fontSize:11,padding:'3px 9px',borderRadius:6,background:'#E2E8F0',color:'#475569',fontWeight:600}}>✓ {f}</span>
                  ))}
                </div>
                <div style={{fontSize:11,color:'#94A3B8',marginTop:8}}>
                  Validade: <strong style={{color:'#0B1E3D'}}>{new Date(calcExpiry(planForm.billing_period)).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</strong>
                  <span style={{marginLeft:8}}>· A mudança é aplicada imediatamente na plataforma do cliente.</span>
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:8}}>
              <button onClick={savePlan} disabled={saving.plan}
                style={{flex:1,...S.btn('#fff','#0B1E3D','transparent'),justifyContent:'center',padding:'10px'}}>
                {saving.plan?'Aplicando...':'Aplicar plano agora'}
              </button>
              <button onClick={()=>setEditPlan(false)} style={S.btn('#64748B','#fff','#E2E8F0')}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Email */}
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:editEmail?14:0}}>
          <div style={S.h}>Email e acesso</div>
          {!editEmail&&<button onClick={()=>setEditEmail(true)} style={S.btn('#2451A0','#DBEAFE','#93C5FD')}>Alterar</button>}
        </div>
        {!editEmail ? (
          <div>
            <div style={S.row}><span style={S.lbl}>Owner ID</span><span style={{...S.val,fontFamily:'monospace',fontSize:11}}>{salon.owner_id?.slice(0,22)}...</span></div>
          </div>
        ) : (
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#64748B',display:'block'}}>Novo e-mail *</label>
            <input style={S.inp} type="email" placeholder="novo@email.com" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} />
            <label style={{fontSize:11,fontWeight:700,color:'#64748B',display:'block',marginTop:10}}>
              Nova senha <span style={{fontWeight:400,color:'#94A3B8'}}>(vazio = manter)</span>
            </label>
            <input style={S.inp} type="password" placeholder="Mín. 6 caracteres" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={salvarEmail} disabled={saving.email} style={{flex:1,...S.btn('#fff','#0B1E3D','transparent'),justifyContent:'center'}}>
                {saving.email?'Salvando...':'Salvar'}
              </button>
              <button onClick={()=>{setEditEmail(false);setNovoEmail('');setNovaSenha('')}} style={S.btn('#64748B','#fff','#E2E8F0')}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Dados + Agendamentos */}
      <div style={S.card}>
        <div style={S.h}>Dados cadastrais</div>
        {[['Nome',salon.name],['Cidade',salon.city||'—'],['Telefone',salon.phone||'—'],['Status',excluido?'Excluído':ativo?'Ativo':'Suspenso'],['Cadastro',salon.created_at?new Date(salon.created_at).toLocaleDateString('pt-BR'):'—']].map(([l,v])=>(
          <div key={l} style={S.row}><span style={S.lbl}>{l}</span><span style={S.val}>{v}</span></div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.h}>Últimos agendamentos</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Cliente','Serviço','Data','Valor','Pag.','Status'].map(h=><th key={h} style={{padding:'7px 10px',fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',textAlign:'left',background:'#F8FAFC',borderBottom:'2px solid #E2E8F0'}}>{h}</th>)}</tr></thead>
          <tbody>
            {appts.map(a=>{
              const dt=a.date?new Date(a.date):null
              return (
                <tr key={a.id}>
                  <td style={{padding:'9px 10px',fontSize:12,color:'#1E293B',borderBottom:'1px solid #F1F5F9'}}>{a.client_name}</td>
                  <td style={{padding:'9px 10px',fontSize:12,color:'#64748B',borderBottom:'1px solid #F1F5F9'}}>{a.service_name||'—'}</td>
                  <td style={{padding:'9px 10px',fontSize:11,color:'#64748B',borderBottom:'1px solid #F1F5F9'}}>{dt?`${dt.getDate()}/${dt.getMonth()+1} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`:'—'}</td>
                  <td style={{padding:'9px 10px',fontSize:12,color:'#059669',fontWeight:700,borderBottom:'1px solid #F1F5F9'}}>{a.value?`R$${a.value}`:'—'}</td>
                  <td style={{padding:'9px 10px',fontSize:11,color:'#64748B',borderBottom:'1px solid #F1F5F9'}}>{a.payment_method||'—'}</td>
                  <td style={{padding:'9px 10px',fontSize:11,color:STATUS_A[a.status]||'#64748B',fontWeight:700,borderBottom:'1px solid #F1F5F9'}}>{a.status}</td>
                </tr>
              )
            })}
            {appts.length===0&&<tr><td colSpan={6} style={{textAlign:'center',color:'#94A3B8',padding:20,fontSize:12}}>Sem agendamentos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
