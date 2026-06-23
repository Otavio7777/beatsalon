'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import Link from 'next/link'
import { Users, Plus, Search, MessageSquare, Phone, Edit, Trash, ChevronRight, AlertCircle, Calendar } from '../../../lib/icons'

const STATUS_CFG = {
  ativo:    { bg:'var(--success-light)', color:'var(--success)',  label:'Ativo' },
  em_risco: { bg:'var(--warning-light)', color:'var(--warning)', label:'Em risco' },
  inativo:  { bg:'var(--danger-light)',  color:'var(--danger)',  label:'Inativo' },
}
const CANAL_ICONS = { instagram:'📸', google:'🔍', indicacao:'🤝', whatsapp:'💬', agendamento_online:'🔗', link_agendamento:'🔗', outro:'⭐' }

function diasSemVisita(last) {
  if (!last) return null
  return Math.floor((Date.now()-new Date(last).getTime())/86400000)
}

/* Mensagens WhatsApp */
const WA_MSGS = {
  retorno:     (name, salonName) => `Olá ${name?.split(' ')[0]}! 👋 Sentimos sua falta no *${salonName}*. Que tal agendar um horário? Temos novidades esperando por você! ✨`,
  aniversario: (name, salonName) => `Feliz aniversário, ${name?.split(' ')[0]}! 🎉🎂 O time do *${salonName}* deseja um dia incrível! Que tal uma visita especial de aniversário? 🎁`,
  proximo:     (name, svc, data, salonName) => `Olá ${name?.split(' ')[0]}! ✂️ Lembrando que você tem *${svc}* agendado em *${data}* no *${salonName}*. Confirme presença!`,
  promo:       (name, salonName) => `Olá ${name?.split(' ')[0]}! 🌟 Temos novidades incríveis esperando por você no *${salonName}*. Agende já o seu horário e garanta sua vaga! 💪`,
  agradecimento:(name,salonName) => `Olá ${name?.split(' ')[0]}! 😊 Foi um prazer te atender no *${salonName}*. Esperamos ter superado suas expectativas! Volte sempre 💙`,
}

function waHref(phone, msg) {
  if (!phone) return null
  return `https://wa.me/55${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
}

/* Modal adicionar/editar cliente */
function ClienteModal({ salonId, cliente, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', phone:'', email:'', canal:'indicacao', status:'ativo', main_service:'', notes:'',
    avatar_color:'#1B3057', ...cliente
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {...form, salon_id:salonId}
    const {error} = cliente?.id
      ? await sb.from('clients').update(payload).eq('id',cliente.id)
      : await sb.from('clients').insert(payload)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  const COLORS = ['#1B3057','#059669','#DC2626','#D97706','#7C3AED','#0891B2','#BE185D','#374151']
  const iS = {width:'100%',padding:'9px 13px',borderRadius:'var(--radius)',border:'1px solid var(--border)',fontSize:13,outline:'none',boxSizing:'border-box',background:'var(--white)',color:'var(--text)'}
  const lS = {display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,marginTop:12}

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-title">{cliente?.id?'Editar cliente':'Novo cliente'}</div>
        <label style={lS}>Nome *</label>
        <input style={iS} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nome completo" autoFocus />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div>
            <label style={lS}>WhatsApp</label>
            <input style={iS} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
          </div>
          <div>
            <label style={lS}>E-mail</label>
            <input style={iS} value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@..." type="email" />
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div>
            <label style={lS}>Canal</label>
            <select style={{...iS}} value={form.canal} onChange={e=>set('canal',e.target.value)}>
              {Object.entries({indicacao:'Indicação',instagram:'Instagram',google:'Google',whatsapp:'WhatsApp',agendamento_online:'Link agendamento',outro:'Outro'}).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={lS}>Status</label>
            <select style={{...iS}} value={form.status} onChange={e=>set('status',e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="em_risco">Em risco</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
        <label style={lS}>Serviço principal</label>
        <input style={iS} value={form.main_service} onChange={e=>set('main_service',e.target.value)} placeholder="Ex: Corte, Barba..." />
        <label style={lS}>Observações</label>
        <input style={iS} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Anotações sobre o cliente..." />
        <label style={lS}>Cor do avatar</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
          {COLORS.map(c=>(
            <div key={c} onClick={()=>set('avatar_color',c)}
              style={{width:28,height:28,borderRadius:14,background:c,cursor:'pointer',border:`3px solid ${form.avatar_color===c?'var(--gray-800)':'transparent'}`,transition:'border .15s'}}/>
          ))}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving?'Salvando...':'Salvar cliente'}</button>
        </div>
      </div>
    </div>
  )
}

/* Painel de ações WhatsApp por cliente */
function ClienteWaPanel({ client, nextAppt, salonName }) {
  const [open, setOpen] = useState(false)
  if (!client.phone) return <span style={{fontSize:11,color:'var(--gray-300)'}}>Sem telefone</span>

  const dias = diasSemVisita(client.last_visit)
  const actions = [
    { label:'Retorno',      icon:'👋', msg: WA_MSGS.retorno(client.name, salonName),      show: dias!==null&&dias>=21 },
    { label:'Aniversário',  icon:'🎂', msg: WA_MSGS.aniversario(client.name, salonName),  show: true },
    { label:'Promoção',     icon:'🌟', msg: WA_MSGS.promo(client.name, salonName),        show: true },
    { label:'Agradecimento',icon:'🙏', msg: WA_MSGS.agradecimento(client.name, salonName),show: true },
    { label:'Ligar',        icon:'📞', href: `tel:${client.phone.replace(/\D/g,'')}`,     show: true, isTel:true },
  ]

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} title="Ações de contato"
        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,border:'1px solid #D1FAE5',background:'#ECFDF5',color:'#059669',fontSize:11,fontWeight:700,cursor:'pointer'}}>
        <MessageSquare size={11} color="#059669" /> Contato
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:49}}/>
          <div style={{position:'absolute',right:0,top:'110%',background:'var(--white)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:50,minWidth:180,padding:6}}>
            {actions.filter(a=>a.show).map(a=>{
              const href = a.isTel ? a.href : waHref(client.phone, a.msg)
              return href ? (
                <a key={a.label} href={href} target={a.isTel?'_self':'_blank'} rel="noreferrer"
                  style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,textDecoration:'none',color:'var(--text)',fontSize:13,fontWeight:600,transition:'background .1s'}}
                  onClick={()=>setOpen(false)}>
                  <span style={{fontSize:16}}>{a.icon}</span> {a.label}
                </a>
              ) : null
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function ClientesPage() {
  const { salon, user, loading:sl } = useSalon()
  const [clients,  setClients]   = useState([])
  const [appts,    setAppts]     = useState([])
  const [loading,  setLoading]   = useState(true)
  const [search,   setSearch]    = useState('')
  const [filter,   setFilter]    = useState('todos')
  const [showModal,setShowModal] = useState(false)
  const [editC,    setEditC]     = useState(null)
  const sb = createClient()

  const load = useCallback(async()=>{
    if (!salon?.id) return
    setLoading(true)
    const [{ data:cl },{ data:ap }] = await Promise.all([
      sb.from('clients').select('*, barbers!clients_last_barber_id_fkey(id,name,color)').eq('salon_id',salon.id).order('name'),
      sb.from('appointments').select('id,client_id,service_name,date,status').eq('salon_id',salon.id)
        .gte('date',new Date().toISOString()).in('status',['agendado']).order('date'),
    ])
    setClients(cl||[])
    setAppts(ap||[])
    setLoading(false)
  },[salon?.id])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const del = async(id)=>{ if(!confirm('Remover cliente?')) return; await sb.from('clients').delete().eq('id',id); load() }

  const nextAppt = (cid) => appts.find(a=>a.client_id===cid)

  const filtered = clients.filter(c=>{
    const ms = c.name?.toLowerCase().includes(search.toLowerCase())||(c.phone||'').includes(search)
    const mf = filter==='todos'||c.status===filter
    return ms&&mf
  })

  const counts = {
    total:    clients.length,
    ativos:   clients.filter(c=>c.status==='ativo').length,
    emRisco:  clients.filter(c=>c.status==='em_risco').length,
    inativos: clients.filter(c=>c.status==='inativo').length,
    ltv:      clients.reduce((s,c)=>s+(c.ltv||0),0),
  }

  if (sl) return <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Clientes — CRM</div>
        <div className="pg-sub">Gestão de relacionamento · {salon?.name}</div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{marginBottom:16}}>
        <div className="mc"><div className="mc-label">Total</div><div className="mc-value">{counts.total}</div><div className="mc-desc">cadastrados</div></div>
        <div className="mc"><div className="mc-label">Ativos</div><div className="mc-value" style={{color:'var(--success)'}}>{counts.ativos}</div><div className="mc-desc">visitaram recente</div></div>
        <div className="mc"><div className="mc-label">Em risco</div><div className="mc-value" style={{color:'var(--warning)'}}>{counts.emRisco}</div><div className="mc-desc">sem visita recente</div></div>
        <div className="mc"><div className="mc-label">LTV total</div><div className="mc-value" style={{color:'var(--navy-600)'}}>R${counts.ltv.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div><div className="mc-desc">faturamento acumulado</div></div>
      </div>

      {/* Alerta em risco */}
      {counts.emRisco>0 && (
        <div className="alert-warn">
          <AlertCircle size={16} color="var(--warning)" style={{flexShrink:0,marginTop:1}} />
          <span>{counts.emRisco} cliente{counts.emRisco>1?'s':''} em risco de abandono — envie uma mensagem de retorno!</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap" style={{flex:1}}>
          <Search size={14} color="var(--muted)" />
          <input className="search-inp" placeholder="Buscar por nome ou telefone..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={()=>{setEditC(null);setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:6}}>
          <Plus size={14} color="#fff" /> Novo cliente
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {[['todos','Todos',counts.total],['ativo','Ativo',counts.ativos],['em_risco','Em risco',counts.emRisco],['inativo','Inativo',counts.inativos]].map(([k,l,n])=>(
          <button key={k} className={`filter-btn${filter===k?' active':''}`} onClick={()=>setFilter(k)}>
            {l} <span style={{opacity:.7}}>({n})</span>
          </button>
        ))}
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>
      ) : filtered.length===0 ? (
        <div style={{padding:32,textAlign:'center',color:'var(--muted)',background:'var(--white)',borderRadius:14,border:'1px solid var(--border)',fontSize:13}}>
          {search||filter!=='todos'?'Nenhum cliente encontrado.':'Nenhum cliente ainda. Clique em "+ Novo cliente" para começar.'}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(c=>{
            const dias  = diasSemVisita(c.last_visit)
            const prox  = nextAppt(c.id)
            const stCfg = STATUS_CFG[c.status]||STATUS_CFG.ativo
            const ini   = c.name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
            const proxDt = prox ? new Date(prox.date) : null
            return (
              <div key={c.id} style={{background:'var(--white)',borderRadius:14,border:'1px solid var(--border)',padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start',boxShadow:'0 1px 3px rgba(0,0,0,.04)',transition:'box-shadow .15s'}}>
                {/* Avatar */}
                <div style={{width:44,height:44,borderRadius:22,background:c.avatar_color||'var(--navy-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,flexShrink:0}}>
                  {ini}
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                    <Link href={`/dashboard/clientes/${c.id}`} style={{fontWeight:700,fontSize:14,color:'var(--navy-900)',textDecoration:'none'}}>
                      {c.name}
                    </Link>
                    <span className="badge" style={{background:stCfg.bg,color:stCfg.color}}>{stCfg.label}</span>
                    {c.canal&&<span style={{fontSize:10,color:'var(--muted)'}}>{CANAL_ICONS[c.canal]||'⭐'} {c.canal}</span>}
                  </div>

                  <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:12,color:'var(--muted)',marginBottom:6}}>
                    {c.phone&&<span>{c.phone}</span>}
                    {c.main_service&&<span>· {c.main_service}</span>}
                    {c.visit_count>0&&<span>· {c.visit_count} visit{c.visit_count>1?'as':'a'}</span>}
                    {c.ltv>0&&<span style={{color:'var(--success)',fontWeight:700}}>· R${Number(c.ltv).toLocaleString('pt-BR',{minimumFractionDigits:0})}</span>}
                    {dias!==null&&<span style={{color:dias>30?'var(--warning)':dias>60?'var(--danger)':'var(--muted)'}}>· {dias}d sem visita</span>}
                  </div>

                  {/* Próximo agendamento */}
                  {prox && (
                    <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--navy-50)',borderRadius:8,padding:'4px 10px',fontSize:11,color:'var(--navy-700)',fontWeight:600,marginBottom:4}}>
                      <Calendar size={11} color="var(--navy-600)" />
                      Próximo: {proxDt.getDate()}/{proxDt.getMonth()+1} às {String(proxDt.getHours()).padStart(2,'0')}:{String(proxDt.getMinutes()).padStart(2,'0')}
                      {prox.service_name&&<span style={{opacity:.7}}>· {prox.service_name}</span>}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end',flexShrink:0}}>
                  <ClienteWaPanel client={c} nextAppt={prox} salonName={salon?.name} />
                  <div style={{display:'flex',gap:5}}>
                    <Link href={`/dashboard/clientes/${c.id}`}>
                      <button className="btn-ghost" title="Ver perfil" style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
                        <ChevronRight size={12} /> Ver
                      </button>
                    </Link>
                    <button className="btn-ghost" onClick={()=>{setEditC(c);setShowModal(true)}} title="Editar">
                      <Edit size={12} color="var(--muted)" />
                    </button>
                    <button className="btn-danger" onClick={()=>del(c.id)} title="Remover">
                      <Trash size={12} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal&&salon&&<ClienteModal salonId={salon.id} cliente={editC} onClose={()=>setShowModal(false)} onSaved={load} />}
    </div>
  )
}
