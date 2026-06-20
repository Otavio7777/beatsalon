'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'

export default function SalaoDetalhe({ params }) {
  const { id } = params
  const [salon, setSalon]   = useState(null)
  const [clients, setClients] = useState([])
  const [appts,   setAppts]  = useState([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: cl }, { data: ap }] = await Promise.all([
        sb.from('salons').select('*').eq('id', id).single(),
        sb.from('clients').select('*').eq('salon_id', id).order('name'),
        sb.from('appointments').select('*').eq('salon_id', id).order('date', {ascending:false}).limit(20),
      ])
      setSalon(s); setClients(cl||[]); setAppts(ap||[])
      setLoading(false)
    }
    load()
  }, [id])

  const st = {
    h1:  { fontSize:22, fontWeight:800, color:'#fff', marginBottom:4 },
    sub: { fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:24 },
    card:{ background:'rgba(255,255,255,.04)', borderRadius:14, border:'1px solid rgba(255,255,255,.08)', padding:'20px', marginBottom:16 },
    cardH:{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:14 },
    grid3:{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 },
    kpi: { background:'rgba(255,255,255,.06)', borderRadius:10, padding:'14px' },
    kl:  { fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', fontWeight:700, marginBottom:4 },
    kv:  { fontSize:20, fontWeight:800, color:'#fff' },
    row: { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:13 },
    lbl: { color:'rgba(255,255,255,.4)' },
    val: { color:'rgba(255,255,255,.85)', fontWeight:600 },
    th:  { padding:'8px 14px', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,.06)' },
    td:  { padding:'10px 14px', fontSize:12, color:'rgba(255,255,255,.7)', borderBottom:'1px solid rgba(255,255,255,.04)' },
  }

  if (loading) return <div style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Carregando...</div>
  if (!salon)  return <div style={{color:'#fff',padding:40}}>Salão não encontrado. <Link href="/admin" style={{color:'#6EE7B7'}}>← Voltar</Link></div>

  const receita = appts.filter(a=>a.status==='concluido').reduce((s,a)=>s+(a.value||0),0)
  const STATUS_COLORS = { agendado:'#3B82F6',concluido:'#059669',cancelado:'#DC2626',faltou:'#D97706' }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Link href="/admin" style={{color:'rgba(255,255,255,.4)',fontSize:13,textDecoration:'none'}}>← Todos os salões</Link>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
        {salon.logo_url ? (
          <img src={salon.logo_url} alt="" style={{width:56,height:56,borderRadius:14,objectFit:'cover'}}/>
        ) : (
          <div style={{width:56,height:56,borderRadius:14,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#fff',fontWeight:800}}>
            {salon.name?.charAt(0)}
          </div>
        )}
        <div>
          <div style={st.h1}>{salon.name}</div>
          <div style={st.sub}>{salon.city||'Sem cidade cadastrada'} · Plano: {salon.plan||'trial'}</div>
        </div>
      </div>
      <div style={st.grid3}>
        <div style={st.kpi}><div style={st.kl}>Clientes</div><div style={st.kv}>{clients.length}</div></div>
        <div style={st.kpi}><div style={st.kl}>Agendamentos</div><div style={st.kv}>{appts.length}</div></div>
        <div style={st.kpi}><div style={st.kl}>Receita</div><div style={{...st.kv,color:'#6EE7B7'}}>R${receita.toLocaleString('pt-BR')}</div></div>
      </div>
      <div style={st.card}>
        <div style={st.cardH}>Dados cadastrais</div>
        {[['ID do Salão',salon.id],['Nome',salon.name],['Telefone',salon.phone||'—'],['Endereço',salon.address?`${salon.address}, ${salon.city||''}`:'—'],['Descrição',salon.description||'—'],['Instagram',salon.instagram||'—'],['Plano',salon.plan||'trial'],['Criado em',salon.created_at?new Date(salon.created_at).toLocaleDateString('pt-BR'):'—']].map(([k,v])=>(
          <div key={k} style={st.row}><span style={st.lbl}>{k}</span><span style={{...st.val,maxWidth:'65%',textAlign:'right',wordBreak:'break-all',fontSize:12}}>{v}</span></div>
        ))}
      </div>
      <div style={st.card}>
        <div style={st.cardH}>Últimos 10 agendamentos</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Cliente','Serviço','Data','Valor','Status'].map(h=><th key={h} style={st.th}>{h}</th>)}</tr></thead>
          <tbody>
            {appts.slice(0,10).map(a=>{
              const dt=a.date?new Date(a.date):null
              return (
                <tr key={a.id}>
                  <td style={st.td}>{a.client_name}</td>
                  <td style={st.td}>{a.service_name||'—'}</td>
                  <td style={st.td}>{dt?`${dt.getDate()}/${dt.getMonth()+1} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`:'—'}</td>
                  <td style={{...st.td,color:'#6EE7B7',fontWeight:700}}>{a.value?`R$${a.value}`:'—'}</td>
                  <td style={st.td}><span style={{color:STATUS_COLORS[a.status]||'#aaa',fontWeight:600}}>{a.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
