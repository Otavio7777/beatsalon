'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'

const STATUS_CFG = {
  agendado:  { bg:'#E6F1FB', color:'#0C447C', label:'Agendado' },
  concluido: { bg:'#E1F5EE', color:'#085041', label:'Concluído' },
  cancelado: { bg:'#FCF0F0', color:'#A32D2D', label:'Cancelado' },
  faltou:    { bg:'#FAEEDA', color:'#633806', label:'Faltou' },
}
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function today() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/* ---------- Modal de agendamento com busca de cliente ---------- */
function AgendamentoModal({ salonId, appt, onClose, onSaved }) {
  const [form, setForm] = useState({
    client_name: '', client_id: null, service_name: '', date: '',
    value: '', status: 'agendado', notes: '', ...appt,
  })
  const [clientSearch, setClientSearch] = useState(appt?.client_name || '')
  const [clients, setClients] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef(null)
  const sb = createClient()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await sb.from('clients').select('id, name, phone, main_service').eq('salon_id', salonId).order('name')
      setClients(data || [])
    }
    fetchClients()
  }, [salonId])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  )

  const selectClient = (client) => {
    setClientSearch(client.name)
    set('client_name', client.name)
    set('client_id', client.id)
    if (!form.service_name && client.main_service) set('service_name', client.main_service)
    setShowDropdown(false)
  }

  const clearClient = () => {
    setClientSearch('')
    set('client_name', '')
    set('client_id', null)
  }

  /* Atualiza stats do cliente quando status = concluido */
  const updateClientStats = async (clientId, appointmentDate, value, previousStatus) => {
    if (!clientId || previousStatus === 'concluido') return
    const date = appointmentDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    const { data: current } = await sb.from('clients').select('visit_count, ltv, last_visit').eq('id', clientId).single()
    if (!current) return
    await sb.from('clients').update({
      visit_count: (current.visit_count || 0) + 1,
      ltv: (current.ltv || 0) + (Number(value) || 0),
      last_visit: date,
      status: 'ativo',
    }).eq('id', clientId)
  }

  const save = async () => {
    if (!form.client_name || !form.date) return
    setSaving(true)
    const payload = {
      client_name: form.client_name,
      client_id: form.client_id || null,
      service_name: form.service_name,
      date: form.date,
      value: Number(form.value) || 0,
      status: form.status,
      notes: form.notes,
      salon_id: salonId,
    }
    if (appt?.id) {
      const { error } = await sb.from('appointments').update(payload).eq('id', appt.id)
      if (!error && form.status === 'concluido' && form.client_id) {
        await updateClientStats(form.client_id, form.date, form.value, appt.status)
      }
    } else {
      const { error } = await sb.from('appointments').insert(payload)
      if (!error && form.status === 'concluido' && form.client_id) {
        await updateClientStats(form.client_id, form.date, form.value, null)
      }
    }
    onSaved(); onClose()
    setSaving(false)
  }

  const s = {
    overlay: 'REPLACED_OVERLAY',
    box:    { background:'#fff',borderRadius:20,padding:'28px',width:'100%',maxWidth:460,maxHeight:'90vh',overflowY:'auto' },
    hd:     { fontSize:18,fontWeight:800,marginBottom:18 },
    label:  { fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,display:'block',marginTop:12 },
    input:  { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',color:'#1A1825',boxSizing:'border-box' },
    select: { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',background:'#fff',color:'#1A1825' },
    grid2:  { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 },
    foot:   { display:'flex',gap:10,justifyContent:'flex-end',marginTop:20,paddingTop:16,borderTop:'1px solid #E3E1F0' },
    drop:   { position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #E3E1F0',borderRadius:9,boxShadow:'0 4px 16px rgba(0,0,0,.1)',zIndex:100,maxHeight:180,overflowY:'auto',marginTop:2 },
    dropItem:{ padding:'9px 14px',cursor:'pointer',fontSize:13,borderBottom:'1px solid #F2F1F8' },
    clientBox:{ position:'relative' },
    selectedClient:{ display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:9,border:'1px solid #534AB7',background:'#EEEDFE',fontSize:13,fontWeight:600,color:'#534AB7' },
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={s.hd}>{appt?.id ? 'Editar agendamento' : 'Novo agendamento'}</div>

        {/* Busca de cliente */}
        <label style={s.label}>Cliente * <span style={{color:'#534AB7',fontWeight:400,textTransform:'none'}}>(selecione do CRM ou digite)</span></label>
        {form.client_id ? (
          <div style={s.selectedClient}>
            <span>👤 {form.client_name}</span>
            <span style={{marginLeft:'auto',cursor:'pointer',color:'#8A87A0',fontSize:16}} onClick={clearClient}>✕</span>
          </div>
        ) : (
          <div style={s.clientBox} ref={searchRef}>
            <input
              style={s.input}
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); set('client_name', e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Buscar cliente ou digitar nome..."
            />
            {showDropdown && clientSearch.length > 0 && filtered.length > 0 && (
              <div style={s.drop}>
                {filtered.map(c => (
                  <div key={c.id} style={s.dropItem}
                    onMouseDown={() => selectClient(c)}>
                    <span style={{fontWeight:600}}>{c.name}</span>
                    {c.phone && <span style={{color:'#8A87A0',marginLeft:8,fontSize:11}}>{c.phone}</span>}
                    {c.main_service && <span style={{color:'#534AB7',marginLeft:8,fontSize:11}}>· {c.main_service}</span>}
                  </div>
                ))}
                {filtered.length === 0 && clientSearch && (
                  <div style={{...s.dropItem,color:'#8A87A0'}}>Usar "{clientSearch}" como novo cliente</div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={s.grid2}>
          <div>
            <label style={s.label}>Serviço</label>
            <input style={s.input} value={form.service_name} onChange={e => set('service_name', e.target.value)} placeholder="Corte, Barba..." />
          </div>
          <div>
            <label style={s.label}>Valor (R$)</label>
            <input style={s.input} type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0" />
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={s.label}>Data e horário *</label>
            <input style={s.input} type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Status</label>
            <select style={s.select} value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Observações</label>
            <input style={s.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        {form.client_id && form.status === 'concluido' && (
          <div style={{background:'#E1F5EE',borderRadius:9,padding:'10px 14px',marginTop:14,fontSize:12,color:'#085041',fontWeight:600}}>
            ✅ Ao salvar, o histórico do cliente será atualizado automaticamente (visitas e LTV).
          </div>
        )}

        <div style={s.foot}>
          <button onClick={onClose} style={{padding:'8px 18px',borderRadius:9,border:'1px solid #E3E1F0',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#8A87A0'}}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{padding:'8px 20px',borderRadius:9,border:'none',background:'#534AB7',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Página principal ---------- */
export default function AgendaPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [appts, setAppts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [currentDate, setCurrentDate] = useState(today())
  const [view, setView]         = useState('semana')
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt] = useState(null)
  const sb = createClient()

  const fetchAppts = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const { data } = await sb.from('appointments').select('*').eq('salon_id', salon.id).order('date')
    setAppts(data || [])
    setLoading(false)
  }, [salon?.id])

  useEffect(() => { fetchAppts() }, [fetchAppts])
  useEffect(() => { if (!salonLoading && !user) window.location.href = '/login' }, [salonLoading, user])

  const del = async (id) => {
    if (!confirm('Remover agendamento?')) return
    await sb.from('appointments').delete().eq('id', id)
    fetchAppts()
  }

  /* Marca como concluído rápido */
  const quickConcluir = async (appt) => {
    await sb.from('appointments').update({ status: 'concluido' }).eq('id', appt.id)
    if (appt.client_id) {
      const date = appt.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)
      const { data: current } = await sb.from('clients').select('visit_count, ltv').eq('id', appt.client_id).single()
      if (current) {
        await sb.from('clients').update({
          visit_count: (current.visit_count || 0) + 1,
          ltv: (current.ltv || 0) + (Number(appt.value) || 0),
          last_visit: date,
          status: 'ativo',
        }).eq('id', appt.client_id)
      }
    }
    fetchAppts()
  }

  const weekStart = (d) => {
    const day = d.getDay()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  }
  const weekDays = () => {
    const start = weekStart(currentDate)
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  const apptsByDate = (date) => {
    const ds = date.toISOString().slice(0, 10)
    return appts.filter(a => a.date?.startsWith(ds)).sort((a, b) => a.date.localeCompare(b.date))
  }
  const isToday = (d) => d.toDateString() === today().toDateString()

  const totalHoje   = appts.filter(a => a.date?.startsWith(today().toISOString().slice(0, 10))).length
  const totalMes    = appts.filter(a => { const d = new Date(a.date); return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() }).length
  const receitaMes  = appts.filter(a => {
    if (a.status !== 'concluido') return false
    const d = new Date(a.date)
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
  }).reduce((s, a) => s + (a.value || 0), 0)

  const st = {
    page:    { padding:'28px 32px', maxWidth:1100 },
    h1:      { fontSize:24, fontWeight:800, color:'#1A1825' },
    sub:     { fontSize:13, color:'#8A87A0', marginTop:3 },
    metrics: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 },
    mc:      { background:'#fff', borderRadius:14, padding:'14px 16px', border:'1px solid #E3E1F0' },
    ml:      { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, marginBottom:5 },
    mv:      { fontSize:22, fontWeight:800 },
    md:      { fontSize:11, marginTop:4, color:'#8A87A0' },
    toolbar: { display:'flex', gap:10, alignItems:'center', marginBottom:20, flexWrap:'wrap' },
    navBtn:  { padding:'7px 14px', borderRadius:8, border:'1px solid #E3E1F0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#534AB7' },
    viewBtn: { padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #E3E1F0', cursor:'pointer', transition:'all .15s' },
    addBtn:  { padding:'9px 18px', background:'#534AB7', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', marginLeft:'auto', display:'flex', alignItems:'center', gap:6 },
    cal:     { background:'#fff', borderRadius:16, border:'1px solid #E3E1F0', overflow:'hidden' },
    calHdr:  { display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#F2F1F8', borderBottom:'1px solid #E3E1F0' },
    dayHdr:  { padding:'8px 4px', textAlign:'center', fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px' },
    calRow:  { display:'grid', gridTemplateColumns:'repeat(7,1fr)', minHeight:120, borderBottom:'1px solid #F2F1F8' },
    dayCell: { padding:'8px 6px', borderRight:'1px solid #F2F1F8', cursor:'pointer' },
    dayNum:  { fontSize:12, fontWeight:700, color:'#1A1825', marginBottom:4 },
    chip:    { fontSize:10, padding:'2px 6px', borderRadius:4, marginBottom:2, fontWeight:600, cursor:'pointer' },
    listItem:{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 0', borderBottom:'1px solid #E3E1F0' },
    actBtn:  { padding:'4px 10px', borderRadius:7, border:'1px solid #E3E1F0', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#8A87A0' },
    okBtn:   { padding:'4px 10px', borderRadius:7, border:'none', background:'#E1F5EE', fontSize:11, fontWeight:700, cursor:'pointer', color:'#085041' },
  }

  if (salonLoading) return <div style={{ padding: 40, color: '#8A87A0', textAlign: 'center' }}>Carregando...</div>

  return (
    <div className="pg">
      <div style={{ marginBottom: 20 }}>
        <div className="pg-h1">📅 Agenda</div>
        <div className="pg-sub">Agendamentos e compromissos · {salon?.name || 'BeatSalon'}</div>
      </div>

      <div className="grid-3">
        <div style={st.mc}><div style={st.ml}>Hoje</div><div style={st.mv}>{totalHoje}</div><div style={st.md}>agendamentos</div></div>
        <div style={st.mc}><div style={st.ml}>Este mês</div><div style={st.mv}>{totalMes}</div><div style={st.md}>agendamentos</div></div>
        <div style={st.mc}><div style={st.ml}>Receita mês</div><div style={{ ...st.mv, color: '#1D9E75' }}>R${receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div><div style={st.md}>concluídos</div></div>
      </div>

      <div className="toolbar">
        <button style={st.navBtn} onClick={() => setCurrentDate(d => view === 'semana' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7) : new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, minWidth: 180, textAlign: 'center' }}>
          {view === 'semana'
            ? `${weekDays()[0].getDate()} – ${weekDays()[6].getDate()} de ${MESES[weekDays()[6].getMonth()]}`
            : `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
        </span>
        <button style={st.navBtn} onClick={() => setCurrentDate(d => view === 'semana' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
        <button style={st.navBtn} onClick={() => setCurrentDate(today())}>Hoje</button>
        <div style={{ display: 'flex', gap: 4 }}>
          {['semana', 'lista'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ ...st.viewBtn, background: view === v ? '#534AB7' : '#fff', color: view === v ? '#fff' : '#8A87A0', borderColor: view === v ? '#534AB7' : '#E3E1F0' }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button style={st.addBtn} onClick={() => { setEditAppt(null); setShowModal(true) }}>＋ Agendar</button>
      </div>

      {view === 'semana' && (
        <div style={st.cal}>
          <div style={st.calHdr}>{DIAS.map(d => <div key={d} style={st.dayHdr}>{d}</div>)}</div>
          <div style={st.calRow}>
            {weekDays().map((day, i) => {
              const dayAppts = apptsByDate(day)
              return (
                <div key={i} style={{ ...st.dayCell, background: isToday(day) ? '#EEEDFE' : 'transparent' }}
                  onClick={() => { setEditAppt({ date: day.toISOString().slice(0, 16) }); setShowModal(true) }}>
                  <div style={{ ...st.dayNum, color: isToday(day) ? '#534AB7' : '#1A1825' }}>{day.getDate()}</div>
                  {dayAppts.slice(0, 3).map(a => {
                    const cfg = STATUS_CFG[a.status] || STATUS_CFG.agendado
                    return (
                      <div key={a.id} style={{ ...st.chip, background: cfg.bg, color: cfg.color }}
                        onClick={e => { e.stopPropagation(); setEditAppt(a); setShowModal(true) }}>
                        {a.date?.slice(11, 16)} {a.client_name}
                        {a.client_id && <span title="Vinculado ao CRM"> 🔗</span>}
                      </div>
                    )
                  })}
                  {dayAppts.length > 3 && <div style={{ fontSize: 10, color: '#8A87A0' }}>+{dayAppts.length - 3} mais</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'lista' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E3E1F0', padding: '16px 20px' }}>
          {loading ? <div style={{ textAlign: 'center', color: '#8A87A0', padding: 32 }}>Carregando...</div>
            : appts.length === 0 ? <div style={{ textAlign: 'center', color: '#8A87A0', padding: 32 }}>Nenhum agendamento. Clique em "Agendar" para começar.</div>
              : appts.map(a => {
                const cfg = STATUS_CFG[a.status] || STATUS_CFG.agendado
                const dt = new Date(a.date)
                return (
                  <div key={a.id} style={st.listItem}>
                    <div style={{ minWidth: 52, textAlign: 'center', background: '#F2F1F8', borderRadius: 10, padding: '6px 8px' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#534AB7' }}>{dt.getDate()}</div>
                      <div style={{ fontSize: 10, color: '#8A87A0' }}>{MESES[dt.getMonth()].slice(0, 3)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>
                          {a.client_name}
                          {a.client_id && <span style={{ fontSize: 10, color: '#534AB7', marginLeft: 4 }}>🔗 CRM</span>}
                        </span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8A87A0', marginTop: 2 }}>
                        {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {a.service_name || '–'} {a.value ? `· R$${Number(a.value).toLocaleString('pt-BR')}` : ''}
                      </div>
                      {a.notes && <div style={{ fontSize: 11, color: '#8A87A0', fontStyle: 'italic', marginTop: 2 }}>{a.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {a.status === 'agendado' && <button style={st.okBtn} onClick={() => quickConcluir(a)}>✓ Concluir</button>}
                      <button style={st.actBtn} onClick={() => { setEditAppt(a); setShowModal(true) }}>Editar</button>
                      <button style={{ ...st.actBtn, color: '#D85A30', borderColor: '#F5C4B3' }} onClick={() => del(a.id)}>✕</button>
                    </div>
                  </div>
                )
              })}
        </div>
      )}

      {showModal && salon && (
        <AgendamentoModal salonId={salon.id} appt={editAppt} onClose={() => setShowModal(false)} onSaved={fetchAppts} />
      )}
    </div>
  )
}
