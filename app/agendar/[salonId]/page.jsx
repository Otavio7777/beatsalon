'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'

const HORA_INICIO = 8
const HORA_FIM    = 18
const SERVICOS    = ['Corte','Barba','Corte + Barba','Coloração','Hidratação','Manicure','Pedicure','Sobrancelha','Outro']
const MESES       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function slots() {
  const s = []
  for (let h = HORA_INICIO; h < HORA_FIM; h++) s.push(`${String(h).padStart(2,'0')}:00`)
  return s
}
function fmtData(d) {
  if (!d) return ''
  const [y,m,dd] = d.split('-')
  return `${dd}/${m}/${y}`
}
function toISO(date, hora) { return `${date}T${hora}:00` }

/* ── Calendário ── */
function Cal({ valor, onChange }) {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (let d = 1; d <= diasNoMes; d++) cells.push(d)
  const str    = (d) => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isPast = (d) => new Date(ano,mes,d) < new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate())
  const isSel  = (d) => valor === str(d)
  return (
    <div style={{userSelect:'none'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={()=>{ if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }}
          style={{border:'none',background:'none',fontSize:20,cursor:'pointer',color:'#534AB7',padding:'4px 8px'}}>‹</button>
        <span style={{fontWeight:700,fontSize:15}}>{MESES[mes]} {ano}</span>
        <button onClick={()=>{ if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }}
          style={{border:'none',background:'none',fontSize:20,cursor:'pointer',color:'#534AB7',padding:'4px 8px'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DIAS_SEMANA.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#8A87A0',padding:'4px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((d,i) => d===null ? <div key={`e${i}`}/> : (
          <div key={d} onClick={()=>!isPast(d)&&onChange(str(d))} style={{
            textAlign:'center',padding:'9px 0',borderRadius:8,fontSize:13,fontWeight:600,
            cursor:isPast(d)?'default':'pointer',
            background:isSel(d)?'#534AB7':isPast(d)?'transparent':'#F2F1F8',
            color:isSel(d)?'#fff':isPast(d)?'#C9C7D4':'#1A1825',
            border:`2px solid ${isSel(d)?'#534AB7':'transparent'}`,
          }}>{d}</div>
        ))}
      </div>
    </div>
  )
}

/* ── Página ── */
export default function AgendarPage({ params }) {
  const { salonId } = params
  const [salon, setSalon]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [etapa, setEtapa]           = useState(1)
  const [servico, setServico]       = useState('')
  const [servicoCustom, setServicoCustom] = useState('')
  const [dataSel, setDataSel]       = useState('')
  const [horaSel, setHoraSel]       = useState('')
  const [ocupados, setOcupados]     = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [nome, setNome]             = useState('')
  const [fone, setFone]             = useState('')
  const [obs, setObs]               = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')
  const [resultado, setResultado]   = useState(null) // { isNew, clientName }
  const sb = createClient()

  /* Busca salão */
  useEffect(() => {
    sb.from('salons').select('id,name,phone').eq('id',salonId).single()
      .then(({data,error}) => {
        if (error||!data) { setNotFound(true); setLoading(false); return }
        setSalon(data); setLoading(false)
      })
  },[salonId])

  /* Busca slots ocupados */
  useEffect(() => {
    if (!dataSel||!salonId) return
    setLoadingSlots(true)
    sb.from('appointments')
      .select('date,status')
      .eq('salon_id',salonId)
      .gte('date',`${dataSel}T00:00:00`)
      .lte('date',`${dataSel}T23:59:59`)
      .not('status','eq','cancelado')
      .then(({data}) => {
        setOcupados((data||[]).map(a=>a.date?.slice(11,16)))
        setLoadingSlots(false)
      })
  },[dataSel,salonId])

  const servicoFinal = servico==='Outro' ? servicoCustom : servico

  /* ── Confirmação com auto-vinculação ao CRM ── */
  const confirmar = async () => {
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!fone.trim()) { setErro('Informe seu telefone/WhatsApp.'); return }
    setSalvando(true); setErro('')

    // Usa o RPC book_appointment que auto-vincula/cria cliente
    const { data, error } = await sb.rpc('book_appointment', {
      p_salon_id:    salonId,
      p_client_name: nome.trim(),
      p_client_phone: fone.replace(/\D/g,''),
      p_service_name: servicoFinal,
      p_date:        toISO(dataSel, horaSel),
      p_notes:       obs.trim(),
    })

    if (error) {
      // Fallback: insert direto se o RPC não existir ainda
      const { error: e2 } = await sb.from('appointments').insert({
        salon_id:     salonId,
        client_name:  nome.trim(),
        service_name: servicoFinal,
        date:         toISO(dataSel, horaSel),
        value:        0,
        status:       'agendado',
        notes:        `${fone.trim()}${obs ? ' | '+obs : ''}`,
      })
      if (e2) { setErro('Erro ao agendar. Tente novamente.'); setSalvando(false); return }
      setResultado({ isNew: null, clientName: nome.trim() })
    } else {
      setResultado({
        isNew:      data?.is_new_client,
        clientName: data?.client_name || nome.trim(),
      })
    }

    setEtapa(5)
    setSalvando(false)
  }

  /* ── Estados visuais ── */
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F2F1F8'}}>
      <div style={{textAlign:'center',color:'#8A87A0'}}>
        <div style={{fontSize:40,marginBottom:12}}>✂️</div>
        <div style={{fontWeight:600}}>Carregando...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F2F1F8'}}>
      <div style={{textAlign:'center',padding:32}}>
        <div style={{fontSize:48,marginBottom:12}}>😕</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Salão não encontrado</div>
        <div style={{color:'#8A87A0',fontSize:14}}>O link pode ser inválido ou ter expirado.</div>
      </div>
    </div>
  )

  const s = {
    page:    { minHeight:'100vh', background:'#F2F1F8', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', paddingBottom:24 },
    header:  { background:'#16112B', padding:'18px 0', textAlign:'center' },
    logo:    { fontSize:22, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
    sname:   { fontSize:13, color:'rgba(255,255,255,.5)', marginTop:4 },
    wrap:    { padding:'20px 16px', maxWidth:480, margin:'0 auto' },
    card:    { background:'#fff', borderRadius:20, padding:'24px 20px', boxShadow:'0 4px 24px rgba(0,0,0,.08)' },
    progBar: { display:'flex', gap:5, marginBottom:20 },
    progSt:  { flex:1, height:4, borderRadius:4 },
    label:   { fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, display:'block', marginTop:14 },
    input:   { width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid #E3E1F0', fontSize:14, outline:'none', color:'#1A1825', boxSizing:'border-box' },
    svcGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 },
    svcBtn:  (sel) => ({ padding:'11px 8px', borderRadius:10, border:`2px solid ${sel?'#534AB7':'#E3E1F0'}`, background:sel?'#EEEDFE':'#fff', color:sel?'#534AB7':'#8A87A0', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'center' }),
    btn:     { width:'100%', padding:'14px', background:'#534AB7', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:16 },
    btnOut:  { width:'100%', padding:'11px', background:'#fff', color:'#534AB7', border:'2px solid #E3E1F0', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:8 },
    slotGrid:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 },
    slotBtn: (sel,ocu) => ({
      padding:'12px 6px', borderRadius:10, textAlign:'center', fontSize:14, fontWeight:700,
      cursor:ocu?'default':'pointer',
      border:`2px solid ${ocu?'#F0EFF8':sel?'#534AB7':'#E3E1F0'}`,
      background:ocu?'#F0EFF8':sel?'#534AB7':'#fff',
      color:ocu?'#C9C7D4':sel?'#fff':'#1A1825',
    }),
    resumo:  { background:'#F2F1F8', borderRadius:12, padding:'14px 16px', marginBottom:18 },
    confRow: { display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #F2F1F8' },
  }

  const passo = Math.min(etapa,4)

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>✂️ BeatSalon</div>
        <div style={s.sname}>{salon.name}</div>
      </div>

      <div style={s.wrap}>

        {/* ── Etapa 5: Confirmado ── */}
        {etapa===5 && (
          <div style={s.card}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{fontSize:56,marginBottom:12}}>🎉</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Agendado!</div>
              <div style={{fontSize:14,color:'#8A87A0'}}>Seu horário foi reservado com sucesso em <strong>{salon.name}</strong>.</div>
            </div>

            {/* Badge de vinculação ao CRM */}
            {resultado?.isNew === true && (
              <div style={{background:'#E1F5EE',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#085041',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                ✨ Cadastro criado automaticamente na base de clientes do salão.
              </div>
            )}
            {resultado?.isNew === false && (
              <div style={{background:'#EEEDFE',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#534AB7',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                🔗 Agendamento vinculado ao seu cadastro existente.
              </div>
            )}

            <div style={{background:'#F2F1F8',borderRadius:14,padding:'14px 16px'}}>
              <div style={s.confRow}><span style={{color:'#8A87A0',fontSize:13}}>Serviço</span><span style={{fontWeight:700,fontSize:13}}>{servicoFinal}</span></div>
              <div style={s.confRow}><span style={{color:'#8A87A0',fontSize:13}}>Data</span><span style={{fontWeight:700,fontSize:13}}>{fmtData(dataSel)}</span></div>
              <div style={s.confRow}><span style={{color:'#8A87A0',fontSize:13}}>Horário</span><span style={{fontWeight:700,fontSize:13}}>{horaSel}</span></div>
              <div style={{...s.confRow,borderBottom:'none'}}><span style={{color:'#8A87A0',fontSize:13}}>Cliente</span><span style={{fontWeight:700,fontSize:13}}>{resultado?.clientName||nome}</span></div>
            </div>

            {salon.phone && (
              <a href={`https://wa.me/55${salon.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                style={{...s.btn,display:'block',textAlign:'center',textDecoration:'none',background:'#25D366',marginTop:16}}>
                💬 Confirmar no WhatsApp
              </a>
            )}
            <div style={{textAlign:'center',marginTop:14,fontSize:12,color:'#C9C7D4'}}>Powered by ✂️ BeatSalon</div>
          </div>
        )}

        {/* ── Etapas 1–4 ── */}
        {etapa<=4 && (
          <div style={s.card}>
            <div style={s.progBar}>
              {[1,2,3,4].map(n=><div key={n} style={{...s.progSt,background:n<=passo?'#534AB7':'#E3E1F0'}}/>)}
            </div>
            <div style={{fontSize:11,color:'#8A87A0',fontWeight:600,marginBottom:18}}>
              PASSO {etapa} DE 4 · {['SERVIÇO','DATA','HORÁRIO','SEUS DADOS'][etapa-1]}
            </div>

            {/* Passo 1 — Serviço */}
            {etapa===1 && <>
              <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>Qual serviço deseja?</div>
              <div style={{fontSize:13,color:'#8A87A0',marginBottom:18}}>Escolha ou descreva o que precisa.</div>
              <div style={s.svcGrid}>
                {SERVICOS.map(sv=>(
                  <button key={sv} style={s.svcBtn(servico===sv)} onClick={()=>setServico(sv)}>{sv}</button>
                ))}
              </div>
              {servico==='Outro' && (
                <input style={s.input} placeholder="Descreva o serviço..." value={servicoCustom} onChange={e=>setServicoCustom(e.target.value)} />
              )}
              <button style={{...s.btn,opacity:!servico||(servico==='Outro'&&!servicoCustom)?.5:1}}
                disabled={!servico||(servico==='Outro'&&!servicoCustom)}
                onClick={()=>setEtapa(2)}>Próximo →</button>
            </>}

            {/* Passo 2 — Data */}
            {etapa===2 && <>
              <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>Quando você quer vir?</div>
              <div style={{fontSize:13,color:'#8A87A0',marginBottom:18}}>Selecione a data disponível.</div>
              <Cal valor={dataSel} onChange={setDataSel} />
              <button style={{...s.btn,opacity:!dataSel?.5:1}} disabled={!dataSel} onClick={()=>setEtapa(3)}>Próximo →</button>
              <button style={s.btnOut} onClick={()=>setEtapa(1)}>← Voltar</button>
            </>}

            {/* Passo 3 — Horário */}
            {etapa===3 && <>
              <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>Qual horário?</div>
              <div style={{fontSize:13,color:'#8A87A0',marginBottom:18}}>Disponíveis para {fmtData(dataSel)} — atendimento de 1 hora.</div>
              {loadingSlots ? (
                <div style={{textAlign:'center',color:'#8A87A0',padding:24}}>Verificando disponibilidade...</div>
              ) : (
                <div style={s.slotGrid}>
                  {slots().map(slot=>{
                    const ocu = ocupados.includes(slot)
                    const sel = horaSel===slot
                    return (
                      <div key={slot} style={s.slotBtn(sel,ocu)} onClick={()=>!ocu&&setHoraSel(slot)}>
                        {slot}
                        {ocu&&<div style={{fontSize:9,marginTop:2,color:'#C9C7D4'}}>ocupado</div>}
                      </div>
                    )
                  })}
                </div>
              )}
              <button style={{...s.btn,opacity:!horaSel?.5:1}} disabled={!horaSel} onClick={()=>setEtapa(4)}>Próximo →</button>
              <button style={s.btnOut} onClick={()=>setEtapa(2)}>← Voltar</button>
            </>}

            {/* Passo 4 — Dados */}
            {etapa===4 && <>
              <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>Quase lá!</div>
              <div style={{fontSize:13,color:'#8A87A0',marginBottom:18}}>Informe seus dados para confirmar.</div>

              {/* Resumo */}
              <div style={s.resumo}>
                <div style={{fontSize:11,color:'#8A87A0',fontWeight:700,marginBottom:6}}>RESUMO</div>
                <div style={{fontSize:14,fontWeight:700}}>{servicoFinal}</div>
                <div style={{fontSize:13,color:'#534AB7',fontWeight:600,marginTop:3}}>📅 {fmtData(dataSel)} às {horaSel}</div>
              </div>

              <label style={s.label}>Seu nome *</label>
              <input style={s.input} placeholder="Nome completo" value={nome} onChange={e=>setNome(e.target.value)} />

              <label style={s.label}>WhatsApp / Telefone *</label>
              <input style={s.input} placeholder="(00) 00000-0000" value={fone} onChange={e=>setFone(e.target.value)} inputMode="tel" />

              {/* Aviso de vinculação automática */}
              <div style={{background:'#E6F1FB',borderRadius:10,padding:'10px 14px',marginTop:12,fontSize:12,color:'#0C447C',display:'flex',gap:8,alignItems:'flex-start'}}>
                <span>🔗</span>
                <span>Seu telefone será usado para <strong>vincular ou criar seu cadastro</strong> automaticamente na base do salão.</span>
              </div>

              <label style={s.label}>Observações <span style={{fontWeight:400,textTransform:'none'}}>(opcional)</span></label>
              <input style={s.input} placeholder="Ex: primeira vez, alergia..." value={obs} onChange={e=>setObs(e.target.value)} />

              {erro && <div style={{fontSize:13,color:'#D85A30',marginTop:10,fontWeight:600}}>⚠️ {erro}</div>}

              <button style={{...s.btn,opacity:salvando?.7:1}} disabled={salvando} onClick={confirmar}>
                {salvando ? 'Agendando...' : '✓ Confirmar agendamento'}
              </button>
              <button style={s.btnOut} onClick={()=>setEtapa(3)}>← Voltar</button>
            </>}
          </div>
        )}

        <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#C9C7D4'}}>Powered by ✂️ BeatSalon</div>
      </div>
    </div>
  )
}
