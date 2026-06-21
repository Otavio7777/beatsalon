'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { createClient } from '../../../lib/supabase'
import { Check, AlertCircle, Link } from '../../../lib/icons'

const DIAS_SEMANA = [
  { d:1,label:'Segunda-feira',  short:'Seg' },
  { d:2,label:'Terça-feira',   short:'Ter' },
  { d:3,label:'Quarta-feira',  short:'Qua' },
  { d:4,label:'Quinta-feira',  short:'Qui' },
  { d:5,label:'Sexta-feira',   short:'Sex' },
  { d:6,label:'Sábado',        short:'Sáb' },
  { d:0,label:'Domingo',       short:'Dom' },
]

const HORAS = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`)

const DEFAULT = DIAS_SEMANA.map(({d}) => ({
  day_of_week:d, is_open: d!==0, open_time:'08:00', close_time:'18:00'
}))

export default function HorariosPage() {
  const { salon, user } = useSalon()
  const [horarios,  setHorarios]  = useState(DEFAULT)
  const [blocked,   setBlocked]   = useState([])
  const [novaData,  setNovaData]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const sb = createClient()

  useEffect(() => {
    if (!salon?.id) return
    Promise.all([
      sb.from('schedule_config').select('*').eq('salon_id', salon.id),
      sb.from('blocked_dates').select('*').eq('salon_id', salon.id).order('date'),
    ]).then(([{data:conf},{data:bl}]) => {
      if (conf && conf.length > 0) {
        setHorarios(DIAS_SEMANA.map(({d}) => {
          const ex = conf.find(c=>c.day_of_week===d)
          return ex || { day_of_week:d, is_open:d!==0, open_time:'08:00', close_time:'18:00' }
        }))
      }
      setBlocked(bl||[])
      setLoading(false)
    })
  },[salon?.id])

  useEffect(()=>{ if(!loading&&!user) window.location.href='/login' },[loading,user])

  const setH = (dayOfWeek, field, val) => {
    setHorarios(prev => prev.map(h => h.day_of_week===dayOfWeek ? {...h,[field]:val} : h))
  }

  const save = async () => {
    if (!salon?.id) return
    setSaving(true); setSaved(false)
    const rows = horarios.map(h => ({
      salon_id: salon.id,
      day_of_week: h.day_of_week,
      is_open: h.is_open,
      open_time: h.open_time,
      close_time: h.close_time,
    }))
    await sb.from('schedule_config').upsert(rows, {onConflict:'salon_id,day_of_week'})
    setSaving(false); setSaved(true)
    setTimeout(()=>setSaved(false), 3000)
  }

  const bloquear = async () => {
    if (!novaData||!salon?.id) return
    const { error } = await sb.from('blocked_dates').upsert(
      { salon_id:salon.id, date:novaData },
      { onConflict:'salon_id,date' }
    )
    if (!error) {
      setBlocked(prev => [...prev.filter(b=>b.date!==novaData), { date:novaData, salon_id:salon.id }].sort((a,b)=>a.date<b.date?-1:1))
      setNovaData('')
    }
  }

  const desbloquear = async (id) => {
    await sb.from('blocked_dates').delete().eq('id', id)
    setBlocked(prev=>prev.filter(b=>b.id!==id))
  }

  const abrirTodos  = () => setHorarios(prev=>prev.map(h=>({...h, is_open:true})))
  const fecharTodos = () => setHorarios(prev=>prev.map(h=>({...h, is_open:false})))

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  const diasAbertos = horarios.filter(h=>h.is_open).length
  const bookingLink = typeof window!=='undefined' ? `${window.location.origin}/agendar/${salon?.id}` : ''

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Gestão de Horários</div>
        <div className="pg-sub">Configure sua disponibilidade · {salon?.name}</div>
      </div>

      {/* Aviso de conexão com agendamento online */}
      <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',gap:10,alignItems:'flex-start'}}>
        <Link size={16} color="#2451A0" style={{flexShrink:0,marginTop:1}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'#1E3A5F'}}>Conectado ao link de agendamento online</div>
          <div style={{fontSize:11,color:'#2451A0',marginTop:2,lineHeight:1.6}}>
            As configurações abaixo afetam diretamente o link <strong>{bookingLink.split('/').slice(-2).join('/')}</strong>.
            Dias fechados ficam indisponíveis no calendário. Horários fora do período configurado não aparecem para os clientes.
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        <div className="mc">
          <div className="mc-label">Dias abertos</div>
          <div className="mc-value" style={{color:'var(--success)'}}>{diasAbertos}</div>
          <div className="mc-desc">por semana</div>
        </div>
        <div className="mc">
          <div className="mc-label">Dias fechados</div>
          <div className="mc-value" style={{color:7-diasAbertos>0?'var(--danger)':'var(--muted)'}}>{7-diasAbertos}</div>
          <div className="mc-desc">por semana</div>
        </div>
        <div className="mc">
          <div className="mc-label">Datas bloqueadas</div>
          <div className="mc-value" style={{color:blocked.length>0?'var(--warning)':'var(--muted)'}}>{blocked.length}</div>
          <div className="mc-desc">no calendário</div>
        </div>
      </div>

      {/* Horários por dia */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)'}}>Horários por dia da semana</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={abrirTodos} className="btn-secondary" style={{fontSize:12,padding:'6px 14px'}}>Abrir todos</button>
            <button onClick={fecharTodos} className="btn-ghost" style={{fontSize:12,padding:'6px 14px'}}>Fechar todos</button>
          </div>
        </div>

        {/* Header */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:12,alignItems:'center',padding:'6px 12px',background:'var(--gray-50)',borderRadius:8,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px'}}>Dia</div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',width:90,textAlign:'center'}}>Abertura</div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',width:90,textAlign:'center'}}>Fechamento</div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',width:56,textAlign:'center'}}>Aberto</div>
        </div>

        {DIAS_SEMANA.map(({d,label,short}) => {
          const h = horarios.find(x=>x.day_of_week===d) || { is_open:false, open_time:'08:00', close_time:'18:00' }
          return (
            <div key={d} style={{
              display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:12,alignItems:'center',
              padding:'10px 12px',borderBottom:'1px solid var(--gray-100)',
              opacity:h.is_open?1:.5,transition:'opacity .2s',
            }}>
              {/* Nome */}
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{label}</div>
                {!h.is_open && <div style={{fontSize:10,fontWeight:700,color:'var(--danger)',textTransform:'uppercase',letterSpacing:'.4px'}}>Fechado</div>}
              </div>

              {/* Abertura */}
              <select
                value={h.open_time}
                onChange={e=>setH(d,'open_time',e.target.value)}
                disabled={!h.is_open}
                style={{
                  width:90, padding:'7px 8px', borderRadius:8,
                  border:'1px solid var(--border)', fontSize:13,
                  color:h.is_open?'var(--text)':'var(--muted)',
                  background:h.is_open?'#fff':'var(--gray-50)',
                  cursor:h.is_open?'pointer':'default',
                }}>
                {HORAS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>

              {/* Até */}
              <select
                value={h.close_time}
                onChange={e=>setH(d,'close_time',e.target.value)}
                disabled={!h.is_open}
                style={{
                  width:90, padding:'7px 8px', borderRadius:8,
                  border:'1px solid var(--border)', fontSize:13,
                  color:h.is_open?'var(--text)':'var(--muted)',
                  background:h.is_open?'#fff':'var(--gray-50)',
                  cursor:h.is_open?'pointer':'default',
                }}>
                {HORAS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>

              {/* Toggle */}
              <div style={{display:'flex',justifyContent:'center'}}>
                <button
                  onClick={()=>setH(d,'is_open',!h.is_open)}
                  style={{
                    width:44,height:24,borderRadius:12,border:'none',
                    background:h.is_open?'var(--navy-600)':'#CBD5E1',
                    cursor:'pointer',position:'relative',transition:'background .2s',padding:0,
                  }}>
                  <div style={{
                    position:'absolute',top:2,
                    left:h.is_open?'calc(100% - 22px)':'2px',
                    width:20,height:20,borderRadius:10,
                    background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                    transition:'left .2s',
                  }}/>
                </button>
              </div>
            </div>
          )
        })}

        {/* Salvar */}
        <div style={{marginTop:16,display:'flex',alignItems:'center',gap:10}}>
          <button onClick={save} disabled={saving} className="btn-primary" style={{padding:'10px 24px',fontSize:14}}>
            {saving?'Salvando...' : saved?'✓ Salvo!':'Salvar horários'}
          </button>
          {saved && <span style={{fontSize:12,color:'var(--success)',fontWeight:600}}>Horários atualizados — o link de agendamento já reflete as mudanças.</span>}
        </div>
      </div>

      {/* Datas bloqueadas */}
      <div className="card">
        <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Datas bloqueadas</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Bloqueie datas específicas (feriados, férias, eventos). Aparecem como indisponíveis no calendário online.</div>

        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          <input
            type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}
            min={new Date().toISOString().slice(0,10)}
            style={{flex:1,minWidth:160,padding:'9px 14px',borderRadius:9,border:'1px solid var(--border)',fontSize:14,color:'var(--text)',outline:'none'}}
          />
          <button onClick={bloquear} disabled={!novaData} className="btn-danger" style={{padding:'9px 18px',fontSize:13}}>
            + Bloquear data
          </button>
        </div>

        {blocked.length===0 ? (
          <div style={{textAlign:'center',padding:'20px 0',color:'var(--muted)',fontSize:13}}>
            <Check size={20} color="var(--success)" style={{display:'block',margin:'0 auto 8px'}}/>
            Nenhuma data bloqueada
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
            {blocked.sort((a,b)=>a.date<b.date?-1:1).map(b=>{
              const dt = new Date(b.date+'T12:00:00')
              const isPass = dt < new Date()
              return (
                <div key={b.id||b.date} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 12px',background:isPass?'var(--gray-50)':'var(--warning-light)',
                  border:`1px solid ${isPass?'var(--border)':'var(--warning)'}`,
                  borderRadius:9,opacity:isPass?.6:1,
                }}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:isPass?'var(--muted)':'var(--text)'}}>
                      {dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
                    </div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>
                      {dt.toLocaleDateString('pt-BR',{weekday:'short'})}
                    </div>
                  </div>
                  <button onClick={()=>desbloquear(b.id)} style={{padding:'3px 8px',borderRadius:6,border:'none',background:'rgba(220,38,38,.1)',color:'var(--danger)',fontSize:11,fontWeight:700,cursor:'pointer'}}>✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
