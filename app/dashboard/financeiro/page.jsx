'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import { TrendingUp, Users, BarChart, CheckCircle } from '../../../lib/icons'

const MS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmtR = v => `R$${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0})}`
const fmtDt = iso => { const d=new Date(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }

function MiniBar({ data }) {
  const max = Math.max(...data.map(d=>d.v),1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:72,marginTop:10}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',background:i===data.length-1?'var(--navy-600)':'var(--navy-200)',borderRadius:'3px 3px 0 0',height:`${Math.max(d.v/max*100,3)}%`,transition:'height .3s'}}/>
          <span style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>{d.l}</span>
        </div>
      ))}
    </div>
  )
}

const STATUS_LABEL = { agendado:'Agendado',concluido:'Concluído',cancelado:'Cancelado',faltou:'Faltou' }
const STATUS_CLASS = { agendado:'badge-blue',concluido:'badge-green',cancelado:'badge-red',faltou:'badge-yellow' }

export default function FinanceiroPage() {
  const { salon, user, loading: sl } = useSalon()
  const [appts, setAppts]     = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [tab, setTab]         = useState('receitas') // receitas | relatorio
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const now = new Date()
    let desde
    if (periodo==='semana')    { desde = new Date(now); desde.setDate(desde.getDate()-7) }
    else if (periodo==='mes')  { desde = new Date(now.getFullYear(),now.getMonth(),1) }
    else                       { desde = new Date(now.getFullYear(),0,1) }

    const [{ data: ap }, { data: cl }] = await Promise.all([
      sb.from('appointments').select('*').eq('salon_id',salon.id).gte('date',desde.toISOString()).order('date',{ascending:false}),
      sb.from('clients').select('*').eq('salon_id',salon.id).order('name'),
    ])
    setAppts(ap||[])
    setClients(cl||[])
    setLoading(false)
  },[salon?.id, periodo])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const conc    = appts.filter(a=>a.status==='concluido')
  const receita = conc.reduce((s,a)=>s+(a.value||0),0)
  const ticket  = conc.length>0 ? receita/conc.length : 0
  const canc    = appts.filter(a=>a.status==='cancelado').length
  const faltou  = appts.filter(a=>a.status==='faltou').length

  const porSvc = {}
  conc.forEach(a=>{ const k=a.service_name||'Sem nome'; if(!porSvc[k]) porSvc[k]={n:0,t:0}; porSvc[k].n++; porSvc[k].t+=(a.value||0) })
  const topSvc = Object.entries(porSvc).sort((a,b)=>b[1].t-a[1].t).slice(0,5)

  const now = new Date()
  const barData = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(),now.getMonth()-5+i,1)
    const v = conc.filter(a=>{ const dt=new Date(a.date); return dt.getMonth()===d.getMonth()&&dt.getFullYear()===d.getFullYear() }).reduce((s,a)=>s+(a.value||0),0)
    return {l:MS[d.getMonth()],v}
  })

  // Relatório: canal captação, retenção, top clientes
  const canalMap = {}
  clients.forEach(c=>{ const k=c.canal||'outro'; canalMap[k]=(canalMap[k]||0)+1 })
  const canais = Object.entries(canalMap).sort((a,b)=>b[1]-a[1])

  const topClientes = [...clients].filter(c=>c.ltv>0).sort((a,b)=>b.ltv-a.ltv).slice(0,5)
  const ativos   = clients.filter(c=>c.status==='ativo').length
  const emRisco  = clients.filter(c=>c.status==='em_risco').length
  const inativos = clients.filter(c=>c.status==='inativo').length
  const retencao = clients.length>0 ? Math.round(clients.filter(c=>c.visit_count>1).length/clients.length*100) : 0

  if (sl) return <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Financeiro &amp; Relatórios</div>
        <div className="pg-sub">Gestão financeira e análise · {salon?.name}</div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab==='receitas'?' active':''}`} onClick={()=>setTab('receitas')}>Receitas</button>
        <button className={`tab-btn${tab==='relatorio'?' active':''}`} onClick={()=>setTab('relatorio')}>Relatórios</button>
      </div>

      {/* Filtro período */}
      <div className="period-row">
        {[['semana','7 dias'],['mes','Este mês'],['ano','Este ano']].map(([k,l])=>(
          <button key={k} className={`period-btn${periodo===k?' active':''}`} onClick={()=>setPeriodo(k)}>{l}</button>
        ))}
      </div>

      {/* ── ABA RECEITAS ── */}
      {tab==='receitas' && (
        <>
          <div className="grid-4" style={{marginBottom:16}}>
            <div className="mc">
              <div className="mc-label">Receita</div>
              <div className="mc-value" style={{color:'var(--success)'}}>{fmtR(receita)}</div>
              <div className="mc-desc">concluídos</div>
            </div>
            <div className="mc">
              <div className="mc-label">Atendimentos</div>
              <div className="mc-value">{conc.length}</div>
              <div className="mc-desc">realizados</div>
            </div>
            <div className="mc">
              <div className="mc-label">Ticket médio</div>
              <div className="mc-value">{fmtR(ticket)}</div>
              <div className="mc-desc">por atendimento</div>
            </div>
            <div className="mc">
              <div className="mc-label">Não compareceu</div>
              <div className="mc-value" style={{color:'var(--danger)'}}>{faltou}</div>
              <div className="mc-desc">cancelados: {canc}</div>
            </div>
          </div>

          <div className="cols-2">
            <div className="card">
              <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Receita mensal</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>Últimos 6 meses</div>
              <MiniBar data={barData} />
            </div>
            <div className="card">
              <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Top serviços</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Por receita no período</div>
              {topSvc.length===0 ? (
                <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:'16px 0'}}>Sem dados</div>
              ) : topSvc.map(([k,v],i)=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:10,fontWeight:800,color:'var(--navy-500)',minWidth:18}}>#{i+1}</span>
                    <span style={{fontSize:13,fontWeight:600}}>{k}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--success)'}}>{fmtR(v.t)}</div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>{v.n}x</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transações */}
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Transações</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{appts.length} registros no período</div>
            {loading ? (
              <div style={{textAlign:'center',color:'var(--muted)',padding:24}}>Carregando...</div>
            ) : appts.length===0 ? (
              <div style={{textAlign:'center',color:'var(--muted)',padding:24}}>Nenhuma transação no período.</div>
            ) : (
              <div className="tbl-wrap" style={{borderRadius:'var(--radius)',border:'none'}}>
                <table>
                  <thead>
                    <tr>
                      {['Data','Cliente','Serviço','Valor','Status'].map(h=>(
                        <th key={h} className="tbl-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appts.slice(0,30).map(a=>(
                      <tr key={a.id} className="tbl-tr">
                        <td className="tbl-td" style={{color:'var(--muted)'}}>{fmtDt(a.date)}</td>
                        <td className="tbl-td" style={{fontWeight:600}}>{a.client_name}</td>
                        <td className="tbl-td">{a.service_name||'–'}</td>
                        <td className="tbl-td" style={{fontWeight:700,color:a.status==='concluido'?'var(--success)':'var(--muted)'}}>{a.value?fmtR(a.value):'–'}</td>
                        <td className="tbl-td"><span className={`badge ${STATUS_CLASS[a.status]||'badge-gray'}`}>{STATUS_LABEL[a.status]||a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ABA RELATÓRIOS ── */}
      {tab==='relatorio' && (
        <>
          <div className="grid-4" style={{marginBottom:16}}>
            <div className="mc"><div className="mc-label">Total clientes</div><div className="mc-value">{clients.length}</div><div className="mc-desc">cadastrados</div></div>
            <div className="mc"><div className="mc-label">Ativos</div><div className="mc-value" style={{color:'var(--success)'}}>{ativos}</div><div className="mc-desc">visitaram recente</div></div>
            <div className="mc"><div className="mc-label">Em risco</div><div className="mc-value" style={{color:'var(--warning)'}}>{emRisco}</div><div className="mc-desc">sem visita recente</div></div>
            <div className="mc"><div className="mc-label">Retenção</div><div className="mc-value" style={{color:'var(--navy-600)'}}>{retencao}%</div><div className="mc-desc">2+ visitas</div></div>
          </div>

          <div className="cols-2">
            {/* Top clientes por LTV */}
            <div className="card">
              <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Top clientes por LTV</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Maior valor acumulado</div>
              {topClientes.length===0 ? (
                <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:16}}>Sem dados ainda</div>
              ) : topClientes.map((c,i)=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <div style={{width:32,height:32,borderRadius:16,background:c.avatar_color||'var(--navy-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>{c.visit_count||0} visitas</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--success)'}}>{fmtR(c.ltv||0)}</div>
                    <div style={{fontSize:9,color:'var(--muted)'}}>#{i+1}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Canal de captação */}
            <div className="card">
              <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Canal de captação</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Origem dos clientes</div>
              {canais.length===0 ? (
                <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:16}}>Sem dados</div>
              ) : canais.map(([canal,count])=>{
                const pct = clients.length>0 ? Math.round(count/clients.length*100) : 0
                const icons = {instagram:'📸',google:'🔍',indicacao:'🤝',whatsapp:'💬',agendamento_online:'🔗',outro:'⭐'}
                return (
                  <div key={canal} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,marginBottom:4}}>
                      <span>{icons[canal]||'⭐'} {canal}</span>
                      <span style={{color:'var(--navy-600)'}}>{count} ({pct}%)</span>
                    </div>
                    <div style={{height:6,background:'var(--gray-100)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'var(--navy-500)',borderRadius:3,transition:'width .3s'}}/>
                    </div>
                  </div>
                )
              })}
              <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Saúde da base</div>
                {[['Ativos',ativos,'var(--success)','var(--success-light)'],['Em risco',emRisco,'var(--warning)','var(--warning-light)'],['Inativos',inativos,'var(--muted)','var(--gray-100)']].map(([l,v,c,bg])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0'}}>
                    <span style={{fontSize:12,fontWeight:600}}>{l}</span>
                    <span className="badge" style={{background:bg,color:c}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Atendimentos por mês */}
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Atendimentos por mês</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Últimos 6 meses (concluídos)</div>
            {(() => {
              const n = new Date()
              const data = Array.from({length:6},(_,i)=>{
                const d = new Date(n.getFullYear(),n.getMonth()-5+i,1)
                const v = conc.filter(a=>{ const dt=new Date(a.date); return dt.getMonth()===d.getMonth()&&dt.getFullYear()===d.getFullYear() }).length
                return {l:MS[d.getMonth()],v}
              })
              const max = Math.max(...data.map(d=>d.v),1)
              return (
                <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80}}>
                  {data.map((d,i)=>(
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                      <div style={{fontSize:10,color:'var(--muted)',fontWeight:600}}>{d.v||''}</div>
                      <div style={{width:'100%',background:i===data.length-1?'var(--navy-600)':'var(--navy-200)',borderRadius:'3px 3px 0 0',height:`${Math.max(d.v/max*100,3)}%`,transition:'height .3s'}}/>
                      <span style={{fontSize:8,color:'var(--muted)',fontWeight:600}}>{d.l}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
