'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { useSalon } from '../../../../lib/useSalon'
import Link from 'next/link'


const NIVEIS_CRM = {
  novo:     { label:'Novo',     cor:'#64748B', bg:'#F1F5F9', bd:'#CBD5E1', icon:'🌱' },
  bronze:   { label:'Bronze',   cor:'#92400E', bg:'#FEF3C7', bd:'#FCD34D', icon:'🥉' },
  prata:    { label:'Prata',    cor:'#475569', bg:'#F1F5F9', bd:'#94A3B8', icon:'🥈' },
  ouro:     { label:'Ouro',     cor:'#B45309', bg:'#FFFBEB', bd:'#F59E0B', icon:'🥇' },
  diamante: { label:'Diamante', cor:'#6D28D9', bg:'#EDE9FE', bd:'#A78BFA', icon:'💎' },
  em_risco: { label:'Em risco', cor:'#DC2626', bg:'#FEF2F2', bd:'#FCA5A5', icon:'⚠️' },
}
function calcNivel(client) {
  if (!client) return 'novo'
  const visits = client.visit_count || 0
  const ltv    = parseFloat(client.ltv || 0)
  const lastStr = client.last_visit
  const diasSV  = lastStr ? Math.floor((Date.now()-new Date(lastStr+'T00:00').getTime())/86400000) : null
  if (visits > 0 && diasSV !== null && diasSV > 45) return 'em_risco'
  if (visits === 0) return 'novo'
  if (visits >= 16 || ltv >= 1000) return 'diamante'
  if (visits >= 9  || ltv >= 500)  return 'ouro'
  if (visits >= 4  || ltv >= 200)  return 'prata'
  return 'bronze'
}
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const STATUS_CFG = {
  ativo:    { bg:'#D1FAE5', color:'#065F46', label:'Ativo',    bd:'#6EE7B7' },
  em_risco: { bg:'#FEF3C7', color:'#92400E', label:'Em risco', bd:'#FCD34D' },
  inativo:  { bg:'#F1F5F9', color:'#64748B', label:'Inativo',  bd:'#CBD5E1' },
}
const STATUS_A = { agendado:'#2451A0', concluido:'#059669', cancelado:'#DC2626', faltou:'#D97706' }

function Avatar({ name, color='#1B3057', size=56 }) {
  const ini = (name||'?').trim().split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?'
  return (
    <div style={{width:size,height:size,borderRadius:size/2,background:color,color:'#fff',
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.33,fontWeight:800,flexShrink:0}}>
      {ini}
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  if (!value && value!==0) return null
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid #F1F5F9',fontSize:13}}>
      <span style={{color:'#64748B',fontWeight:500}}>{label}</span>
      <span style={{color:highlight||'#0B1E3D',fontWeight:600,textAlign:'right',maxWidth:'60%',wordBreak:'break-word'}}>{value}</span>
    </div>
  )
}

const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const FREQUENCIAS = { weekly:'Semanal', biweekly:'Quinzenal', monthly:'Mensal' }

function RecorrenciaCard({ clientId, salonId, clientName, services }) {
  const [recors,  setRecors]  = useState([])
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ frequency:'biweekly', day_of_week:1, time_slot:'09:00', service_name:'', service_value:'' })
  const [saving,  setSaving]  = useState(false)
  const sb = createClient()

  useEffect(() => {
    if (!clientId||!salonId) return
    sb.from('recurring_appointments').select('*').eq('client_id',clientId).eq('active',true)
      .then(({ data }) => setRecors(data||[]))
  },[clientId])

  const save = async () => {
    if (!form.time_slot) return
    setSaving(true)
    await sb.from('recurring_appointments').insert({
      salon_id:salonId, client_id:clientId, frequency:form.frequency,
      day_of_week:form.day_of_week, time_slot:form.time_slot,
      service_name:form.service_name, service_value:Number(form.service_value)||0, active:true,
    })
    // Gera os próximos 3 meses
    const appts = []
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const limite = new Date(hoje); limite.setMonth(limite.getMonth()+3)
    let cur = new Date(hoje)
    while (cur.getDay()!==Number(form.day_of_week)) cur.setDate(cur.getDate()+1)
    const step = form.frequency==='weekly'?7:form.frequency==='biweekly'?14:null
    while (cur<=limite) {
      appts.push({ salon_id:salonId, client_id:clientId, client_name:clientName,
        service_name:form.service_name||'Atendimento recorrente',
        date:`${cur.toISOString().slice(0,10)}T${form.time_slot}:00`,
        status:'agendado', value:Number(form.service_value)||0, notes:'Recorrente' })
      if (step) cur.setDate(cur.getDate()+step)
      else cur.setMonth(cur.getMonth()+1)
    }
    if (appts.length) await sb.from('appointments').insert(appts)
    setSaving(false); setAdding(false)
    const { data } = await sb.from('recurring_appointments').select('*').eq('client_id',clientId).eq('active',true)
    setRecors(data||[])
  }

  const INP = {width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',color:'#0B1E3D'}

  return (
    <div>
      {recors.length===0&&!adding&&(
        <div style={{textAlign:'center',color:'#94A3B8',padding:'12px 0',fontSize:12}}>Nenhuma recorrência configurada.</div>
      )}
      {recors.map(r=>(
        <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid #F1F5F9'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#0B1E3D'}}>{r.service_name||'Atendimento'}</div>
            <div style={{fontSize:11,color:'#64748B'}}>{FREQUENCIAS[r.frequency]} · {DIAS_SEMANA[r.day_of_week]} às {r.time_slot?.slice(0,5)}{r.service_value>0&&<span style={{color:'#059669',fontWeight:700,marginLeft:6}}>R${r.service_value}</span>}</div>
          </div>
          <button onClick={async()=>{ await sb.from('recurring_appointments').update({active:false}).eq('id',r.id); setRecors(x=>x.filter(i=>i.id!==r.id)) }}
            style={{padding:'4px 10px',borderRadius:7,border:'1px solid #E2E8F0',background:'#F8FAFC',color:'#94A3B8',fontSize:11,fontWeight:600,cursor:'pointer'}}>
            Cancelar
          </button>
        </div>
      ))}

      {!adding&&(
        <button onClick={()=>setAdding(true)}
          style={{marginTop:12,width:'100%',padding:'9px',borderRadius:10,border:'1.5px dashed #CBD5E1',background:'#F8FAFC',color:'#64748B',fontSize:12,fontWeight:700,cursor:'pointer'}}>
          + Adicionar recorrência
        </button>
      )}

      {adding&&(
        <div style={{marginTop:12,padding:'14px',background:'#F8FAFC',borderRadius:12,border:'1px solid #E2E8F0'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0B1E3D',marginBottom:12}}>Nova recorrência</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',display:'block',marginBottom:4}}>Frequência</label>
              <select style={INP} value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
                {Object.entries(FREQUENCIAS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',display:'block',marginBottom:4}}>Dia da semana</label>
              <select style={INP} value={form.day_of_week} onChange={e=>setForm(f=>({...f,day_of_week:Number(e.target.value)}))}>
                {DIAS_SEMANA.map((d,i)=><option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',display:'block',marginBottom:4}}>Horário</label>
              <input type="time" style={INP} value={form.time_slot} onChange={e=>setForm(f=>({...f,time_slot:e.target.value}))}/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',display:'block',marginBottom:4}}>Serviço</label>
              <input style={INP} placeholder="Ex: Corte" value={form.service_name} onChange={e=>setForm(f=>({...f,service_name:e.target.value}))}/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',display:'block',marginBottom:4}}>Valor (R$)</label>
              <input type="number" style={INP} placeholder="0" value={form.service_value} onChange={e=>setForm(f=>({...f,service_value:e.target.value}))}/>
            </div>
          </div>
          <div style={{fontSize:10,color:'#94A3B8',marginTop:8,marginBottom:12}}>Gera agendamentos para os próximos 3 meses automaticamente.</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={save} disabled={saving}
              style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:'#0B1E3D',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
              {saving?'Gerando...':'Criar recorrência'}
            </button>
            <button onClick={()=>setAdding(false)}
              style={{padding:'9px 14px',borderRadius:9,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:12,cursor:'pointer'}}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientePerfilPage() {
  const params = useParams()
  const { id }  = params
  const router  = useRouter()
  const { salon, isBarber, barberData } = useSalon()
  const [client,  setClient]  = useState(null)
  const [appts,   setAppts]   = useState([])
  const [barber,  setBarber]  = useState(null)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [tab,     setTab]     = useState('perfil')
  const sb = createClient()

  const load = async () => {
    const [{ data:cl },{ data:ap }] = await Promise.all([
      sb.from('clients').select('*').eq('id', id).single(),
      sb.from('appointments').select('*').eq('client_id', id).order('date',{ascending:false}).limit(20),
    ])
    setClient(cl); setAppts(ap||[])
    setForm(cl||{})
    if (cl?.last_barber_id) {
      const { data:br } = await sb.from('barbers').select('id,name,color').eq('id',cl.last_barber_id).single()
      setBarber(br||null)
    }
  }
  useEffect(() => { if (id) load() }, [id])

  const save = async () => {
    setSaving(true)
    await sb.from('clients').update(form).eq('id', id)
    await load(); setSaving(false); setEditing(false)
  }

  if (!client) return (
    <div className="pg" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}>
      <div style={{color:'#94A3B8',fontSize:14}}>Carregando...</div>
    </div>
  )

  const phone    = (client.phone||'').replace(/\D/g,'')
  const cfg      = STATUS_CFG[client.status||'ativo']||STATUS_CFG.ativo
  const totalLTV = appts.filter(a=>a.status==='concluido').reduce((s,a)=>s+(a.value||0),0)
  const visitas  = appts.filter(a=>a.status==='concluido').length

  const TABS = [['perfil','Ficha'],['historico','Histórico'],['recorrencia','Recorrência']]

  return (
    <div className="pg">
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <button onClick={()=>router.back()}
          style={{padding:'6px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
          ← Clientes
        </button>
      </div>

      {/* Cartão de identidade do cliente */}
      <div style={{background:'linear-gradient(135deg,#0B1E3D 0%,#1E3A6E 100%)',borderRadius:20,padding:'24px',marginBottom:16,position:'relative',overflow:'hidden'}}>
        {/* Pattern decorativo */}
        <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:60,background:'rgba(255,255,255,.04)'}}/>
        <div style={{position:'absolute',bottom:-20,right:40,width:80,height:80,borderRadius:40,background:'rgba(255,255,255,.03)'}}/>

        <div style={{display:'flex',gap:14,alignItems:'flex-start',position:'relative'}}>
          <Avatar name={client.name} color={client.avatar_color||'#1B3057'} size={60}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:4}}>{client.name}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
              {(() => { const nk=calcNivel(client); const n=NIVEIS_CRM[nk]; return (
                <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,background:n.bg,color:n.cor,border:`1px solid ${n.bd}`}}>
                  {n.icon} {n.label}
                </span>
              )})()}
              {barber&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,background:barber.color||'#1B3057',color:'#fff'}}>
                ✂️ {barber.name?.split(' ')[0]}
              </span>}
            </div>
            {phone&&<div style={{fontSize:12,color:'rgba(255,255,255,.6)',marginBottom:2}}>📱 {client.phone}</div>}
            {client.email&&<div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>✉️ {client.email}</div>}
          </div>
          {!isBarber&&(
            <button onClick={()=>setEditing(!editing)}
              style={{padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'rgba(255,255,255,.8)',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>
              {editing?'Cancelar':'Editar'}
            </button>
          )}
        </div>


        {/* Nível e progressão */}
        {(() => {
          const nk = calcNivel(client)
          const n  = NIVEIS_CRM[nk]
          const ordem = ['novo','bronze','prata','ouro','diamante']
          const idx = ordem.indexOf(nk)
          const pct = nk==='em_risco'?100 : idx < 0 ? 0 : (idx/(ordem.length-1))*100
          return (
            <div style={{marginTop:14,padding:'10px 14px',background:'rgba(255,255,255,.08)',borderRadius:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:11,color:'rgba(255,255,255,.5)',fontWeight:600}}>Nível {n.label}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{client.visit_count||0} visitas · R${parseFloat(client.ltv||0).toLocaleString('pt-BR')} LTV</span>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,.15)',borderRadius:2}}>
                <div style={{height:'100%',background:nk==='em_risco'?'#EF4444':nk==='diamante'?'#A78BFA':nk==='ouro'?'#F59E0B':'rgba(255,255,255,.6)',borderRadius:2,width:`${pct}%`,transition:'width .3s'}}/>
              </div>
              {nk!=='diamante'&&nk!=='em_risco'&&<div style={{fontSize:9,color:'rgba(255,255,255,.3)',marginTop:4}}>
                {nk==='novo'?'Faça 1 visita para Bronze':nk==='bronze'?'Mais 1 visita para Prata (4 total)':nk==='prata'?'Mais 1 visita para Ouro (9 total)':'Mais 1 visita para Diamante (16 total)'}
              </div>}
            </div>
          )
        })()}
        {/* KPIs rápidos */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:16}}>
          {[
            ['Visitas', visitas||client.visit_count||0, '#6EE7B7'],
            ['LTV Total', `R$${(totalLTV||client.ltv||0).toLocaleString('pt-BR')}`, '#FCD34D'],
            ['Última visita', client.last_visit?new Date(client.last_visit+'T00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—', 'rgba(255,255,255,.6)'],
          ].map(([l,v,c])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.5px',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:14,background:'#F1F5F9',borderRadius:12,padding:4}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{flex:1,padding:'8px',borderRadius:9,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',
              background:tab===k?'#fff':'transparent',color:tab===k?'#0B1E3D':'#64748B',
              boxShadow:tab===k?'0 1px 4px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Ficha */}
      {tab==='perfil'&&(
        <div>
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'18px',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:'#0B1E3D',marginBottom:12}}>Dados pessoais</div>
            {editing ? (
              <div>
                {[
                  ['Nome *','name','text','Nome completo'],
                  ['WhatsApp','phone','tel','(31) 99999-0000'],
                  ['E-mail','email','email','email@...'],
                  ['Aniversário','birth_date','date',''],
                ].map(([l,k,t,p])=>(
                  <div key={k} style={{marginBottom:10}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{l}</label>
                    <input type={t} placeholder={p} value={form[k]||''}
                      onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E2E8F0',fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit',color:'#0B1E3D'}}/>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <InfoRow label="Telefone" value={client.phone}/>
                <InfoRow label="E-mail" value={client.email}/>
                <InfoRow label="Aniversário" value={client.birth_date?new Date(client.birth_date+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}):null}/>
                <InfoRow label="Primeira visita" value={client.first_visit?new Date(client.first_visit+'T00:00').toLocaleDateString('pt-BR'):null}/>
                <InfoRow label="Como nos encontrou" value={client.referral_source}/>
              </div>
            )}
          </div>

          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'18px',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:'#0B1E3D',marginBottom:12}}>Preferências e perfil ✂️</div>
            {editing ? (
              <div>
                {[
                  ['Tipo de corte preferido','preferred_cut','Degradê na lateral, franja longa...'],
                  ['Alergias / Restrições','allergies','Ex: alergia a amônia...'],
                  ['Notas internas','notes_internal','Observações para a equipe...'],
                ].map(([l,k,p])=>(
                  <div key={k} style={{marginBottom:10}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{l}</label>
                    <textarea placeholder={p} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',color:'#0B1E3D',resize:'none',minHeight:60}}/>
                  </div>
                ))}
                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Status</label>
                  <select value={form.status||'ativo'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',color:'#0B1E3D'}}>
                    <option value="ativo">Ativo</option>
                    <option value="em_risco">Em risco</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                {client.preferred_cut ? (
                  <div style={{padding:'10px 14px',background:'#F8FAFC',borderRadius:10,border:'1px solid #E2E8F0',marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Tipo de corte</div>
                    <div style={{fontSize:13,color:'#0B1E3D',fontWeight:600}}>{client.preferred_cut}</div>
                  </div>
                ) : <div style={{fontSize:12,color:'#94A3B8',marginBottom:10}}>Nenhuma preferência registrada.</div>}
                {client.allergies&&(
                  <div style={{padding:'10px 14px',background:'#FEF3C7',borderRadius:10,border:'1px solid #FCD34D',marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#92400E',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>⚠️ Alergias / Atenção</div>
                    <div style={{fontSize:13,color:'#92400E',fontWeight:600}}>{client.allergies}</div>
                  </div>
                )}
                {client.notes_internal&&(
                  <div style={{padding:'10px 14px',background:'#EFF6FF',borderRadius:10,border:'1px solid #93C5FD'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#1E40AF',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>📋 Notas internas</div>
                    <div style={{fontSize:13,color:'#1E3A5F'}}>{client.notes_internal}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ações de comunicação */}
          {phone&&(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'18px',marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0B1E3D',marginBottom:12}}>Comunicação</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  ['💬 Enviar mensagem','',`https://wa.me/55${phone}`,'#E2E8F0','#64748B'],
                  ['📅 Lembrar de remarcar','',`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${client.name?.split(' ')[0]}! 👋 Que tal agendar um horário no ${salon?.name}? 😊`)}` ,'#DBEAFE','#2451A0'],
                  ['🎂 Mensagem de aniversário','',`https://wa.me/55${phone}?text=${encodeURIComponent(`Feliz aniversário, ${client.name?.split(' ')[0]}! 🎉 O time do ${salon?.name} deseja um dia incrível! 🎁`)}`,'#FEF3C7','#D97706'],
                ].map(([l,,href,bg,color])=>(
                  <a key={l} href={href} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:`1px solid ${bg}`,background:bg,color,fontSize:12,fontWeight:700,textDecoration:'none'}}>
                    {l}
                  </a>
                ))}
              </div>
            </div>
          )}

          {editing&&(
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={save} disabled={saving}
                style={{flex:1,padding:'13px',borderRadius:12,border:'none',background:'#0B1E3D',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                {saving?'Salvando...':'Salvar alterações'}
              </button>
              <button onClick={()=>{ setEditing(false); setForm(client) }}
                style={{padding:'13px 18px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {tab==='historico'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'2px solid #E2E8F0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#0B1E3D'}}>Histórico de atendimentos</div>
            <div style={{fontSize:12,color:'#64748B'}}>{appts.length} registro{appts.length!==1?'s':''}</div>
          </div>
          {appts.length===0 ? (
            <div style={{padding:32,textAlign:'center',color:'#94A3B8',fontSize:13}}>Nenhum atendimento registrado.</div>
          ) : appts.map((a,i)=>{
            const dt = a.date?new Date(a.date):null
            const cfa = STATUS_A[a.status]||'#94A3B8'
            return (
              <div key={a.id} style={{display:'flex',gap:12,padding:'12px 16px',borderBottom:i<appts.length-1?'1px solid #F1F5F9':'none',alignItems:'flex-start'}}>
                <div style={{width:40,textAlign:'center',background:a.status==='concluido'?'#D1FAE5':'#F1F5F9',borderRadius:8,padding:'5px 0',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:cfa}}>{dt?dt.getDate():'—'}</div>
                  <div style={{fontSize:8,color:'#94A3B8',fontWeight:700}}>{dt?MESES[dt.getMonth()]:''}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:4}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0B1E3D'}}>{a.service_name||'Atendimento'}</div>
                    {a.value>0&&<div style={{fontSize:13,fontWeight:800,color:'#059669'}}>R${Number(a.value).toLocaleString('pt-BR')}</div>}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                    {dt&&<span style={{fontSize:11,color:'#94A3B8'}}>{dt.toLocaleDateString('pt-BR')} {String(dt.getHours()).padStart(2,'0')}:{String(dt.getMinutes()).padStart(2,'0')}</span>}
                    <span style={{fontSize:10,fontWeight:700,color:cfa}}>{a.status}</span>
                    {a.payment_method&&<span style={{fontSize:10,color:'#94A3B8'}}>{a.payment_method}</span>}
                    {a.cut_preference&&<span style={{fontSize:10,color:'#64748B'}}>✂️ {a.cut_preference}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Recorrência */}
      {tab==='recorrencia'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'18px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Agendamentos recorrentes</div>
          <div style={{fontSize:12,color:'#64748B',marginBottom:14}}>Configure horários fixos gerados automaticamente</div>
          <RecorrenciaCard clientId={id} salonId={salon?.id} clientName={client?.name}/>
        </div>
      )}
    </div>
  )
}
