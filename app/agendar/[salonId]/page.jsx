'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

const H_INICIO = 8, H_FIM = 18
const DIAS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DEFAULT_SVCS = [
  {id:'corte',name:'Corte',price:0,duration:60},
  {id:'barba',name:'Barba',price:0,duration:60},
  {id:'corte-barba',name:'Corte + Barba',price:0,duration:90},
  {id:'coloracao',name:'Coloração',price:0,duration:120},
  {id:'hidratacao',name:'Hidratação',price:0,duration:60},
  {id:'manicure',name:'Manicure',price:0,duration:60},
  {id:'pedicure',name:'Pedicure',price:0,duration:60},
  {id:'sobrancelha',name:'Sobrancelha',price:0,duration:30},
  {id:'outro',name:'Outro',price:0,duration:60},
]

function slots() {
  const s = []
  for (let h = H_INICIO; h < H_FIM; h++) s.push(`${String(h).padStart(2,'0')}:00`)
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
function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/* ─── Calendário ─── */
function Cal({ valor, onChange, blockedDates = [] }) {
  const agora = today()
  const [mes, setMes] = useState(agora.getMonth())
  const [ano, setAno] = useState(agora.getFullYear())
  const primeiro = new Date(ano, mes, 1).getDay()
  const ultimo   = new Date(ano, mes + 1, 0).getDate()
  const cells    = [...Array(primeiro).fill(null), ...Array.from({length:ultimo},(_,i)=>i+1)]
  const str    = d => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isPast = d => new Date(ano,mes,d) < agora
  const isBlocked = d => blockedDates.includes(str(d))
  const isTdy  = d => new Date(ano,mes,d).toDateString() === agora.toDateString()
  const isSel  = d => valor === str(d)
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <button onClick={()=>{ if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }}
          style={{width:38,height:38,borderRadius:19,border:'1px solid var(--border)',background:'var(--white)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--navy-600)'}}>‹</button>
        <span style={{fontWeight:800,fontSize:15,color:'var(--navy-900)'}}>{MESES[mes]} {ano}</span>
        <button onClick={()=>{ if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }}
          style={{width:38,height:38,borderRadius:19,border:'1px solid var(--border)',background:'var(--white)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--navy-600)'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
        {DIAS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'var(--muted)',padding:'3px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
        {cells.map((d,i) => d===null ? <div key={`e${i}`}/> : (
          <div key={d}
            onClick={()=>!isPast(d)&&!isBlocked(d)&&onChange(str(d))}
            title={isBlocked(d)?'Data bloqueada':''}
            style={{
              aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
              borderRadius:'50%',fontSize:13,fontWeight:isSel(d)?800:500,
              cursor:(isPast(d)||isBlocked(d))?'default':'pointer',
              background: isSel(d)?'var(--navy-600)' : 'transparent',
              color: isSel(d)?'#fff' : (isPast(d)||isBlocked(d))?'var(--gray-300)':'var(--text)',
              border:`2px solid ${isSel(d)?'var(--navy-600)':'transparent'}`,
              position:'relative', transition:'all .12s',
              textDecoration: isBlocked(d)?'line-through':'none',
            }}>
            {d}
            {isTdy(d) && !isSel(d) && <span style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:2,background:'var(--navy-500)'}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Step indicator ─── */
function Steps({ atual }) {
  const passos = ['Serviço','Data','Horário','Dados']
  return (
    <div style={{padding:'0 4px',marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
        <div style={{position:'absolute',top:14,left:'12%',right:'12%',height:2,background:'var(--gray-200)',zIndex:0}}/>
        <div style={{position:'absolute',top:14,left:'12%',height:2,background:'var(--navy-600)',zIndex:1,width:`${((atual-1)/3)*76}%`,transition:'width .4s ease'}}/>
        {passos.map((p,i) => {
          const n=i+1, done=n<atual, act=n===atual
          return (
            <div key={p} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,zIndex:2}}>
              <div style={{width:28,height:28,borderRadius:14,background:(done||act)?'var(--navy-600)':'var(--white)',border:`2px solid ${(done||act)?'var(--navy-600)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:(done||act)?'#fff':'var(--muted)',transition:'all .3s'}}>
                {done?'✓':n}
              </div>
              <span style={{fontSize:10,fontWeight:600,color:act?'var(--navy-600)':done?'var(--navy-400)':'var(--muted)'}}>{p}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AgendarPage({ params }) {
  const { salonId } = params
  const [salon, setSalon]         = useState(null)
  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [etapa, setEtapa]         = useState(1)
  const [servico, setServico]     = useState(null)
  const [servicoCustom, setServicoCustom] = useState('')
  const [dataSel, setDataSel]     = useState('')
  const [horaSel, setHoraSel]     = useState('')
  const [ocupados, setOcupados]   = useState([])
  const [blocked, setBlocked]     = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [nome, setNome]           = useState('')
  const [fone, setFone]           = useState('')
  const [obs, setObs]             = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [resultado, setResultado] = useState(null)
  const sb = createClient()

  useEffect(() => {
    Promise.all([
      sb.from('salons').select('id,name,phone').eq('id',salonId).single(),
      sb.from('services').select('id,name,price,duration,category').eq('salon_id',salonId).eq('active',true).order('name'),
      sb.from('blocked_dates').select('date').eq('salon_id',salonId),
    ]).then(([{data:s,error:e},{data:svcs},{data:bl}]) => {
      if (e||!s) { setNotFound(true); setLoading(false); return }
      setSalon(s)
      setServices((svcs&&svcs.length>0) ? svcs : DEFAULT_SVCS)
      setBlocked((bl||[]).map(b=>b.date))
      setLoading(false)
    })
  },[])

  useEffect(() => {
    if (!dataSel||!salonId) return
    setLoadingSlots(true); setHoraSel('')
    sb.from('appointments').select('date')
      .eq('salon_id',salonId)
      .gte('date',`${dataSel}T00:00:00`)
      .lte('date',`${dataSel}T23:59:59`)
      .not('status','eq','cancelado')
      .then(({data}) => {
        setOcupados((data||[]).map(a=>a.date?.slice(11,16)))
        setLoadingSlots(false)
      })
  },[dataSel])

  const servicoFinal = servico?.id==='outro' ? servicoCustom : servico?.name

  const irPara = (n) => {
    setEtapa(n)
    setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)
  }

  const confirmar = async () => {
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!fone.trim()) { setErro('Informe seu WhatsApp.'); return }
    setSalvando(true); setErro('')
    const { data, error } = await sb.rpc('book_appointment', {
      p_salon_id:    salonId,
      p_client_name: nome.trim(),
      p_client_phone: fone.replace(/\D/g,''),
      p_service_name: servicoFinal,
      p_date: `${dataSel}T${horaSel}:00`,
      p_notes: obs.trim(),
    })
    if (error) {
      const { error: e2 } = await sb.from('appointments').insert({
        salon_id:salonId, client_name:nome.trim(), service_name:servicoFinal,
        date:`${dataSel}T${horaSel}:00`, value:0, status:'agendado',
        notes:`${fone.trim()}${obs ? ' | '+obs : ''}`,
      })
      if (e2) { setErro('Erro ao agendar. Tente novamente.'); setSalvando(false); return }
      setResultado({isNew:null, clientName:nome.trim()})
    } else {
      setResultado({isNew:data?.is_new_client, clientName:data?.client_name||nome.trim()})
    }
    irPara(5); setSalvando(false)
  }

  /* Estilos base com novas cores */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent }
    body { font-family: 'Inter', -apple-system, sans-serif; background: var(--gray-50, #F8FAFC) }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pop   { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
    @keyframes spin  { to{transform:rotate(360deg)} }
    .fade-up { animation: fadeUp .3s ease both }
    .svc-card:hover { transform: translateY(-2px) }
    .slot-btn:hover:not(:disabled) { transform: scale(1.03) }
  `

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0B1E3D',gap:16}}>
      <div style={{fontFamily:'Dancing Script, cursive',fontSize:36,fontWeight:700,color:'#fff'}}>Meu Salão</div>
      <div style={{width:36,height:36,border:'3px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <style>{css}</style>
    </div>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#F8FAFC',padding:32,textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:16}}>🔍</div>
      <div style={{fontSize:20,fontWeight:800,color:'#0B1E3D',marginBottom:8}}>Salão não encontrado</div>
      <div style={{color:'#64748B'}}>O link pode ter expirado ou é inválido.</div>
      <style>{css}</style>
    </div>
  )

  const CTABtn = ({label,onClick,disabled,secondary}) => (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%',padding:'14px',fontWeight:700,fontSize:15,borderRadius:12,
      border: secondary ? '2px solid #D1DBE8' : 'none',
      background: secondary ? '#fff' : disabled ? '#CBD5E1' : '#1B3057',
      color: secondary ? '#64748B' : '#fff',
      cursor: disabled ? 'default' : 'pointer', transition:'all .15s',
    }}>{label}</button>
  )

  const fmtP = (p) => p > 0 ? `R$${Number(p).toLocaleString('pt-BR')}` : ''
  const fmtD = (d) => d >= 60 ? `${d/60}h` : `${d}min`

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:'100vh',background:'#F8FAFC',fontFamily:"'Inter',-apple-system,sans-serif"}}>

        {/* Header */}
        <div style={{background:'#0B1E3D',paddingTop:'env(safe-area-inset-top,0)'}}>
          <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:21,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontFamily:'Dancing Script,cursive',fontSize:20,color:'#fff',fontWeight:700}}>M</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Dancing Script,cursive',fontWeight:700,color:'#fff',fontSize:18,lineHeight:1}}>Meu Salão</div>
              <div style={{fontFamily:'Dancing Script,cursive',fontSize:11,color:'rgba(255,255,255,.4)',marginTop:1}}>{salon.name}</div>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px 100px'}}>

          {/* Sucesso */}
          {etapa===5 && (
            <div className="fade-up">
              <div style={{textAlign:'center',padding:'28px 0 20px'}}>
                <div style={{width:80,height:80,borderRadius:40,background:'linear-gradient(135deg,#059669,#047857)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:36,marginBottom:16,boxShadow:'0 8px 24px rgba(5,150,105,.3)',animation:'pop .5s cubic-bezier(.175,.885,.32,1.275) both'}}>✓</div>
                <div style={{fontSize:24,fontWeight:800,color:'#0B1E3D',marginBottom:8}}>Agendado!</div>
                <div style={{fontSize:14,color:'#64748B',lineHeight:1.6}}>
                  Reservado com sucesso em<br/><strong style={{color:'#0B1E3D'}}>{salon.name}</strong>
                </div>
              </div>

              {resultado?.isNew===true && (
                <div style={{display:'flex',gap:10,background:'#D1FAE5',borderRadius:12,padding:'12px 16px',marginBottom:12,border:'1px solid #6EE7B7'}}>
                  <span style={{fontSize:18}}>✨</span>
                  <div><div style={{fontWeight:700,color:'#065F46',fontSize:13}}>Cadastro criado!</div><div style={{fontSize:12,color:'#047857'}}>Você foi adicionado à base de clientes.</div></div>
                </div>
              )}
              {resultado?.isNew===false && (
                <div style={{display:'flex',gap:10,background:'#DBEAFE',borderRadius:12,padding:'12px 16px',marginBottom:12,border:'1px solid #93C5FD'}}>
                  <span style={{fontSize:18}}>🔗</span>
                  <div><div style={{fontWeight:700,color:'#1E3A5F',fontSize:13}}>Vinculado ao seu cadastro</div><div style={{fontSize:12,color:'#2451A0'}}>Histórico conectado automaticamente.</div></div>
                </div>
              )}

              <div style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #E2E8F0',marginBottom:16}}>
                {[['Serviço',servicoFinal],['Data',fmtDataLong(dataSel)],['Horário',horaSel],['Nome',resultado?.clientName||nome],['WhatsApp',fone]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #F1F5F9'}}>
                    <span style={{fontSize:13,color:'#64748B'}}>{k}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#0B1E3D',textAlign:'right',maxWidth:'60%'}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* WhatsApp confirmation */}
              {salon.phone && (
                <a href={`https://wa.me/55${salon.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá! Acabei de agendar *${servicoFinal}* para ${fmtDataLong(dataSel)} às ${horaSel}. Nome: ${nome}`)}`}
                  target="_blank" rel="noreferrer" style={{display:'block',textDecoration:'none',marginBottom:10}}>
                  <div style={{background:'#25D366',borderRadius:12,padding:'14px',textAlign:'center',fontWeight:700,fontSize:15,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <span style={{fontSize:20}}>💬</span> Confirmar pelo WhatsApp
                  </div>
                </a>
              )}

              <button onClick={()=>{setEtapa(1);setServico(null);setDataSel('');setHoraSel('');setNome('');setFone('');setObs('');setResultado(null)}}
                style={{width:'100%',padding:'12px',background:'#F1F5F9',borderRadius:12,border:'none',fontWeight:600,fontSize:14,color:'#64748B',cursor:'pointer'}}>
                Novo agendamento
              </button>
              <div style={{textAlign:'center',marginTop:20,fontFamily:'Dancing Script,cursive',fontSize:13,color:'#CBD5E1'}}>Meu Salão by Whatsale</div>
            </div>
          )}

          {/* Etapas 1-4 */}
          {etapa<=4 && (
            <div className="fade-up">
              <Steps atual={etapa} />

              {/* Passo 1: Serviços do banco */}
              {etapa===1 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Qual serviço?</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:20}}>Escolha um dos nossos serviços.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                    {services.map(s => {
                      const sel = servico?.id === s.id || servico?.name === s.name
                      return (
                        <button key={s.id||s.name} className="svc-card" onClick={()=>setServico(s)} style={{
                          padding:'14px 12px',borderRadius:14,
                          border:`2px solid ${sel?'#1B3057':'#E2E8F0'}`,
                          background: sel ? '#1B3057' : '#fff',
                          cursor:'pointer',textAlign:'left',transition:'all .15s',
                          boxShadow: sel ? '0 4px 16px rgba(27,48,87,.25)' : '0 1px 4px rgba(0,0,0,.05)',
                        }}>
                          <div style={{fontWeight:700,fontSize:14,color:sel?'#fff':'#0B1E3D',marginBottom:s.price>0||s.duration?4:0}}>{s.name}</div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                            {s.price>0 && <span style={{fontSize:11,fontWeight:700,color:sel?'#93C5FD':'#2451A0'}}>{fmtP(s.price)}</span>}
                            {s.duration>0 && <span style={{fontSize:11,color:sel?'rgba(255,255,255,.6)':'#94A3B8'}}>{fmtD(s.duration)}</span>}
                          </div>
                        </button>
                      )
                    })}
                    {/* Opção "Outro" sempre disponível */}
                    {!services.find(s=>s.id==='outro') && (
                      <button className="svc-card" onClick={()=>setServico({id:'outro',name:'Outro'})} style={{
                        padding:'14px 12px',borderRadius:14,
                        border:`2px solid ${servico?.id==='outro'?'#1B3057':'#E2E8F0'}`,
                        background: servico?.id==='outro' ? '#1B3057' : '#fff',
                        cursor:'pointer',textAlign:'left',transition:'all .15s',
                      }}>
                        <div style={{fontWeight:700,fontSize:14,color:servico?.id==='outro'?'#fff':'#0B1E3D'}}>Outro</div>
                      </button>
                    )}
                  </div>
                  {servico?.id==='outro' && (
                    <input style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'2px solid #1B3057',fontSize:14,outline:'none',color:'#0B1E3D',marginBottom:16,fontFamily:'inherit'}}
                      placeholder="Descreva o serviço..." value={servicoCustom} onChange={e=>setServicoCustom(e.target.value)} autoFocus />
                  )}
                  <CTABtn label="Próximo →" onClick={()=>irPara(2)} disabled={!servico||(servico?.id==='outro'&&!servicoCustom)} />
                </>
              )}

              {/* Passo 2: Data */}
              {etapa===2 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Qual data?</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>Selecione um dia disponível.</div>
                  <div style={{background:'#fff',borderRadius:16,padding:'18px',border:'1px solid #E2E8F0',boxShadow:'0 2px 12px rgba(0,0,0,.05)',marginBottom:12}}>
                    <Cal valor={dataSel} onChange={setDataSel} blockedDates={blocked} />
                  </div>
                  {dataSel && (
                    <div style={{background:'#DBEAFE',borderRadius:10,padding:'10px 16px',marginBottom:12,display:'flex',gap:10,alignItems:'center',border:'1px solid #93C5FD'}}>
                      <span style={{fontSize:16}}>📅</span>
                      <span style={{fontWeight:700,color:'#1E3A5F',fontSize:14}}>{fmtDataLong(dataSel)}</span>
                    </div>
                  )}
                  <CTABtn label="Escolher horário →" onClick={()=>irPara(3)} disabled={!dataSel} />
                  <div style={{marginTop:8}}><CTABtn label="← Voltar" onClick={()=>irPara(1)} secondary /></div>
                </>
              )}

              {/* Passo 3: Horário */}
              {etapa===3 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Qual horário?</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>Atendimentos de 1h — {fmtDataLong(dataSel)}</div>
                  {loadingSlots ? (
                    <div style={{textAlign:'center',padding:'40px 0',color:'#64748B'}}>
                      <div style={{width:32,height:32,border:'3px solid #E2E8F0',borderTopColor:'#1B3057',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
                      Verificando disponibilidade...
                    </div>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                      {slots().map(slot => {
                        const ocu = ocupados.includes(slot), sel = horaSel===slot
                        return (
                          <button key={slot} className="slot-btn" onClick={()=>!ocu&&setHoraSel(slot)} style={{
                            padding:'13px 6px',borderRadius:12,textAlign:'center',
                            border:`2px solid ${ocu?'#F1F5F9':sel?'#1B3057':'#E2E8F0'}`,
                            background:ocu?'#F8FAFC':sel?'#1B3057':'#fff',
                            cursor:ocu?'default':'pointer',transition:'all .15s',
                            boxShadow:sel?'0 4px 12px rgba(27,48,87,.25)':'none',
                          }}>
                            <div style={{fontSize:15,fontWeight:700,color:ocu?'#CBD5E1':sel?'#fff':'#0B1E3D'}}>{slot}</div>
                            {ocu&&<div style={{fontSize:9,color:'#CBD5E1',marginTop:2}}>ocupado</div>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {horaSel && (
                    <div style={{background:'#DBEAFE',borderRadius:10,padding:'10px 16px',marginBottom:12,display:'flex',gap:10,alignItems:'center',border:'1px solid #93C5FD'}}>
                      <span style={{fontSize:16}}>⏰</span>
                      <span style={{fontWeight:700,color:'#1E3A5F',fontSize:14}}>Selecionado: {horaSel}</span>
                    </div>
                  )}
                  <CTABtn label="Continuar →" onClick={()=>irPara(4)} disabled={!horaSel||loadingSlots} />
                  <div style={{marginTop:8}}><CTABtn label="← Voltar" onClick={()=>irPara(2)} secondary /></div>
                </>
              )}

              {/* Passo 4: Dados */}
              {etapa===4 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Quase lá!</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>Confirme seus dados.</div>

                  {/* Card resumo */}
                  <div style={{background:'linear-gradient(135deg,#0B1E3D,#1E3A6E)',borderRadius:16,padding:'16px 18px',marginBottom:20,color:'#fff'}}>
                    <div style={{fontSize:11,opacity:.5,textTransform:'uppercase',letterSpacing:'.6px',fontWeight:700,marginBottom:4}}>Resumo</div>
                    <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{servicoFinal}</div>
                    {servico?.price>0 && <div style={{fontSize:13,opacity:.7,marginBottom:2}}>R${Number(servico.price).toLocaleString('pt-BR')}</div>}
                    <div style={{fontSize:13,opacity:.8}}>{fmtDataLong(dataSel)} · {horaSel}</div>
                  </div>

                  {[
                    {label:'Seu nome *',placeholder:'Nome completo',value:nome,onChange:setNome,type:'text'},
                    {label:'WhatsApp *',placeholder:'(00) 00000-0000',value:fone,onChange:setFone,type:'tel'},
                  ].map(({label,placeholder,value,onChange,type})=>(
                    <div key={label} style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{label}</label>
                      <input style={{width:'100%',padding:'13px 16px',borderRadius:12,border:`1.5px solid ${value?'#1B3057':'#E2E8F0'}`,fontSize:15,outline:'none',color:'#0B1E3D',background:'#fff',transition:'border .2s',fontFamily:'inherit'}}
                        type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
                    </div>
                  ))}

                  <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#1E3A5F',display:'flex',gap:8,border:'1px solid #BFDBFE'}}>
                    <span>🔗</span><span>Seu telefone vincula ou cria seu cadastro automaticamente na base do salão.</span>
                  </div>

                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Observação <span style={{fontWeight:400,textTransform:'none'}}>(opcional)</span></label>
                    <input style={{width:'100%',padding:'13px 16px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:15,outline:'none',color:'#0B1E3D',background:'#fff',fontFamily:'inherit'}}
                      placeholder="Ex: primeira vez, alergia..." value={obs} onChange={e=>setObs(e.target.value)} />
                  </div>

                  {erro && <div style={{background:'#FEE2E2',borderRadius:10,padding:'12px 16px',marginBottom:12,fontSize:13,color:'#DC2626',fontWeight:600,border:'1px solid #FCA5A5'}}>⚠️ {erro}</div>}

                  <CTABtn label={salvando?'Agendando...':'Confirmar agendamento'} onClick={confirmar} disabled={salvando} />
                  <div style={{marginTop:8}}><CTABtn label="← Voltar" onClick={()=>irPara(3)} secondary /></div>
                </>
              )}

              <div style={{textAlign:'center',marginTop:24,fontFamily:'Dancing Script,cursive',fontSize:12,color:'#CBD5E1'}}>Meu Salão by Whatsale</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
