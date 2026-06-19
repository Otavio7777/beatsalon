'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function BarChart({ data, max }) {
  const m = Math.max(...data.map(d=>d.v), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:80,marginTop:8}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
          <div style={{width:'100%',background:'#534AB7',borderRadius:'3px 3px 0 0',height:`${Math.max(d.v/m*100,3)}%`,opacity:i===data.length-1?1:.5,transition:'height .3s'}}/>
          <span style={{fontSize:8,color:'#8A87A0',fontWeight:600}}>{d.l}</span>
        </div>
      ))}
    </div>
  )
}

export default function FinanceiroPage() {
  const { salon, user, loading: sl } = useSalon()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [viewMode, setViewMode] = useState('resumo') // resumo | transacoes
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const now = new Date()
    let desde
    if (periodo==='semana') { desde = new Date(now); desde.setDate(desde.getDate()-7) }
    else if (periodo==='mes') { desde = new Date(now.getFullYear(),now.getMonth(),1) }
    else { desde = new Date(now.getFullYear(),0,1) }

    const { data } = await sb.from('appointments').select('*')
      .eq('salon_id',salon.id).gte('date',desde.toISOString()).order('date',{ascending:false})
    setAppts(data||[])
    setLoading(false)
  },[salon?.id, periodo])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const concluidos = appts.filter(a=>a.status==='concluido')
  const receita    = concluidos.reduce((s,a)=>s+(a.value||0),0)
  const ticket     = concluidos.length>0 ? receita/concluidos.length : 0
  const cancelados = appts.filter(a=>a.status==='cancelado').length
  const faltou     = appts.filter(a=>a.status==='faltou').length

  // Receita por serviço
  const porServico = {}
  concluidos.forEach(a=>{
    const k = a.service_name||'Sem serviço'
    if (!porServico[k]) porServico[k]={qtd:0,total:0}
    porServico[k].qtd++; porServico[k].total+=(a.value||0)
  })
  const topServicos = Object.entries(porServico).sort((a,b)=>b[1].total-a[1].total).slice(0,6)

  // Gráfico últimos 6 meses
  const now = new Date()
  const barData = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(),now.getMonth()-5+i,1)
    const v = concluidos.filter(a=>{
      const dt = new Date(a.date)
      return dt.getMonth()===d.getMonth()&&dt.getFullYear()===d.getFullYear()
    }).reduce((s,a)=>s+(a.value||0),0)
    return {l:MS[d.getMonth()],v}
  })

  // Por forma de pagamento (futuro) - por enquanto por status
  const fmtCur = v => `R$${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0})}`
  const fmtDt  = iso => { const d=new Date(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }

  const st = {
    page:   { padding:'16px', maxWidth:900 },
    h1:     { fontSize:22, fontWeight:800, color:'#1A1825' },
    sub:    { fontSize:12, color:'#8A87A0', marginTop:3, marginBottom:20 },
    periodRow:{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' },
    pBtn:   (a)=>({ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, border:`1px solid ${a?'#534AB7':'#E3E1F0'}`, background:a?'#534AB7':'#fff', color:a?'#fff':'#8A87A0', cursor:'pointer' }),
    grid2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 },
    grid4:  { display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:16 },
    mc:     { background:'#fff', borderRadius:14, padding:'14px', border:'1px solid #E3E1F0' },
    ml:     { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, marginBottom:4 },
    mv:     { fontSize:22, fontWeight:800 },
    md:     { fontSize:11, color:'#8A87A0', marginTop:3 },
    card:   { background:'#fff', borderRadius:16, padding:'16px', border:'1px solid #E3E1F0', marginBottom:12 },
    cardHd: { fontSize:15, fontWeight:800, marginBottom:4 },
    cardSb: { fontSize:12, color:'#8A87A0', marginBottom:12 },
    row:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #F2F1F8' },
    tabRow: { display:'flex', gap:6, marginBottom:16 },
    tabBtn: (a)=>({ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, border:`1px solid ${a?'#534AB7':'#E3E1F0'}`, background:a?'#EEEDFE':'#fff', color:a?'#534AB7':'#8A87A0', cursor:'pointer' }),
    trRow:  { display:'flex', gap:10, alignItems:'center', padding:'10px 0', borderBottom:'1px solid #F2F1F8' },
    trDot:  (s)=>{ const c={concluido:'#1D9E75',agendado:'#534AB7',cancelado:'#D85A30',faltou:'#BA7517'}; return {width:8,height:8,borderRadius:4,background:c[s]||'#8A87A0',flexShrink:0} },
    badge:  (s)=>{ const cfg={concluido:{bg:'#E1F5EE',c:'#085041'},agendado:{bg:'#E6F1FB',c:'#0C447C'},cancelado:{bg:'#FCEBEB',c:'#A32D2D'},faltou:{bg:'#FAEEDA',c:'#633806'}}; const x=cfg[s]||{bg:'#F0EFF8',c:'#8A87A0'}; return {fontSize:10,padding:'2px 8px',borderRadius:8,background:x.bg,color:x.c,fontWeight:700} },
  }

  if (sl) return <div style={{padding:40,textAlign:'center',color:'#8A87A0'}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-hd">
        <div style={st.h1}>💰 Gestão Financeira</div>
        <div style={st.sub}>Receitas e transações · {salon?.name}</div>
      </div>

      <div style={st.periodRow}>
        {[['semana','7 dias'],['mes','Este mês'],['ano','Este ano']].map(([k,l])=>(
          <button key={k} style={st.pBtn(periodo===k)} onClick={()=>setPeriodo(k)}>{l}</button>
        ))}
      </div>

      {/* KPIs */}
      <div style={st.grid4}>
        <div style={st.mc}><div style={st.ml}>Receita</div><div style={{...st.mv,color:'#1D9E75'}}>{fmtCur(receita)}</div><div style={st.md}>concluídos</div></div>
        <div style={st.mc}><div style={st.ml}>Atendimentos</div><div style={st.mv}>{concluidos.length}</div><div style={st.md}>realizados</div></div>
        <div style={st.mc}><div style={st.ml}>Ticket médio</div><div style={st.mv}>{fmtCur(ticket)}</div><div style={st.md}>por atendimento</div></div>
        <div style={st.mc}><div style={st.ml}>Não compareceu</div><div style={{...st.mv,color:'#D85A30'}}>{faltou}</div><div style={st.md}>cancelados: {cancelados}</div></div>
      </div>

      {/* Gráfico + top serviços */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div style={st.card}>
          <div style={st.cardHd}>Receita mensal</div>
          <div style={st.cardSb}>Últimos 6 meses</div>
          <BarChart data={barData} />
        </div>
        <div style={st.card}>
          <div style={st.cardHd}>Top serviços</div>
          <div style={st.cardSb}>Por receita no período</div>
          {topServicos.length===0 ? <div style={{color:'#8A87A0',fontSize:12,textAlign:'center',padding:16}}>Sem dados</div>
          : topServicos.map(([k,v],i)=>(
            <div key={k} style={st.row}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:10,fontWeight:800,color:'#534AB7',minWidth:16}}>#{i+1}</span>
                <span style={{fontSize:12,fontWeight:600}}>{k}</span>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1D9E75'}}>{fmtCur(v.total)}</div>
                <div style={{fontSize:10,color:'#8A87A0'}}>{v.qtd}x</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transações */}
      <div style={st.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={st.cardHd}>Transações</div>
            <div style={st.cardSb}>{appts.length} registros no período</div>
          </div>
          <div style={st.tabRow}>
            <button style={st.tabBtn(viewMode==='resumo')} onClick={()=>setViewMode('resumo')}>Resumo</button>
            <button style={st.tabBtn(viewMode==='transacoes')} onClick={()=>setViewMode('transacoes')}>Detalhado</button>
          </div>
        </div>

        {loading ? <div style={{textAlign:'center',color:'#8A87A0',padding:24}}>Carregando...</div>
        : appts.length===0 ? <div style={{textAlign:'center',color:'#8A87A0',padding:24}}>Nenhuma transação no período.</div>
        : viewMode==='transacoes' ? (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
              <thead style={{background:'#F2F1F8'}}>
                <tr>
                  {['Data/Hora','Cliente','Serviço','Valor','Status'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',fontSize:10,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',textAlign:'left'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appts.map(a=>(
                  <tr key={a.id} style={{borderBottom:'1px solid #F2F1F8'}}>
                    <td style={{padding:'10px 12px',fontSize:12,color:'#8A87A0'}}>{fmtDt(a.date)}</td>
                    <td style={{padding:'10px 12px',fontSize:13,fontWeight:600}}>{a.client_name}</td>
                    <td style={{padding:'10px 12px',fontSize:12}}>{a.service_name||'–'}</td>
                    <td style={{padding:'10px 12px',fontSize:13,fontWeight:700,color:a.status==='concluido'?'#1D9E75':'#8A87A0'}}>{a.value?fmtCur(a.value):'–'}</td>
                    <td style={{padding:'10px 12px'}}><span style={st.badge(a.status)}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              ['Agendado',    appts.filter(a=>a.status==='agendado'), '#E6F1FB','#0C447C'],
              ['Concluído',   concluidos,                             '#E1F5EE','#085041'],
              ['Cancelado',   appts.filter(a=>a.status==='cancelado'),'#FCEBEB','#A32D2D'],
              ['Faltou',      appts.filter(a=>a.status==='faltou'),  '#FAEEDA','#633806'],
            ].map(([label,list,bg,color])=>(
              <div key={label} style={{background:bg,borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:11,fontWeight:700,color,marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>{label}</div>
                <div style={{fontSize:22,fontWeight:800,color}}>{list.length}</div>
                <div style={{fontSize:13,fontWeight:700,color,marginTop:2,opacity:.8}}>
                  {fmtCur(list.reduce((s,a)=>s+(a.value||0),0))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
