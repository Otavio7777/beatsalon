'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'

const DIAS_SEMANA = [
  {d:1,label:'Segunda-feira',  short:'Seg'},
  {d:2,label:'Terça-feira',    short:'Ter'},
  {d:3,label:'Quarta-feira',   short:'Qua'},
  {d:4,label:'Quinta-feira',   short:'Qui'},
  {d:5,label:'Sexta-feira',    short:'Sex'},
  {d:6,label:'Sábado',         short:'Sáb'},
  {d:0,label:'Domingo',        short:'Dom'},
]

const DEFAULT_HORARIOS = DIAS_SEMANA.map(({d}) => ({
  day_of_week: d,
  is_open: d !== 0,
  open_time: '08:00',
  close_time: '18:00',
}))

const SLOTS_PADRAO = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00']

function BlockDateModal({ salonId, onClose, onSaved }) {
  const [date, setDate]     = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const sb = createClient()

  const save = async () => {
    if (!date) return
    setSaving(true)
    await sb.from('blocked_dates').upsert({salon_id:salonId, date, reason}, {onConflict:'salon_id,date'})
    onSaved(); onClose()
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{maxWidth:360}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:16}}>Bloquear data</div>
        <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:6}}>Data</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #E3E1F0',fontSize:14,outline:'none',marginBottom:12,boxSizing:'border-box'}} />
        <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:6}}>Motivo (opcional)</label>
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex: Feriado, folga, viagem..."
          style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #E3E1F0',fontSize:14,outline:'none',marginBottom:20,boxSizing:'border-box'}} />
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'8px 16px',borderRadius:10,border:'1px solid #E3E1F0',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#8A87A0'}}>Cancelar</button>
          <button onClick={save} disabled={!date||saving} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#D85A30',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {saving?'Salvando...':'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HorariosPage() {
  const { salon, user, loading: sl } = useSalon()
  const [horarios, setHorarios]   = useState(DEFAULT_HORARIOS)
  const [blocked, setBlocked]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const [{ data: conf }, { data: bl }] = await Promise.all([
      sb.from('schedule_config').select('*').eq('salon_id',salon.id),
      sb.from('blocked_dates').select('*').eq('salon_id',salon.id).order('date'),
    ])

    if (conf && conf.length > 0) {
      const merged = DEFAULT_HORARIOS.map(def => {
        const existing = conf.find(c=>c.day_of_week===def.day_of_week)
        return existing || def
      })
      setHorarios(merged)
    }
    setBlocked(bl||[])
    setLoading(false)
  },[salon?.id])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const saveConfig = async () => {
    setSaving(true)
    const rows = horarios.map(h => ({
      salon_id: salon.id,
      day_of_week: h.day_of_week,
      is_open: h.is_open,
      open_time: h.open_time,
      close_time: h.close_time,
    }))
    await sb.from('schedule_config').upsert(rows, {onConflict:'salon_id,day_of_week'})
    setSaving(false); setSaved(true)
    setTimeout(()=>setSaved(false), 2500)
  }

  const unblock = async (id) => {
    if (!confirm('Remover bloqueio desta data?')) return
    await sb.from('blocked_dates').delete().eq('id',id)
    load()
  }

  const setHorario = (idx, field, val) => {
    setHorarios(prev => prev.map((h,i) => i===idx ? {...h,[field]:val} : h))
  }

  const toggleAll = (open) => {
    setHorarios(prev => prev.map(h => ({...h, is_open: open})))
  }

  // Conta dias abertos
  const diasAbertos = horarios.filter(h=>h.is_open).length

  const st = {
    dayRow: { display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:'1px solid #F2F1F8' },
    dayLbl: { minWidth:130, fontSize:14, fontWeight:600, color:'#1A1825' },
    toggle: (on) => ({ width:44, height:24, borderRadius:12, background:on?'#534AB7':'#D4D2DF', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }),
    toggleDot: (on) => ({ width:20, height:20, borderRadius:10, background:'#fff', position:'absolute', top:2, left:on?22:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }),
    timeSelect: { padding:'7px 10px', borderRadius:8, border:'1px solid #E3E1F0', fontSize:13, outline:'none', background:'#fff', cursor:'pointer' },
    blDate: { display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F2F1F8' },
  }

  if (sl) return <div style={{padding:40,textAlign:'center',color:'#8A87A0'}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-hd">
        <div style={{fontSize:22,fontWeight:800,color:'#1A1825'}}>Gestão de Horários</div>
        <div style={{fontSize:12,color:'#8A87A0',marginTop:3}}>Configure sua disponibilidade · {salon?.name}</div>
      </div>

      {/* Status geral */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
        <div className="mc"><div className="mc-label">Dias abertos</div><div className="mc-value" style={{color:'#1D9E75'}}>{diasAbertos}</div><div className="mc-desc">por semana</div></div>
        <div className="mc"><div className="mc-label">Dias fechados</div><div className="mc-value" style={{color:'#D85A30'}}>{7-diasAbertos}</div><div className="mc-desc">por semana</div></div>
        <div className="mc"><div className="mc-label">Datas bloqueadas</div><div className="mc-value" style={{color:'#BA7517'}}>{blocked.length}</div><div className="mc-desc">no calendário</div></div>
      </div>

      {/* Ações rápidas */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        <button className="btn-secondary" onClick={()=>toggleAll(true)}>Abrir todos os dias</button>
        <button className="btn-secondary" onClick={()=>toggleAll(false)}>Fechar todos os dias</button>
        <button onClick={()=>setShowBlockModal(true)} style={{padding:'8px 14px',background:'#FCEBEB',color:'#A32D2D',border:'1px solid #F5C4B3',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
          Bloquear data
        </button>
      </div>

      {/* Horários por dia */}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #E3E1F0',padding:'8px 20px',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #F2F1F8',marginBottom:4}}>
          <span style={{fontSize:15,fontWeight:800}}>Horários por dia</span>
          <span style={{fontSize:12,color:'#8A87A0'}}>Abertura · Fechamento</span>
        </div>

        {loading ? <div style={{textAlign:'center',color:'#8A87A0',padding:24}}>Carregando...</div>
        : DIAS_SEMANA.map(({d,label,short},idx) => {
          const h = horarios.find(x=>x.day_of_week===d) || DEFAULT_HORARIOS.find(x=>x.day_of_week===d)
          const hIdx = horarios.findIndex(x=>x.day_of_week===d)
          return (
            <div key={d} style={st.dayRow}>
              <div style={{minWidth:110}}>
                <div style={{fontSize:13,fontWeight:700,color:h.is_open?'#1A1825':'#8A87A0'}}>{label}</div>
                {!h.is_open && <div style={{fontSize:10,color:'#D85A30',fontWeight:600,marginTop:2}}>FECHADO</div>}
              </div>
              <div onClick={()=>setHorario(hIdx,'is_open',!h.is_open)} style={st.toggle(h.is_open)}>
                <div style={st.toggleDot(h.is_open)}/>
              </div>
              {h.is_open && (
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                  <select value={h.open_time} onChange={e=>setHorario(hIdx,'open_time',e.target.value)} style={st.timeSelect}>
                    {SLOTS_PADRAO.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{color:'#8A87A0',fontSize:12}}>até</span>
                  <select value={h.close_time} onChange={e=>setHorario(hIdx,'close_time',e.target.value)} style={st.timeSelect}>
                    {SLOTS_PADRAO.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {!h.is_open && <div style={{flex:1,fontSize:12,color:'#C9C7D4',fontStyle:'italic'}}>Sem atendimento</div>}
            </div>
          )
        })}
      </div>

      {/* Salvar horários */}
      <button onClick={saveConfig} disabled={saving} style={{
        width:'100%', padding:'13px', background:saved?'#1D9E75':'#534AB7', color:'#fff',
        border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer',
        transition:'background .3s', marginBottom:20,
      }}>
        {saving?'Salvando...' : saved?'✓ Configurações salvas!' : 'Salvar horários'}
      </button>

      {/* Datas bloqueadas */}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #E3E1F0',padding:'16px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>Datas bloqueadas</div>
            <div style={{fontSize:12,color:'#8A87A0',marginTop:2}}>Dias sem atendimento no link público</div>
          </div>
          <button onClick={()=>setShowBlockModal(true)} className="btn-primary" style={{fontSize:12,padding:'7px 14px'}}>＋ Bloquear</button>
        </div>

        {blocked.length===0 ? (
          <div style={{textAlign:'center',color:'#8A87A0',padding:'20px 0',fontSize:13}}>
            Nenhuma data bloqueada. Clique em "+ Bloquear" para adicionar.
          </div>
        ) : blocked.map(b=>{
          const d = new Date(b.date+'T12:00:00')
          return (
            <div key={b.id} style={st.blDate}>
              <div style={{width:44,height:44,borderRadius:12,background:'#FCEBEB',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:800,color:'#A32D2D'}}>{d.getDate()}</div>
                <div style={{fontSize:9,color:'#A32D2D',fontWeight:600}}>{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
                {b.reason && <div style={{fontSize:12,color:'#8A87A0',marginTop:2}}>{b.reason}</div>}
              </div>
              <button className="btn-danger" onClick={()=>unblock(b.id)}>Remover</button>
            </div>
          )
        })}
      </div>

      {showBlockModal && salon && (
        <BlockDateModal salonId={salon.id} onClose={()=>setShowBlockModal(false)} onSaved={load} />
      )}
    </div>
  )
}
