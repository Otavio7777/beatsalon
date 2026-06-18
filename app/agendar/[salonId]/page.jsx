'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'

/* ─── Configuração de horários ─── */
const HORA_INICIO  = 8   // 08:00
const HORA_FIM     = 18  // até 18:00 (último slot = 17:00)
const INTERVALO    = 60  // minutos por slot

const SERVICOS_PADRAO = ['Corte', 'Barba', 'Corte + Barba', 'Coloração', 'Hidratação', 'Manicure', 'Pedicure', 'Sobrancelha', 'Outro']

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function gerarSlots() {
  const slots = []
  for (let h = HORA_INICIO; h < HORA_FIM; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`)
  }
  return slots
}

function formatarData(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function dataParaISO(dateStr, hora) {
  return `${dateStr}T${hora}:00`
}

/* ─── Calendário simples ─── */
function Calendario({ valor, onChange, ocupados = [] }) {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())

  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()

  const celulas = []
  for (let i = 0; i < primeiroDia; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)

  const dataStr = (d) => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isPast = (d) => new Date(ano, mes, d) < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const isSelected = (d) => valor === dataStr(d)

  return (
    <div style={{userSelect:'none'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={()=>{ if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }}
          style={{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'#534AB7',padding:'4px 10px'}}>‹</button>
        <span style={{fontWeight:700,fontSize:15}}>{MESES[mes]} {ano}</span>
        <button onClick={()=>{ if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }}
          style={{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'#534AB7',padding:'4px 10px'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DIAS_SEMANA.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#8A87A0',padding:'4px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {celulas.map((d,i) => d === null ? <div key={`e${i}`}/> : (
          <div key={d} onClick={()=>!isPast(d) && onChange(dataStr(d))}
            style={{
              textAlign:'center', padding:'8px 0', borderRadius:8, fontSize:13, fontWeight:600,
              cursor: isPast(d) ? 'default' : 'pointer',
              background: isSelected(d) ? '#534AB7' : isPast(d) ? 'transparent' : '#F2F1F8',
              color: isSelected(d) ? '#fff' : isPast(d) ? '#C9C7D4' : '#1A1825',
              border: isSelected(d) ? '2px solid #534AB7' : '2px solid transparent',
            }}>
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Página principal ─── */
export default function AgendarPage({ params }) {
  const { salonId } = params
  const [salon, setSalon]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  const [etapa, setEtapa]         = useState(1) // 1=servico, 2=data, 3=horario, 4=dados, 5=confirmado
  const [servico, setServico]     = useState('')
  const [servicoCustom, setServicoCustom] = useState('')
  const [dataSel, setDataSel]     = useState('')
  const [horaSel, setHoraSel]     = useState('')
  const [slotsOcupados, setSlotsOcupados] = useState([])
  const [loadingSlots, setLoadingSlots]   = useState(false)

  const [nome, setNome]   = useState('')
  const [fone, setFone]   = useState('')
  const [obs, setObs]     = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]   = useState('')

  const sb = createClient()
  const slots = gerarSlots()

  /* Busca dados do salão */
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await sb.from('salons').select('id, name, phone, address').eq('id', salonId).single()
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setSalon(data)
      setLoading(false)
    }
    fetch()
  }, [salonId])

  /* Busca slots ocupados quando data muda */
  useEffect(() => {
    if (!dataSel || !salonId) return
    const fetchSlots = async () => {
      setLoadingSlots(true)
      const inicio = `${dataSel}T00:00:00`
      const fim    = `${dataSel}T23:59:59`
      const { data } = await sb.from('appointments')
        .select('date, status')
        .eq('salon_id', salonId)
        .gte('date', inicio)
        .lte('date', fim)
        .not('status', 'eq', 'cancelado')
      setSlotsOcupados((data || []).map(a => a.date?.slice(11,16)))
      setLoadingSlots(false)
    }
    fetchSlots()
  }, [dataSel, salonId])

  const servicoFinal = servico === 'Outro' ? servicoCustom : servico

  const confirmar = async () => {
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!fone.trim()) { setErro('Informe seu telefone.'); return }
    setSalvando(true); setErro('')
    const { error } = await sb.from('appointments').insert({
      salon_id:     salonId,
      client_name:  nome.trim(),
      service_name: servicoFinal,
      date:         dataParaISO(dataSel, horaSel),
      value:        0,
      status:       'agendado',
      notes:        fone + (obs ? ` | ${obs}` : ''),
    })
    if (error) { setErro('Erro ao agendar. Tente novamente.'); setSalvando(false); return }
    setEtapa(5)
    setSalvando(false)
  }

  /* ─── Loading / Not found ─── */
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F2F1F8'}}>
      <div style={{textAlign:'center',color:'#8A87A0'}}>
        <div style={{fontSize:32,marginBottom:12}}>✂️</div>
        <div style={{fontSize:15,fontWeight:600}}>Carregando...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F2F1F8'}}>
      <div style={{textAlign:'center',color:'#8A87A0',padding:32}}>
        <div style={{fontSize:40,marginBottom:12}}>😕</div>
        <div style={{fontSize:18,fontWeight:700,color:'#1A1825',marginBottom:8}}>Salão não encontrado</div>
        <div style={{fontSize:14}}>O link de agendamento pode ter expirado ou é inválido.</div>
      </div>
    </div>
  )

  /* ─── Estilos ─── */
  const s = {
    page:    { minHeight:'100vh', background:'#F2F1F8', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    header:  { background:'#16112B', padding:'20px 0', textAlign:'center' },
    logo:    { fontSize:22, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
    salon:   { fontSize:14, color:'rgba(255,255,255,.55)', marginTop:4 },
    card:    { background:'#fff', borderRadius:20, padding:'28px', maxWidth:480, margin:'0 auto', boxShadow:'0 4px 24px rgba(0,0,0,.08)' },
    title:   { fontSize:20, fontWeight:800, color:'#1A1825', marginBottom:6 },
    sub:     { fontSize:13, color:'#8A87A0', marginBottom:24 },
    btn:     { width:'100%', padding:'13px', background:'#534AB7', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:16 },
    btnOut:  { width:'100%', padding:'11px', background:'#fff', color:'#534AB7', border:'2px solid #534AB7', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', marginTop:8 },
    progBar: { display:'flex', gap:6, marginBottom:24 },
    progStep:{ flex:1, height:4, borderRadius:4 },
    steps:   ['Serviço','Data','Horário','Seus dados'],
    label:   { fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8, display:'block', marginTop:16 },
    input:   { width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid #E3E1F0', fontSize:14, outline:'none', color:'#1A1825', boxSizing:'border-box' },
    svcGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 },
    svcBtn:  (sel) => ({ padding:'10px', borderRadius:10, border:`2px solid ${sel?'#534AB7':'#E3E1F0'}`, background:sel?'#EEEDFE':'#fff', color:sel?'#534AB7':'#8A87A0', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'center' }),
    slotGrid:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 },
    slotBtn: (sel, ocupado) => ({
      padding:'12px 8px', borderRadius:10, textAlign:'center', fontSize:14, fontWeight:700, cursor: ocupado ? 'default' : 'pointer',
      border:`2px solid ${ocupado ? '#F0EFF8' : sel ? '#534AB7' : '#E3E1F0'}`,
      background: ocupado ? '#F0EFF8' : sel ? '#534AB7' : '#fff',
      color: ocupado ? '#C9C7D4' : sel ? '#fff' : '#1A1825',
    }),
    confRow: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F2F1F8' },
    confLbl: { fontSize:13, color:'#8A87A0' },
    confVal: { fontSize:13, fontWeight:700, color:'#1A1825', textAlign:'right', maxWidth:'60%' },
  }

  const progressoAtual = Math.min(etapa, 4)

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>✂️ BeatSalon</div>
        <div style={s.salon}>{salon.name}</div>
      </div>

      {/* Conteúdo */}
      <div style={{padding:'24px 16px', maxWidth:480, margin:'0 auto'}}>

        {/* Etapa 5: Confirmado */}
        {etapa === 5 && (
          <div style={s.card}>
            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{fontSize:56, marginBottom:12}}>🎉</div>
              <div style={{fontSize:22, fontWeight:800, color:'#1A1825', marginBottom:8}}>Agendado!</div>
              <div style={{fontSize:14, color:'#8A87A0'}}>Seu horário foi reservado com sucesso em {salon.name}.</div>
            </div>
            <div style={{background:'#F2F1F8', borderRadius:14, padding:'16px'}}>
              <div style={s.confRow}><span style={s.confLbl}>Serviço</span><span style={s.confVal}>{servicoFinal}</span></div>
              <div style={s.confRow}><span style={s.confLbl}>Data</span><span style={s.confVal}>{formatarData(dataSel)}</span></div>
              <div style={s.confRow}><span style={s.confLbl}>Horário</span><span style={s.confVal}>{horaSel}</span></div>
              <div style={{...s.confRow, borderBottom:'none'}}><span style={s.confLbl}>Cliente</span><span style={s.confVal}>{nome}</span></div>
            </div>
            {salon.phone && (
              <a href={`https://wa.me/55${salon.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                style={{...s.btn, display:'block', textAlign:'center', textDecoration:'none', marginTop:16, background:'#25D366'}}>
                💬 Confirmar no WhatsApp
              </a>
            )}
            <div style={{textAlign:'center', marginTop:16, fontSize:12, color:'#8A87A0'}}>
              Qualquer dúvida, entre em contato com o salão.
            </div>
          </div>
        )}

        {/* Etapas 1-4 */}
        {etapa <= 4 && (
          <div style={s.card}>
            {/* Barra de progresso */}
            <div style={s.progBar}>
              {[1,2,3,4].map(n => (
                <div key={n} style={{...s.progStep, background: n <= progressoAtual ? '#534AB7' : '#E3E1F0'}} />
              ))}
            </div>
            <div style={{fontSize:11, color:'#8A87A0', marginBottom:20, fontWeight:600}}>
              PASSO {etapa} DE 4 · {['SERVIÇO','DATA','HORÁRIO','SEUS DADOS'][etapa-1]}
            </div>

            {/* Etapa 1: Serviço */}
            {etapa === 1 && (
              <>
                <div style={s.title}>Qual serviço deseja?</div>
                <div style={s.sub}>Escolha o serviço ou descreva o que precisa.</div>
                <div style={s.svcGrid}>
                  {SERVICOS_PADRAO.map(sv => (
                    <button key={sv} style={s.svcBtn(servico === sv)} onClick={() => setServico(sv)}>
                      {sv}
                    </button>
                  ))}
                </div>
                {servico === 'Outro' && (
                  <input style={s.input} placeholder="Descreva o serviço..." value={servicoCustom}
                    onChange={e => setServicoCustom(e.target.value)} />
                )}
                <button style={{...s.btn, opacity: !servico || (servico === 'Outro' && !servicoCustom) ? .5 : 1}}
                  disabled={!servico || (servico === 'Outro' && !servicoCustom)}
                  onClick={() => setEtapa(2)}>
                  Próximo →
                </button>
              </>
            )}

            {/* Etapa 2: Data */}
            {etapa === 2 && (
              <>
                <div style={s.title}>Quando você quer vir?</div>
                <div style={s.sub}>Selecione a data no calendário abaixo.</div>
                <Calendario valor={dataSel} onChange={setDataSel} />
                <button style={{...s.btn, opacity: !dataSel ? .5 : 1}} disabled={!dataSel}
                  onClick={() => setEtapa(3)}>
                  Próximo →
                </button>
                <button style={s.btnOut} onClick={() => setEtapa(1)}>← Voltar</button>
              </>
            )}

            {/* Etapa 3: Horário */}
            {etapa === 3 && (
              <>
                <div style={s.title}>Qual horário?</div>
                <div style={s.sub}>Horários disponíveis para {formatarData(dataSel)} — cada atendimento dura 1 hora.</div>
                {loadingSlots ? (
                  <div style={{textAlign:'center',color:'#8A87A0',padding:'24px 0'}}>Verificando disponibilidade...</div>
                ) : (
                  <div style={s.slotGrid}>
                    {slots.map(slot => {
                      const ocupado = slotsOcupados.includes(slot)
                      const sel = horaSel === slot
                      return (
                        <div key={slot} style={s.slotBtn(sel, ocupado)}
                          onClick={() => !ocupado && setHoraSel(slot)}>
                          {slot}
                          {ocupado && <div style={{fontSize:9,marginTop:2,color:'#C9C7D4'}}>ocupado</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <button style={{...s.btn, opacity: !horaSel ? .5 : 1}} disabled={!horaSel}
                  onClick={() => setEtapa(4)}>
                  Próximo →
                </button>
                <button style={s.btnOut} onClick={() => setEtapa(2)}>← Voltar</button>
              </>
            )}

            {/* Etapa 4: Dados do cliente */}
            {etapa === 4 && (
              <>
                <div style={s.title}>Quase lá!</div>
                <div style={s.sub}>Informe seus dados para confirmar o agendamento.</div>

                {/* Resumo */}
                <div style={{background:'#F2F1F8',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
                  <div style={{fontSize:12,color:'#8A87A0',fontWeight:600,marginBottom:6}}>RESUMO</div>
                  <div style={{fontSize:14,fontWeight:700}}>{servicoFinal}</div>
                  <div style={{fontSize:13,color:'#534AB7',fontWeight:600,marginTop:2}}>📅 {formatarData(dataSel)} às {horaSel}</div>
                </div>

                <label style={s.label}>Seu nome *</label>
                <input style={s.input} placeholder="Nome completo" value={nome} onChange={e=>setNome(e.target.value)} />

                <label style={s.label}>WhatsApp / Telefone *</label>
                <input style={s.input} placeholder="(00) 00000-0000" value={fone} onChange={e=>setFone(e.target.value)} />

                <label style={s.label}>Observações <span style={{fontWeight:400,textTransform:'none'}}>(opcional)</span></label>
                <input style={s.input} placeholder="Ex: primeira vez, alergia a determinado produto..." value={obs} onChange={e=>setObs(e.target.value)} />

                {erro && <div style={{fontSize:13,color:'#D85A30',marginTop:10,fontWeight:600}}>⚠️ {erro}</div>}

                <button style={{...s.btn, opacity: salvando ? .7 : 1}} disabled={salvando} onClick={confirmar}>
                  {salvando ? 'Agendando...' : '✓ Confirmar agendamento'}
                </button>
                <button style={s.btnOut} onClick={() => setEtapa(3)}>← Voltar</button>
              </>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div style={{textAlign:'center',marginTop:24,fontSize:12,color:'#C9C7D4'}}>
          Powered by ✂️ BeatSalon
        </div>
      </div>
    </div>
  )
}
