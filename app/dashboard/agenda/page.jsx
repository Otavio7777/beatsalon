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

/* Modal de conclusão de atendimento */
function ConcludeModal({ appt, salonName, onClose, onSaved }) {
  const [mode,    setMode]    = useState('normal') // normal | faltou
  const [payment, setPayment] = useState('')
  const [remarcar,setRemarcar]= useState(false)
  const [saving,  setSaving]  = useState(false)
  const sb = createClient()

  const PAGAMENTOS = [
    { id:'pix',      label:'PIX',             icon:'💠' },
    { id:'dinheiro', label:'Dinheiro',         icon:'💵' },
    { id:'debito',   label:'Cartão Débito',    icon:'💳' },
    { id:'credito',  label:'Cartão Crédito',   icon:'💳' },
  ]

  const save = async () => {
    setSaving(true)
    if (mode === 'faltou') {
      await sb.from('appointments').update({ status:'faltou', no_show:true, reschedule_requested:remarcar }).eq('id', appt.id)
    } else {
      if (!payment) { setSaving(false); return }
      await sb.from('appointments').update({ status:'concluido', payment_method:payment }).eq('id', appt.id)
      // Atualiza LTV do cliente
      if (appt.client_id && appt.value > 0) {
        const { data:cl } = await sb.from('clients').select('ltv,visit_count').eq('id',appt.client_id).single()
        if (cl) await sb.from('clients').update({ ltv:(cl.ltv||0)+(appt.value||0), visit_count:(cl.visit_count||0)+1, last_visit:appt.date?.slice(0,10), status:'ativo' }).eq('id',appt.client_id)
      }
    }
    setSaving(false); onSaved(); onClose()
  }

  const phone = appt.notes?.match(/\d{10,11}/)?.[0]
  const waRemarcar = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${appt.client_name}! Sentimos sua falta hoje. Gostaria de remarcar seu horário? 😊`)}` : null

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:18,padding:'28px',width:'100%',maxWidth:420,boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
        <div style={{fontSize:17,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Concluir atendimento</div>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>{appt.client_name} · {appt.service_name} · {fmtHM(appt.date)}</div>

        {/* Modo: normal ou faltou */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
          {[['normal','Atendimento realizado'],['faltou','Cliente não compareceu']].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)}
              style={{padding:'10px',borderRadius:10,border:`2px solid ${mode===m?'var(--navy-600)':'var(--border)'}`,background:mode===m?'var(--navy-50)':'#fff',color:mode===m?'var(--navy-700)':'var(--muted)',fontSize:12,fontWeight:700,cursor:'pointer',textAlign:'center'}}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'normal' && (
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Forma de pagamento recebida *</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              {PAGAMENTOS.map(p=>(
                <button key={p.id} onClick={()=>setPayment(p.id)}
                  style={{padding:'10px',borderRadius:10,border:`2px solid ${payment===p.id?'var(--navy-600)':'var(--border)'}`,background:payment===p.id?'var(--navy-50)':'#fff',color:payment===p.id?'var(--navy-700)':'var(--text)',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <span>{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'faltou' && (
          <div style={{marginBottom:20}}>
            <div style={{background:'var(--warning-light)',borderRadius:10,padding:'12px 14px',border:'1px solid var(--warning)',marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:'#92400E'}}>Cliente não compareceu</div>
              <div style={{fontSize:12,color:'#78350F',marginTop:3}}>O agendamento será marcado como "Faltou".</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setRemarcar(r=>!r)}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${remarcar?'var(--navy-600)':'var(--border)'}`,background:remarcar?'var(--navy-600)':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {remarcar&&<span style={{color:'#fff',fontSize:12,fontWeight:800}}>✓</span>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Deseja remarcar o horário?</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Aparecerá link para WhatsApp do cliente</div>
              </div>
            </div>
            {remarcar&&waRemarcar&&(
              <a href={waRemarcar} target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:8,marginTop:12,padding:'10px 14px',background:'#ECFDF5',border:'1px solid #6EE7B7',borderRadius:10,color:'#065F46',fontSize:13,fontWeight:700,textDecoration:'none'}}>
                <span>💬</span> Enviar mensagem para remarcar
              </a>
            )}
          </div>
        )}

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'9px 18px',borderRadius:9,border:'1px solid var(--border)',background:'#fff',color:'var(--muted)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
          <button onClick={save} disabled={saving||(mode==='normal'&&!payment)}
            style={{padding:'9px 20px',borderRadius:9,border:'none',background:saving||(mode==='normal'&&!payment)?'var(--gray-200)':'var(--navy-600)',color:saving||(mode==='normal'&&!payment)?'var(--muted)':'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {saving?'Salvando...':'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const { salon, user, loading:sl } = useSalon()
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [concludeModal, setConcludeModal] = useState(null)
  const [currDate, setCurrDate] = useState(()=>today())
  const [view, setView]       = useState('semana')
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
          {loading ? <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>
          : appts.length===0 ? <div style={{padding:32,textAlign:'center',color:'var(--muted)',fontSize:13}}>Nenhum agendamento. Clique em "Agendar" para começar.</div>
          : appts.map((a,i)=>{
            const cfg = STATUS[a.status]||STATUS.agendado
            const dt  = new Date(a.date)
            return (
              <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 16px',borderBottom:i<appts.length-1?'1px solid var(--gray-100)':'none'}}>
                <div style={{minWidth:50,textAlign:'center',background:'var(--navy-50)',borderRadius:10,padding:'6px 4px',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--navy-600)'}}>{dt.getDate()}</div>
                  <div style={{fontSize:9,color:'var(--muted)',fontWeight:600}}>{MS[dt.getMonth()]}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--navy-500)',marginTop:2}}>{fmtHM(a.date)}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:13}}>
                      {a.client_name}
                      {a.client_id&&<span style={{fontSize:10,color:'var(--navy-500)',marginLeft:4}}>🔗</span>}
                    </span>
                    <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                    {a.service_name||'–'}{a.value?` · R$${Number(a.value).toLocaleString('pt-BR')}`:''}{a.notes?` · ${a.notes.substring(0,30)}...`:''}
                  </div>
                </div>
                <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
                  {a.status==='agendado'&&<button className="btn-success" onClick={()=>setConcludeModal(a)} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}><Check size={11} color="var(--success)"/> Concluir</button>}
                  <WaPanel appt={a} salon={salon} onRefresh={load} />
                  <button className="btn-ghost" onClick={()=>{setEditAppt(a);setShowModal(true)}} title="Editar"><Edit size={12} color="var(--muted)"/></button>
                  <button className="btn-danger" onClick={()=>del(a.id)} title="Remover"><Trash size={12} color="var(--danger)"/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal&&salon&&<AgModal salonId={salon.id} appt={editAppt} onClose={()=>setShowModal(false)} onSaved={load} />}
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
