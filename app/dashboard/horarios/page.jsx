'use client'
import { useState, useEffect } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { createClient } from '../../../lib/supabase'
import { Check, Link, Clock, AlertCircle } from '../../../lib/icons'

const DIAS = [
  { d:1,label:'Segunda-feira', short:'Seg' },
  { d:2,label:'Terça-feira',  short:'Ter' },
  { d:3,label:'Quarta-feira', short:'Qua' },
  { d:4,label:'Quinta-feira', short:'Qui' },
  { d:5,label:'Sexta-feira',  short:'Sex' },
  { d:6,label:'Sábado',       short:'Sáb' },
  { d:0,label:'Domingo',      short:'Dom' },
]

const DEFAULT_HORARIO = (d) => ({
  day_of_week: d,
  is_open: d !== 0 && d !== 6,
  open_time: '08:00',
  close_time: '18:00',
  lunch_start: null,
  lunch_end: null,
  slot_duration: 30,
})

// Gera array de horários entre início e fim com duração
function gerarSlots(open, close, lunch_start, lunch_end, duration = 30) {
  const slots = []
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  let cur = oh * 60 + om
  const end = ch * 60 + cm
  const ls = lunch_start ? lunch_start.split(':').map(Number).reduce((a,b,i)=>i===0?a*60+b:a+b,0) : null
  const le = lunch_end   ? lunch_end.split(':').map(Number).reduce((a,b,i)=>i===0?a*60+b:a+b,0) : null
  while (cur + duration <= end) {
    if (!ls || cur >= le || cur + duration <= ls) {
      const hh = String(Math.floor(cur/60)).padStart(2,'0')
      const mm = String(cur%60).padStart(2,'0')
      slots.push(`${hh}:${mm}`)
    }
    cur += duration
  }
  return slots
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="toggle-track"
      style={{ background: checked ? 'var(--navy-600)' : 'var(--gray-300)' }}
      type="button">
      <div className="toggle-thumb" style={{ left: checked ? 22 : 2 }}/>
    </button>
  )
}

function TimeSelect({ value, onChange, disabled }) {
  const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`)
  const halfs = hours.flatMap(h=>[h, h.slice(0,3)+'30'])
  return (
    <select value={value||''} onChange={e=>onChange(e.target.value)} disabled={disabled}
      style={{padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,
        color:'var(--text)',background:disabled?'var(--gray-50)':'var(--white)',fontFamily:'inherit',
        minWidth:80,cursor:disabled?'not-allowed':'pointer'}}>
      {!value && <option value="">--:--</option>}
      {halfs.map(h=><option key={h} value={h}>{h}</option>)}
    </select>
  )
}

export default function HorariosPage() {
  const { salon } = useSalon()
  const [horarios,  setHorarios]  = useState(DIAS.map(d => DEFAULT_HORARIO(d.d)))
  const [blocked,   setBlocked]   = useState([])
  const [novaData,  setNovaData]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [preview,   setPreview]   = useState(null) // dia selecionado para preview
  const sb = createClient()

  useEffect(() => {
    if (!salon?.id) return
    Promise.all([
      sb.from('schedule_config').select('*').eq('salon_id', salon.id),
      sb.from('blocked_dates').select('*').eq('salon_id', salon.id).order('date'),
    ]).then(([{ data:conf }, { data:bl }]) => {
      if (conf?.length > 0) {
        setHorarios(DIAS.map(({ d }) => {
          const ex = conf.find(c => c.day_of_week === d)
          return ex ? { ...DEFAULT_HORARIO(d), ...ex } : DEFAULT_HORARIO(d)
        }))
      }
      setBlocked(bl || [])
      setLoading(false)
    })
  }, [salon?.id])

  const setH = (day, field, val) =>
    setHorarios(prev => prev.map(h => h.day_of_week === day ? { ...h, [field]: val } : h))

  const save = async () => {
    if (!salon?.id) return
    setSaving(true); setSaved(false)
    const rows = horarios.map(h => ({
      salon_id:     salon.id,
      day_of_week:  h.day_of_week,
      is_open:      h.is_open,
      open_time:    h.open_time,
      close_time:   h.close_time,
      lunch_start:  h.lunch_start || null,
      lunch_end:    h.lunch_end   || null,
      slot_duration: h.slot_duration || 30,
    }))
    const { error } = await sb.from('schedule_config').upsert(rows, { onConflict: 'salon_id,day_of_week' })
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const bloquear = async () => {
    if (!novaData || !salon?.id) return
    await sb.from('blocked_dates').upsert({ salon_id: salon.id, date: novaData }, { onConflict: 'salon_id,date' })
    setBlocked(prev => [...prev.filter(b => b.date !== novaData), { date: novaData }].sort((a,b) => a.date < b.date ? -1 : 1))
    setNovaData('')
  }

  const desbloquear = async (date) => {
    await sb.from('blocked_dates').delete().eq('salon_id', salon.id).eq('date', date)
    setBlocked(prev => prev.filter(b => b.date !== date))
  }

  const slotPreview = preview !== null
    ? gerarSlots(
        horarios[preview]?.open_time||'08:00',
        horarios[preview]?.close_time||'18:00',
        horarios[preview]?.lunch_start,
        horarios[preview]?.lunch_end,
        horarios[preview]?.slot_duration||30
      )
    : []

  const bookingLink = `${typeof window!=='undefined'?window.location.origin:''}/agendar/${salon?.id||''}`

  if (loading) return <div className="pg" style={{color:'var(--muted)',textAlign:'center',padding:40}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Horários</div>
        <div className="pg-sub">Defina os dias, horários de atendimento e pausas · conectado ao agendamento online</div>
      </div>

      {/* Aviso de conexão */}
      <div className="alert-info" style={{marginBottom:16}}>
        <Link size={14} color="var(--navy-600)" style={{flexShrink:0,marginTop:1}}/>
        <div>
          <strong>Conectado ao agendamento online</strong> — as configurações abaixo controlam os dias e horários disponíveis no seu link público de agendamento.{' '}
          <a href={bookingLink} target="_blank" rel="noreferrer" style={{color:'var(--navy-600)',fontWeight:700}}>
            Ver link →
          </a>
        </div>
      </div>

      {/* Duração dos slots */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Duração do atendimento padrão</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Define o intervalo entre os horários disponíveis no agendamento online</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[15,20,30,45,60,90].map(min=>{
            const h0 = horarios[0]
            const cur = h0?.slot_duration || 30
            const sel = cur === min
            return (
              <button key={min} onClick={()=>setHorarios(prev=>prev.map(h=>({...h,slot_duration:min})))}
                style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${sel?'var(--navy-600)':'var(--border)'}`,
                  background:sel?'var(--navy-600)':'var(--white)',color:sel?'#fff':'var(--muted)',
                  fontSize:13,fontWeight:700,cursor:'pointer'}}>
                {min}min
              </button>
            )
          })}
        </div>
      </div>

      {/* Dias da semana */}
      <div className="card">
        <div style={{fontSize:14,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Dias e horários</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Configure cada dia individualmente. A pausa para almoço bloqueia os horários no período selecionado.</div>

        {DIAS.map(({ d, label, short }) => {
          const h = horarios.find(x => x.day_of_week === d) || DEFAULT_HORARIO(d)
          const hasLunch = !!(h.lunch_start && h.lunch_end)
          return (
            <div key={d} style={{padding:'14px 0',borderBottom:'1px solid var(--gray-100)'}}>
              {/* Linha 1: toggle + nome + aberto/fechado */}
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:h.is_open?12:0}}>
                <Toggle checked={h.is_open} onChange={v=>setH(d,'is_open',v)}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:h.is_open?'var(--navy-900)':'var(--muted)'}}>{label}</div>
                  {!h.is_open && <div style={{fontSize:11,color:'var(--muted)'}}>Fechado</div>}
                </div>
                {/* Preview slots */}
                {h.is_open && (
                  <button onClick={()=>setPreview(preview===DIAS.findIndex(x=>x.d===d)?null:DIAS.findIndex(x=>x.d===d))}
                    style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--gray-50)',
                      color:'var(--muted)',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    <Clock size={11} color="var(--muted)" style={{marginRight:4}}/>
                    {preview===DIAS.findIndex(x=>x.d===d)?'Fechar':'Ver slots'}
                  </button>
                )}
              </div>

              {/* Linha 2: horários */}
              {h.is_open && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginLeft:56}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:5}}>Abre</div>
                    <TimeSelect value={h.open_time} onChange={v=>setH(d,'open_time',v)}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:5}}>Fecha</div>
                    <TimeSelect value={h.close_time} onChange={v=>setH(d,'close_time',v)}/>
                  </div>

                  {/* Pausa para almoço */}
                  <div style={{gridColumn:'1/-1',marginTop:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:hasLunch?10:0,cursor:'pointer'}}
                      onClick={()=>{
                        if (hasLunch) { setH(d,'lunch_start',null); setH(d,'lunch_end',null) }
                        else { setH(d,'lunch_start','12:00'); setH(d,'lunch_end','13:00') }
                      }}>
                      <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${hasLunch?'var(--navy-600)':'var(--border)'}`,
                        background:hasLunch?'var(--navy-600)':'var(--white)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {hasLunch&&<Check size={10} color="#fff"/>}
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>Pausa para almoço</span>
                    </div>
                    {hasLunch && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginLeft:24}}>
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Início</div>
                          <TimeSelect value={h.lunch_start||''} onChange={v=>setH(d,'lunch_start',v)}/>
                        </div>
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Fim</div>
                          <TimeSelect value={h.lunch_end||''} onChange={v=>setH(d,'lunch_end',v)}/>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview de slots */}
              {h.is_open && preview===DIAS.findIndex(x=>x.d===d) && (
                <div style={{marginTop:12,marginLeft:56,padding:'10px 14px',background:'var(--gray-50)',borderRadius:10,border:'1px solid var(--border)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>
                    Horários disponíveis no agendamento ({slotPreview.length} slots)
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {slotPreview.map(s=>(
                      <span key={s} style={{fontSize:12,padding:'3px 10px',background:'var(--navy-50)',borderRadius:6,color:'var(--navy-700)',fontWeight:600,border:'1px solid var(--navy-200)'}}>
                        {s}
                      </span>
                    ))}
                    {slotPreview.length===0&&<span style={{fontSize:12,color:'var(--muted)'}}>Nenhum slot disponível com essas configurações.</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{marginTop:20,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving?'Salvando...' : saved?<><Check size={14} color="#fff" style={{marginRight:6}}/>Salvo!</>:'Salvar horários'}
          </button>
          {saved && <span style={{fontSize:12,color:'var(--success)',fontWeight:700}}>✓ Conectado ao agendamento online</span>}
        </div>
      </div>

      {/* Datas bloqueadas */}
      <div className="card">
        <div style={{fontSize:14,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Datas bloqueadas</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Dias específicos em que o salão não atenderá (feriados, férias). Esses dias ficam indisponíveis no agendamento online.</div>

        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}
            min={new Date().toISOString().slice(0,10)}
            style={{padding:'8px 12px',borderRadius:9,border:'1.5px solid var(--border)',fontSize:14,color:'var(--text)',outline:'none',background:'var(--white)',fontFamily:'inherit'}}/>
          <button onClick={bloquear} disabled={!novaData} className="btn-primary" style={{padding:'8px 16px'}}>
            Bloquear data
          </button>
        </div>

        {blocked.length === 0 ? (
          <div style={{textAlign:'center',color:'var(--muted)',fontSize:13,padding:'12px 0'}}>Nenhuma data bloqueada.</div>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {blocked.map(b => {
              const dt = new Date(b.date+'T12:00:00')
              return (
                <div key={b.date} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'var(--danger-light)',borderRadius:8,border:'1px solid #FCA5A5'}}>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--danger)'}}>
                    {dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
                  </span>
                  <button onClick={()=>desbloquear(b.date)}
                    style={{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',padding:0,fontSize:14,fontWeight:800,lineHeight:1}}>×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
