'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'

const STATUS_CFG = {
  agendado:   { bg:'#E6F1FB', color:'#0C447C', label:'Agendado' },
  concluido:  { bg:'#E1F5EE', color:'#085041', label:'Concluído' },
  cancelado:  { bg:'#FCF0F0', color:'#A32D2D', label:'Cancelado' },
  faltou:     { bg:'#FAEEDA', color:'#633806', label:'Faltou' },
}

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function AgendamentoModal({ salonId, appt, onClose, onSaved }) {
  const [form, setForm] = useState({
    client_name: '', service_name: '', date: '',
    value: '', status: 'agendado', notes: '', ...appt,
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const save = async () => {
    if (!form.client_name || !form.date) return
    setSaving(true)
    const payload = { ...form, salon_id: salonId, value: Number(form.value)||0 }
    const { error } = appt?.id
      ? await sb.from('appointments').update(payload).eq('id', appt.id)
      : await sb.from('appointments').insert(payload)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  const s = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16 },
    box:     { background:'#fff',borderRadius:20,padding:'28px',width:'100%',maxWidth:460,maxHeight:'90vh',overflowY:'auto' },
    hd:      { fontSize:18,fontWeight:800,marginBottom:18 },
    label:   { fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,display:'block',marginTop:12 },
    input:   { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',color:'#1A1825' },
    select:  { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',background:'#fff',color:'#1A1825' },
    grid2:   { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 },
    foot:    { display:'flex',gap:10,justifyContent:'flex-end',marginTop:20,paddingTop:16,borderTop:'1px solid #E3E1F0' },
  }

  return (
    <div style={s.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={s.box}>
        <div style={s.hd}>{appt?.id ? 'Editar agendamento' : 'Novo agendamento'}</div>
        <div style={s.grid2}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={s.label}>Cliente *</label>
            <input style={s.input} value={form.client_name} onChange={e=>set('client_name',e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <label style={s.label}>Serviço</label>
            <input style={s.input} value={form.service_name} onChange={e=>set('service_name',e.target.value)} placeholder="Corte, Barba..." />
          </div>
          <div>
            <label style={s.label}>Valor (R$)</label>
            <input style={s.input} type="number" value={form.value} onChange={e=>set('value',e.target.value)} placeholder="0" />
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={s.label}>Data e horário *</label>
            <input style={s.input} type="datetime-local" value={form.date} onChange={e=>set('date',e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Status</label>
            <select style={s.select} value={form.status} onChange={e=>set('status',e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Observações</label>
            <input style={s.input} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Opcional" />
          </div>
        </div>
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

export default function AgendaPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [appts, setAppts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [currentDate, setCurrentDate] = useState(today())
  const [view, setView]           = useState('semana') // semana | mes | lista
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt]   = useState(null)
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

  const weekStart = (d) => {
    const day = d.getDay()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  }

  const weekDays = () => {
    const start = weekStart(currentDate)
    return Array.from({length:7}, (_,i) => new Date(start.getFullYear(), start.getMonth(), start.getDate()+i))
  }

  const apptsByDate = (date) => {
    const ds = date.toISOString().slice(0,10)
    return appts.filter(a => a.date?.startsWith(ds)).sort((a,b) => a.date.localeCompare(b.date))
  }

  const isToday = (d) => d.toDateString() === today().toDateString()

  const totalHoje = appts.filter(a => a.date?.startsWith(today().toISOString().slice(0,10))).length
  const totalMes  = appts.filter(a => {
    const d = new Date(a.date)
    return d.getMonth()===currentDate.getMonth() && d.getFullYear()===currentDate.getFullYear()
  }).length
  const receitaMes = appts.filter(a => {
    if (a.status !== 'concluido') return false
    const d = new Date(a.date)
    return d.getMonth()===currentDate.getMonth() && d.getFullYear()===currentDate.getFullYear()
  }).reduce((s,a) => s + (a.value||0), 0)

  const st = {
    page:   { padding:'28px 32px', maxWidth:1100 },
    hd:     { marginBottom:20 },
    h1:     { fontSize:24, fontWeight:800, color:'#1A1825' },
    sub:    { fontSize:13, color:'#8A87A0', marginTop:3 },
    metrics:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 },
    mc:     { background:'#fff', borderRadius:14, padding:'14px 16px', border:'1px solid #E3E1F0' },
    ml:     { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, marginBottom:5 },
    mv:     { fontSize:22, fontWeight:800 },
    md:     { fontSize:11, marginTop:4, color:'#8A87A0' },
    toolbar:{ display:'flex', gap:10, alignItems:'center', marginBottom:20, flexWrap:'wrap' },
    navBtn: { padding:'7px 14px', borderRadius:8, border:'1px solid #E3E1F0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#534AB7' },
    viewBtn:{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #E3E1F0', cursor:'pointer', transition:'all .15s' },
    addBtn: { padding:'9px 18px', background:'#534AB7', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', marginLeft:'auto', display:'flex', alignItems:'center', gap:6 },
    cal:    { background:'#fff', borderRadius:16, border:'1px solid #E3E1F0', overflow:'hidden' },
    calHdr: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#F2F1F8', borderBottom:'1px solid #E3E1F0' },
    dayHdr: { padding:'8px 4px', textAlign:'center', fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px' },
    calRow: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', minHeight:120, borderBottom:'1px solid #F2F1F8' },
    dayCell:{ padding:'8px 6px', borderRight:'1px solid #F2F1F8', cursor:'pointer', transition:'background .1s' },
    dayCellToday:{ background:'#EEEDFE' },
    dayNum: { fontSize:12, fontWeight:700, color:'#1A1825', marginBottom:4 },
    dayNumToday:{ color:'#534AB7' },
    apptChip:{ fontSize:10, padding:'2px 6px', borderRadius:4, marginBottom:2, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
    listItem:{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 0', borderBottom:'1px solid #E3E1F0' },
    actBtn: { padding:'4px 10px', borderRadius:7, border:'1px solid #E3E1F0', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#8A87A0' },
  }

  if (salonLoading) return <div style={{padding:40,color:'#8A87A0',textAlign:'center'}}>Carregando...</div>

  return (
    <div style={st.page}>
      <div style={st.hd}>
        <div style={st.h1}>📅 Agenda</div>
        <div style={st.sub}>Agendamentos e compromissos · {salon?.name || 'BeatSalon'}</div>
      </div>

      <div style={st.metrics}>
        <div style={st.mc}><div style={st.ml}>Hoje</div><div style={st.mv}>{totalHoje}</div><div style={st.md}>agendamentos</div></div>
        <div style={st.mc}><div style={st.ml}>Este mês</div><div style={st.mv}>{totalMes}</div><div style={st.md}>agendamentos</div></div>
        <div style={st.mc}><div style={st.ml}>Receita mês</div><div style={{...st.mv,color:'#1D9E75'}}>R${receitaMes.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div><div style={st.md}>concluídos</div></div>
      </div>

      <div style={st.toolbar}>
        <button style={st.navBtn} onClick={() => setCurrentDate(d => {
          if (view==='semana') return new Date(d.getFullYear(),d.getMonth(),d.getDate()-7)
          return new Date(d.getFullYear(),d.getMonth()-1,1)
        })}>‹</button>
        <span style={{fontWeight:700,fontSize:15,minWidth:160,textAlign:'center'}}>
          {view==='semana'
            ? `${weekDays()[0].getDate()} – ${weekDays()[6].getDate()} de ${MESES[weekDays()[6].getMonth()]}`
            : `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
        </span>
        <button style={st.navBtn} onClick={() => setCurrentDate(d => {
          if (view==='semana') return new Date(d.getFullYear(),d.getMonth(),d.getDate()+7)
          return new Date(d.getFullYear(),d.getMonth()+1,1)
        })}>›</button>
        <button style={st.navBtn} onClick={() => setCurrentDate(today())}>Hoje</button>
        <div style={{display:'flex',gap:4}}>
          {['semana','lista'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{...st.viewBtn,
              background: view===v ? '#534AB7' : '#fff',
              color: view===v ? '#fff' : '#8A87A0',
              borderColor: view===v ? '#534AB7' : '#E3E1F0',
            }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
        <button style={st.addBtn} onClick={() => { setEditAppt(null); setShowModal(true) }}>＋ Agendar</button>
      </div>

      {view === 'semana' && (
        <div style={st.cal}>
          <div style={st.calHdr}>
            {DIAS_SEMANA.map(d => <div key={d} style={st.dayHdr}>{d}</div>)}
          </div>
          <div style={st.calRow}>
            {weekDays().map((day, i) => {
              const dayAppts = apptsByDate(day)
              return (
                <div key={i} style={{...st.dayCell, ...(isToday(day)?st.dayCellToday:{})}}
                  onClick={() => { setCurrentDate(day); setEditAppt({date: day.toISOString().slice(0,16)}); setShowModal(true) }}>
                  <div style={{...st.dayNum,...(isToday(day)?st.dayNumToday:{})}}>{day.getDate()}</div>
                  {dayAppts.slice(0,4).map(a => {
                    const cfg = STATUS_CFG[a.status] || STATUS_CFG.agendado
                    return (
                      <div key={a.id} style={{...st.apptChip,background:cfg.bg,color:cfg.color}}
                        onClick={e => { e.stopPropagation(); setEditAppt(a); setShowModal(true) }}>
                        {a.date?.slice(11,16)} {a.client_name}
                      </div>
                    )
                  })}
                  {dayAppts.length > 4 && <div style={{fontSize:10,color:'#8A87A0'}}>+{dayAppts.length-4} mais</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'lista' && (
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #E3E1F0',padding:'16px 20px'}}>
          {loading ? <div style={{textAlign:'center',color:'#8A87A0',padding:32}}>Carregando...</div>
          : appts.length === 0 ? <div style={{textAlign:'center',color:'#8A87A0',padding:32}}>Nenhum agendamento. Clique em "Agendar" para começar.</div>
          : appts.map(a => {
            const cfg = STATUS_CFG[a.status] || STATUS_CFG.agendado
            const dt = new Date(a.date)
            return (
              <div key={a.id} style={st.listItem}>
                <div style={{minWidth:52,textAlign:'center',background:'#F2F1F8',borderRadius:10,padding:'6px 8px'}}>
                  <div style={{fontSize:18,fontWeight:800,color:'#534AB7'}}>{dt.getDate()}</div>
                  <div style={{fontSize:10,color:'#8A87A0'}}>{MESES[dt.getMonth()].slice(0,3)}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:14}}>{a.client_name}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:700,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                  </div>
                  <div style={{fontSize:12,color:'#8A87A0',marginTop:2}}>
                    {dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {a.service_name||'–'} {a.value ? `· R$${Number(a.value).toLocaleString('pt-BR')}` : ''}
                  </div>
                  {a.notes && <div style={{fontSize:11,color:'#8A87A0',fontStyle:'italic',marginTop:2}}>{a.notes}</div>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={st.actBtn} onClick={() => { setEditAppt(a); setShowModal(true) }}>Editar</button>
                  <button style={{...st.actBtn,color:'#D85A30',borderColor:'#F5C4B3'}} onClick={() => del(a.id)}>✕</button>
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
