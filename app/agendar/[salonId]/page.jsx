'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase'

/* ── Constantes ── */
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const ORIGENS = ['Instagram','Google','Indicação de amigo','Passou pela rua','TikTok','Facebook','Outro']
const DEFAULT_SVCS = [
  { id:'d1', name:'Corte',       price:40,  duration:30 },
  { id:'d2', name:'Barba',       price:30,  duration:20 },
  { id:'d3', name:'Corte+Barba', price:65,  duration:50 },
]

function today() { const d = new Date(); d.setHours(0,0,0,0); return d }
function fmtPreco(p) { return p > 0 ? `R$${Number(p).toLocaleString('pt-BR')}` : '' }
function fmtDur(m) { if (!m) return ''; const h=Math.floor(m/60),r=m%60; return r?`${h?h+'h':''}${r}min`:`${h}h` }
function formatPhone(v) { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3') }

/* Avatar simples */
function AvatarCircle({ name, color, size=52 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:size/2,
      background:color||'#1B3057',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*.38, fontWeight:800, color:'#fff', flexShrink:0,
    }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  )
}

/* Calendário */
function Cal({ valor, onChange, blockedDates=[], schedCfg=[] }) {
  const agora = today()
  const [mes, setMes] = useState(agora.getMonth())
  const [ano, setAno] = useState(agora.getFullYear())
  const primeiro = new Date(ano,mes,1).getDay()
  const ultimo   = new Date(ano,mes+1,0).getDate()
  const cells    = [...Array(primeiro).fill(null), ...Array.from({length:ultimo},(_,i)=>i+1)]
  const str = d => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isPast   = d => new Date(ano,mes,d) < agora
  const isClosed = d => { const cfg=schedCfg.find(x=>x.day_of_week===new Date(ano,mes,d).getDay()); return cfg?cfg.is_open===false:false }
  const isBlock  = d => blockedDates.includes(str(d))
  const isTdy    = d => new Date(ano,mes,d).toDateString()===agora.toDateString()
  const isSel    = d => valor===str(d)
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={()=>mes===0?(setMes(11),setAno(a=>a-1)):setMes(m=>m-1)}
          style={{width:36,height:36,borderRadius:18,border:'1px solid #E2E8F0',background:'#fff',fontSize:17,cursor:'pointer',color:'#1B3057'}}>‹</button>
        <span style={{fontWeight:800,fontSize:14,color:'#0B1E3D'}}>{MESES[mes]} {ano}</span>
        <button onClick={()=>mes===11?(setMes(0),setAno(a=>a+1)):setMes(m=>m+1)}
          style={{width:36,height:36,borderRadius:18,border:'1px solid #E2E8F0',background:'#fff',fontSize:17,cursor:'pointer',color:'#1B3057'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DIAS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#94A3B8'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
        {cells.map((d,i)=>d===null?<div key={`e${i}`}/>:(
          <div key={d} onClick={()=>!isPast(d)&&!isBlock(d)&&!isClosed(d)&&onChange(str(d))} style={{
            aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',
            fontSize:13,fontWeight:isSel(d)?800:500,cursor:(isPast(d)||isBlock(d)||isClosed(d))?'default':'pointer',
            background:isSel(d)?'#1B3057':'transparent',
            color:isSel(d)?'#fff':(isPast(d)||isBlock(d)||isClosed(d))?'#CBD5E1':'#1E293B',
            position:'relative',transition:'all .12s',
          }}>
            {d}
            {isTdy(d)&&!isSel(d)&&<span style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:2,background:'#1B3057'}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* Indicador de progresso */
function Progress({ etapa, passos }) {
  const total = passos.length
  return (
    <div style={{padding:'0 4px',marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        {passos.map((p,i)=>(
          <div key={i} style={{textAlign:'center',flex:1}}>
            <div style={{width:28,height:28,borderRadius:14,margin:'0 auto 4px',display:'flex',alignItems:'center',justifyContent:'center',
              background:etapa>i?'#059669':etapa===i?'#1B3057':'#E2E8F0',
              fontSize:11,fontWeight:800,color:etapa>=i?'#fff':'#94A3B8',transition:'all .2s'}}>
              {etapa>i?'✓':i+1}
            </div>
            <div style={{fontSize:9,fontWeight:700,color:etapa===i?'#1B3057':'#94A3B8',textTransform:'uppercase',letterSpacing:'.3px',display:etapa===i?'block':'none'}}>{p}</div>
          </div>
        ))}
      </div>
      <div style={{height:3,background:'#E2E8F0',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',background:'#1B3057',borderRadius:2,transition:'width .3s',width:`${(etapa/(total-1))*100}%`}}/>
      </div>
    </div>
  )
}

/* Geração de slots com almoço */
function gerarSlots(schedCfg, date) {
  if (schedCfg?.length && date) {
    const dow = new Date(date+'T12:00:00').getDay()
    const cfg = schedCfg.find(c=>c.day_of_week===dow)
    if (cfg?.is_open===false) return []
    if (cfg?.open_time && cfg?.close_time) {
      const dur = cfg.slot_duration||30
      const [hI,mI] = cfg.open_time.split(':').map(Number)
      const [hF,mF] = cfg.close_time.split(':').map(Number)
      const ls = cfg.lunch_start?cfg.lunch_start.split(':').map(Number).reduce((a,b,i)=>i===0?a*60+b:a+b,0):null
      const le = cfg.lunch_end  ?cfg.lunch_end.split(':').map(Number).reduce((a,b,i)=>i===0?a*60+b:a+b,0)  :null
      const s = []
      for (let m=hI*60+mI; m+dur<=hF*60+mF; m+=dur) {
        if (!ls||!le||m<ls||m>=le)
          s.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`)
      }
      return s
    }
  }
  return Array.from({length:13},(_,i)=>`${String(8+i).padStart(2,'0')}:00`)
}

/* ─────────────────────────────────── MAIN ─────────────────────────────────── */
export default function AgendarPage({ params }) {
  const { salonId } = params
  const sb = createClient()

  // Dados do salão
  const [salon,       setSalon]       = useState(null)
  const [services,    setServices]    = useState([])
  const [blocked,     setBlocked]     = useState([])
  const [schedCfg,    setSchedCfg]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)

  // Barbeiros
  const [barbers,     setBarbers]     = useState([])
  const [showBarberStep, setShowBarberStep] = useState(false)

  // Fluxo — etapa 0=barbeiro (opcional), 1=identidade, 2=serviços, 3=data/hora, 4=confirmar
  const [etapa,       setEtapa]       = useState(1)

  // Etapa 1: Identidade
  const [fone,        setFone]        = useState('')
  const [nome,        setNome]        = useState('')
  const [origem,      setOrigem]      = useState('')
  const [lookingUp,   setLookingUp]   = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(null)
  const [proximosAppts, setProximosAppts] = useState([])
  const [isNewClient, setIsNewClient] = useState(null)
  const [outraPessoa, setOutraPessoa] = useState(false)

  // Etapa 2: Serviços
  const [selecionados, setSelecionados] = useState([])
  const [cutPref,     setCutPref]     = useState('')

  // Etapa 3: Data/Hora
  const [dataSel,     setDataSel]     = useState('')
  const [horaSel,     setHoraSel]     = useState('')
  const [ocupados,    setOcupados]    = useState([])

  // Barbeiro selecionado
  const [barberId,    setBarberId]    = useState(null)
  const [barberName,  setBarberName]  = useState(null)

  // Etapa 4: Confirmar
  const [obs,         setObs]         = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [resultado,   setResultado]   = useState(null)
  const [erroMsg,     setErroMsg]     = useState(null)

  /* Carrega dados do salão */
  useEffect(() => {
    const toSlug = (name) => (name||'').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId)

    // Captura barbeiro da URL (?barber=id)
    let urlBarber = null
    if (typeof window !== 'undefined') {
      urlBarber = new URLSearchParams(window.location.search).get('barber')
      if (urlBarber) setBarberId(urlBarber)
    }

    const loadById = async (id) => {
      const [
        {data:s,error:e},
        {data:sv},
        {data:bl},
        {data:sc},
        {data:bb},
      ] = await Promise.all([
        sb.from('salons').select('*').eq('id',id).single(),
        sb.from('services').select('id,name,price,duration,category').eq('salon_id',id).eq('active',true).order('name'),
        sb.from('blocked_dates').select('date').eq('salon_id',id),
        sb.from('schedule_config').select('*').eq('salon_id',id),
        sb.from('barbers').select('id,name,avatar_url,color').eq('salon_id',id).eq('active',true).order('name'),
      ])

      if (e||!s) { setNotFound(true); setLoading(false); return }
      setSalon(s)
      setServices(sv?.length>0?sv:DEFAULT_SVCS)
      setBlocked((bl||[]).map(b=>b.date))
      setSchedCfg(sc||[])

      const activeBarbers = bb || []
      setBarbers(activeBarbers)

      // Se há ≥2 barbeiros e nenhum foi pré-selecionado via URL, mostrar etapa de escolha
      if (activeBarbers.length >= 2 && !urlBarber) {
        setShowBarberStep(true)
        setEtapa(0)
      }

      // Se barbeiro foi pré-selecionado via URL, pegar o nome dele
      if (urlBarber && activeBarbers.length > 0) {
        const found = activeBarbers.find(b => b.id === urlBarber)
        if (found) setBarberName(found.name)
      }

      setLoading(false)
      sb.from('page_views').insert({salon_id:id,type:'booking'}).catch(()=>{})
    }

    if (isUUID) {
      loadById(salonId)
    } else {
      sb.from('salons').select('id,name').eq('is_active',true)
        .then(({data:all})=>{
          const match = (all||[]).find(s=>toSlug(s.name)===salonId)
          if (match) loadById(match.id)
          else { setNotFound(true); setLoading(false) }
        })
    }
  },[])

  /* Carrega slots ocupados ao selecionar data */
  useEffect(()=>{
    if (!dataSel||!salon?.id) return
    setHoraSel('')
    let query = sb.from('appointments').select('date')
      .eq('salon_id',salon.id)
      .gte('date',`${dataSel}T00:00:00`)
      .lte('date',`${dataSel}T23:59:59`)
      .not('status','eq','cancelado')

    // Filtrar por barbeiro se selecionado — evita conflito entre agendas de barbeiros diferentes
    if (barberId) query = query.eq('barber_id', barberId)

    query.then(({data})=>setOcupados((data||[]).map(a=>a.date?.slice(11,16))))
  },[dataSel,salon?.id,barberId])

  /* Lookup de cliente por telefone */
  const lookupCliente = async (phoneRaw) => {
    const phone = phoneRaw.replace(/\D/g,'')
    if (phone.length < 10) return
    setLookingUp(true)
    const { data:cl } = await sb.from('clients')
      .select('*').eq('salon_id',salon?.id)
      .or(`phone.ilike.%${phone}%,phone.eq.${phone}`)
      .limit(1)
    const found = cl?.[0] || null
    setClienteEncontrado(found)
    if (found) {
      setNome(found.name||'')
      setIsNewClient(false)
      const { data:ap } = await sb.from('appointments')
        .select('id,date,service_name,status')
        .eq('client_id',found.id)
        .eq('status','agendado')
        .gte('date',new Date().toISOString())
        .order('date').limit(3)
      setProximosAppts(ap||[])
    } else {
      setIsNewClient(true)
      setProximosAppts([])
    }
    setLookingUp(false)
  }

  /* Selecionar barbeiro (etapa 0) */
  const selecionarBarbeiro = (b) => {
    if (b) {
      setBarberId(b.id)
      setBarberName(b.name)
    } else {
      setBarberId(null)
      setBarberName(null)
    }
    setEtapa(1)
  }

  /* Avança para próxima etapa — validações */
  const avancar = () => {
    if (etapa===1) {
      if (!fone||fone.replace(/\D/g,'').length<10) return
      if (!nome.trim()) return
      if (isNewClient && !origem) return
    }
    if (etapa===2 && selecionados.length===0) return
    if (etapa===3 && (!dataSel||!horaSel)) return
    setEtapa(e=>e+1)
  }

  /* Volta para etapa anterior */
  const voltar = () => {
    if (etapa === 1 && showBarberStep) {
      setEtapa(0)
    } else {
      setEtapa(e=>e-1)
    }
  }

  /* Confirmar agendamento */
  const confirmar = async () => {
    setSalvando(true)
    const dt = `${dataSel}T${horaSel}:00`
    const total = selecionados.reduce((s,sv)=>s+(sv.price||0),0)
    const svNomes = selecionados.map(sv=>sv.name).join(', ')

    try {
      setErroMsg(null)
      const phoneClean = fone.replace(/\D/g,'')
      let clientId = clienteEncontrado?.id || null

      if (!clientId) {
        const { data:clInsert } = await sb.from('clients').insert({
          salon_id: salon?.id,
          name: nome.trim(),
          phone: phoneClean,
          referral_source: origem || '',
          first_visit: dataSel,
          status: 'ativo',
          visit_count: 0,
          ltv: 0,
        }).select('id')

        if (clInsert?.[0]?.id) {
          clientId = clInsert[0].id
        } else {
          const { data:found } = await sb.from('clients')
            .select('id').eq('salon_id', salon?.id).eq('phone', phoneClean).maybeSingle()
          clientId = found?.id || null
        }
      }

      const { data:apArr, error:apErr } = await sb.from('appointments').insert({
        salon_id: salon?.id,
        client_id: clientId,
        client_name: nome.trim(),
        service_name: svNomes,
        date: dt,
        status: 'agendado',
        value: total,
        barber_id: barberId || null,
        notes: `${phoneClean}${obs?' | '+obs:''}`,
        cut_preference: cutPref.trim() || null,
      }).select()

      if (apErr) throw new Error(apErr.message)
      const ap = Array.isArray(apArr) ? apArr[0] : apArr
      setResultado({ ap, svNomes, total, dataSel, horaSel })
    } catch(e) {
      console.error(e)
      setErroMsg('Ocorreu um erro ao confirmar. Tente novamente.')
    }
    setSalvando(false)
  }

  const totalSelecionado = selecionados.reduce((s,sv)=>s+(sv.price||0),0)
  const slots = gerarSlots(schedCfg, dataSel).filter(s=>!ocupados.includes(s))

  /* Passos do progress */
  const passos = showBarberStep
    ? ['Barbeiro','Identidade','Serviços','Data e Hora','Confirmar']
    : ['Identidade','Serviços','Data e Hora','Confirmar']

  // etapa índice no progress: quando showBarberStep, etapa 0=passo 0, 1=passo 1, etc.
  // quando não showBarberStep, etapa 1=passo 0, 2=passo 1, etc.
  const progressIdx = showBarberStep ? etapa : etapa - 1

  /* ── Loading / Not found ── */
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFC'}}>
      <div style={{color:'#64748B',fontSize:14}}>Carregando...</div>
    </div>
  )
  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0B1E3D',padding:20}}>
      <div style={{fontFamily:'Dancing Script,cursive',fontSize:36,color:'#fff',marginBottom:8}}>Meu Salão</div>
      <div style={{color:'rgba(255,255,255,.5)',fontSize:14}}>Salão não encontrado ou inativo.</div>
    </div>
  )

  /* ── Resultado ── */
  if (resultado) {
    const dt = new Date(`${resultado.dataSel}T${resultado.horaSel}:00`)
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0B1E3D,#1E3A6E)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;800&display=swap')`}</style>
        <div style={{background:'#fff',borderRadius:24,padding:'32px 24px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,.3)'}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <div style={{fontSize:20,fontWeight:800,color:'#0B1E3D',marginBottom:6}}>Agendado com sucesso!</div>
          <div style={{fontSize:14,color:'#64748B',marginBottom:20}}>
            <strong>{resultado.svNomes}</strong><br/>
            {dt.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})} às {resultado.horaSel}<br/>
            {barberName && <span>com <strong>{barberName}</strong><br/></span>}
            {salon?.name}
          </div>
          {resultado.total>0&&<div style={{fontSize:22,fontWeight:800,color:'#059669',marginBottom:20}}>R${resultado.total.toLocaleString('pt-BR')}</div>}
          <a href={`https://wa.me/55${salon?.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá! Acabei de agendar: ${resultado.svNomes} para ${dt.toLocaleDateString('pt-BR')} às ${resultado.horaSel}. Nome: ${nome}`)}`}
            target="_blank" rel="noreferrer"
            style={{display:'block',padding:'13px',background:'#25D366',borderRadius:12,color:'#fff',fontWeight:700,fontSize:14,textDecoration:'none',marginBottom:10}}>
            💬 Confirmar pelo WhatsApp
          </a>
          <button onClick={()=>window.location.reload()} style={{width:'100%',padding:12,borderRadius:12,border:'1px solid #E2E8F0',background:'transparent',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            Novo agendamento
          </button>
        </div>
      </div>
    )
  }

  /* ── Layout principal ── */
  const CARD = { background:'#fff', borderRadius:16, padding:'20px', marginBottom:14, border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }
  const LABEL = { display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, marginTop:14 }
  const INP = { width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', fontSize:15, outline:'none', color:'#0B1E3D', boxSizing:'border-box', fontFamily:'inherit', background:'#fff', transition:'border .2s' }
  const BTN_PRI = { width:'100%', padding:'14px', borderRadius:12, border:'none', background:'#1B3057', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:16 }

  return (
    <div style={{minHeight:'100vh',background:'#F8FAFC',fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap'); input:focus,select:focus,textarea:focus{border-color:#1B3057!important;outline:none} input,select,textarea{font-size:16px!important}`}</style>

      {/* Header */}
      <div style={{background:'#0B1E3D',padding:'20px 20px 14px',textAlign:'center'}}>
        {salon.logo_url&&<img src={salon.logo_url} style={{width:56,height:56,borderRadius:28,objectFit:'cover',marginBottom:8}}/>}
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:24,color:'#fff',fontWeight:700}}>{salon.name||'Meu Salão'}</div>
        {/* Badge do barbeiro pré-selecionado via link */}
        {barberName && etapa > 0 && (
          <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:6,background:'rgba(255,255,255,.12)',borderRadius:20,padding:'4px 12px'}}>
            <div style={{width:8,height:8,borderRadius:4,background:'#4ade80'}}/>
            <span style={{fontSize:12,color:'rgba(255,255,255,.85)',fontWeight:600}}>{barberName}</span>
          </div>
        )}
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:12,color:'rgba(255,255,255,.4)',marginTop:barberName&&etapa>0?4:0}}>Agendamento online</div>
      </div>

      <div style={{padding:'20px 16px',maxWidth:560,margin:'0 auto'}}>
        {/* Progress — não mostra na etapa 0 */}
        {etapa > 0 && <Progress etapa={progressIdx} passos={passos}/>}

        {/* ── Etapa 0: Escolha o barbeiro ── */}
        {etapa===0&&(
          <div>
            <div style={CARD}>
              <div style={{fontSize:16,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Com quem você quer ser atendido?</div>
              <div style={{fontSize:12,color:'#64748B',marginBottom:20}}>Escolha o profissional ou deixe sem preferência</div>

              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                {barbers.map(b=>(
                  <button key={b.id} onClick={()=>selecionarBarbeiro(b)}
                    style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:14,border:'2px solid #E2E8F0',background:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#1B3057';e.currentTarget.style.background='#EFF6FF'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.background='#fff'}}
                  >
                    <div style={{
                      width:48,height:48,borderRadius:24,
                      background:b.color||'#1B3057',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:18,fontWeight:800,color:'#fff',flexShrink:0,
                    }}>
                      {b.avatar_url
                        ? <img src={b.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:24}} alt={b.name}/>
                        : (b.name||'?')[0].toUpperCase()
                      }
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15,color:'#0B1E3D'}}>{b.name}</div>
                    </div>
                    <div style={{color:'#CBD5E1',fontSize:18}}>›</div>
                  </button>
                ))}
              </div>

              {/* Sem preferência */}
              <button onClick={()=>selecionarBarbeiro(null)}
                style={{width:'100%',padding:'12px',borderRadius:12,border:'1.5px dashed #CBD5E1',background:'transparent',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                Sem preferência
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 1: Identidade ── */}
        {etapa===1&&(
          <div style={CARD}>
            <div style={{fontSize:16,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Olá! Quem vai ser atendido?</div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>Digite seu WhatsApp para verificarmos seu cadastro</div>

            <label style={LABEL}>WhatsApp *</label>
            <input style={INP} type="tel" placeholder="(31) 99999-0000" value={fone}
              onChange={e=>{
                const v = formatPhone(e.target.value)
                setFone(v)
                setClienteEncontrado(null); setIsNewClient(null); setProximosAppts([]); setNome(outraPessoa?'':nome)
                if (v.replace(/\D/g,'').length>=10) lookupCliente(v)
              }}/>

            {lookingUp&&<div style={{fontSize:12,color:'#64748B',marginTop:6}}>Verificando cadastro...</div>}

            {/* Cliente encontrado */}
            {isNewClient===false && !outraPessoa && (
              <div style={{marginTop:12,padding:'12px 14px',background:'#D1FAE5',borderRadius:12,border:'1px solid #6EE7B7'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#065F46',marginBottom:4}}>Olá, {clienteEncontrado?.name?.split(' ')[0]}!</div>
                <div style={{fontSize:12,color:'#047857'}}>Encontramos seu cadastro.</div>
                {proximosAppts.length>0&&(
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#065F46',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Você já tem horário marcado:</div>
                    {proximosAppts.map(a=>{
                      const d = new Date(a.date)
                      return (
                        <div key={a.id} style={{background:'rgba(0,0,0,.06)',borderRadius:8,padding:'8px 10px',marginBottom:6,fontSize:12,color:'#065F46',fontWeight:600}}>
                          {a.service_name} · {d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} às {d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      )
                    })}
                    <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                      <button onClick={()=>setEtapa(2)}
                        style={{flex:'1 1 140px',padding:'9px 14px',borderRadius:10,border:'none',background:'#065F46',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        + Marcar outro horário
                      </button>
                      <button onClick={()=>setOutraPessoa(true)}
                        style={{flex:'1 1 120px',padding:'9px 14px',borderRadius:10,border:'1px solid #6EE7B7',background:'transparent',color:'#065F46',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        É para outra pessoa
                      </button>
                    </div>
                  </div>
                )}
                {proximosAppts.length===0&&(
                  <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                    <button onClick={()=>setEtapa(2)}
                      style={{flex:'1 1 140px',padding:'9px 14px',borderRadius:10,border:'none',background:'#065F46',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      Agendar agora
                    </button>
                    <button onClick={()=>setOutraPessoa(true)}
                      style={{flex:'1 1 120px',padding:'9px 14px',borderRadius:10,border:'1px solid #6EE7B7',background:'transparent',color:'#065F46',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      É para outra pessoa
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Outra pessoa / nome */}
            {(isNewClient||outraPessoa)&&(
              <div>
                {outraPessoa&&<div style={{fontSize:12,color:'#64748B',marginTop:10,marginBottom:4}}>Agendando para outra pessoa:</div>}
                <label style={LABEL}>Nome completo *</label>
                <input style={INP} placeholder="Nome de quem vai ser atendido" value={nome} onChange={e=>setNome(e.target.value)}/>
              </div>
            )}

            {/* Origem */}
            {isNewClient && !outraPessoa && (
              <div>
                <label style={LABEL}>Como nos encontrou? *</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
                  {ORIGENS.map(o=>(
                    <button key={o} onClick={()=>setOrigem(o)}
                      style={{padding:'9px 12px',borderRadius:10,border:`1.5px solid ${origem===o?'#1B3057':'#E2E8F0'}`,
                        background:origem===o?'#EFF6FF':'#fff',color:origem===o?'#1B3057':'#64748B',
                        fontSize:12,fontWeight:origem===o?700:500,cursor:'pointer',textAlign:'center'}}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botão avançar */}
            {((isNewClient===false&&!outraPessoa&&proximosAppts.length===0)||(isNewClient&&nome&&origem)||outraPessoa)&&(
              <button onClick={avancar} style={BTN_PRI}
                disabled={!fone||fone.replace(/\D/g,'').length<10||!nome.trim()||(isNewClient&&!origem&&!outraPessoa)}>
                Escolher serviço →
              </button>
            )}

            {/* Voltar para barbeiro */}
            {showBarberStep && (
              <button onClick={()=>setEtapa(0)} style={{width:'100%',padding:'10px',borderRadius:12,border:'1px solid #E2E8F0',background:'transparent',color:'#64748B',fontSize:13,fontWeight:600,cursor:'pointer',marginTop:8}}>
                ← Trocar barbeiro
              </button>
            )}
          </div>
        )}

        {/* ── Etapa 2: Serviços ── */}
        {etapa===2&&(
          <div>
            <div style={CARD}>
              <div style={{fontSize:16,fontWeight:800,color:'#0B1E3D',marginBottom:4}}>Qual serviço?</div>
              <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>Selecione um ou mais serviços</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {services.map(svc=>{
                  const sel = selecionados.some(s=>s.id===svc.id)
                  return (
                    <button key={svc.id} onClick={()=>setSelecionados(prev=>sel?prev.filter(s=>s.id!==svc.id):[...prev,svc])}
                      style={{display:'flex',alignItems:'center',gap:14,padding:'14px',borderRadius:14,textAlign:'left',
                        border:`2px solid ${sel?'#1B3057':'#E2E8F0'}`,background:sel?'#EFF6FF':'#fff',
                        cursor:'pointer',transition:'all .15s',boxShadow:sel?'0 4px 16px rgba(27,48,87,.15)':'none'}}>
                      <div style={{width:22,height:22,borderRadius:11,border:`2px solid ${sel?'#1B3057':'#CBD5E1'}`,
                        background:sel?'#1B3057':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {sel&&<span style={{color:'#fff',fontSize:12,fontWeight:800}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#0B1E3D'}}>{svc.name}</div>
                        <div style={{fontSize:12,color:'#64748B',marginTop:2}}>
                          {svc.price>0&&<span style={{color:'#1B3057',fontWeight:700,marginRight:8}}>{fmtPreco(svc.price)}</span>}
                          {svc.duration>0&&<span>{fmtDur(svc.duration)}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {selecionados.length>0&&(
              <div style={{...CARD,background:'#0B1E3D',border:'none',color:'#fff'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,.5)',fontWeight:600}}>Selecionados: {selecionados.map(s=>s.name).join(', ')}</div>
                    <div style={{fontSize:22,fontWeight:800,color:'#fff',marginTop:2}}>R${totalSelecionado.toLocaleString('pt-BR')}</div>
                  </div>
                  <div style={{textAlign:'right',color:'rgba(255,255,255,.5)',fontSize:12}}>
                    {fmtDur(selecionados.reduce((s,sv)=>s+(sv.duration||0),0))}
                  </div>
                </div>
              </div>
            )}

            <label style={{...LABEL,marginTop:0}}>Tipo de corte / preferência <span style={{fontWeight:400,textTransform:'none',color:'#94A3B8'}}>(opcional)</span></label>
            <input style={INP} placeholder="Ex: degradê na lateral, franja, mechas..." value={cutPref} onChange={e=>setCutPref(e.target.value)}/>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={voltar} style={{flex:'0 0 auto',padding:'14px 20px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:14,fontWeight:600,cursor:'pointer'}}>←</button>
              <button onClick={avancar} disabled={selecionados.length===0} style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:selecionados.length?'#1B3057':'#E2E8F0',color:selecionados.length?'#fff':'#94A3B8',fontSize:14,fontWeight:700,cursor:selecionados.length?'pointer':'not-allowed'}}>
                Escolher data →
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 3: Data e Hora ── */}
        {etapa===3&&(
          <div>
            <div style={CARD}>
              <div style={{fontSize:16,fontWeight:800,color:'#0B1E3D',marginBottom:16}}>Quando você quer vir?</div>
              <Cal valor={dataSel} onChange={setDataSel} blockedDates={blocked} schedCfg={schedCfg}/>
            </div>

            {dataSel&&(
              <div style={CARD}>
                <div style={{fontSize:13,fontWeight:700,color:'#0B1E3D',marginBottom:12}}>
                  Horários disponíveis · {new Date(dataSel+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}
                  {barberName&&<span style={{color:'#64748B',fontWeight:500}}> · {barberName}</span>}
                </div>
                {slots.length===0
                  ? <div style={{textAlign:'center',color:'#94A3B8',padding:16,fontSize:13}}>Sem horários disponíveis neste dia.</div>
                  : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))',gap:8}}>
                    {slots.map(s=>(
                      <button key={s} onClick={()=>setHoraSel(s)}
                        style={{padding:'10px 0',borderRadius:10,border:`2px solid ${horaSel===s?'#1B3057':'#E2E8F0'}`,
                          background:horaSel===s?'#1B3057':'#fff',color:horaSel===s?'#fff':'#1E293B',
                          fontSize:13,fontWeight:700,cursor:'pointer',minHeight:42}}>
                        {s}
                      </button>
                    ))}
                  </div>
                }
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={voltar} style={{flex:'0 0 auto',padding:'14px 20px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:14,fontWeight:600,cursor:'pointer'}}>←</button>
              <button onClick={avancar} disabled={!dataSel||!horaSel} style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:dataSel&&horaSel?'#1B3057':'#E2E8F0',color:dataSel&&horaSel?'#fff':'#94A3B8',fontSize:14,fontWeight:700,cursor:dataSel&&horaSel?'pointer':'not-allowed'}}>
                Revisar e confirmar →
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 4: Confirmar ── */}
        {etapa===4&&(
          <div>
            <div style={CARD}>
              <div style={{fontSize:16,fontWeight:800,color:'#0B1E3D',marginBottom:16}}>Confirme seu agendamento</div>
              {[
                ['Quem', nome],
                ['WhatsApp', fone],
                ...(barberName?[['Profissional',barberName]]:[]),
                ['Serviço', selecionados.map(s=>s.name).join(', ')],
                ['Data', dataSel?new Date(dataSel+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}):''],
                ['Horário', horaSel],
                ...(cutPref?[['Preferência',cutPref]]:[]),
                ...(totalSelecionado?[['Total',`R$${totalSelecionado.toLocaleString('pt-BR')}`]]:[]),
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #F1F5F9',fontSize:13}}>
                  <span style={{color:'#64748B',fontWeight:600}}>{l}</span>
                  <span style={{color:'#0B1E3D',fontWeight:700,textAlign:'right',maxWidth:'60%'}}>{v}</span>
                </div>
              ))}

              <label style={LABEL}>Observações <span style={{fontWeight:400,textTransform:'none',color:'#94A3B8'}}>(opcional)</span></label>
              <textarea style={{...INP,resize:'none',minHeight:70}} placeholder="Algum pedido especial?" value={obs} onChange={e=>setObs(e.target.value)}/>
            </div>

            {erroMsg && (
              <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#B91C1C',marginBottom:8,textAlign:'center'}}>
                {erroMsg}
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={voltar} style={{flex:'0 0 auto',padding:'14px 20px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:14,fontWeight:600,cursor:'pointer'}}>←</button>
              <button onClick={confirmar} disabled={salvando}
                style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:salvando?'#E2E8F0':'#1B3057',color:salvando?'#94A3B8':'#fff',fontSize:15,fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>
                {salvando?'Agendando...':'✓ Confirmar agendamento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
