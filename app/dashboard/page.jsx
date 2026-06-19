'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'

const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function today() { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()) }
function fmtHora(iso) { return iso?.slice(11,16) || '' }
function fmtDia(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${MESES_SHORT[d.getMonth()]}`
}
function diasSemCeder(lastVisit) {
  if (!lastVisit) return null
  return Math.floor((Date.now()-new Date(lastVisit).getTime())/(1000*60*60*24))
}

const STATUS_COLORS = {
  agendado:  { bg:'#E6F1FB', color:'#0C447C', label:'Agendado' },
  concluido: { bg:'#E1F5EE', color:'#085041', label:'Concluído' },
  cancelado: { bg:'#FCEBEB', color:'#A32D2D', label:'Cancelado' },
  faltou:    { bg:'#FAEEDA', color:'#633806', label:'Faltou' },
}

export default function DashboardHome() {
  const { salon, user, loading: sl } = useSalon()
  const [appts, setAppts]       = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [quickStats, setQuickStats] = useState({ hoje:0, semana:0, receitaHoje:0, receitaMes:0 })
  const sb = createClient()

  const fetch = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const now = today()
    const in7 = new Date(now); in7.setDate(in7.getDate()+7)
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [{ data: ap }, { data: cl }] = await Promise.all([
      sb.from('appointments').select('*').eq('salon_id',salon.id)
        .gte('date', now.toISOString()).lte('date', in7.toISOString())
        .order('date'),
      sb.from('clients').select('*').eq('salon_id',salon.id).order('name'),
    ])

    // Stats
    const todayStr = now.toISOString().slice(0,10)
    const apHoje  = (ap||[]).filter(a=>a.date?.startsWith(todayStr))
    const apConc  = (ap||[]).filter(a=>a.status==='concluido')

    // Receita do mês (busca separada)
    const { data: mesAppts } = await sb.from('appointments').select('value,status,date')
      .eq('salon_id',salon.id).eq('status','concluido').gte('date',mesInicio)

    setAppts(ap||[])
    setClients(cl||[])
    setQuickStats({
      hoje:   apHoje.length,
      semana: (ap||[]).length,
      receitaHoje: apConc.filter(a=>a.date?.startsWith(todayStr)).reduce((s,a)=>s+(a.value||0),0),
      receitaMes:  (mesAppts||[]).reduce((s,a)=>s+(a.value||0),0),
    })
    setLoading(false)
  }, [salon?.id])

  useEffect(()=>{ fetch() },[fetch])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  // Follow-up: clientes em risco ou sem visita há muito tempo
  const followUps = clients.filter(c => {
    if (c.status==='inativo') return true
    const dias = diasSemCeder(c.last_visit)
    return dias !== null && dias >= 30
  }).slice(0,5)

  // Agendamentos hoje
  const todayStr = today().toISOString().slice(0,10)
  const apptHoje = appts.filter(a=>a.date?.startsWith(todayStr))
  const apptFuturos = appts.filter(a=>!a.date?.startsWith(todayStr))

  const st = {
    page:  {padding:'0'},
    hero:  {background:'linear-gradient(135deg,#16112B,#2D2460)',padding:'20px 20px 24px',color:'#fff'},
    greet: {fontSize:20,fontWeight:800,marginBottom:4},
    sub:   {fontSize:13,opacity:.6},
    grid2: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16},
    statC: {background:'rgba(255,255,255,.1)',borderRadius:12,padding:'12px 14px',backdropFilter:'blur(10px)'},
    statL: {fontSize:10,opacity:.6,textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600,marginBottom:4},
    statV: {fontSize:22,fontWeight:800},
    statD: {fontSize:10,opacity:.5,marginTop:2},
    section:{padding:'16px 16px 0'},
    secHd: {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12},
    secTi: {fontSize:15,fontWeight:800,color:'#1A1825'},
    secLk: {fontSize:12,color:'#534AB7',fontWeight:600},
    card:  {background:'#fff',borderRadius:14,border:'1px solid #E3E1F0',marginBottom:8},
    apRow: {display:'flex',alignItems:'center',gap:12,padding:'12px 14px'},
    apTime:{minWidth:38,textAlign:'center',background:'#F2F1F8',borderRadius:8,padding:'6px 4px'},
    apTmV: {fontSize:13,fontWeight:800,color:'#534AB7'},
    apTmD: {fontSize:9,color:'#8A87A0',marginTop:1},
    apNm:  {flex:1,fontWeight:700,fontSize:13,color:'#1A1825'},
    apSv:  {fontSize:11,color:'#8A87A0',marginTop:2},
    badge: {fontSize:10,padding:'3px 8px',borderRadius:10,fontWeight:700},
    fuCard:{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:'1px solid #F2F1F8'},
    fuAv:  {width:36,height:36,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,flexShrink:0},
    fuNm:  {fontWeight:700,fontSize:13},
    fuSub: {fontSize:11,color:'#8A87A0',marginTop:2},
    fuBtn: {padding:'5px 12px',background:'#E1F5EE',color:'#085041',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'},
    quickAct:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,padding:'16px'},
    qBtn:  {display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'12px 8px',background:'#fff',borderRadius:12,border:'1px solid #E3E1F0',cursor:'pointer',textDecoration:'none'},
    qIco:  {fontSize:22},
    qLbl:  {fontSize:10,fontWeight:600,color:'#8A87A0',textAlign:'center',lineHeight:1.2},
    empty: {textAlign:'center',color:'#8A87A0',padding:'24px 16px',fontSize:13},
  }

  if (sl) return <div style={{padding:40,textAlign:'center',color:'#8A87A0'}}>Carregando...</div>

  const hora = new Date().getHours()
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite'

  return (
    <div style={st.page}>
      {/* Hero */}
      <div style={st.hero}>
        <div style={st.greet}>{saudacao} 👋</div>
        <div style={st.sub}>{salon?.name} · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
        <div style={st.grid2}>
          <div style={st.statC}>
            <div style={st.statL}>Hoje</div>
            <div style={st.statV}>{quickStats.hoje}</div>
            <div style={st.statD}>agendamentos</div>
          </div>
          <div style={st.statC}>
            <div style={st.statL}>Receita hoje</div>
            <div style={{...st.statV,color:'#6DFFC4'}}>R${quickStats.receitaHoje.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div>
            <div style={st.statD}>concluídos</div>
          </div>
          <div style={st.statC}>
            <div style={st.statL}>Próx. 7 dias</div>
            <div style={st.statV}>{quickStats.semana}</div>
            <div style={st.statD}>agendamentos</div>
          </div>
          <div style={st.statC}>
            <div style={st.statL}>Receita mês</div>
            <div style={{...st.statV,color:'#6DFFC4'}}>R${quickStats.receitaMes.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div>
            <div style={st.statD}>acumulado</div>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={st.quickAct}>
        {[
          {href:'/dashboard/agenda',   icon:'📅', label:'Agendar'},
          {href:'/dashboard/clientes', icon:'👤', label:'Clientes'},
          {href:'/dashboard/financeiro',icon:'💰',label:'Financeiro'},
          {href:'/dashboard/servicos', icon:'✂️', label:'Serviços'},
        ].map(a=>(
          <Link key={a.href} href={a.href} style={st.qBtn}>
            <span style={st.qIco}>{a.icon}</span>
            <span style={st.qLbl}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Agenda de hoje */}
      <div style={st.section}>
        <div style={st.secHd}>
          <span style={st.secTi}>📅 Agenda de hoje</span>
          <Link href="/dashboard/agenda" style={st.secLk}>Ver tudo →</Link>
        </div>
        <div style={st.card}>
          {loading ? <div style={st.empty}>Carregando...</div>
          : apptHoje.length===0 ? <div style={st.empty}>Nenhum agendamento para hoje.</div>
          : apptHoje.map(a=>{
            const cfg = STATUS_COLORS[a.status]||STATUS_COLORS.agendado
            return (
              <div key={a.id} style={{...st.apRow,borderBottom:'1px solid #F2F1F8'}}>
                <div style={st.apTime}>
                  <div style={st.apTmV}>{fmtHora(a.date)}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={st.apNm}>{a.client_name}</div>
                  <div style={st.apSv}>{a.service_name||'–'} {a.value?`· R$${Number(a.value).toLocaleString('pt-BR')}`:''}</div>
                </div>
                <span style={{...st.badge,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximos horários */}
      {apptFuturos.length>0 && (
        <div style={st.section}>
          <div style={st.secHd}>
            <span style={st.secTi}>🗓️ Próximos horários</span>
            <Link href="/dashboard/agenda" style={st.secLk}>Ver agenda →</Link>
          </div>
          <div style={st.card}>
            {apptFuturos.slice(0,4).map(a=>{
              const cfg = STATUS_COLORS[a.status]||STATUS_COLORS.agendado
              return (
                <div key={a.id} style={{...st.apRow,borderBottom:'1px solid #F2F1F8'}}>
                  <div style={st.apTime}>
                    <div style={st.apTmV}>{fmtHora(a.date)}</div>
                    <div style={st.apTmD}>{fmtDia(a.date)}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={st.apNm}>{a.client_name}</div>
                    <div style={st.apSv}>{a.service_name||'–'}</div>
                  </div>
                  <span style={{...st.badge,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {followUps.length>0 && (
        <div style={{...st.section,paddingBottom:16}}>
          <div style={st.secHd}>
            <span style={st.secTi}>💬 Sugestões de follow-up</span>
            <Link href="/dashboard/clientes" style={st.secLk}>Ver clientes →</Link>
          </div>
          <div style={{background:'#FAEEDA',borderRadius:12,padding:'10px 14px',marginBottom:10,fontSize:12,color:'#633806',fontWeight:600,display:'flex',gap:8}}>
            ⚠️ {followUps.length} cliente{followUps.length>1?'s':''} sem visita recente — boa hora para um contato!
          </div>
          <div style={st.card}>
            {followUps.map((c,i)=>{
              const dias = diasSemCeder(c.last_visit)
              const initials = c.name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
              const wLink = c.phone ? `https://wa.me/55${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${c.name.split(' ')[0]}! Tudo bem? Faz um tempinho que não te vejo por aqui. Que tal agendarmos um horário? 😊`)}` : null
              return (
                <div key={c.id} style={{...st.fuCard,borderBottom:i<followUps.length-1?'1px solid #F2F1F8':'none'}}>
                  <div style={{...st.fuAv,background:c.avatar_color||'#534AB7',color:'#fff'}}>{initials}</div>
                  <div style={{flex:1}}>
                    <div style={st.fuNm}>{c.name}</div>
                    <div style={st.fuSub}>
                      {dias!==null?`${dias} dias sem visita`:'Nunca visitou'} · {c.phone||'Sem telefone'}
                    </div>
                  </div>
                  {wLink && (
                    <a href={wLink} target="_blank" rel="noreferrer">
                      <button style={st.fuBtn}>💬 WhatsApp</button>
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
