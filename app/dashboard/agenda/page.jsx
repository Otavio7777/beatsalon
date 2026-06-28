'use client'
import { todayBRT, fmtHoraBRT, fmtDataBRT, isTodayBRT, dayOfWeekBRT, toISOBRT, monthYearBRT, nowBRT } from '../../../lib/timezone'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import { Calendar, Plus, Check, Edit, Trash, MessageSquare, Phone, Bell, CheckCircle, AlertTriangle, Scissors, X, Clock, ArrowLeft, ChevronRight, User } from '../../../lib/icons'

const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MS    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS = {
  agendado:  {bg:'var(--navy-100)',color:'var(--navy-700)',label:'Agendado'},
  concluido: {bg:'var(--success-light)',color:'var(--success)',label:'Concluído'},
  cancelado: {bg:'var(--danger-light)',color:'var(--danger)',label:'Cancelado'},
  faltou:    {bg:'var(--warning-light)',color:'var(--warning)',label:'Faltou'},
}

function todayBR() {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [y,m,d] = str.split('-').map(Number); return new Date(y,m-1,d)
}
function todayStrBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function today() { return todayBR() }
function isTodayAppt(a) {
  if (!a?.date) return false
  const apptLocal = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  return apptLocal === todayStrBR()
}
function fmtHM(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('pt-BR', { timeZone:'America/Sao_Paulo', hour:'2-digit', minute:'2-digit' })
}
/* Gera links WhatsApp */
function waLink(phone, msg) {
  if (!phone) return null
  const num = `55${phone.replace(/\D/g,'')}`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

function waLembrete(appt, salonName) {
  const dt = new Date(appt.date)
  const dia = `${dt.getDate()}/${dt.getMonth()+1}`
  const hr  = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  return `Olá ${appt.client_name?.split(' ')[0]}! 👋 Lembrando que você tem *${appt.service_name||'horário'}* amanhã, *${dia} às ${hr}*, em *${salonName}*. Confirme sua presença! 😊`
}

function waConfirmar(appt, salonName) {
  const dt = new Date(appt.date)
  const dia = `${dt.getDate()}/${dt.getMonth()+1}`
  const hr  = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  return `Olá ${appt.client_name?.split(' ')[0]}! ✂️ Confirmando seu agendamento: *${appt.service_name||'atendimento'}* em *${dia} às ${hr}* aqui no *${salonName}*. Te esperamos!`
}

function waObrigado(appt, salonName) {
  return `Olá ${appt.client_name?.split(' ')[0]}! 🌟 Foi um prazer atendê-lo(a) hoje com *${appt.service_name||'nosso serviço'}* aqui no *${salonName}*. Ficou satisfeito? Avalie e volte sempre! 😊`
}

function waRemarcar(appt, salonName) {
  return `Olá ${appt.client_name?.split(' ')[0]}! Sentimos sua falta no agendamento de hoje em *${salonName}*. Que tal remarcarmos? Escolha um horário que funcione para você! 📅`
}

/* ── Modal de agendamento ── */
function AgModal({ salonId, appt, onClose, onSaved }) {
  const [form, setForm] = useState({
    client_name:'', client_id:null, client_phone:'', service_name:'', date:'',
    value:'', status:'agendado', notes:'', ...appt,
  })
  const [clientSearch, setClientSearch] = useState(appt?.client_name||'')
  const [clients,  setClients]   = useState([])
  const [services, setServices]  = useState([])
  const [showDrop, setShowDrop]  = useState(false)
  const [saving,   setSaving]    = useState(false)
  const [crmMsg,   setCrmMsg]    = useState(null)
  const sb = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    Promise.all([
      sb.from('clients').select('id,name,phone,main_service').eq('salon_id',salonId).order('name'),
      sb.from('services').select('id,name,price').eq('salon_id',salonId).eq('active',true).order('name'),
    ]).then(([{data:cl},{data:sv}])=>{ setClients(cl||[]); setServices(sv||[]) })
  },[salonId])

  const filtered = clients.filter(c=>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())||
    (c.phone||'').includes(clientSearch)
  )

  const selClient = (c) => {
    setClientSearch(c.name); set('client_name',c.name); set('client_id',c.id)
    set('client_phone',c.phone||'')
    if (!form.service_name && c.main_service) set('service_name',c.main_service)
    setShowDrop(false)
  }

  const clearClient = () => { setClientSearch(''); set('client_name',''); set('client_id',null); set('client_phone','') }

  const updateStats = async (cid, date, value, prevStatus) => {
    if (!cid||prevStatus==='concluido') return
    const {data:cur} = await sb.from('clients').select('visit_count,ltv').eq('id',cid).single()
    if (!cur) return
    await sb.from('clients').update({
      visit_count:(cur.visit_count||0)+1, ltv:(cur.ltv||0)+(Number(value)||0),
      last_visit:date?.slice(0,10), status:'ativo',
    }).eq('id',cid)
  }

  const autoVincular = async (phone) => {
    if (!phone||form.client_id) return null
    const digits = phone.replace(/\D/g,'')
    if (digits.length<8) return null
    const {data,error} = await sb.rpc('match_or_create_client',{
      p_salon_id:salonId, p_client_name:form.client_name||'Cliente', p_client_phone:digits
    })
    if (!error&&data?.client_id) return data
    const found = clients.find(c=>(c.phone||'').replace(/\D/g,'')=== digits)
    if (found) return {client_id:found.id, client_name:found.name, is_new:false}
    return null
  }

  const save = async () => {
    if (!form.client_name||!form.date) return
    setSaving(true); setCrmMsg(null)
    let cid = form.client_id||null, crmRes = null
    if (!cid&&form.client_phone) { crmRes = await autoVincular(form.client_phone); if(crmRes) cid=crmRes.client_id }
    const payload = {client_name:form.client_name,client_id:cid,service_name:form.service_name,
      date:form.date,value:Number(form.value)||0,status:form.status,notes:form.notes,salon_id:salonId}
    if (appt?.id) {
      await sb.from('appointments').update(payload).eq('id',appt.id)
      if (form.status==='concluido'&&cid) await updateStats(cid,form.date,form.value,appt.status)
    } else {
      await sb.from('appointments').insert(payload)
      if (form.status==='concluido'&&cid) await updateStats(cid,form.date,form.value,null)
    }
    onSaved()
    if (crmRes) { setCrmMsg({type:crmRes.is_new?'new':'linked',name:crmRes.client_name}); setTimeout(onClose,2000) }
    else onClose()
    setSaving(false)
  }

  const iS = {border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'9px 13px',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',background:'var(--white)',color:'var(--text)'}
  const lS = {display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,marginTop:12}

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        {crmMsg && (
          <div style={{background:crmMsg.type==='new'?'var(--success-light)':'var(--navy-100)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13,fontWeight:600,color:crmMsg.type==='new'?'var(--success)':'var(--navy-700)',display:'flex',gap:8}}>
            {crmMsg.type==='new'?'Novo cliente criado:':'Vinculado a:'} <strong>{crmMsg.name}</strong>
          </div>
        )}
        <div className="modal-title">{appt?.id?'Editar':'Novo'} agendamento</div>

        {/* Busca cliente */}
        <label style={lS}>Cliente * <span style={{color:'var(--navy-500)',fontWeight:400,textTransform:'none'}}>— busque ou digite</span></label>
        {form.client_id ? (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 13px',borderRadius:'var(--radius)',border:'2px solid var(--navy-400)',background:'var(--navy-50)'}}>
            <span style={{fontWeight:700,color:'var(--navy-700)',flex:1,fontSize:13,display:'flex',alignItems:'center',gap:4}}><User size={13} color="var(--navy-700)"/> {form.client_name}</span>
            <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',display:'flex',alignItems:'center',padding:2}} onClick={clearClient}><X size={14}/></button>
          </div>
        ) : (
          <div style={{position:'relative'}}>
            <input style={iS} value={clientSearch}
              onChange={e=>{setClientSearch(e.target.value);set('client_name',e.target.value);setShowDrop(true)}}
              onFocus={()=>setShowDrop(true)} onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
              placeholder="Buscar cliente ou digitar nome..." />
            {showDrop&&clientSearch.length>0&&filtered.length>0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'0 4px 16px rgba(0,0,0,.1)',zIndex:100,maxHeight:180,overflowY:'auto',marginTop:2}}>
                {filtered.map(c=>(
                  <div key={c.id} onMouseDown={()=>selClient(c)} style={{padding:'9px 14px',cursor:'pointer',fontSize:13,borderBottom:'1px solid var(--gray-100)'}}>
                    <span style={{fontWeight:600}}>{c.name}</span>
                    {c.phone&&<span style={{color:'var(--muted)',marginLeft:8,fontSize:11}}>{c.phone}</span>}
                    {c.main_service&&<span style={{color:'var(--navy-500)',marginLeft:8,fontSize:11}}>· {c.main_service}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Celular (se não vinculado) */}
        {!form.client_id && (
          <div>
            <label style={lS}>WhatsApp <span style={{color:'var(--navy-500)',fontWeight:400,textTransform:'none'}}>— auto-vincula ao CRM</span></label>
            <input style={iS} placeholder="(00) 00000-0000" value={form.client_phone||''} onChange={e=>set('client_phone',e.target.value)} inputMode="tel" />
          </div>
        )}

        {/* Serviço */}
        <label style={lS}>Serviço</label>
        {services.length>0 ? (
          <select style={{...iS}} value={form.service_name} onChange={e=>{
            const svcName = e.target.value
            set('service_name', svcName)
            const svcData = services.find(s=>s.name===svcName)
            if (svcData?.price > 0) set('value', svcData.price)
          }}>
            <option value="">Selecione ou personalize</option>
            {services.map(s=><option key={s.id} value={s.name}>{s.name}{s.price>0?` — R$${Number(s.price).toLocaleString('pt-BR')}`:''}</option>)}
            <option value="__custom">Outro...</option>
          </select>
        ) : (
          <input style={iS} value={form.service_name} onChange={e=>set('service_name',e.target.value)} placeholder="Corte, Barba..." />
        )}
        {form.service_name==='__custom' && (
          <input style={{...iS,marginTop:6}} placeholder="Descreva o serviço..." onChange={e=>set('service_name',e.target.value)} autoFocus />
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div>
            <label style={lS}>Valor (R$)</label>
            <input style={iS} type="number" value={form.value} onChange={e=>set('value',e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={lS}>Status</label>
            <select style={{...iS}} value={form.status} onChange={e=>set('status',e.target.value)}>
              {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <label style={lS}>Data e horário *</label>
        <input style={iS} type="datetime-local" value={form.date} onChange={e=>set('date',e.target.value)} />

        <label style={lS}>Observações</label>
        <input style={iS} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Opcional" />

        {form.client_id&&form.status==='concluido' && (
          <div style={{background:'var(--success-light)',borderRadius:8,padding:'9px 13px',marginTop:12,fontSize:12,color:'var(--success)',fontWeight:600}}>
            Ao salvar, histórico do cliente será atualizado automaticamente.
          </div>
        )}

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving?'Salvando...':'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Painel WhatsApp de appointment ── */
function WaPanel({ appt, salon, onRefresh }) {
  const [open, setOpen] = useState(false)
  const phone = appt.notes?.match(/^\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/)?.[0] || ''

  if (!phone && !appt.client_phone) return null

  const fone = phone || appt.client_phone
  const msgs = [
    { label:'Lembrete 24h', Icon: Bell,         href: waLink(fone, waLembrete(appt, salon?.name)), cond: appt.status==='agendado' },
    { label:'Confirmar',    Icon: CheckCircle,  href: waLink(fone, waConfirmar(appt, salon?.name)), cond: appt.status==='agendado' },
    { label:'Obrigado',     Icon: MessageSquare,href: waLink(fone, waObrigado(appt, salon?.name)),  cond: appt.status==='concluido' },
    { label:'Remarcar',     Icon: Calendar,     href: waLink(fone, waRemarcar(appt, salon?.name)),  cond: appt.status==='faltou'||appt.status==='cancelado' },
  ].filter(m=>m.cond)

  if (msgs.length===0) return null

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} title="Ações WhatsApp"
        style={{padding:'4px 8px',borderRadius:6,border:'1px solid #D1FAE5',background:'#ECFDF5',color:'#059669',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
        <MessageSquare size={11} color="#059669" /> WA
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:49}}/>
          <div style={{position:'absolute',right:0,top:'110%',background:'var(--white)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,.12)',zIndex:50,minWidth:160,padding:6}}>
            {msgs.map(m=>(
              <a key={m.label} href={m.href} target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,textDecoration:'none',color:'var(--text)',fontSize:12,fontWeight:600}}
                onClick={()=>setOpen(false)}>
                {m.Icon && <m.Icon size={12} color="var(--navy-600)"/>} {m.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Página principal ── */


/* ── Modal Remarcar Atendimento ── */
function gerarSlotsLocal(schedCfg, date) {
  if (!schedCfg?.length || !date) return Array.from({length:29},(_,i)=>{const m=7*60+i*30;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`})
  const dow = new Date(date+'T12:00:00').getDay()
  const cfg = schedCfg.find(c=>c.day_of_week===dow)
  if (cfg?.is_open===false) return []
  if (!cfg?.open_time) return []
  const dur = cfg.slot_duration||30
  const [hI,mI] = cfg.open_time.split(':').map(Number)
  const [hF,mF] = cfg.close_time.split(':').map(Number)
  const ls = cfg.lunch_start?cfg.lunch_start.split(':').map(Number).reduce((a,b,i)=>i===0?a*60+b:a+b,0):null
  const le = cfg.lunch_end  ?cfg.lunch_end.split(':').map(Number).reduce((a,b,i)=>i===0?a*60+b:a+b,0)  :null
  const s = []
  for (let m=hI*60+mI; m+dur<=hF*60+mF; m+=dur) {
    if (!ls||!le||m<ls||m>=le) s.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`)
  }
  return s
}

function RemarcarModal({ appt, salonName, salonId, schedCfg=[], onClose, onSaved }) {
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [slots,    setSlots]    = useState([])
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const sb = createClient()

  // Gera slots reais do schedule_config e exclui ocupados
  useEffect(() => {
    if (!novaData) { setSlots([]); setNovaHora(''); return }
    const load = async () => {
      // Slots disponíveis via schedule_config
      const rawSlots = gerarSlotsLocal(schedCfg, novaData)
      if (!rawSlots.length) { setSlots([]); return }
      // Remove slots já ocupados
      const { data: ocupadosData } = await sb.from('appointments')
        .select('date').eq('salon_id', salonId)
        .gte('date', `${novaData}T00:00:00`).lte('date', `${novaData}T23:59:59`)
        .not('status', 'eq', 'cancelado').neq('id', appt.id)
      const ocupados = (ocupadosData||[]).map(a => a.date?.slice(11,16))
      setSlots(rawSlots.filter(s => !ocupados.includes(s)))
      setNovaHora('')
    }
    load()
  }, [novaData, schedCfg])

  const msgWa = novaData && novaHora
    ? `Olá ${appt.client_name?.split(' ')[0]}! 📅 Seu horário de *${appt.service_name||'atendimento'}* em *${salonName}* foi remarcado para *${new Date(novaData+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}* às *${novaHora}*. Aguardamos você! 🙂`
    : ''

  const phone  = appt.notes?.match(/\d{10,11}/)?.[0] || appt.client_phone?.replace(/\D/g,'')
  const waLink = phone && msgWa ? `https://wa.me/55${phone}?text=${encodeURIComponent(msgWa)}` : null

  const save = async () => {
    if (!novaData || !novaHora) return
    setSaving(true)
    await sb.from('appointments').update({
      date: `${novaData}T${novaHora}:00`,
      status: 'agendado', reschedule_requested: false,
    }).eq('id', appt.id)
    setSaving(false); setSaved(true); onSaved()
  }

  // Verifica se o dia está disponível no schedule_config
  const isOpen = (d) => {
    if (!d) return true
    const dow = new Date(d+'T12:00:00').getDay()
    const cfg = schedCfg.find(c => c.day_of_week === dow)
    return !cfg || cfg.is_open !== false
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={{width:40,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 20px'}}/>
        <div style={{fontSize:17,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Remarcar atendimento</div>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F1F5F9'}}>
          <strong style={{color:'var(--navy-900)'}}>{appt.client_name}</strong> · {appt.service_name}
        </div>

        <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Nova data *</label>
        <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}
          min={todayBRT()}
          style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid var(--border)',fontSize:14,color:'var(--text)',outline:'none',background:'var(--white)',boxSizing:'border-box',marginBottom:14}}/>

        {novaData && !isOpen(novaData) && (
          <div style={{padding:'10px 14px',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:10,marginBottom:14,fontSize:12,color:'#92400E',fontWeight:600}}>
            <span style={{display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={13} color="var(--warning)"/> Este dia está fechado nas configurações de horário.</span>
          </div>
        )}

        {novaData && isOpen(novaData) && (
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:8}}>
              Horário disponível · {slots.length} vaga{slots.length!==1?'s':''}
            </label>
            {slots.length===0
              ? <div style={{padding:'12px',textAlign:'center',color:'var(--muted)',fontSize:12,background:'var(--gray-50)',borderRadius:9}}>Sem horários disponíveis neste dia.</div>
              : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(70px,1fr))',gap:8,maxHeight:180,overflowY:'auto',marginBottom:14}}>
                  {slots.map(h=>(
                    <button key={h} onClick={()=>setNovaHora(h)}
                      style={{padding:'9px 4px',borderRadius:9,border:`2px solid ${novaHora===h?'var(--navy-600)':'var(--border)'}`,
                        background:novaHora===h?'var(--navy-600)':'var(--white)',color:novaHora===h?'#fff':'var(--text)',
                        fontSize:13,fontWeight:700,cursor:'pointer',minHeight:40}}>
                      {h}
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Preview mensagem WhatsApp */}
        {msgWa && (
          <div style={{marginBottom:14,padding:'10px 12px',background:'#ECE5DD',borderRadius:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#4A4A4A',textTransform:'uppercase',marginBottom:5}}>Mensagem para o cliente</div>
            <div style={{background:'#fff',borderRadius:'10px 10px 10px 3px',padding:'8px 12px',fontSize:12,color:'#1C1C1C',lineHeight:1.6,display:'inline-block',maxWidth:'90%'}}>
              {msgWa}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {!saved ? (
            <>
              <button onClick={save} disabled={saving||!novaData||!novaHora||!isOpen(novaData)}
                style={{flex:1,padding:'12px',borderRadius:10,border:'none',fontSize:13,fontWeight:700,cursor:'pointer',
                  background:saving||!novaData||!novaHora||!isOpen(novaData)?'var(--gray-200)':'var(--navy-600)',
                  color:saving||!novaData||!novaHora||!isOpen(novaData)?'var(--muted)':'#fff'}}>
                {saving?'Salvando...':'Confirmar remarcação'}
              </button>
              {waLink&&<a href={waLink} target="_blank" rel="noreferrer"
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'12px',borderRadius:10,background:'#25D366',color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none'}}>
                <MessageSquare size={12} color="currentColor"/> Avisar
              </a>}
            </>
          ) : (
            <div style={{flex:1,padding:'12px',borderRadius:10,background:'var(--success-light)',color:'var(--success)',fontSize:13,fontWeight:700,textAlign:'center',border:'1px solid #6EE7B7'}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><Check size={13} color="var(--success)"/> Remarcado!</span>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{width:'100%',marginTop:8,padding:'11px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          Fechar
        </button>
      </div>
    </div>
  )
}


/* ── Modal Concluir Atendimento ── */
function ConcludeModal({ appt, salonName, onClose, onSaved }) {
  const [modo, setModo]       = useState('realizado') // 'realizado' | 'faltou'
  const [pagamento, setPagamento] = useState('pix')
  const [valor, setValor]     = useState(String(appt?.value || ''))
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const sb = createClient()

  const PAGAMENTOS = [
    { key:'pix',     label:'PIX' },
    { key:'dinheiro',label:'Dinheiro' },
    { key:'debito',  label:'Débito' },
    { key:'credito', label:'Crédito' },
  ]

  const salvar = async () => {
    setSaving(true)
    const val = Number(valor) || 0
    if (modo === 'realizado') {
      const { error: apptErr } = await sb.from('appointments').update({
        status: 'concluido',
        payment_method: pagamento,
        value: val,
      }).eq('id', appt.id)
      if (apptErr) { console.error('Erro ao concluir:', apptErr); setSaving(false); return }
      // Atualiza CRM do cliente
      if (appt.client_id) {
        const { data: cur } = await sb.from('clients')
          .select('visit_count,ltv,first_visit').eq('id', appt.client_id).single()
        if (cur) {
          await sb.from('clients').update({
            visit_count: (cur.visit_count || 0) + 1,
            ltv: (cur.ltv || 0) + val,
            last_visit: appt.date?.slice(0, 10),
            first_visit: cur.first_visit || appt.date?.slice(0, 10),
            status: 'ativo',
          }).eq('id', appt.client_id)
        }
      }
    } else {
      const { error: faltouErr } = await sb.from('appointments').update({ status: 'faltou' }).eq('id', appt.id)
      if (faltouErr) { console.error('Erro faltou:', faltouErr); setSaving(false); return }
    }
    setSaving(false)
    setDone(true)
    onSaved()
    setTimeout(onClose, 1400)
  }

  const phone = appt.notes?.match(/\d{10,11}/)?.[0] || appt.client_phone?.replace(/\D/g, '')
  const waMsg = modo === 'faltou' && phone
    ? `Olá ${appt.client_name?.split(' ')[0]}! Sentimos sua falta no horário de hoje em *${salonName}*. Que tal remarcarmos? 📅`
    : null
  const waHref = waMsg ? `https://wa.me/55${phone}?text=${encodeURIComponent(waMsg)}` : null

  const iS = { border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'9px 13px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', background:'var(--white)', color:'var(--text)' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{width:40,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 20px'}}/>
        <div style={{fontSize:17,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Concluir atendimento</div>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F1F5F9'}}>
          <strong style={{color:'var(--navy-900)'}}>{appt.client_name}</strong> · {appt.service_name}
        </div>

        {done ? (
          <div style={{padding:'20px',textAlign:'center',color:'var(--success)',fontWeight:700,fontSize:15,background:'var(--success-light)',borderRadius:12}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:8}}><Check size={22} color="var(--success)"/></div>
            {modo==='realizado' ? 'Atendimento concluído!' : 'Marcado como faltou!'}
          </div>
        ) : (
          <>
            {/* Modo */}
            <div style={{display:'flex',gap:8,marginBottom:18}}>
              {[['realizado','✓ Realizado'],['faltou','✗ Não compareceu']].map(([m,l])=>(
                <button key={m} onClick={()=>setModo(m)}
                  style={{flex:1,padding:'10px 8px',borderRadius:10,border:`2px solid ${modo===m?'var(--navy-600)':'var(--border)'}`,
                    background:modo===m?'var(--navy-600)':'var(--white)',color:modo===m?'#fff':'var(--muted)',
                    fontSize:12,fontWeight:700,cursor:'pointer'}}>
                  {l}
                </button>
              ))}
            </div>

            {modo === 'realizado' && (
              <>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Valor cobrado (R$)</label>
                <input style={{...iS, marginBottom:16}} type="number" value={valor}
                  onChange={e=>setValor(e.target.value)} placeholder="0.00" />

                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Forma de pagamento</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:18}}>
                  {PAGAMENTOS.map(p=>(
                    <button key={p.key} onClick={()=>setPagamento(p.key)}
                      style={{padding:'10px 8px',borderRadius:10,border:`2px solid ${pagamento===p.key?'var(--navy-600)':'var(--border)'}`,
                        background:pagamento===p.key?'var(--navy-50)':'var(--white)',color:pagamento===p.key?'var(--navy-700)':'var(--muted)',
                        fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {modo === 'faltou' && waHref && (
              <div style={{marginBottom:16,padding:'10px 14px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10}}>
                <div style={{fontSize:12,color:'#92400E',fontWeight:600,marginBottom:6}}>Avisar o cliente via WhatsApp?</div>
                <a href={waHref} target="_blank" rel="noreferrer"
                  style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'#25D366',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>
                  <MessageSquare size={12} color="#fff"/> Enviar mensagem
                </a>
              </div>
            )}

            <div style={{display:'flex',gap:8}}>
              <button onClick={onClose}
                style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={saving}
                style={{flex:2,padding:'12px',borderRadius:10,border:'none',
                  background:modo==='realizado'?'var(--navy-600)':'var(--warning)',
                  color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                {saving ? 'Salvando...' : modo==='realizado' ? 'Confirmar conclusão' : 'Confirmar falta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const { salon, user, loading:sl } = useSalon()
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [concludeModal, setConcludeModal] = useState(null)
  const [remarcarModal,  setRemarcarModal]  = useState(null)
  const [currDate, setCurrDate] = useState(()=>todayBR())
  const [view, setView]       = useState('hoje')
  const [barbers,  setBarbers]    = useState([])
  const [barberFiltro, setBarberFiltro] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt]  = useState(null)
  const [schedCfg, setSchedCfg]  = useState([])
  const sb = createClient()

  const load = useCallback(async()=>{
    if (!salon?.id) return
    setLoading(true)
    const [{ data }, { data: sched }] = await Promise.all([
      sb.from('appointments').select('*').eq('salon_id', salon.id).order('date'),
      sb.from('schedule_config').select('*').eq('salon_id', salon.id),
    ])
    setAppts(data||[])
    setSchedCfg(sched||[])
    setLoading(false)
  },[salon?.id])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const del = async(id)=>{ if(!confirm('Remover?')) return; await sb.from('appointments').delete().eq('id',id); load() }

  const quickConcluir = async(appt) => {
    await sb.from('appointments').update({status:'concluido'}).eq('id',appt.id)
    if (appt.client_id) {
      const {data:cur} = await sb.from('clients').select('visit_count,ltv').eq('id',appt.client_id).single()
      if (cur) await sb.from('clients').update({visit_count:(cur.visit_count||0)+1,ltv:(cur.ltv||0)+(Number(appt.value)||0),last_visit:appt.date?.slice(0,10),status:'ativo'}).eq('id',appt.client_id)
    }
    load()
  }

  const weekStart = d => { const day=d.getDay(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()-day) }
  const weekDays  = () => { const s=weekStart(currDate); return Array.from({length:7},(_,i)=>new Date(s.getFullYear(),s.getMonth(),s.getDate()+i)) }
  const apptsByDate = date => { const ds=date.toISOString().slice(0,10); return appts.filter(a=>a.date?.startsWith(ds)).sort((a,b)=>a.date.localeCompare(b.date)) }
  const isToday = d => d.toDateString()===today().toDateString()

  /* Lembretes: agendamentos de amanhã */
  const tomorrow = new Date(today()); tomorrow.setDate(tomorrow.getDate()+1)
  const tomorrowStr = tomorrow.toISOString().slice(0,10)
  const lembretes = appts.filter(a=>a.date?.startsWith(tomorrowStr)&&a.status==='agendado')

  const todayStr = today().toISOString().slice(0,10)
  const stats = {
    hoje:    appts.filter(a=>a.date?.startsWith(todayStr)).length,
    semana:  appts.length,
    receita: appts.filter(a=>a.status==='concluido'&&a.date?.startsWith(monthYearBRT())).reduce((s,a)=>s+(a.value||0),0),
  }

  if (sl) return <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Agenda</div>
        <div className="pg-sub">Agendamentos · {salon?.name}</div>
      </div>

      {/* KPIs */}
      <div className="grid-3" style={{marginBottom:16}}>
        <div className="mc"><div className="mc-label">Hoje</div><div className="mc-value">{stats.hoje}</div><div className="mc-desc">agendamentos</div></div>
        <div className="mc"><div className="mc-label">Próx. 7 dias</div><div className="mc-value">{stats.semana}</div><div className="mc-desc">no período</div></div>
        <div className="mc"><div className="mc-label">Receita mês</div><div className="mc-value" style={{color:'var(--success)'}}>R${stats.receita.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div><div className="mc-desc">concluídos</div></div>
      </div>

      {/* Lembretes 24h */}
      {lembretes.length>0 && (
        <div style={{background:'linear-gradient(135deg,var(--navy-900),var(--navy-700))',borderRadius:14,padding:'14px 16px',marginBottom:16,color:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:14}}>Lembretes de amanhã</div>
            <span style={{fontSize:10,background:'rgba(255,255,255,.15)',padding:'3px 8px',borderRadius:20,fontWeight:700}}>{lembretes.length} agendamentos</span>
          </div>
          {lembretes.map(a=>{
            const phone = a.notes?.match(/^\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/)?.[0] || a.client_phone || ''
            return (
              <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
                <div style={{minWidth:40,textAlign:'center',background:'rgba(255,255,255,.1)',borderRadius:6,padding:'4px'}}>
                  <div style={{fontSize:12,fontWeight:800}}>{fmtHM(a.date)}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.client_name}</div>
                  <div style={{fontSize:11,opacity:.6}}>{a.service_name||'–'}</div>
                </div>
                {phone && (
                  <a href={waLink(phone, waLembrete(a, salon?.name))} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#25D366',borderRadius:8,textDecoration:'none',color:'#fff',fontWeight:700,fontSize:11,flexShrink:0}}>
                    <MessageSquare size={12} color="#fff" /> Lembrar
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn-secondary" onClick={()=>setCurrDate(d=>{ const n=new Date(d); view==='semana'?n.setDate(n.getDate()-7):view==='hoje'||view==='amanha'?n.setDate(n.getDate()-1):n.setMonth(n.getMonth()-1); return n })}>‹</button>
        <span style={{fontWeight:700,fontSize:14,minWidth:180,textAlign:'center',color:'var(--navy-900)'}}>
          {view==='semana' ? `${weekDays()[0].getDate()}–${weekDays()[6].getDate()} de ${MESES[weekDays()[6].getMonth()]}` : view==='hoje' ? `Hoje · ${currDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}` : view==='amanha' ? `Amanhã · ${new Date(currDate.getTime()+86400000).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}` : `${MESES[currDate.getMonth()]} ${currDate.getFullYear()}`}
        </span>
        <button className="btn-secondary" onClick={()=>setCurrDate(d=>{ const n=new Date(d); view==='semana'?n.setDate(n.getDate()+7):view==='hoje'||view==='amanha'?n.setDate(n.getDate()+1):n.setMonth(n.getMonth()+1); return n })}>›</button>
        <button className="btn-secondary" onClick={()=>setCurrDate(today())}>Hoje</button>
        <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
          {[['hoje','Hoje'],['amanha','Amanhã'],['semana','Semana'],['mes','Mês'],['lista','Lista']].map(([v,l])=>(
            <button key={v} className={`filter-btn${view===v?' active':''}`} onClick={()=>setView(v)}>{l}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>{setEditAppt(null);setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:6}}>
          <Plus size={14} color="#fff" /> Agendar
        </button>
      </div>

      {/* Calendário semanal */}
      {view==='semana' && (
        <div style={{background:'var(--white)',borderRadius:14,border:'1px solid var(--border)',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'var(--gray-50)',borderBottom:'1px solid var(--border)'}}>
            {DIAS.map(d=><div key={d} style={{padding:'8px 4px',textAlign:'center',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',minHeight:140}}>
            {weekDays().map((day,i)=>{
              const dayAppts = apptsByDate(day)
              return (
                <div key={i} style={{padding:'8px 5px',borderRight:'1px solid var(--gray-100)',background:isToday(day)?'var(--navy-50)':'transparent',cursor:'pointer',minHeight:140}}
                  onClick={()=>{setEditAppt({date:day.toISOString().slice(0,16)});setShowModal(true)}}>
                  <div style={{fontSize:12,fontWeight:700,color:isToday(day)?'var(--navy-600)':'var(--text)',marginBottom:4}}>{day.getDate()}</div>
                  {dayAppts.slice(0,3).map(a=>{
                    const cfg = STATUS[a.status]||STATUS.agendado
                    return (
                      <div key={a.id}
                        onClick={e=>{e.stopPropagation();setEditAppt(a);setShowModal(true)}}
                        style={{fontSize:10,padding:'3px 6px',borderRadius:5,marginBottom:2,background:cfg.bg,color:cfg.color,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}>
                        {fmtHM(a.date)} {a.client_name}
                        {a.client_id&&<span title="Vinculado ao CRM" style={{marginLeft:2,display:'inline-flex',alignItems:'center'}}><CheckCircle size={10} color="#059669"/></span>}
                      </div>
                    )
                  })}
                  {dayAppts.length>3&&<div style={{fontSize:9,color:'var(--muted)',marginTop:2}}>+{dayAppts.length-3}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista */}


      {/* Filtro por barbeiro */}
      {barbers.length > 0 && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          <button onClick={()=>setBarberFiltro('todos')}
            style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${barberFiltro==='todos'?'#0B1E3D':'#E2E8F0'}`,background:barberFiltro==='todos'?'#0B1E3D':'#fff',color:barberFiltro==='todos'?'#fff':'#64748B',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            Todos
          </button>
          {barbers.map(b=>(
            <button key={b.id} onClick={()=>setBarberFiltro(b.id)}
              style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${barberFiltro===b.id?b.color||'#1B3057':'#E2E8F0'}`,background:barberFiltro===b.id?b.color||'#1B3057':'#fff',color:barberFiltro===b.id?'#fff':'#64748B',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:8,height:8,borderRadius:4,background:b.color||'#1B3057',opacity:barberFiltro===b.id?0:1}}/>
              {b.name?.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
      {/* Hoje */}
      {(view==='hoje'||view==='amanha') && (() => {
        const targetDate = view==='hoje' ? nowBRT() : (() => { const d=nowBRT(); d.setDate(d.getDate()+1); return d })()
        const dayStr = targetDate.toISOString().slice(0,10)
        const dayAppts = appts.filter(a => a.date?.startsWith(dayStr)).sort((a,b)=>a.date>b.date?1:-1)
        return (
          <div>
            <div style={{padding:'14px 16px',background:'var(--navy-50)',borderRadius:'12px 12px 0 0',borderBottom:'2px solid var(--border)'}}>
              <div style={{fontSize:15,fontWeight:800,color:'var(--navy-900)'}}>
                {view==='hoje'?'Hoje':'Amanhã'} · {targetDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}
              </div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{dayAppts.length} agendamento{dayAppts.length!==1?'s':''}</div>
            </div>
            {dayAppts.length===0
              ? <div style={{padding:'32px 16px',textAlign:'center',color:'var(--muted)',fontSize:13}}>
                  Nenhum agendamento para {view==='hoje'?'hoje':'amanhã'}.
                </div>
              : dayAppts.map((a,i) => {
                const cfg=STATUS[a.status]||STATUS.agendado
                const dt=new Date(a.date)
                const isAg=a.status==='agendado'
                return (
                  <div key={a.id} style={{padding:'14px 16px',borderBottom:i<dayAppts.length-1?'1px solid var(--gray-100)':'none'}}>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:isAg?10:0}}>
                      <div style={{width:48,textAlign:'center',background:isAg?'var(--navy-600)':'var(--gray-100)',borderRadius:10,padding:'6px 4px',flexShrink:0}}>
                        <div style={{fontSize:16,fontWeight:800,color:isAg?'#fff':'var(--text)'}}>{String(dt.getHours()).padStart(2,'0')}</div>
                        <div style={{fontSize:10,color:isAg?'rgba(255,255,255,.7)':'var(--muted)',fontWeight:700}}>{String(dt.getMinutes()).padStart(2,'0')}</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:3}}>
                          <span style={{fontWeight:800,fontSize:14,color:'var(--navy-900)'}}>{a.client_name}</span>
                          <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                        </div>
                        <div style={{fontSize:12,color:'var(--muted)'}}>{a.service_name||'—'}{a.value>0&&<span style={{color:'var(--success)',fontWeight:700,marginLeft:6}}>R${Number(a.value).toLocaleString('pt-BR')}</span>}</div>
                        {a.cut_preference&&<div style={{fontSize:11,color:'var(--navy-500)',marginTop:2,display:'flex',alignItems:'center',gap:3}}><Scissors size={10} color="var(--navy-500)"/> {a.cut_preference}</div>}
                      </div>
                      <div style={{display:'flex',gap:5}}>
                        <WaPanel appt={a} salon={salon} onRefresh={load}/>
                        <button className="btn-ghost" onClick={()=>{setEditAppt(a);setShowModal(true)}} style={{padding:'6px 8px'}}><Edit size={13} color="var(--muted)"/></button>
                        <button className="btn-danger" onClick={()=>del(a.id)} style={{padding:'6px 8px'}}><Trash size={13} color="var(--danger)"/></button>
                      </div>
                    </div>
                    {isAg&&(
                      <div style={{display:'flex',gap:8,marginLeft:60,flexWrap:'wrap'}}>
                        <button onClick={()=>setConcludeModal(a)} style={{flex:'1 1 120px',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 14px',borderRadius:10,border:'none',background:'var(--navy-600)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',minHeight:40}}>
                          <Check size={13} color="#fff"/> Concluir
                        </button>
                        <button onClick={()=>setRemarcarModal(a)} style={{flex:'1 1 100px',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 14px',borderRadius:10,border:'1.5px solid var(--navy-200)',background:'var(--navy-50)',color:'var(--navy-700)',fontSize:12,fontWeight:700,cursor:'pointer',minHeight:40}}>
                          ↻ Remarcar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        )
      })()}

      {/* Mês */}
      {view==='mes' && (() => {
        const ano = currDate.getFullYear()
        const mes = currDate.getMonth()
        const primeiro = new Date(ano,mes,1).getDay()
        const ultimo   = new Date(ano,mes+1,0).getDate()
        const cells    = [...Array(primeiro).fill(null), ...Array.from({length:ultimo},(_,i)=>i+1)]
        const str = d => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const hoje = nowBRT(); hoje.setHours(0,0,0,0)
        const MESES_N = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
        return (
          <div style={{background:'var(--white)',borderRadius:14,border:'1px solid var(--border)',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'2px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:800,fontSize:14,color:'var(--navy-900)'}}>{MESES_N[mes]} {ano}</span>
              <span style={{fontSize:12,color:'var(--muted)'}}>{appts.filter(a=>a.date?.startsWith(str(1).slice(0,7))).length} agendamentos no mês</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--gray-100)'}}>
              {['D','S','T','Q','Q','S','S'].map((d,i)=>(
                <div key={i} style={{padding:'8px 4px',textAlign:'center',fontSize:10,fontWeight:700,color:'var(--muted)'}}>{d}</div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
              {cells.map((d,i)=>{
                if (!d) return <div key={`e${i}`} style={{minHeight:60,borderRight:'1px solid var(--gray-100)',borderBottom:'1px solid var(--gray-100)'}}/>
                const dayStr = str(d)
                const dayAppts = appts.filter(a=>a.date?.startsWith(dayStr))
                const isTdy = new Date(ano,mes,d).toDateString()===hoje.toDateString()
                return (
                  <div key={d} style={{minHeight:60,padding:4,borderRight:'1px solid var(--gray-100)',borderBottom:'1px solid var(--gray-100)',background:isTdy?'var(--navy-50)':'transparent'}}>
                    <div style={{fontSize:11,fontWeight:isTdy?800:500,color:isTdy?'var(--navy-700)':'var(--text)',marginBottom:2,width:20,height:20,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:isTdy?'var(--navy-600)':'transparent',color:isTdy?'#fff':'var(--text)'}}>
                      {d}
                    </div>
                    {dayAppts.slice(0,3).map((a,ai)=>{
                      const cfg=STATUS[a.status]||STATUS.agendado
                      return (
                        <div key={ai} style={{fontSize:9,fontWeight:600,color:cfg.color,background:cfg.bg,borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}
                          onClick={()=>{setEditAppt(a);setShowModal(true)}}>
                          {fmtHM(a.date)} {a.client_name?.split(' ')[0]}
                        </div>
                      )
                    })}
                    {dayAppts.length>3&&<div style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>+{dayAppts.length-3}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {view==='lista' && (
        <div style={{background:'var(--white)',borderRadius:14,border:'1px solid var(--border)',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
          {loading
            ? <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>
            : appts.length===0
              ? <div style={{padding:32,textAlign:'center',color:'var(--muted)',fontSize:13}}>Nenhum agendamento. Clique em "Agendar" para começar.</div>
              : appts.map((a,i)=>{
                const cfg = STATUS[a.status]||STATUS.agendado
                const dt  = new Date(a.date)
                const isAgendado = a.status === 'agendado'
                return (
                  <div key={a.id} style={{padding:'14px 16px',borderBottom:i<appts.length-1?'1px solid var(--gray-100)':'none'}}>
                    {/* Info: mini-cal + nome + badges */}
                    <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:isAgendado?10:0}}>
                      <div style={{width:48,textAlign:'center',background:isAgendado?'var(--navy-600)':'var(--gray-100)',borderRadius:10,padding:'6px 4px',flexShrink:0}}>
                        <div style={{fontSize:15,fontWeight:800,color:isAgendado?'#fff':'var(--text)'}}>{dt.getDate()}</div>
                        <div style={{fontSize:8,fontWeight:700,textTransform:'uppercase',color:isAgendado?'rgba(255,255,255,.6)':'var(--muted)'}}>{MS[dt.getMonth()]}</div>
                        <div style={{fontSize:11,fontWeight:700,color:isAgendado?'rgba(255,255,255,.9)':'var(--navy-500)',marginTop:2}}>{fmtHM(a.date)}</div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:3}}>
                          <span style={{fontWeight:800,fontSize:14,color:'var(--navy-900)'}}>{a.client_name}</span>
                          <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                        </div>
                        <div style={{fontSize:12,color:'var(--muted)'}}>
                          {a.service_name||'—'}
                          {a.value>0&&<span style={{color:'var(--success)',fontWeight:700,marginLeft:6}}>R${Number(a.value).toLocaleString('pt-BR')}</span>}
                        </div>
                        {a.cut_preference&&<div style={{fontSize:11,color:'var(--navy-500)',marginTop:2,display:'flex',alignItems:'center',gap:3}}><Scissors size={10} color="var(--navy-500)"/> {a.cut_preference}</div>}
                      </div>
                      <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
                        <WaPanel appt={a} salon={salon} onRefresh={load} />
                        <button className="btn-ghost" onClick={()=>{setEditAppt(a);setShowModal(true)}} style={{padding:'6px 8px'}}>
                          <Edit size={13} color="var(--muted)"/>
                        </button>
                        <button className="btn-danger" onClick={()=>del(a.id)} style={{padding:'6px 8px'}}>
                          <Trash size={13} color="var(--danger)"/>
                        </button>
                      </div>
                    </div>
                    {/* Botões Concluir e Remarcar — visíveis para agendamentos */}
                    {isAgendado&&(
                      <div style={{display:'flex',gap:8,marginLeft:60,flexWrap:'wrap'}}>
                        <button onClick={()=>setConcludeModal(a)}
                          style={{flex:'1 1 140px',display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                            padding:'10px 16px',borderRadius:10,border:'none',
                            background:'var(--navy-600)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',minHeight:42}}>
                          <Check size={14} color="#fff"/> Concluir
                        </button>
                        <button onClick={()=>setRemarcarModal(a)}
                          style={{flex:'1 1 110px',display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                            padding:'10px 16px',borderRadius:10,border:'1.5px solid var(--navy-200)',
                            background:'var(--navy-50)',color:'var(--navy-700)',fontSize:13,fontWeight:700,cursor:'pointer',minHeight:42}}>
                          ↻ Remarcar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
          }
        </div>
      )}

      {showModal&&salon&&<AgModal salonId={salon.id} appt={editAppt} onClose={()=>setShowModal(false)} onSaved={load} />}
      {remarcarModal && (
        <RemarcarModal
          appt={remarcarModal}
          salonName={salon?.name}
          salon={salon}
          salonId={salon?.id}
          schedCfg={schedCfg}
          onClose={()=>setRemarcarModal(null)}
          onSaved={()=>{ load(); setRemarcarModal(null) }}
        />
      )}
      {concludeModal && (
        <ConcludeModal
          appt={concludeModal}
          salonName={salon?.name}
          onClose={()=>setConcludeModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
