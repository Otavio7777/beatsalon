import { Users, Scissors, Mail, Smartphone, Key, Check, Eye, Link as LinkIcon } from '../../../lib/icons'
'use client'
import { useState, useEffect } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { bookingURL, barberSetupURL } from '../../../lib/config'
import { createClient } from '../../../lib/supabase'

const PLAN_LIMITS = {
  individual: 1, trial: 1, basic: 1,
  equipe: 4, pro: 4,
  supremo: 10, enterprise: 10,
}
const PLAN_NAMES = {
  individual:'Individual', trial:'Trial', equipe:'Equipe', supremo:'Supremo', pro:'Pro', basic:'Básico', enterprise:'Enterprise'
}
const COLORS = ['#1B3057','#059669','#7C3AED','#DC2626','#D97706','#0891B2','#BE185D','#065F46','#1D4ED8','#92400E']

function Avatar({ name, color='#1B3057', size=40 }) {
  const ini = (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
  return (
    <div style={{width:size,height:size,borderRadius:size/2,background:color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.35,fontWeight:800,flexShrink:0}}>
      {ini}
    </div>
  )
}

export default function EquipePage() {
  const { salon } = useSalon()
  const [barbers, setBarbers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding,  setAdding]    = useState(false)
  const [editing, setEditing]   = useState(null)
  const [msg,     setMsg]       = useState(null)
  const [form,    setForm]      = useState({
    name:'', email:'', phone:'', role:'barber',
    commission_type:'percentage', commission_value:40, color:'#1B3057',
  })
  const sb = createClient()

  const planLimit = PLAN_LIMITS[salon?.plan||'individual'] || 1
  const planName  = PLAN_NAMES[salon?.plan||'individual'] || 'Individual'
  const canAdd    = barbers.filter(b=>b.active).length < planLimit

  const load = async () => {
    if (!salon?.id) return
    setLoading(true)
    const { data } = await sb.from('barbers').select('*').eq('salon_id', salon.id).order('created_at')
    setBarbers(data||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [salon?.id])

  const showMsg = (ok, text) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),4000) }

  const save = async () => {
    if (!form.name.trim()) { showMsg(false,'Nome é obrigatório.'); return }
    if (!form.email.trim()||!form.email.includes('@')) { showMsg(false,'E-mail inválido.'); return }
    if (barbers.some(b=>b.email===form.email.trim()&&b.id!==editing)) { showMsg(false,'E-mail já cadastrado nesta equipe.'); return }

    const payload = {
      salon_id: salon.id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role,
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value)||0,
      color: form.color,
      active: true,
    }

    let error
    if (editing) {
      // Usa RPC SECURITY DEFINER para bypasear RLS
      const { error: e } = await sb.rpc('update_barber', {
        p_id: editing,
        p_name: form.name.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_phone: form.phone.trim(),
        p_role: form.role,
        p_commission_type: form.commission_type,
        p_commission_value: Number(form.commission_value)||0,
        p_color: form.color,
      })
      error = e
    } else {
      if (!canAdd) { showMsg(false, `Limite de ${planLimit} barbeiro${planLimit>1?'s':''} atingido. Faça upgrade do plano.`); return }
      const { error: e } = await sb.rpc('insert_barber', {
        p_salon_id: salon.id,
        p_name: form.name.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_phone: form.phone.trim(),
        p_role: form.role,
        p_commission_type: form.commission_type,
        p_commission_value: Number(form.commission_value)||0,
        p_color: form.color,
      })
      error = e
    }

    if (error) { showMsg(false, error.message); return }
    showMsg(true, editing ? 'Barbeiro atualizado.' : 'Barbeiro adicionado! Envie o link de acesso para ele.')
    setAdding(false); setEditing(null)
    setForm({ name:'', email:'', phone:'', role:'barber', commission_type:'percentage', commission_value:40, color:'#1B3057' })
    load()
  }

  const toggleActive = async (b) => {
    if (!b.active && !canAdd) { showMsg(false,'Limite de barbeiros atingido.'); return }
    await sb.rpc('toggle_barber_active', { p_id: b.id, p_active: !b.active })
    load()
  }

  const startEdit = (b) => {
    setForm({ name:b.name, email:b.email||'', phone:b.phone||'', role:b.role||'barber', commission_type:b.commission_type||'percentage', commission_value:b.commission_value||40, color:b.color||'#1B3057' })
    setEditing(b.id); setAdding(true)
  }

  const cancelForm = () => { setAdding(false); setEditing(null); setForm({ name:'', email:'', phone:'', role:'barber', commission_type:'percentage', commission_value:40, color:'#1B3057' }) }

  const setupLink  = (b) => barberSetupURL(salon?.id, b.email||'', b.name)
  const bookingLink = (b) => bookingURL(salon?.id, b.id)

  if (!salon) return <div className="pg" style={{color:'var(--muted)',textAlign:'center',padding:40}}>Carregando...</div>

  // Bloqueio para plano Individual
  if (planLimit <= 1) {
    return (
      <div className="pg">
        <div className="pg-hd"><div className="pg-h1">Minha Equipe</div></div>
        <div className="card" style={{textAlign:'center',padding:'40px 24px'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:12,opacity:.25}}><Users size={40}/></div>
          <div style={{fontSize:18,fontWeight:800,color:'var(--navy-900)',marginBottom:8}}>Disponível nos planos Equipe e Supremo</div>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:20,maxWidth:360,margin:'0 auto 20px'}}>
            Seu plano atual (<strong>{planName}</strong>) permite apenas 1 barbeiro. Faça upgrade para adicionar sua equipe, gerenciar comissões e ter logins individuais.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,maxWidth:400,margin:'0 auto'}}>
            {[
              {plan:'Equipe',limite:4,cor:'#2451A0',bg:'#DBEAFE',desc:'Até 4 barbeiros + dashboard gerencial + comissões'},
              {plan:'Supremo',limite:10,cor:'#7C3AED',bg:'#EDE9FE',desc:'Até 10 barbeiros + relatórios avançados + suporte prioritário'},
            ].map(p=>(
              <div key={p.plan} style={{padding:'16px',borderRadius:12,border:`2px solid ${p.cor}`,background:p.bg}}>
                <div style={{fontWeight:800,fontSize:16,color:p.cor,marginBottom:4}}>{p.plan}</div>
                <div style={{fontSize:12,color:'#475569',marginBottom:8}}>Até {p.limite} barbeiros</div>
                <div style={{fontSize:11,color:'#64748B'}}>{p.desc}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,fontSize:12,color:'var(--muted)'}}>Fale com o suporte para fazer o upgrade do seu plano.</div>
        </div>
      </div>
    )
  }

  const ativos = barbers.filter(b=>b.active).length

  return (
    <div className="pg">
      <div className="pg-hd" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
        <div>
          <div className="pg-h1">Minha Equipe</div>
          <div className="pg-sub">Gerencie os barbeiros, logins e comissões · Plano {planName}</div>
        </div>
        {!adding && (
          <button onClick={()=>setAdding(true)} disabled={!canAdd}
            className={canAdd?'btn-primary':'btn-ghost'}
            style={{display:'flex',alignItems:'center',gap:7,opacity:canAdd?1:.6}}>
            + Adicionar barbeiro
          </button>
        )}
      </div>

      {/* Limite e uso */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--navy-900)'}}>Uso do plano</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
              {ativos} de {planLimit} barbeiro{planLimit>1?'s':''} ativos · Plano {planName}
            </div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {Array.from({length:planLimit}).map((_,i)=>(
              <div key={i} style={{width:20,height:20,borderRadius:10,background:i<ativos?'var(--navy-600)':'var(--gray-200)',transition:'background .2s'}}/>
            ))}
          </div>
        </div>
        {!canAdd&&<div style={{marginTop:10,padding:'8px 12px',background:'var(--warning-light)',borderRadius:8,fontSize:12,color:'#92400E',fontWeight:600}}>
          Limite atingido. Para adicionar mais barbeiros, faça upgrade para o plano Supremo.
        </div>}
      </div>

      {/* Feedback */}
      {msg&&<div style={{padding:'9px 14px',borderRadius:9,marginBottom:14,fontSize:13,fontWeight:600,
        background:msg.ok?'var(--success-light)':'#FEE2E2',color:msg.ok?'var(--success)':'#DC2626',
        border:`1px solid ${msg.ok?'#6EE7B7':'#FCA5A5'}`}}>{msg.text}</div>}

      {/* Formulário de adição/edição */}
      {adding&&(
        <div className="card" style={{marginBottom:14,border:'2px solid var(--navy-200)'}}>
          <div style={{fontSize:15,fontWeight:800,color:'var(--navy-900)',marginBottom:14}}>
            {editing?'Editar barbeiro':'Novo barbeiro'}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}>
              <label className="inp-label">Nome completo *</label>
              <input className="inp-field" placeholder="João Silva" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div>
              <label className="inp-label">E-mail (para login) *</label>
              <input className="inp-field" type="email" placeholder="joao@email.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
              <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>Este e-mail será usado para fazer login no sistema</div>
            </div>
            <div>
              <label className="inp-label">WhatsApp</label>
              <input className="inp-field" placeholder="(31) 99999-0000" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
            </div>

            {/* Comissão */}
            <div>
              <label className="inp-label">Tipo de comissão</label>
              <select className="inp-field" value={form.commission_type} onChange={e=>setForm(f=>({...f,commission_type:e.target.value}))}>
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="inp-label">{form.commission_type==='percentage'?'Percentual (%)':'Valor por serviço (R$)'}</label>
              <input className="inp-field" type="number" min="0" max={form.commission_type==='percentage'?100:9999}
                value={form.commission_value} onChange={e=>setForm(f=>({...f,commission_value:e.target.value}))}/>
            </div>

            {/* Função */}
            <div>
              <label className="inp-label">Função</label>
              <select className="inp-field" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="barber">Barbeiro</option>
                <option value="manager">Gerente</option>
              </select>
            </div>

            {/* Cor no calendário */}
            <div>
              <label className="inp-label">Cor no calendário</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                {COLORS.map(c=>(
                  <div key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                    style={{width:24,height:24,borderRadius:12,background:c,cursor:'pointer',
                      border:form.color===c?'3px solid #0B1E3D':'2px solid transparent',
                      boxShadow:form.color===c?'0 0 0 1px #fff inset':'none',transition:'all .1s'}}/>
                ))}
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
            <button onClick={save} className="btn-primary" style={{flex:'1 1 140px',justifyContent:'center'}}>
              {editing?'Salvar alterações':'Adicionar à equipe'}
            </button>
            <button onClick={cancelForm} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de barbeiros */}
      {loading ? (
        <div className="card" style={{textAlign:'center',color:'var(--muted)',padding:32}}>Carregando...</div>
      ) : barbers.length===0 ? (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:10,opacity:.25}}><Scissors size={36}/></div>
          <div style={{fontSize:15,fontWeight:700,color:'var(--navy-900)',marginBottom:6}}>Nenhum barbeiro ainda</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Adicione os barbeiros da sua equipe para que cada um tenha seu próprio login e agenda.</div>
          <button onClick={()=>setAdding(true)} className="btn-primary">+ Adicionar primeiro barbeiro</button>
        </div>
      ) : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'2px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:800,color:'var(--navy-900)'}}>Barbeiros ({barbers.length})</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>{ativos} ativo{ativos!==1?'s':''}</div>
          </div>
          {barbers.map((b,i)=>{
            const commLabel = b.commission_type==='percentage' ? `${b.commission_value||0}%` : `R$${b.commission_value||0}`
            const link = accessLink(b)
            return (
              <div key={b.id} style={{padding:'16px 18px',borderBottom:i<barbers.length-1?'1px solid var(--gray-100)':'none',opacity:b.active?1:.55,transition:'opacity .2s'}}>
                <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                  <Avatar name={b.name} color={b.color||'#1B3057'}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                      <span style={{fontSize:14,fontWeight:800,color:'var(--navy-900)'}}>{b.name}</span>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:700,
                        background:b.role==='manager'?'var(--navy-50)':'var(--gray-100)',
                        color:b.role==='manager'?'var(--navy-700)':'var(--muted)'}}>
                        {b.role==='manager'?'Gerente':'Barbeiro'}
                      </span>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:700,
                        background:b.active?'var(--success-light)':'var(--gray-100)',
                        color:b.active?'var(--success)':'var(--muted)',
                        border:`1px solid ${b.active?'#6EE7B7':'var(--border)'}`}}>
                        {b.active?'Ativo':'Inativo'}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>
                      {b.email&&<span style={{marginRight:10,display:'inline-flex',alignItems:'center',gap:4}}><Mail size={10} color="#64748B"/> {b.email}</span>}
                      {b.phone&&<span style={{marginRight:10,display:'inline-flex',alignItems:'center',gap:4}}><Smartphone size={10} color="#64748B"/> {b.phone}</span>}
                      <span style={{color:'var(--navy-500)',fontWeight:600}}>Comissão: {commLabel}</span>
                    </div>
                    {/* Links do barbeiro */}
                    {b.active && (
                      <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:8}}>
                        {/* Link de agendamento personalizado */}
                        <div style={{padding:'8px 12px',background:'#ECFDF5',borderRadius:9,border:'1px solid #6EE7B7'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#065F46',marginBottom:4,display:'flex',alignItems:'center',gap:4}}><LinkIcon size={10} color="#065F46"/> Link de agendamento pessoal:</div>
                          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                            <code style={{fontSize:10,color:'#065F46',flex:1,wordBreak:'break-all',background:'#fff',padding:'4px 8px',borderRadius:6,border:'1px solid #6EE7B7'}}>
                              {bookingLink(b)}
                            </code>
                            <button onClick={()=>{ navigator.clipboard?.writeText(bookingLink(b)); showMsg(true,'Link de agendamento copiado!') }}
                              style={{padding:'4px 10px',borderRadius:7,border:'1px solid #6EE7B7',background:'#059669',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                              Copiar
                            </button>
                          </div>
                        </div>
                        {/* Link de setup (login) — só se ainda não configurou */}
                        {b.email && !b.user_id && (
                          <div style={{padding:'8px 12px',background:'var(--navy-50)',borderRadius:9,border:'1px solid var(--navy-200)'}}>
                            <div style={{fontSize:11,fontWeight:700,color:'var(--navy-700)',marginBottom:4,display:'flex',alignItems:'center',gap:4}}><Key size={10} color="var(--navy-700)"/> Link para criar senha (envie UMA vez):</div>
                            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                              <code style={{fontSize:10,color:'var(--navy-600)',flex:1,wordBreak:'break-all',background:'#fff',padding:'4px 8px',borderRadius:6,border:'1px solid var(--navy-200)'}}>
                                {setupLink(b)}
                              </code>
                              <button onClick={()=>{ navigator.clipboard?.writeText(setupLink(b)); showMsg(true,'Link copiado!') }}
                                style={{padding:'4px 10px',borderRadius:7,border:'1px solid var(--navy-200)',background:'var(--navy-600)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                                Copiar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {b.user_id && (
                      <div style={{marginTop:4,fontSize:11,color:'var(--success)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}><Check size={11} color="var(--success)"/> Conta criada — acesso ativo</div>
                    )}
                  </div>
                  {/* Ações */}
                  <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap'}}>
                    {b.active&&b.user_id&&<button onClick={()=>{
                      sessionStorage.setItem('ms_barber_view',JSON.stringify({barberId:b.id,barberName:b.name,salonId:salon?.id,timestamp:Date.now()}))
                      window.location.href='/dashboard'
                    }} style={{padding:'5px 10px',borderRadius:8,border:'1px solid #C4B5FD',background:'#F5F3FF',color:'#5B21B6',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                      <Eye size={12} color="currentColor" style={{marginRight:4}}/> Ver como
                    </button>}
                    <button onClick={()=>startEdit(b)}
                      style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--white)',color:'var(--muted)',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      Editar
                    </button>
                    <button onClick={()=>toggleActive(b)}
                      style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${b.active?'#FCA5A5':'#6EE7B7'}`,
                        background:b.active?'#FEF2F2':'#ECFDF5',color:b.active?'#DC2626':'#059669',
                        fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      {b.active?'Desativar':'Reativar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Instruções */}
      <div className="card" style={{marginTop:14,background:'var(--navy-50)',border:'1px solid var(--navy-200)'}}>
        <div style={{fontSize:13,fontWeight:800,color:'var(--navy-800)',marginBottom:8}}>Como funciona o acesso dos barbeiros</div>
        {[
          ['1. Adicionar','Cadastre o barbeiro com nome e e-mail'],
          ['2. Enviar link','Copie e envie o link de acesso para o barbeiro'],
          ['3. Criar senha','O barbeiro acessa o link e cria sua própria senha'],
          ['4. Acessar','O barbeiro entra em '+( typeof window!=='undefined'?window.location.origin:'beatsalon.vercel.app')+'/login com seu e-mail'],
          ['5. Ver agenda','O barbeiro vê apenas a própria agenda e clientes'],
        ].map(([t,d])=>(
          <div key={t} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:'1px solid var(--navy-200)'}}>
            <div style={{fontSize:11,fontWeight:800,color:'var(--navy-600)',width:80,flexShrink:0}}>{t}</div>
            <div style={{fontSize:11,color:'var(--navy-700)'}}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
