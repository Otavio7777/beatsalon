'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase'

/* ── Configuração ── */
const H_INICIO = 8
const H_FIM    = 18
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const SERVICES = [
  { id:'corte',       icon:'✂️',  name:'Corte'        },
  { id:'barba',       icon:'🪒',  name:'Barba'        },
  { id:'corte-barba', icon:'💈',  name:'Corte + Barba'},
  { id:'coloracao',   icon:'🎨',  name:'Coloração'    },
  { id:'hidratacao',  icon:'💧',  name:'Hidratação'   },
  { id:'manicure',    icon:'💅',  name:'Manicure'     },
  { id:'pedicure',    icon:'🦶',  name:'Pedicure'     },
  { id:'sobrancelha', icon:'✨',  name:'Sobrancelha'  },
  { id:'outro',       icon:'➕',  name:'Outro'        },
]

function slots() {
  const s = []
  for (let h = H_INICIO; h < H_FIM; h++)
    s.push(`${String(h).padStart(2,'0')}:00`)
  return s
}

function fmtData(ds) {
  if (!ds) return ''
  const [y,m,d] = ds.split('-')
  return `${d}/${m}/${y}`
}

function fmtDataLong(ds) {
  if (!ds) return ''
  const d = new Date(ds + 'T12:00:00')
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function toISO(date, hora) { return `${date}T${hora}:00` }

function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/* ─────────────── Calendário ─────────────── */
function Cal({ valor, onChange }) {
  const agora = today()
  const [mes, setMes] = useState(agora.getMonth())
  const [ano, setAno] = useState(agora.getFullYear())

  const primeiro = new Date(ano, mes, 1).getDay()
  const ultimo   = new Date(ano, mes + 1, 0).getDate()
  const cells    = [...Array(primeiro).fill(null), ...Array.from({length:ultimo},(_,i)=>i+1)]

  const str    = d => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isPast = d => new Date(ano,mes,d) < agora
  const isTdy  = d => new Date(ano,mes,d).toDateString() === agora.toDateString()
  const isSel  = d => valor === str(d)

  const prev = () => { if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }
  const next = () => { if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }

  return (
    <div>
      {/* Header do mês */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <button onClick={prev} style={{width:40,height:40,borderRadius:20,border:'1px solid #E3E1F0',background:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#534AB7'}}>‹</button>
        <span style={{fontWeight:800,fontSize:16,color:'#1A1825'}}>{MESES[mes]} {ano}</span>
        <button onClick={next} style={{width:40,height:40,borderRadius:20,border:'1px solid #E3E1F0',background:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#534AB7'}}>›</button>
      </div>

      {/* Dias da semana */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
        {DIAS.map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'#8A87A0',padding:'4px 0'}}>{d}</div>)}
      </div>

      {/* Dias */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
        {cells.map((d,i) => d===null ? <div key={`e${i}`}/> : (
          <div key={d}
            onClick={() => !isPast(d) && onChange(str(d))}
            style={{
              aspectRatio:'1',
              display:'flex',alignItems:'center',justifyContent:'center',
              borderRadius:'50%',fontSize:14,fontWeight:isSel(d)?800:isTdy(d)?700:500,
              cursor:isPast(d)?'default':'pointer',
              background: isSel(d)?'#534AB7' : 'transparent',
              color: isSel(d)?'#fff' : isPast(d)?'#D4D2DF' : '#1A1825',
              position:'relative',
              transition:'all .15s',
            }}>
            {d}
            {isTdy(d) && !isSel(d) && (
              <span style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:2,background:'#534AB7'}}/>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Step indicator ─────────────── */
function StepBar({ atual }) {
  const passos = ['Serviço','Data','Horário','Dados']
  return (
    <div style={{padding:'0 4px',marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
        {/* Linha de fundo */}
        <div style={{position:'absolute',top:14,left:'12%',right:'12%',height:2,background:'#E3E1F0',zIndex:0}}/>
        {/* Linha de progresso */}
        <div style={{
          position:'absolute',top:14,left:'12%',height:2,background:'#534AB7',zIndex:1,
          width:`${((atual-1)/3)*76}%`,transition:'width .4s ease',
        }}/>
        {passos.map((p,i) => {
          const n    = i+1
          const done = n < atual
          const act  = n === atual
          return (
            <div key={p} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,zIndex:2}}>
              <div style={{
                width:28,height:28,borderRadius:14,
                background: done?'#534AB7' : act?'#534AB7' : '#fff',
                border: `2px solid ${(done||act)?'#534AB7':'#E3E1F0'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:12,fontWeight:700,
                color: (done||act)?'#fff':'#8A87A0',
                transition:'all .3s',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{fontSize:10,fontWeight:600,color:act?'#534AB7':done?'#534AB7':'#8A87A0'}}>{p}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── Página principal ─────────────── */
export default function AgendarPage({ params }) {
  const { salonId } = params
  const [salon, setSalon]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [etapa, setEtapa]         = useState(1)
  const [servico, setServico]     = useState(null)   // objeto { id, icon, name }
  const [servicoCustom, setServicoCustom] = useState('')
  const [dataSel, setDataSel]     = useState('')
  const [horaSel, setHoraSel]     = useState('')
  const [ocupados, setOcupados]   = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [nome, setNome]           = useState('')
  const [fone, setFone]           = useState('')
  const [obs, setObs]             = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [resultado, setResultado] = useState(null)
  const topRef                    = useRef(null)
  const sb = createClient()

  useEffect(() => {
    sb.from('salons').select('id,name,phone').eq('id',salonId).single()
      .then(({data,error}) => {
        if (error||!data) { setNotFound(true) }
        else setSalon(data)
        setLoading(false)
      })
  },[])

  useEffect(() => {
    if (!dataSel||!salonId) return
    setLoadingSlots(true); setHoraSel('')
    sb.from('appointments')
      .select('date')
      .eq('salon_id',salonId)
      .gte('date',`${dataSel}T00:00:00`)
      .lte('date',`${dataSel}T23:59:59`)
      .not('status','eq','cancelado')
      .then(({data}) => {
        setOcupados((data||[]).map(a=>a.date?.slice(11,16)))
        setLoadingSlots(false)
      })
  },[dataSel])

  /* Scroll topo ao mudar etapa */
  const irPara = (n) => {
    setEtapa(n)
    setTimeout(() => topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}), 50)
  }

  const servicoFinal = servico?.id === 'outro' ? servicoCustom : servico?.name

  const confirmar = async () => {
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!fone.trim()) { setErro('Informe seu WhatsApp.'); return }
    setSalvando(true); setErro('')

    const { data, error } = await sb.rpc('book_appointment', {
      p_salon_id:    salonId,
      p_client_name: nome.trim(),
      p_client_phone: fone.replace(/\D/g,''),
      p_service_name: servicoFinal,
      p_date:        toISO(dataSel, horaSel),
      p_notes:       obs.trim(),
    })

    if (error) {
      // Fallback
      const { error: e2 } = await sb.from('appointments').insert({
        salon_id:salonId, client_name:nome.trim(), service_name:servicoFinal,
        date:toISO(dataSel,horaSel), value:0, status:'agendado',
        notes:`${fone.trim()}${obs ? ' | '+obs : ''}`,
      })
      if (e2) { setErro('Erro ao agendar. Tente novamente.'); setSalvando(false); return }
      setResultado({ isNew: null, clientName: nome.trim() })
    } else {
      setResultado({ isNew: data?.is_new_client, clientName: data?.client_name || nome.trim() })
    }

    irPara(5)
    setSalvando(false)
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#16112B',gap:16}}>
      <div style={{fontSize:48}}>✂️</div>
      <div style={{width:40,height:40,border:'3px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#F2F1F8',padding:32,textAlign:'center'}}>
      <div style={{fontSize:56,marginBottom:16}}>😕</div>
      <div style={{fontSize:20,fontWeight:800,marginBottom:8}}>Salão não encontrado</div>
      <div style={{color:'#8A87A0',fontSize:15}}>O link pode ter expirado.</div>
    </div>
  )

  /* ── Estilos base ── */
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { background: #F2F1F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    input { font-family: inherit; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
    @keyframes pop   { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
    @keyframes spin  { to { transform: rotate(360deg) } }
    .fade-up { animation: fadeUp .3s ease both }
    .pop     { animation: pop .5s cubic-bezier(.175,.885,.32,1.275) both }
  `

  /* Botão CTA fixo */
  const CTA = ({ label, onClick, disabled, secondary }) => (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', padding:'15px', fontWeight:700, fontSize:15,
      borderRadius:14, border: secondary ? '2px solid #E3E1F0' : 'none',
      background: secondary ? '#fff' : disabled ? '#C9C7D4' : '#534AB7',
      color: secondary ? '#8A87A0' : '#fff',
      cursor: disabled ? 'default' : 'pointer',
      transition:'all .15s',
    }}>{label}</button>
  )

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:'100vh',background:'#F2F1F8',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>

        {/* ── Header ── */}
        <div ref={topRef} style={{background:'#16112B',paddingTop:'env(safe-area-inset-top, 0px)'}}>
          <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:20,background:'#534AB7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>✂️</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,color:'#fff',fontSize:16,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{salon.name}</div>
              {etapa <= 4 && <div style={{fontSize:11,color:'rgba(255,255,255,.45)',marginTop:1}}>Agendamento online</div>}
            </div>
          </div>
        </div>

        {/* ── Conteúdo ── */}
        <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px 100px'}}>

          {/* Etapa de sucesso */}
          {etapa === 5 && (
            <div className="fade-up">
              {/* Ícone de sucesso */}
              <div style={{textAlign:'center',padding:'32px 0 24px'}}>
                <div className="pop" style={{
                  width:80,height:80,borderRadius:40,
                  background:'linear-gradient(135deg,#1D9E75,#0E6A4E)',
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  fontSize:36,marginBottom:16,boxShadow:'0 8px 24px rgba(29,158,117,.35)',
                }}>✓</div>
                <div style={{fontSize:26,fontWeight:800,color:'#1A1825',marginBottom:8}}>Agendado!</div>
                <div style={{fontSize:15,color:'#8A87A0',lineHeight:1.5}}>
                  Seu horário foi reservado com sucesso em<br/>
                  <strong style={{color:'#1A1825'}}>{salon.name}</strong>
                </div>
              </div>

              {/* Badge de vinculação CRM */}
              {resultado?.isNew === true && (
                <div style={{display:'flex',alignItems:'center',gap:10,background:'#E1F5EE',borderRadius:14,padding:'12px 16px',marginBottom:12,border:'1px solid #A7DFC8'}}>
                  <span style={{fontSize:20}}>✨</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#085041'}}>Cadastro criado!</div>
                    <div style={{fontSize:12,color:'#0E7A54'}}>Você foi adicionado à base de clientes do salão.</div>
                  </div>
                </div>
              )}
              {resultado?.isNew === false && (
                <div style={{display:'flex',alignItems:'center',gap:10,background:'#EEEDFE',borderRadius:14,padding:'12px 16px',marginBottom:12,border:'1px solid #C5C2F0'}}>
                  <span style={{fontSize:20}}>🔗</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#534AB7'}}>Vinculado ao seu cadastro</div>
                    <div style={{fontSize:12,color:'#7F77DC'}}>Agendamento conectado ao seu histórico.</div>
                  </div>
                </div>
              )}

              {/* Card resumo */}
              <div style={{background:'#fff',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,.06)',marginBottom:16}}>
                {[
                  ['🎯 Serviço', servicoFinal],
                  ['📅 Data',    fmtDataLong(dataSel)],
                  ['⏰ Horário', horaSel],
                  ['👤 Cliente', resultado?.clientName||nome],
                  ['📱 Contato', fone],
                ].map(([k,v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:'1px solid #F2F1F8'}}>
                    <span style={{fontSize:13,color:'#8A87A0'}}>{k}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#1A1825',textAlign:'right',maxWidth:'60%'}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Ações */}
              {salon.phone && (
                <a href={`https://wa.me/55${salon.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{display:'block',marginBottom:10,textDecoration:'none'}}>
                  <div style={{background:'#25D366',borderRadius:14,padding:'15px',textAlign:'center',fontWeight:700,fontSize:15,color:'#fff'}}>
                    💬 Confirmar via WhatsApp
                  </div>
                </a>
              )}
              <button onClick={()=>{ setEtapa(1);setServico(null);setDataSel('');setHoraSel('');setNome('');setFone('');setObs('');setResultado(null) }}
                style={{width:'100%',padding:'13px',background:'#F2F1F8',borderRadius:14,border:'none',fontWeight:600,fontSize:14,color:'#8A87A0',cursor:'pointer'}}>
                Fazer novo agendamento
              </button>

              <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#C9C7D4'}}>Powered by ✂️ BeatSalon</div>
            </div>
          )}

          {/* Etapas 1–4 */}
          {etapa <= 4 && (
            <div className="fade-up">
              <StepBar atual={etapa} />

              {/* ── Passo 1: Serviço ── */}
              {etapa === 1 && (
                <>
                  <div style={{marginBottom:6,fontSize:22,fontWeight:800,color:'#1A1825'}}>Qual serviço?</div>
                  <div style={{marginBottom:20,fontSize:14,color:'#8A87A0'}}>Toque para selecionar o que precisa.</div>

                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
                    {SERVICES.map(s => {
                      const sel = servico?.id === s.id
                      return (
                        <button key={s.id} onClick={()=>setServico(s)} style={{
                          padding:'14px 8px',borderRadius:16,border:`2px solid ${sel?'#534AB7':'#E3E1F0'}`,
                          background: sel ? '#534AB7' : '#fff',
                          display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                          cursor:'pointer',transition:'all .15s',
                          boxShadow: sel ? '0 4px 12px rgba(83,74,183,.35)' : '0 1px 4px rgba(0,0,0,.06)',
                        }}>
                          <span style={{fontSize:26}}>{s.icon}</span>
                          <span style={{fontSize:11,fontWeight:700,color:sel?'#fff':'#1A1825',textAlign:'center',lineHeight:1.2}}>{s.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  {servico?.id === 'outro' && (
                    <input
                      style={{width:'100%',padding:'13px 16px',borderRadius:12,border:'1px solid #E3E1F0',fontSize:14,outline:'none',color:'#1A1825',marginBottom:16,background:'#fff'}}
                      placeholder="Descreva o serviço desejado..."
                      value={servicoCustom}
                      onChange={e=>setServicoCustom(e.target.value)}
                      autoFocus
                    />
                  )}
                </>
              )}

              {/* ── Passo 2: Data ── */}
              {etapa === 2 && (
                <>
                  <div style={{marginBottom:6,fontSize:22,fontWeight:800,color:'#1A1825'}}>Qual data?</div>
                  <div style={{marginBottom:20,fontSize:14,color:'#8A87A0'}}>Toque em um dia disponível.</div>
                  <div style={{background:'#fff',borderRadius:20,padding:'20px',boxShadow:'0 2px 16px rgba(0,0,0,.06)',marginBottom:16}}>
                    <Cal valor={dataSel} onChange={setDataSel} />
                  </div>
                  {dataSel && (
                    <div style={{background:'#EEEDFE',borderRadius:12,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:18}}>📅</span>
                      <span style={{fontWeight:700,color:'#534AB7',fontSize:14}}>{fmtDataLong(dataSel)}</span>
                    </div>
                  )}
                </>
              )}

              {/* ── Passo 3: Horário ── */}
              {etapa === 3 && (
                <>
                  <div style={{marginBottom:6,fontSize:22,fontWeight:800,color:'#1A1825'}}>Qual horário?</div>
                  <div style={{marginBottom:16,fontSize:14,color:'#8A87A0'}}>
                    Atendimentos de 1 hora · {fmtDataLong(dataSel)}
                  </div>

                  {loadingSlots ? (
                    <div style={{textAlign:'center',padding:'40px 0',color:'#8A87A0'}}>
                      <div style={{width:32,height:32,border:'3px solid #E3E1F0',borderTopColor:'#534AB7',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
                      Verificando disponibilidade...
                    </div>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                      {slots().map(slot => {
                        const ocu = ocupados.includes(slot)
                        const sel = horaSel === slot
                        return (
                          <button key={slot} onClick={()=>!ocu&&setHoraSel(slot)} style={{
                            padding:'14px 8px',borderRadius:14,
                            border:`2px solid ${ocu?'#F0EFF8':sel?'#534AB7':'#E3E1F0'}`,
                            background: ocu?'#F7F6FD' : sel?'#534AB7':'#fff',
                            cursor:ocu?'default':'pointer',
                            transition:'all .15s',
                            boxShadow: sel ? '0 4px 12px rgba(83,74,183,.35)' : 'none',
                          }}>
                            <div style={{fontSize:15,fontWeight:700,color:ocu?'#C9C7D4':sel?'#fff':'#1A1825'}}>{slot}</div>
                            {ocu && <div style={{fontSize:10,color:'#C9C7D4',marginTop:2}}>ocupado</div>}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {horaSel && (
                    <div style={{background:'#EEEDFE',borderRadius:12,padding:'10px 16px',marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:18}}>⏰</span>
                      <span style={{fontWeight:700,color:'#534AB7',fontSize:14}}>Selecionado: {horaSel}</span>
                    </div>
                  )}
                </>
              )}

              {/* ── Passo 4: Dados ── */}
              {etapa === 4 && (
                <>
                  <div style={{marginBottom:6,fontSize:22,fontWeight:800,color:'#1A1825'}}>Quase lá!</div>
                  <div style={{marginBottom:16,fontSize:14,color:'#8A87A0'}}>Confirme seus dados para finalizar.</div>

                  {/* Resumo compacto */}
                  <div style={{background:'linear-gradient(135deg,#534AB7,#7F77DC)',borderRadius:18,padding:'16px 18px',marginBottom:20,color:'#fff'}}>
                    <div style={{fontSize:12,opacity:.7,marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600}}>Resumo do agendamento</div>
                    <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{servicoFinal}</div>
                    <div style={{fontSize:14,opacity:.9}}>{fmtDataLong(dataSel)} · {horaSel}</div>
                  </div>

                  {/* Nome */}
                  <div style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:12,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Seu nome *</label>
                    <input
                      style={{width:'100%',padding:'14px 16px',borderRadius:14,border:`1.5px solid ${nome?'#534AB7':'#E3E1F0'}`,fontSize:15,outline:'none',color:'#1A1825',background:'#fff',transition:'border .2s'}}
                      placeholder="Nome completo"
                      value={nome}
                      onChange={e=>setNome(e.target.value)}
                      autoCapitalize="words"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:12,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>WhatsApp *</label>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:16}}>📱</span>
                      <input
                        style={{width:'100%',padding:'14px 16px 14px 44px',borderRadius:14,border:`1.5px solid ${fone?'#534AB7':'#E3E1F0'}`,fontSize:15,outline:'none',color:'#1A1825',background:'#fff',transition:'border .2s'}}
                        placeholder="(00) 00000-0000"
                        value={fone}
                        onChange={e=>setFone(e.target.value)}
                        inputMode="tel"
                      />
                    </div>
                    <div style={{fontSize:11,color:'#8A87A0',marginTop:5,display:'flex',alignItems:'center',gap:4}}>
                      🔗 Seu celular vincula ou cria seu cadastro automaticamente
                    </div>
                  </div>

                  {/* Observação */}
                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',fontSize:12,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>
                      Observação <span style={{textTransform:'none',fontWeight:400}}>(opcional)</span>
                    </label>
                    <input
                      style={{width:'100%',padding:'14px 16px',borderRadius:14,border:'1.5px solid #E3E1F0',fontSize:15,outline:'none',color:'#1A1825',background:'#fff'}}
                      placeholder="Ex: primeira vez, cor desejada..."
                      value={obs}
                      onChange={e=>setObs(e.target.value)}
                    />
                  </div>

                  {erro && (
                    <div style={{background:'#FCEBEB',borderRadius:12,padding:'12px 16px',marginBottom:12,fontSize:14,color:'#A32D2D',fontWeight:600,display:'flex',gap:8,alignItems:'center'}}>
                      ⚠️ {erro}
                    </div>
                  )}
                </>
              )}

              {/* ── Botões de navegação ── */}
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
                {/* Botão primário */}
                {etapa === 1 && (
                  <CTA label="Próximo →"
                    onClick={()=>irPara(2)}
                    disabled={!servico||(servico?.id==='outro'&&!servicoCustom)}
                  />
                )}
                {etapa === 2 && (
                  <CTA label="Ver horários →" onClick={()=>irPara(3)} disabled={!dataSel} />
                )}
                {etapa === 3 && (
                  <CTA label="Continuar →" onClick={()=>irPara(4)} disabled={!horaSel||loadingSlots} />
                )}
                {etapa === 4 && (
                  <CTA
                    label={salvando ? '⏳ Agendando...' : '✓ Confirmar agendamento'}
                    onClick={confirmar}
                    disabled={salvando}
                  />
                )}

                {/* Botão voltar */}
                {etapa > 1 && (
                  <CTA label="← Voltar" onClick={()=>irPara(etapa-1)} secondary />
                )}
              </div>

              <div style={{textAlign:'center',marginTop:24,fontSize:11,color:'#C9C7D4'}}>Powered by ✂️ BeatSalon</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
