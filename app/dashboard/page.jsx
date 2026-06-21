'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'
import { Calendar, Users, DollarSign, Scissors, MessageSquare, AlertCircle, ChevronRight } from '../../lib/icons'

const STATUS_CFG = {
  agendado:  { bg:'var(--navy-100)', color:'var(--navy-700)', label:'Agendado' },
  concluido: { bg:'var(--success-light)', color:'var(--success)', label:'Concluído' },
  cancelado: { bg:'var(--danger-light)', color:'var(--danger)', label:'Cancelado' },
  faltou:    { bg:'var(--warning-light)', color:'var(--warning)', label:'Faltou' },
}
const MESES_S = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MICRODATA_ICONS = { aniversario:'🎂', retorno:'🔔', evento:'📅', reuniao:'💼', outro:'📌' }
const MICRODATA_COLORS = { aniversario:'#BE185D', retorno:'#D97706', evento:'#7C3AED', reuniao:'#0891B2', outro:'#475569' }

function today() { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()) }
function fmtHora(iso) { return iso?.slice(11,16)||'' }
function fmtDia(iso)  { if(!iso) return ''; const d=new Date(iso); return `${d.getDate()} ${MESES_S[d.getMonth()]}` }
function diasSemVisita(last) { if(!last) return null; return Math.floor((Date.now()-new Date(last).getTime())/86400000) }
function diasParaData(dateStr) {
  if (!dateStr) return null
  const now = today()
  const ano  = now.getFullYear()
  const [,m,d] = dateStr.split('-')
  let alvo = new Date(ano, parseInt(m)-1, parseInt(d))
  if (alvo < now) alvo = new Date(ano+1, parseInt(m)-1, parseInt(d))
  return Math.floor((alvo.getTime()-now.getTime())/86400000)
}

export default function DashboardHome() {
  const { salon, user, loading:sl } = useSalon()
  const [appts,     setAppts]     = useState([])
  const [clients,   setClients]   = useState([])
  const [microdates, setMicrodates] = useState([])
  const [autoCompleted, setAutoCompleted] = useState(0)

  // Agendamento próximo (janela: -5min a +30min)
  const [proximoAppt, setProximoAppt] = useState(null)

  useEffect(() => {
    if (!salon?.id) return
    const check = async () => {
      const now = new Date()
      const em5  = new Date(now.getTime() - 5*60*1000)
      const em35 = new Date(now.getTime() + 35*60*1000)
      const { data } = await createClient().from('appointments')
        .select('*').eq('salon_id',salon.id).eq('status','agendado')
        .gte('date', em5.toISOString()).lte('date', em35.toISOString())
        .order('date').limit(1)
      if (data?.[0]) {
        // Só mostra se está dentro da janela -5 a +30 do horário
        const apptTime = new Date(data[0].date)
        const diffMin = (apptTime.getTime() - now.getTime()) / 60000
        if (diffMin >= -30 && diffMin <= 5) setProximoAppt(data[0])
        else setProximoAppt(null)
      } else {
        setProximoAppt(null)
      }
    }
    check()
    const interval = setInterval(check, 60000) // verifica a cada 1 minuto
    return () => clearInterval(interval)
  }, [salon?.id])


  const [stats,     setStats]     = useState({ hoje:0, semana:0, receitaHoje:0, receitaMes:0 })
  const [loading,   setLoading]   = useState(true)
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const now = today()
    const in7 = new Date(now); in7.setDate(in7.getDate()+7)
    const mesIni = new Date(now.getFullYear(),now.getMonth(),1).toISOString()

    // Auto-completa agendamentos passados e conta quantos foram
    const cutoff = new Date(Date.now()-60*60*1000).toISOString()
    const { data: pastAppts } = await sb.from('appointments')
      .select('id,client_id,value,date')
      .eq('salon_id',salon.id).eq('status','agendado').lt('date',cutoff)

    if (pastAppts && pastAppts.length > 0) {
      await sb.from('appointments').update({status:'concluido'})
        .eq('salon_id',salon.id).eq('status','agendado').lt('date',cutoff)

      // Atualiza LTV dos clientes vinculados
      for (const ap of pastAppts) {
        if (ap.client_id && ap.value > 0) {
          const { data:cur } = await sb.from('clients').select('ltv,visit_count').eq('id',ap.client_id).single()
          if (cur) await sb.from('clients').update({
            ltv:(cur.ltv||0)+(ap.value||0),
            visit_count:(cur.visit_count||0)+1,
            last_visit:ap.date?.slice(0,10),
            status:'ativo',
          }).eq('id',ap.client_id)
        }
      }
      setAutoCompleted(pastAppts.length)
    }

    const [{ data:ap },{ data:cl },{ data:mes },{ data:md }] = await Promise.all([
      sb.from('appointments').select('*').eq('salon_id',salon.id)
        .gte('date',now.toISOString()).lte('date',in7.toISOString()).order('date'),
      sb.from('clients').select('id,name,phone,last_visit,status,avatar_color').eq('salon_id',salon.id).order('name'),
      sb.from('appointments').select('value,date').eq('salon_id',salon.id).eq('status','concluido').gte('date',mesIni),
      sb.from('microdates').select('*,clients(name,phone,avatar_color)').eq('salon_id',salon.id).order('date'),
    ])

    const todayStr = now.toISOString().slice(0,10)
    setAppts(ap||[])
    setClients(cl||[])
    setMicrodates(md||[])
    setStats({
      hoje:   (ap||[]).filter(a=>a.date?.startsWith(todayStr)).length,
      semana: (ap||[]).length,
      receitaHoje: (ap||[]).filter(a=>a.status==='concluido'&&a.date?.startsWith(todayStr)).reduce((s,a)=>s+(a.value||0),0),
      receitaMes:  (mes||[]).reduce((s,a)=>s+(a.value||0),0),
    })
    setLoading(false)
  },[salon?.id])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const todayStr = today().toISOString().slice(0,10)
  const apptHoje = appts.filter(a=>a.date?.startsWith(todayStr))
  const apptProx = appts.filter(a=>!a.date?.startsWith(todayStr)).slice(0,5)
  const followUps = clients.filter(c=>{ const d=diasSemVisita(c.last_visit); return c.status==='inativo'||(d!==null&&d>=30) }).slice(0,4)

  // Microdatas nos próximos 30 dias
  const microProximas = microdates
    .map(m=>({ ...m, diasRestantes:diasParaData(m.date) }))
    .filter(m=>m.diasRestantes!==null && m.diasRestantes<=30)
    .sort((a,b)=>a.diasRestantes-b.diasRestantes)
    .slice(0,5)

  const hora = new Date().getHours()
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite'
  const fmtR = v => `R$${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0})}`

  if (sl) return <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  return (
    <div style={{padding:0}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,var(--navy-900) 0%,var(--navy-700) 100%)',padding:'22px 20px 26px',color:'#fff'}}>
        <div style={{fontSize:21,fontWeight:800,marginBottom:4}}>{saudacao} 👋</div>
        <div style={{fontSize:13,opacity:.5,marginBottom:18}}>
          {salon?.name} · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            ['Hoje',stats.hoje,'agendamentos'],
            ['Receita hoje',fmtR(stats.receitaHoje),'concluídos'],
            ['Próx. 7 dias',stats.semana,'agendamentos'],
            ['Receita mês',fmtR(stats.receitaMes),'acumulado'],
          ].map(([l,v,d])=>(
            <div key={l} style={{background:'rgba(255,255,255,.09)',borderRadius:12,padding:'12px 14px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',letterSpacing:'.6px',fontWeight:700,marginBottom:3}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:l.includes('Receita')?'#93E4C1':'#fff'}}>{v}</div>
              <div style={{fontSize:10,opacity:.4,marginTop:1}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notificação de auto-complete financeiro */}
      {autoCompleted > 0 && (
        <div style={{background:'#D1FAE5',borderLeft:'4px solid #059669',padding:'10px 16px',display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:18}}>💰</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:'#065F46'}}>
              {autoCompleted} atendimento{autoCompleted>1?'s':''} concluído{autoCompleted>1?'s':''} automaticamente
            </div>
            <div style={{fontSize:11,color:'#047857'}}>O valor já entrou no saldo financeiro do mês.</div>
          </div>
          <Link href="/dashboard/financeiro" style={{fontSize:11,fontWeight:700,color:'#059669',textDecoration:'none'}}>Ver financeiro →</Link>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="quick-actions">
        {[
          {href:'/dashboard/agenda',    Icon:Calendar,   label:'Agendar'},
          {href:'/dashboard/clientes',  Icon:Users,      label:'Clientes'},
          {href:'/dashboard/financeiro',Icon:DollarSign, label:'Financeiro'},
          {href:'/dashboard/servicos',  Icon:Scissors,   label:'Serviços'},
        ].map(({href,Icon,label})=>(
          <Link key={href} href={href} className="quick-btn">
            <div className="quick-btn-icon"><Icon size={18}/></div>
            <span className="quick-btn-label">{label}</span>
          </Link>
        ))}
      </div>

      <div style={{padding:'0 16px 16px'}}>

        {/* Microdatas — datas importantes dos clientes */}
        {microProximas.length > 0 && (
          <div style={{marginBottom:20}}>
            <div className="sec-hd">
              <span className="sec-title">Datas importantes</span>
              <Link href="/dashboard/clientes" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
                Ver todos <ChevronRight size={12} color="var(--navy-500)"/>
              </Link>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {microProximas.map((m,i)=>{
                const cor = MICRODATA_COLORS[m.type||'outro']
                const ico = MICRODATA_ICONS[m.type||'outro']
                const nome = m.clients?.name || m.client_name || '—'
                const fone = m.clients?.phone || ''
                const waMsg = `Olá ${nome.split(' ')[0]}! ${m.type==='aniversario'?'🎂 Feliz aniversário!':'📅 Lembrando da data: '+m.description}`
                const waLink = fone ? `https://wa.me/55${fone.replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}` : null
                return (
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<microProximas.length-1?'1px solid var(--gray-100)':'none'}}>
                    <div style={{width:40,height:40,borderRadius:12,background:`${cor}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${cor}30`}}>
                      {ico}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nome}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{m.description||m.type} · {fmtDia(m.date)}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20,background:`${cor}15`,color:cor}}>
                        {m.diasRestantes===0?'Hoje!':m.diasRestantes===1?'Amanhã':`${m.diasRestantes}d`}
                      </span>
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noreferrer">
                          <button style={{padding:'4px 10px',borderRadius:7,border:'1px solid #D1FAE5',background:'#ECFDF5',color:'#059669',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                            <MessageSquare size={11} color="#059669"/> WA
                          </button>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Agenda de hoje */}
        <div style={{marginBottom:20}}>
          <div className="sec-hd">
            <span className="sec-title">Agenda de hoje</span>
            <Link href="/dashboard/agenda" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
              Ver tudo <ChevronRight size={12} color="var(--navy-500)"/>
            </Link>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading ? <div style={{padding:24,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>
            : apptHoje.length===0 ? <div style={{padding:24,textAlign:'center',color:'var(--muted)',fontSize:13}}>Nenhum agendamento para hoje.</div>
            : apptHoje.map((a,i)=>{
              const cfg = STATUS_CFG[a.status]||STATUS_CFG.agendado
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<apptHoje.length-1?'1px solid var(--gray-100)':'none'}}>
                  <div style={{minWidth:46,textAlign:'center',background:'var(--navy-50)',borderRadius:8,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--navy-600)'}}>{fmtHora(a.date)}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.client_name}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{a.service_name||'–'}{a.value?` · ${fmtR(a.value)}`:''}</div>
                  </div>
                  <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Próximos horários */}
        {apptProx.length>0 && (
          <div style={{marginBottom:20}}>
            <div className="sec-hd">
              <span className="sec-title">Próximos horários</span>
              <Link href="/dashboard/agenda" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
                Ver agenda <ChevronRight size={12} color="var(--navy-500)"/>
              </Link>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {apptProx.map((a,i)=>{
                const cfg=STATUS_CFG[a.status]||STATUS_CFG.agendado
                return (
                  <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<apptProx.length-1?'1px solid var(--gray-100)':'none'}}>
                    <div style={{minWidth:46,textAlign:'center',background:'var(--navy-50)',borderRadius:8,padding:'6px 4px'}}>
                      <div style={{fontSize:12,fontWeight:800,color:'var(--navy-600)'}}>{fmtHora(a.date)}</div>
                      <div style={{fontSize:9,color:'var(--muted)',fontWeight:600}}>{fmtDia(a.date)}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13}}>{a.client_name}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{a.service_name||'–'}</div>
                    </div>
                    <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Follow-up */}
        {followUps.length>0 && (
          <div>
            <div className="sec-hd">
              <span className="sec-title">Follow-up sugerido</span>
              <Link href="/dashboard/clientes" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
                Ver clientes <ChevronRight size={12} color="var(--navy-500)"/>
              </Link>
            </div>
            <div className="alert-warn" style={{alignItems:'flex-start',gap:10}}>
              <AlertCircle size={16} color="var(--warning)" style={{flexShrink:0,marginTop:1}}/>
              <span>{followUps.length} cliente{followUps.length>1?'s':''} sem visita recente. Envie uma mensagem!</span>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {followUps.map((c,i)=>{
                const dias=diasSemVisita(c.last_visit)
                const ini=c.name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
                const wa=c.phone?`https://wa.me/55${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${c.name.split(' ')[0]}! Sentimos sua falta. Que tal agendar um horário? 😊`)}`:null
                return (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<followUps.length-1?'1px solid var(--gray-100)':'none'}}>
                    <div style={{width:36,height:36,borderRadius:18,background:c.avatar_color||'var(--navy-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>{ini}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{dias!==null?`${dias} dias sem visita`:'Nunca visitou'}</div>
                    </div>
                    {wa&&<a href={wa} target="_blank" rel="noreferrer">
                      <button style={{padding:'5px 12px',background:'#ECFDF5',border:'1px solid #D1FAE5',borderRadius:8,color:'#059669',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                        <MessageSquare size={12} color="#059669"/> WhatsApp
                      </button>
                    </a>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
