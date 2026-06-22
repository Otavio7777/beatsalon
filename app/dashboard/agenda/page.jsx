'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import { Calendar, Plus, Check, Edit, Trash, MessageSquare, Phone } from '../../../lib/icons'

const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MS    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS = {
  agendado:  {bg:'var(--navy-100)',color:'var(--navy-700)',label:'Agendado'},
  concluido: {bg:'var(--success-light)',color:'var(--success)',label:'Concluído'},
  cancelado: {bg:'var(--danger-light)',color:'var(--danger)',label:'Cancelado'},
  faltou:    {bg:'var(--warning-light)',color:'var(--warning)',label:'Faltou'},
}

function isTodayAppt(a) { if (!a?.date) return false; const dt = a.date.slice(0,10); return dt === today().toISOString().slice(0,10) }
function today() { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()) }
function fmtHM(iso) { return iso?.slice(11,16)||'' }

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
            {crmMsg.type==='new'?'✨ Novo cliente criado:':'🔗 Vinculado a:'} <strong>{crmMsg.name}</strong>
          </div>
        )}
        <div className="modal-title">{appt?.id?'Editar':'Novo'} agendamento</div>

        {/* Busca cliente */}
        <label style={lS}>Cliente * <span style={{color:'var(--navy-500)',fontWeight:400,textTransform:'none'}}>— busque ou digite</span></label>
        {form.client_id ? (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 13px',borderRadius:'var(--radius)',border:'2px solid var(--navy-400)',background:'var(--navy-50)'}}>
            <span style={{fontWeight:700,color:'var(--navy-700)',flex:1,fontSize:13}}>👤 {form.client_name}</span>
            <span style={{cursor:'pointer',color:'var(--muted)',fontSize:16}} onClick={clearClient}>✕</span>
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
            <label style={lS}>WhatsApp <span style={{color:'var(--navy-500)',fontWeight:400,textTransform:'none'}}>— auto-vincula ao CRM 🔗</span></label>
            <input style={iS} placeholder="(00) 00000-0000" value={form.client_phone||''} onChange={e=>set('client_phone',e.target.value)} inputMode="tel" />
          </div>
        )}

        {/* Serviço */}
        <label style={lS}>Serviço</label>
        {services.length>0 ? (
          <select style={{...iS}} value={form.service_name} onChange={e=>set('service_name',e.target.value)}>
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
    { label:'Lembrete 24h', icon:'🔔', href: waLink(fone, waLembrete(appt, salon?.name)), cond: appt.status==='agendado' },
    { label:'Confirmar',    icon:'✅', href: waLink(fone, waConfirmar(appt, salon?.name)), cond: appt.status==='agendado' },
    { label:'Obrigado',     icon:'🙏', href: waLink(fone, waObrigado(appt, salon?.name)),  cond: appt.status==='concluido' },
    { label:'Remarcar',     icon:'📅', href: waLink(fone, waRemarcar(appt, salon?.name)),  cond: appt.status==='faltou'||appt.status==='cancelado' },
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
                <span>{m.icon}</span> {m.label}
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
function RemarcarModal({ appt, salonName, onClose, onSaved }) {
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [saving,   setSaving]  = useState(false)
  const [saved,    setSaved]   = useState(false)
  const sb = createClient()

  // Gera horários das 07:00 às 21:00 de 30 em 30 min
  const horas = []
  for (let m = 7*60; m <= 21*60; m += 30) {
    horas.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`)
  }

  const msgWa = novaData && novaHora
    ? `Olá ${appt.client_name?.split(' ')[0]}! 📅 Seu horário de *${appt.service_name||'atendimento'}* em *${salonName}* foi remarcado para *${new Date(novaData+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}* às *${novaHora}*. Aguardamos você! 🙂`
    : ''

  const phone = appt.notes?.match(/\d{10,11}/)?.[0]
  const waLink = phone && msgWa ? `https://wa.me/55${phone}?text=${encodeURIComponent(msgWa)}` : null

  const save = async () => {
    if (!novaData || !novaHora) return
    setSaving(true)
    const newDate = `${novaData}T${novaHora}:00`
    await sb.from('appointments').update({
      date: newDate,
      status: 'agendado',
      reschedule_requested: false,
    }).eq('id', appt.id)
    setSaving(false)
    setSaved(true)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={{fontSize:16,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Remarcar atendimento</div>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>
          {appt.client_name} · {appt.service_name}
          {appt.date && <span> · agendado para {new Date(appt.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} às {fmtHM(appt.date)}</span>}
        </div>

        <label className="inp-label">Nova data *</label>
        <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}
          min={new Date().toISOString().slice(0,10)}
          className="inp-field"/>

        <label className="inp-label" style={{marginTop:14}}>Novo horário *</label>
        <select value={novaHora} onChange={e=>setNovaHora(e.target.value)} className="inp-field" style={{cursor:'pointer'}}>
          <option value="">Selecione o horário</option>
          {horas.map(h=><option key={h} value={h}>{h}</option>)}
        </select>

        {/* Preview mensagem WhatsApp */}
        {msgWa && (
          <div style={{marginTop:16,padding:'12px 14px',background:'#ECE5DD',borderRadius:12}}>
            <div style={{fontSize:10,fontWeight:700,color:'#4A4A4A',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Mensagem para o cliente</div>
            <div style={{background:'#fff',borderRadius:'12px 12px 12px 4px',padding:'10px 12px',fontSize:13,color:'#1C1C1C',lineHeight:1.6,display:'inline-block',maxWidth:'90%',boxShadow:'0 1px 3px rgba(0,0,0,.1)'}}>
              {msgWa}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:10,marginTop:18,flexWrap:'wrap'}}>
          {!saved ? (
            <>
              <button onClick={save} disabled={saving||!novaData||!novaHora}
                className="btn-primary" style={{flex:1,justifyContent:'center'}}>
                {saving?'Salvando...':'Remarcar'}
              </button>
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  style={{display:'flex',alignItems:'center',gap:7,padding:'11px 16px',background:'#25D366',borderRadius:'var(--radius)',color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none',flex:1,justifyContent:'center'}}>
                  💬 Avisar cliente
                </a>
              )}
            </>
          ) : (
            <div style={{flex:1,padding:'11px 14px',background:'var(--success-light)',borderRadius:'var(--radius)',border:'1px solid #6EE7B7',color:'var(--success)',fontWeight:700,fontSize:13,textAlign:'center'}}>
              ✓ Remarcado!
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  style={{marginLeft:10,color:'#25D366',fontWeight:700}}>
                  Enviar WhatsApp →
                </a>
              )}
            </div>
          )}
        </div>

        <button onClick={onClose}
          style={{width:'100%',marginTop:10,padding:'10px',borderRadius:'var(--radius)',border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          Fechar
        </button>
      </div>
    </div>
  )
}

/* Modal de conclusão de atendimento */
function ConcludeModal({ appt, salonName, onClose, onSaved }) {
  const [mode,    setMode]    = useState('normal')
  const [payment, setPayment] = useState('')
  const [remarcar,setRemarcar]= useState(false)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [done,    setDone]    = useState(false)
  const sb = createClient()

  const PAGAMENTOS = [
    { id:'pix',      label:'PIX',          icon:'💠' },
    { id:'dinheiro', label:'Dinheiro',      icon:'💵' },
    { id:'debito',   label:'Débito',        icon:'💳' },
    { id:'credito',  label:'Crédito',       icon:'💳' },
  ]

  const phone = appt.notes?.match(/\d{10,11}/)?.[0] || appt.client_phone?.replace(/\D/g,'')
  const waFaltou  = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá, ${appt.client_name?.split(' ')[0]}! Sentimos sua falta hoje. Gostaria de remarcar? 😊`)}` : null
  const waPos = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Obrigado pela visita, ${appt.client_name?.split(' ')[0]}! 🙏 Foi um prazer te atender em *${salonName||'nosso salão'}*. Para reagendar é só chamar! 😊`)}` : null

  const save = async () => {
    if (mode === 'normal' && !payment) { setErr('Selecione a forma de pagamento.'); return }
    setSaving(true); setErr('')

    try {
      if (mode === 'faltou') {
        /* ── Marcar como faltou ── */
        const { error } = await sb.from('appointments')
          .update({ status: 'faltou' })
          .eq('id', appt.id)
        if (error) throw new Error(error.message)

      } else {
        /* ── Marcar como concluído ── */
        // 1. Atualiza o agendamento
        const upd = { status: 'concluido', payment_method: payment }
        const { error: e1 } = await sb.from('appointments').update(upd).eq('id', appt.id)
        if (e1) {
          // payment_method pode não existir — tenta sem
          const { error: e2 } = await sb.from('appointments').update({ status:'concluido' }).eq('id', appt.id)
          if (e2) throw new Error(e2.message)
        }

        // 2. Atualiza CRM do cliente (diretamente, sem RPC)
        if (appt.client_id) {
          const { data: cl } = await sb.from('clients')
            .select('ltv,visit_count,first_visit')
            .eq('id', appt.client_id)
            .maybeSingle()

          const apptDate = appt.date?.slice(0,10) || new Date().toISOString().slice(0,10)
          const crmUpd = {
            last_visit:  apptDate,
            status:      'ativo',
            visit_count: (cl?.visit_count || 0) + 1,
            ltv:         parseFloat(((cl?.ltv||0) + (appt.value||0)).toFixed(2)),
          }
          if (!cl?.first_visit) crmUpd.first_visit = apptDate

          await sb.from('clients').update(crmUpd).eq('id', appt.client_id)
        }
      }

      setSaving(false)
      setDone(true)
      onSaved() // recarrega a lista imediatamente

    } catch(e) {
      setErr(e.message || 'Erro ao salvar. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:520,
        boxShadow:'0 -8px 40px rgba(0,0,0,.2)',maxHeight:'90vh',overflowY:'auto'}}>

        {/* Handle */}
        <div style={{width:40,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 20px'}}/>

        {/* Cabeçalho */}
        <div style={{fontSize:17,fontWeight:800,color:'#0B1E3D',marginBottom:2}}>Concluir atendimento</div>
        <div style={{fontSize:13,color:'#64748B',marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F1F5F9'}}>
          <strong style={{color:'#0B1E3D'}}>{appt.client_name}</strong> · {appt.service_name}
          {appt.date&&<span> · {new Date(appt.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} às {fmtHM(appt.date)}</span>}
          {appt.value>0&&<span style={{color:'#059669',fontWeight:700,marginLeft:6}}>R${Number(appt.value).toLocaleString('pt-BR')}</span>}
        </div>

        {/* Estado: concluído ✓ */}
        {done ? (
          <div>
            {mode==='normal' ? (
              <div>
                <div style={{textAlign:'center',padding:'8px 0 20px'}}>
                  <div style={{fontSize:48,marginBottom:8}}>✅</div>
                  <div style={{fontSize:17,fontWeight:800,color:'#059669',marginBottom:4}}>Atendimento concluído!</div>
                  <div style={{fontSize:13,color:'#64748B'}}>Pagamento via <strong>{PAGAMENTOS.find(p=>p.id===payment)?.label}</strong> · CRM atualizado</div>
                </div>
                {waPos&&(
                  <a href={waPos} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px',borderRadius:12,background:'#25D366',color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none',marginBottom:10}}>
                    💬 Enviar mensagem pós-atendimento
                  </a>
                )}
                <button onClick={onClose}
                  style={{width:'100%',padding:'12px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  Fechar
                </button>
              </div>
            ) : (
              <div>
                <div style={{textAlign:'center',padding:'8px 0 20px'}}>
                  <div style={{fontSize:48,marginBottom:8}}>📋</div>
                  <div style={{fontSize:17,fontWeight:800,color:'#D97706',marginBottom:4}}>Registrado como faltou</div>
                  <div style={{fontSize:13,color:'#64748B'}}>O agendamento foi atualizado.</div>
                </div>
                {waFaltou&&(
                  <a href={waFaltou} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px',borderRadius:12,background:'#25D366',color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none',marginBottom:10}}>
                    💬 Avisar cliente
                  </a>
                )}
                <button onClick={onClose}
                  style={{width:'100%',padding:'12px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Modo */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:18}}>
              {[['normal','✓  Atendimento realizado'],['faltou','✗  Cliente não veio']].map(([m,l])=>(
                <button key={m} onClick={()=>setMode(m)}
                  style={{padding:'11px 8px',borderRadius:11,border:`2px solid ${mode===m?'#0B1E3D':'#E2E8F0'}`,
                    background:mode===m?'#0B1E3D':'#fff',color:mode===m?'#fff':'#64748B',
                    fontSize:12,fontWeight:700,cursor:'pointer',textAlign:'center',lineHeight:1.4}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Pagamento */}
            {mode==='normal'&&(
              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>
                  Forma de pagamento *
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {PAGAMENTOS.map(p=>(
                    <button key={p.id} onClick={()=>{ setPayment(p.id); setErr('') }}
                      style={{padding:'12px 10px',borderRadius:11,border:`2px solid ${payment===p.id?'#0B1E3D':'#E2E8F0'}`,
                        background:payment===p.id?'#0B1E3D':'#fff',color:payment===p.id?'#fff':'#1E293B',
                        fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:46}}>
                      <span>{p.icon}</span>{p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Faltou — remarcar */}
            {mode==='faltou'&&(
              <div style={{marginBottom:18,padding:'14px',background:'#FFFBEB',borderRadius:12,border:'1px solid #FCD34D'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#92400E',marginBottom:3}}>Cliente não compareceu</div>
                <div style={{fontSize:12,color:'#78350F'}}>O agendamento ficará com status "Faltou".</div>
              </div>
            )}

            {/* Erro */}
            {err&&<div style={{padding:'9px 14px',background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,fontSize:13,color:'#DC2626',fontWeight:600,marginBottom:14}}>{err}</div>}

            {/* Botão confirmar */}
            <button onClick={save} disabled={saving||(mode==='normal'&&!payment)}
              style={{width:'100%',padding:'14px',borderRadius:12,border:'none',fontSize:14,fontWeight:700,cursor:'pointer',
                background:saving||(mode==='normal'&&!payment)?'#E2E8F0':'#0B1E3D',
                color:saving||(mode==='normal'&&!payment)?'#94A3B8':'#fff',
                marginBottom:10}}>
              {saving?'Salvando...' : mode==='normal'?'Confirmar conclusão':'Registrar faltou'}
            </button>
            <button onClick={onClose}
              style={{width:'100%',padding:'12px',borderRadius:12,border:'1px solid #E2E8F0',background:'transparent',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              Cancelar
            </button>
          </div>
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
  const [currDate, setCurrDate] = useState(()=>today())
  const [view, setView]       = useState('lista')
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt]  = useState(null)
  const sb = createClient()

  const load = useCallback(async()=>{
    if (!salon?.id) return
    setLoading(true)
    const {data} = await sb.from('appointments').select('*').eq('salon_id',salon.id).order('date')
    setAppts(data||[])
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
    receita: appts.filter(a=>a.status==='concluido'&&a.date?.startsWith(new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'))).reduce((s,a)=>s+(a.value||0),0),
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
        <button className="btn-secondary" onClick={()=>setCurrDate(d=>{ const n=new Date(d); view==='semana'?n.setDate(n.getDate()-7):n.setMonth(n.getMonth()-1); return n })}>‹</button>
        <span style={{fontWeight:700,fontSize:14,minWidth:180,textAlign:'center',color:'var(--navy-900)'}}>
          {view==='semana' ? `${weekDays()[0].getDate()}–${weekDays()[6].getDate()} de ${MESES[weekDays()[6].getMonth()]}` : `${MESES[currDate.getMonth()]} ${currDate.getFullYear()}`}
        </span>
        <button className="btn-secondary" onClick={()=>setCurrDate(d=>{ const n=new Date(d); view==='semana'?n.setDate(n.getDate()+7):n.setMonth(n.getMonth()+1); return n })}>›</button>
        <button className="btn-secondary" onClick={()=>setCurrDate(today())}>Hoje</button>
        <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
          {['semana','lista'].map(v=>(
            <button key={v} className={`filter-btn${view===v?' active':''}`} onClick={()=>setView(v)}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
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
                        {a.client_id&&<span title="Vinculado ao CRM" style={{marginLeft:2}}>🔗</span>}
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
                        {a.cut_preference&&<div style={{fontSize:11,color:'var(--navy-500)',marginTop:2}}>✂️ {a.cut_preference}</div>}
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
