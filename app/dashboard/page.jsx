'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase'
import { useSalon } from '../../lib/useSalon'
import { Calendar, Users, DollarSign, Scissors, MessageSquare, AlertCircle, CheckCircle, ChevronRight } from '../../lib/icons'

const STATUS_CFG = {
  agendado:  { bg: 'var(--navy-100)', color: 'var(--navy-700)', label: 'Agendado' },
  concluido: { bg: 'var(--success-light)', color: 'var(--success)', label: 'Concluído' },
  cancelado: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'Cancelado' },
  faltou:    { bg: 'var(--warning-light)', color: 'var(--warning)', label: 'Faltou' },
}
const MESES_S = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function today() { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()) }
function fmtHora(iso) { return iso?.slice(11,16)||'' }
function fmtDia(iso) { if(!iso) return ''; const d=new Date(iso); return `${d.getDate()} ${MESES_S[d.getMonth()]}` }
function diasSemVisita(last) { if(!last) return null; return Math.floor((Date.now()-new Date(last).getTime())/(86400000)) }

export default function DashboardHome() {
  const { salon, user, loading: sl } = useSalon()
  const [appts, setAppts]   = useState([])
  const [clients, setClients] = useState([])
  const [stats, setStats]   = useState({ hoje:0, semana:0, receitaHoje:0, receitaMes:0 })
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const now = today()
    const in7 = new Date(now); in7.setDate(in7.getDate()+7)
    const mesIni = new Date(now.getFullYear(),now.getMonth(),1).toISOString()

    const [{ data: ap }, { data: cl }, { data: mes }] = await Promise.all([
      sb.from('appointments').select('*').eq('salon_id',salon.id)
        .gte('date', now.toISOString()).lte('date', in7.toISOString()).order('date'),
      sb.from('clients').select('id,name,phone,last_visit,status,avatar_color').eq('salon_id',salon.id).order('name'),
      sb.from('appointments').select('value,date').eq('salon_id',salon.id)
        .eq('status','concluido').gte('date',mesIni),
    ])
    const todayStr = now.toISOString().slice(0,10)
    setAppts(ap||[])
    setClients(cl||[])
    setStats({
      hoje:   (ap||[]).filter(a=>a.date?.startsWith(todayStr)).length,
      semana: (ap||[]).length,
      receitaHoje: (ap||[]).filter(a=>a.status==='concluido'&&a.date?.startsWith(todayStr)).reduce((s,a)=>s+(a.value||0),0),
      receitaMes:  (mes||[]).reduce((s,a)=>s+(a.value||0),0),
    })
    setLoading(false)
  }, [salon?.id])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const todayStr = today().toISOString().slice(0,10)
  const apptHoje = appts.filter(a=>a.date?.startsWith(todayStr))
  const apptProx = appts.filter(a=>!a.date?.startsWith(todayStr)).slice(0,5)
  const followUps = clients.filter(c=>{
    const dias = diasSemVisita(c.last_visit)
    return c.status==='inativo' || (dias!==null && dias>=30)
  }).slice(0,4)

  const hora = new Date().getHours()
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite'

  if (sl) return <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  const fmtR = v => `R$${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0})}`

  return (
    <div style={{padding:0}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-700) 100%)',padding:'24px 20px 28px',color:'#fff'}}>
        <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>{saudacao}</div>
        <div style={{fontSize:13,opacity:.55,marginBottom:20}}>
          {salon?.name} · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            ['Hoje', stats.hoje, 'agendamentos'],
            ['Receita hoje', fmtR(stats.receitaHoje), 'concluídos'],
            ['Próx. 7 dias', stats.semana, 'agendamentos'],
            ['Receita mês', fmtR(stats.receitaMes), 'acumulado'],
          ].map(([l,v,d])=>(
            <div key={l} style={{background:'rgba(255,255,255,.1)',borderRadius:12,padding:'12px 14px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:10,opacity:.55,textTransform:'uppercase',letterSpacing:'.6px',fontWeight:700,marginBottom:4}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:l.includes('Receita')?'#93E4C1':'#fff'}}>{v}</div>
              <div style={{fontSize:10,opacity:.45,marginTop:2}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="quick-actions">
        {[
          {href:'/dashboard/agenda',    Icon:Calendar,   label:'Agendar'},
          {href:'/dashboard/clientes',  Icon:Users,      label:'Clientes'},
          {href:'/dashboard/financeiro',Icon:DollarSign, label:'Financeiro'},
          {href:'/dashboard/servicos',  Icon:Scissors,   label:'Serviços'},
        ].map(({href,Icon,label})=>(
          <Link key={href} href={href} className="quick-btn">
            <div className="quick-btn-icon"><Icon size={18} /></div>
            <span className="quick-btn-label">{label}</span>
          </Link>
        ))}
      </div>

      <div style={{padding:'0 16px 16px'}}>

        {/* Agenda de hoje */}
        <div style={{marginBottom:20}}>
          <div className="sec-hd">
            <span className="sec-title">Agenda de hoje</span>
            <Link href="/dashboard/agenda" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
              Ver tudo <ChevronRight size={12} color="var(--navy-500)" />
            </Link>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading ? (
              <div style={{padding:'24px',textAlign:'center',color:'var(--muted)'}}>Carregando...</div>
            ) : apptHoje.length===0 ? (
              <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:13}}>Nenhum agendamento para hoje.</div>
            ) : apptHoje.map((a,i)=>{
              const cfg = STATUS_CFG[a.status]||STATUS_CFG.agendado
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<apptHoje.length-1?'1px solid var(--gray-100)':'none'}}>
                  <div style={{minWidth:46,textAlign:'center',background:'var(--navy-50)',borderRadius:8,padding:'6px 4px'}}>
                    <div style={{fontSize:14,fontWeight:800,color:'var(--navy-600)'}}>{fmtHora(a.date)}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.client_name}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{a.service_name||'–'}{a.value?` · ${fmtR(a.value)}`:''}</div>
                  </div>
                  <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Próximos */}
        {apptProx.length>0 && (
          <div style={{marginBottom:20}}>
            <div className="sec-hd">
              <span className="sec-title">Próximos horários</span>
              <Link href="/dashboard/agenda" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
                Ver agenda <ChevronRight size={12} color="var(--navy-500)" />
              </Link>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {apptProx.map((a,i)=>{
                const cfg = STATUS_CFG[a.status]||STATUS_CFG.agendado
                return (
                  <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<apptProx.length-1?'1px solid var(--gray-100)':'none'}}>
                    <div style={{minWidth:46,textAlign:'center',background:'var(--navy-50)',borderRadius:8,padding:'6px 4px'}}>
                      <div style={{fontSize:13,fontWeight:800,color:'var(--navy-600)'}}>{fmtHora(a.date)}</div>
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
              <span className="sec-title">Sugestões de follow-up</span>
              <Link href="/dashboard/clientes" className="sec-link" style={{display:'flex',alignItems:'center',gap:4}}>
                Ver clientes <ChevronRight size={12} color="var(--navy-500)" />
              </Link>
            </div>
            <div className="alert-warn" style={{alignItems:'flex-start',gap:10}}>
              <AlertCircle size={16} color="var(--warning)" style={{flexShrink:0,marginTop:1}} />
              <span>{followUps.length} cliente{followUps.length>1?'s':''} sem visita recente. Hora de um contato!</span>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {followUps.map((c,i)=>{
                const dias = diasSemVisita(c.last_visit)
                const ini  = c.name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
                const wa   = c.phone ? `https://wa.me/55${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${c.name.split(' ')[0]}! Tudo bem? Faz um tempinho que não te vejo. Que tal agendarmos um horário? 😊`)}` : null
                return (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<followUps.length-1?'1px solid var(--gray-100)':'none'}}>
                    <div style={{width:36,height:36,borderRadius:18,background:c.avatar_color||'var(--navy-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>{ini}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{dias!==null?`${dias} dias sem visita`:'Nunca visitou'}</div>
                    </div>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer">
                        <button className="btn-success" style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                          <MessageSquare size={12} /> WhatsApp
                        </button>
                      </a>
                    )}
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
