'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

const H_INICIO = 8, H_FIM = 18
const DIAS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const DEFAULT_SVCS = [
  {id:'corte',        name:'Corte',        price:0,   duration:60},
  {id:'barba',        name:'Barba',        price:0,   duration:30},
  {id:'corte-barba',  name:'Corte + Barba',price:0,   duration:90},
  {id:'coloracao',    name:'Coloração',    price:0,   duration:120},
  {id:'hidratacao',   name:'Hidratação',   price:0,   duration:60},
  {id:'manicure',     name:'Manicure',     price:0,   duration:60},
  {id:'pedicure',     name:'Pedicure',     price:0,   duration:60},
  {id:'sobrancelha',  name:'Sobrancelha',  price:0,   duration:30},
]

function gerarSlots() {
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
function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function fmtDuracao(min) {
  if (!min) return ''
  if (min < 60) return `${min}min`
  const h = Math.floor(min/60), m = min%60
  return m ? `${h}h${m}min` : `${h}h`
}
function fmtPreco(p) {
  return p > 0 ? `R$${Number(p).toLocaleString('pt-BR')}` : ''
}

/* ── Calendário ── */
function Cal({ valor, onChange, blockedDates = [] }) {
  const agora   = today()
  const [mes, setMes] = useState(agora.getMonth())
  const [ano, setAno] = useState(agora.getFullYear())
  const primeiro = new Date(ano,mes,1).getDay()
  const ultimo   = new Date(ano,mes+1,0).getDate()
  const cells    = [...Array(primeiro).fill(null), ...Array.from({length:ultimo},(_,i)=>i+1)]
  const str      = d => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isPast   = d => new Date(ano,mes,d) < agora
  const isBlock  = d => blockedDates.includes(str(d))
  const isTdy    = d => new Date(ano,mes,d).toDateString() === agora.toDateString()
  const isSel    = d => valor === str(d)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <button onClick={()=>mes===0?(setMes(11),setAno(a=>a-1)):setMes(m=>m-1)}
          style={{width:38,height:38,borderRadius:19,border:'1px solid #E2E8F0',background:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#1B3057'}}>‹</button>
        <span style={{fontWeight:800,fontSize:15,color:'#0B1E3D'}}>{MESES[mes]} {ano}</span>
        <button onClick={()=>mes===11?(setMes(0),setAno(a=>a+1)):setMes(m=>m+1)}
          style={{width:38,height:38,borderRadius:19,border:'1px solid #E2E8F0',background:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#1B3057'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
        {DIAS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#94A3B8',padding:'3px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
        {cells.map((d,i) => d===null ? <div key={`e${i}`}/> : (
          <div key={d} onClick={()=>!isPast(d)&&!isBlock(d)&&onChange(str(d))} style={{
            aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
            borderRadius:'50%',fontSize:13,fontWeight:isSel(d)?800:500,
            cursor:(isPast(d)||isBlock(d))?'default':'pointer',
            background:isSel(d)?'#1B3057':'transparent',
            color:isSel(d)?'#fff':(isPast(d)||isBlock(d))?'#CBD5E1':'#1E293B',
            border:`2px solid ${isSel(d)?'#1B3057':'transparent'}`,
            position:'relative',transition:'all .12s',
            textDecoration:isBlock(d)?'line-through':'none',
          }}>
            {d}
            {isTdy(d)&&!isSel(d)&&<span style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:2,background:'#1B3057'}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Steps ── */
function Steps({ atual }) {
  const passos = ['Serviços','Data','Horário','Dados']
  return (
    <div style={{padding:'0 4px',marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
        <div style={{position:'absolute',top:14,left:'12%',right:'12%',height:2,background:'#E2E8F0',zIndex:0}}/>
        <div style={{position:'absolute',top:14,left:'12%',height:2,background:'#1B3057',zIndex:1,
          width:`${((atual-1)/3)*76}%`,transition:'width .4s ease'}}/>
        {passos.map((p,i) => {
          const n=i+1,done=n<atual,act=n===atual
          return (
            <div key={p} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,zIndex:2}}>
              <div style={{
                width:28,height:28,borderRadius:14,
                background:(done||act)?'#1B3057':'#fff',
                border:`2px solid ${(done||act)?'#1B3057':'#E2E8F0'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:11,fontWeight:700,
                color:(done||act)?'#fff':'#94A3B8',
                transition:'all .3s',
              }}>
                {done?'✓':n}
              </div>
              <span style={{fontSize:10,fontWeight:600,color:act?'#1B3057':done?'#2451A0':'#94A3B8'}}>{p}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Card de serviço (multi-select) ── */
function SvcCard({ svc, selected, onToggle }) {
  return (
    <button onClick={()=>onToggle(svc)}
      style={{
        padding:'14px 12px',borderRadius:14,textAlign:'left',
        border:`2px solid ${selected?'#1B3057':'#E2E8F0'}`,
        background:selected?'#EFF6FF':'#fff',
        cursor:'pointer',transition:'all .15s',
        position:'relative',
        boxShadow:selected?'0 4px 16px rgba(27,48,87,.18)':'0 1px 4px rgba(0,0,0,.05)',
        width:'100%',
      }}>
      {/* Checkbox visual */}
      <div style={{
        position:'absolute',top:10,right:10,
        width:20,height:20,borderRadius:10,
        border:`2px solid ${selected?'#1B3057':'#CBD5E1'}`,
        background:selected?'#1B3057':'#fff',
        display:'flex',alignItems:'center',justifyContent:'center',
        transition:'all .15s',
        flexShrink:0,
      }}>
        {selected && <span style={{color:'#fff',fontSize:11,fontWeight:800,lineHeight:1}}>✓</span>}
      </div>

      <div style={{paddingRight:28}}>
        <div style={{fontWeight:700,fontSize:14,color:selected?'#0B1E3D':'#1E293B',marginBottom:4}}>{svc.name}</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {svc.price>0 && (
            <span style={{fontSize:12,fontWeight:800,color:selected?'#1B3057':'#2451A0'}}>{fmtPreco(svc.price)}</span>
          )}
          {svc.duration>0 && (
            <span style={{fontSize:12,color:'#94A3B8'}}>{fmtDuracao(svc.duration)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

/* ── Resumo dos serviços selecionados ── */
function ResumoServicos({ selecionados }) {
  const total    = selecionados.reduce((s,sv)=>s+(sv.price||0),0)
  const duracao  = selecionados.reduce((s,sv)=>s+(sv.duration||0),0)

  if (selecionados.length === 0) return null

  return (
    <div style={{
      background:'linear-gradient(135deg,#0B1E3D,#1E3A6E)',
      borderRadius:14,padding:'14px 16px',marginTop:12,marginBottom:4,
      border:'1px solid rgba(255,255,255,.1)',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:700,marginBottom:6}}>
            {selecionados.length} serviço{selecionados.length>1?'s':''} selecionado{selecionados.length>1?'s':''}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {selecionados.map(sv=>(
              <span key={sv.id||sv.name} style={{fontSize:11,background:'rgba(255,255,255,.12)',color:'rgba(255,255,255,.9)',padding:'3px 8px',borderRadius:20,fontWeight:600}}>
                {sv.name}
              </span>
            ))}
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          {total>0 && <div style={{fontSize:18,fontWeight:800,color:'#6EE7B7'}}>R${total.toLocaleString('pt-BR')}</div>}
          {duracao>0 && <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:2}}>{fmtDuracao(duracao)}</div>}
        </div>
      </div>
    </div>
  )
}

/* ─────── Página principal ─────── */
export default function AgendarPage({ params }) {
  const { salonId } = params
  const [salon,    setSalon]    = useState(null)
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [etapa,    setEtapa]    = useState(1)
  // MULTI-SELECT: array de serviços
  const [selecionados, setSelecionados] = useState([])
  const [servicoCustom, setServicoCustom] = useState('')

  const [dataSel,   setDataSel]   = useState('')
  const [horaSel,   setHoraSel]   = useState('')
  const [ocupados,  setOcupados]  = useState([])
  const [blocked,   setBlocked]   = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [nome,    setNome]    = useState('')
  const [fone,    setFone]    = useState('')
  const [obs,     setObs]     = useState('')
  const [salvando,setSalvando] = useState(false)
  const [erro,    setErro]    = useState('')
  const [resultado,setResultado] = useState(null)
  const sb = createClient()

  /* Carrega salão, serviços e datas bloqueadas */
  useEffect(() => {
    Promise.all([
      sb.from('salons').select('*').eq('id',salonId).single(),
      sb.from('services').select('id,name,price,duration,category').eq('salon_id',salonId).eq('active',true).order('name'),
      sb.from('blocked_dates').select('date').eq('salon_id',salonId),
    ]).then(([{data:s,error:e},{data:sv},{data:bl}]) => {
      if (e||!s) { setNotFound(true); setLoading(false); return }
      setSalon(s)
      setServices(sv&&sv.length>0 ? sv : DEFAULT_SVCS)
      setBlocked((bl||[]).map(b=>b.date))
      setLoading(false)
      // Registra acesso para analytics do admin
      sb.from('page_views').insert({ salon_id:salonId, type:'booking' }).then(()=>{}).catch(()=>{})
    })
  },[])

  /* Carrega slots ocupados ao selecionar data */
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

  const irPara = (n) => {
    setEtapa(n)
    setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)
  }

  /* Toggle de serviço (add/remove do array) */
  const toggleSvc = (svc) => {
    setSelecionados(prev => {
      const idx = prev.findIndex(s=>s.id===svc.id&&s.name===svc.name)
      if (idx>=0) return prev.filter((_,i)=>i!==idx)
      return [...prev, svc]
    })
  }

  const totalPreco   = selecionados.reduce((s,sv)=>s+(sv.price||0),0)
  const totalDuracao = selecionados.reduce((s,sv)=>s+(sv.duration||0),0)

  /* Nome dos serviços para salvar */
  const nomesServicos = selecionados.length>0
    ? selecionados.map(s=>s.name).join(' + ')
    : servicoCustom

  const podeAvancar = selecionados.length>0 || servicoCustom.trim().length>0

  const confirmar = async () => {
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!fone.trim()) { setErro('Informe seu WhatsApp.'); return }
    setSalvando(true); setErro('')

    const { data, error } = await sb.rpc('book_appointment', {
      p_salon_id:     salonId,
      p_client_name:  nome.trim(),
      p_client_phone: fone.replace(/\D/g,''),
      p_service_name: nomesServicos,
      p_date:         `${dataSel}T${horaSel}:00`,
      p_notes:        obs.trim(),
    })

    // Atualiza valor total se veio de serviços com preço
    if (data?.appointment_id && totalPreco > 0) {
      await sb.from('appointments').update({ value: totalPreco }).eq('id', data.appointment_id)
    }

    if (error) {
      const { error: e2 } = await sb.from('appointments').insert({
        salon_id:salonId, client_name:nome.trim(), service_name:nomesServicos,
        date:`${dataSel}T${horaSel}:00`, value:totalPreco, status:'agendado',
        notes:`${fone.trim()}${obs?' | '+obs:''}`,
      })
      if (e2) { setErro('Erro ao agendar. Tente novamente.'); setSalvando(false); return }
      setResultado({ isNew:null, clientName:nome.trim() })
    } else {
      setResultado({ isNew:data?.is_new_client, clientName:data?.client_name||nome.trim() })
    }

    irPara(5); setSalvando(false)
  }

  /* Estilos */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    body{font-family:'Inter',-apple-system,sans-serif;background:#F8FAFC}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pop{0%{transform:scale(.8);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade-up{animation:fadeUp .3s ease both}
  `

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0B1E3D',gap:16}}>
      <style>{css}</style>
      <div style={{fontFamily:'Dancing Script,cursive',fontSize:36,fontWeight:700,color:'#fff'}}>Meu Salão</div>
      <div style={{width:36,height:36,border:'3px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )
  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#F8FAFC',padding:32,textAlign:'center'}}>
      <style>{css}</style>
      <div style={{fontSize:20,fontWeight:800,color:'#0B1E3D',marginBottom:8}}>Salão não encontrado</div>
      <div style={{color:'#64748B'}}>O link pode ter expirado.</div>
    </div>
  )

  const CTABtn = ({label,onClick,disabled,secondary}) => (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%',padding:'14px',fontWeight:700,fontSize:15,borderRadius:12,
      border:secondary?'2px solid #E2E8F0':'none',
      background:secondary?'#fff':disabled?'#CBD5E1':'#1B3057',
      color:secondary?'#64748B':'#fff',
      cursor:disabled?'default':'pointer',transition:'all .15s',
    }}>{label}</button>
  )

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:'100vh',background:'#F8FAFC',fontFamily:"'Inter',-apple-system,sans-serif"}}>

        {/* Header */}
        <div style={{background:'#0B1E3D',paddingTop:'env(safe-area-inset-top,0)'}}>
          <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:12}}>
            {salon.logo_url ? (
              <img src={salon.logo_url} alt="" style={{width:40,height:40,borderRadius:20,objectFit:'cover',border:'2px solid rgba(255,255,255,.2)',flexShrink:0}}/>
            ) : (
              <div style={{width:40,height:40,borderRadius:20,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontFamily:'Dancing Script,cursive',fontSize:20,color:'#fff',fontWeight:700}}>M</span>
              </div>
            )}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Dancing Script,cursive',fontWeight:700,color:'#fff',fontSize:18,lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{salon.name}</div>
              {salon.city && <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:1}}>{salon.city}</div>}
            </div>
          </div>
        </div>

        <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px 100px'}}>

          {/* ── SUCESSO ── */}
          {etapa===5 && (
            <div className="fade-up">
              <div style={{textAlign:'center',padding:'28px 0 20px'}}>
                <div style={{width:80,height:80,borderRadius:40,background:'linear-gradient(135deg,#059669,#047857)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:36,marginBottom:16,boxShadow:'0 8px 24px rgba(5,150,105,.3)',animation:'pop .5s cubic-bezier(.175,.885,.32,1.275) both'}}>✓</div>
                <div style={{fontSize:24,fontWeight:800,color:'#0B1E3D',marginBottom:8}}>Agendado!</div>
                <div style={{fontSize:14,color:'#64748B',lineHeight:1.6}}>Reservado com sucesso em<br/><strong style={{color:'#0B1E3D'}}>{salon.name}</strong></div>
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
                  <div><div style={{fontWeight:700,color:'#1E3A5F',fontSize:13}}>Vinculado ao cadastro</div><div style={{fontSize:12,color:'#2451A0'}}>Histórico conectado automaticamente.</div></div>
                </div>
              )}

              <div style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #E2E8F0',marginBottom:16}}>
                {[
                  ['Serviços', nomesServicos],
                  ...(totalPreco>0?[['Total',`R$${totalPreco.toLocaleString('pt-BR')}`]]:[]),
                  ...(totalDuracao>0?[['Duração estimada',fmtDuracao(totalDuracao)]]:[]),
                  ['Data', fmtDataLong(dataSel)],
                  ['Horário', horaSel],
                  ['Nome', resultado?.clientName||nome],
                  ['WhatsApp', fone],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 16px',borderBottom:'1px solid #F1F5F9'}}>
                    <span style={{fontSize:13,color:'#64748B'}}>{k}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#0B1E3D',textAlign:'right',maxWidth:'58%'}}>{v}</span>
                  </div>
                ))}
              </div>

              {salon.phone && (
                <a href={`https://wa.me/55${salon.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá! Acabei de agendar ${nomesServicos} para ${fmtDataLong(dataSel)} às ${horaSel}. Nome: ${nome}`)}`}
                  target="_blank" rel="noreferrer" style={{display:'block',textDecoration:'none',marginBottom:10}}>
                  <div style={{background:'#25D366',borderRadius:12,padding:'14px',textAlign:'center',fontWeight:700,fontSize:15,color:'#fff'}}>
                    💬 Confirmar pelo WhatsApp
                  </div>
                </a>
              )}
              <button onClick={()=>{setEtapa(1);setSelecionados([]);setServicoCustom('');setDataSel('');setHoraSel('');setNome('');setFone('');setObs('');setResultado(null)}}
                style={{width:'100%',padding:'12px',background:'#F1F5F9',borderRadius:12,border:'none',fontWeight:600,fontSize:14,color:'#64748B',cursor:'pointer'}}>
                Novo agendamento
              </button>
              <div style={{textAlign:'center',marginTop:20,fontFamily:'Dancing Script,cursive',fontSize:12,color:'#CBD5E1'}}>Meu Salão by Whatsale</div>
            </div>
          )}

          {/* ── ETAPAS 1–4 ── */}
          {etapa<=4 && (
            <div className="fade-up">
              <Steps atual={etapa} />

              {/* ─ Passo 1: Serviços (MULTI-SELECT) ─ */}
              {etapa===1 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Quais serviços?</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>
                    Selecione um ou mais serviços. Toque para marcar ou desmarcar.
                  </div>

                  {/* Grid de serviços */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:4}}>
                    {services.map(svc => {
                      const sel = selecionados.some(s=>s.id===svc.id&&s.name===svc.name)
                      return <SvcCard key={svc.id||svc.name} svc={svc} selected={sel} onToggle={toggleSvc} />
                    })}
                  </div>

                  {/* Resumo seleção */}
                  <ResumoServicos selecionados={selecionados} />

                  {/* "Outro" serviço personalizado */}
                  <div style={{marginTop:12,marginBottom:4}}>
                    <div style={{fontSize:12,color:'#94A3B8',fontWeight:600,marginBottom:6}}>OU adicione um serviço personalizado:</div>
                    <input
                      style={{width:'100%',padding:'11px 14px',borderRadius:10,border:`1.5px solid ${servicoCustom?'#1B3057':'#E2E8F0'}`,fontSize:14,outline:'none',color:'#0B1E3D',background:'#fff'}}
                      placeholder="Ex: Progressiva, Escova, Penteado..."
                      value={servicoCustom}
                      onChange={e=>setServicoCustom(e.target.value)}
                    />
                  </div>

                  <div style={{marginTop:16}}>
                    <CTABtn
                      label={selecionados.length>0
                        ? `Confirmar ${selecionados.length} serviço${selecionados.length>1?'s':''} → Escolher data`
                        : servicoCustom ? 'Próximo →' : 'Selecione ao menos 1 serviço'}
                      onClick={()=>irPara(2)}
                      disabled={!podeAvancar}
                    />
                  </div>
                </>
              )}

              {/* ─ Passo 2: Data ─ */}
              {etapa===2 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Qual data?</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>Toque em um dia disponível.</div>

                  {/* Mini-resumo dos serviços */}
                  {selecionados.length>0 && (
                    <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:14,border:'1px solid #BFDBFE'}}>
                      <div style={{fontSize:11,color:'#1E3A5F',fontWeight:700,marginBottom:3}}>
                        {selecionados.length} serviço{selecionados.length>1?'s':''} · {fmtDuracao(totalDuracao)} estimado{totalPreco>0?' · R$'+totalPreco.toLocaleString('pt-BR'):''}
                      </div>
                      <div style={{fontSize:12,color:'#2451A0'}}>{selecionados.map(s=>s.name).join(' + ')}</div>
                    </div>
                  )}

                  <div style={{background:'#fff',borderRadius:16,padding:'18px',border:'1px solid #E2E8F0',boxShadow:'0 2px 12px rgba(0,0,0,.05)',marginBottom:12}}>
                    <Cal valor={dataSel} onChange={setDataSel} blockedDates={blocked} />
                  </div>
                  {dataSel && (
                    <div style={{background:'#DBEAFE',borderRadius:10,padding:'10px 16px',marginBottom:12,display:'flex',gap:10,alignItems:'center',border:'1px solid #93C5FD'}}>
                      <span style={{fontSize:16}}>📅</span>
                      <span style={{fontWeight:700,color:'#1E3A5F',fontSize:14}}>{fmtDataLong(dataSel)}</span>
                    </div>
                  )}
                  <CTABtn label="Ver horários disponíveis →" onClick={()=>irPara(3)} disabled={!dataSel} />
                  <div style={{marginTop:8}}><CTABtn label="← Voltar" onClick={()=>irPara(1)} secondary /></div>
                </>
              )}

              {/* ─ Passo 3: Horário ─ */}
              {etapa===3 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Qual horário?</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>
                    {fmtDataLong(dataSel)}
                    {totalDuracao>0 && ` · Duração estimada: ${fmtDuracao(totalDuracao)}`}
                  </div>

                  {loadingSlots ? (
                    <div style={{textAlign:'center',padding:'40px 0',color:'#64748B'}}>
                      <div style={{width:32,height:32,border:'3px solid #E2E8F0',borderTopColor:'#1B3057',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
                      Verificando disponibilidade...
                    </div>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                      {gerarSlots().map(slot => {
                        const ocu = ocupados.includes(slot), sel = horaSel===slot
                        return (
                          <button key={slot} onClick={()=>!ocu&&setHoraSel(slot)} style={{
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
                      <span style={{fontWeight:700,color:'#1E3A5F',fontSize:14}}>Horário: {horaSel}</span>
                    </div>
                  )}
                  <CTABtn label="Continuar →" onClick={()=>irPara(4)} disabled={!horaSel||loadingSlots} />
                  <div style={{marginTop:8}}><CTABtn label="← Voltar" onClick={()=>irPara(2)} secondary /></div>
                </>
              )}

              {/* ─ Passo 4: Dados ─ */}
              {etapa===4 && (
                <>
                  <div style={{fontSize:22,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Quase lá!</div>
                  <div style={{fontSize:14,color:'#64748B',marginBottom:16}}>Confirme seus dados.</div>

                  {/* Resumo final */}
                  <div style={{background:'linear-gradient(135deg,#0B1E3D,#1E3A6E)',borderRadius:16,padding:'16px 18px',marginBottom:20,color:'#fff'}}>
                    <div style={{fontSize:11,opacity:.5,textTransform:'uppercase',letterSpacing:'.6px',fontWeight:700,marginBottom:6}}>Resumo do agendamento</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                      {selecionados.map(sv=>(
                        <span key={sv.name} style={{fontSize:12,background:'rgba(255,255,255,.12)',color:'rgba(255,255,255,.9)',padding:'3px 9px',borderRadius:20,fontWeight:600}}>{sv.name}</span>
                      ))}
                      {servicoCustom&&<span style={{fontSize:12,background:'rgba(255,255,255,.12)',color:'rgba(255,255,255,.9)',padding:'3px 9px',borderRadius:20,fontWeight:600}}>{servicoCustom}</span>}
                    </div>
                    {totalPreco>0 && <div style={{fontSize:16,fontWeight:800,color:'#6EE7B7',marginBottom:2}}>Total: R${totalPreco.toLocaleString('pt-BR')}{totalDuracao>0?` · ${fmtDuracao(totalDuracao)}`:''}</div>}
                    <div style={{fontSize:13,opacity:.8}}>{fmtDataLong(dataSel)} · {horaSel}</div>
                  </div>

                  {[
                    {label:'Seu nome *',placeholder:'Nome completo',value:nome,onChange:setNome,type:'text'},
                    {label:'WhatsApp *',placeholder:'(00) 00000-0000',value:fone,onChange:setFone,type:'tel'},
                  ].map(({label,placeholder,value,onChange,type})=>(
                    <div key={label} style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{label}</label>
                      <input style={{width:'100%',padding:'13px 16px',borderRadius:12,border:`1.5px solid ${value?'#1B3057':'#E2E8F0'}`,fontSize:15,outline:'none',color:'#0B1E3D',background:'#fff',fontFamily:'inherit'}}
                        type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
                    </div>
                  ))}

                  <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#1E3A5F',display:'flex',gap:8,border:'1px solid #BFDBFE'}}>
                    🔗 Seu WhatsApp vincula ao cadastro automaticamente.
                  </div>

                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Observação <span style={{fontWeight:400,textTransform:'none'}}>(opcional)</span></label>
                    <input style={{width:'100%',padding:'13px 16px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:15,outline:'none',color:'#0B1E3D',background:'#fff',fontFamily:'inherit'}}
                      placeholder="Ex: alergia, cor preferida..." value={obs} onChange={e=>setObs(e.target.value)} />
                  </div>

                  {erro && <div style={{background:'#FEE2E2',borderRadius:10,padding:'12px 16px',marginBottom:12,fontSize:13,color:'#DC2626',fontWeight:600,border:'1px solid #FCA5A5'}}>⚠️ {erro}</div>}

                  <CTABtn label={salvando?'Agendando...':'✓ Confirmar agendamento'} onClick={confirmar} disabled={salvando} />
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
