'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import Link from 'next/link'
import { todayBRT } from '../../../lib/timezone'

/* ── Sistema de Níveis CRM ── */
const NIVEIS = {
  novo:     { label:'Novo',     icon:'🌱', cor:'#475569', bg:'#F8FAFC', bd:'#CBD5E1' },
  bronze:   { label:'Bronze',   icon:'🥉', cor:'#92400E', bg:'#FEF7ED', bd:'#FCD34D' },
  prata:    { label:'Prata',    icon:'🥈', cor:'#334155', bg:'#F1F5F9', bd:'#94A3B8' },
  ouro:     { label:'Ouro',     icon:'🥇', cor:'#92400E', bg:'#FFFBEB', bd:'#F59E0B' },
  diamante: { label:'Diamante', icon:'💎', cor:'#5B21B6', bg:'#F5F3FF', bd:'#A78BFA' },
  em_risco: { label:'Em risco', icon:'⚠️', cor:'#B91C1C', bg:'#FEF2F2', bd:'#FCA5A5' },
}

function calcNivel(c) {
  const visits = c.visit_count || 0
  const ltv    = parseFloat(c.ltv) || 0
  const last   = c.last_visit
  const dias   = last ? Math.floor((Date.now()-new Date(last+'T00:00').getTime())/864e5) : null
  if (visits > 0 && dias !== null && dias > 45) return 'em_risco'
  if (visits === 0) return 'novo'
  if (visits >= 16 || ltv >= 1000) return 'diamante'
  if (visits >= 9  || ltv >= 500)  return 'ouro'
  if (visits >= 4  || ltv >= 200)  return 'prata'
  return 'bronze'
}

function diasSV(last) {
  if (!last) return null
  return Math.floor((Date.now()-new Date(last+'T00:00').getTime())/864e5)
}

function Avatar({ name='?', color='#1B3057', size=38 }) {
  const ini = name.trim().split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?'
  return <div style={{width:size,height:size,borderRadius:size/2,background:color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.33,fontWeight:800,flexShrink:0,userSelect:'none'}}>{ini}</div>
}

function ClienteModal({ salonId, cliente, onClose, onSaved }) {
  const [f, setF] = useState({ name:'', phone:'', email:'', birth_date:'', status:'ativo', preferred_cut:'', allergies:'', notes_internal:'', avatar_color:'#1B3057', ...cliente })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const save = async () => {
    if (!f.name.trim()) return
    setSaving(true)
    const pay = {...f, salon_id:salonId}
    const {error} = cliente?.id
      ? await sb.from('clients').update(pay).eq('id',cliente.id)
      : await sb.from('clients').insert(pay)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }
  const CORES = ['#1B3057','#059669','#DC2626','#D97706','#7C3AED','#0891B2','#BE185D','#374151']
  const S = { inp:{width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',boxSizing:'border-box',background:'#fff',color:'#0B1E3D',fontFamily:'inherit'},
               lbl:{display:'block',fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4,marginTop:12} }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{width:40,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 20px'}}/>
        <div style={{fontSize:17,fontWeight:800,color:'#0B1E3D',marginBottom:12}}>{cliente?.id?'Editar cliente':'Novo cliente'}</div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <Avatar name={f.name||'?'} color={f.avatar_color||'#1B3057'} size={44}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {CORES.map(c=><div key={c} onClick={()=>set('avatar_color',c)} style={{width:22,height:22,borderRadius:11,background:c,cursor:'pointer',border:f.avatar_color===c?'3px solid #0B1E3D':'2px solid transparent',boxShadow:f.avatar_color===c?'0 0 0 1px #fff inset':'none'}}/>)}
          </div>
        </div>
        <label style={S.lbl}>Nome *</label>
        <input style={S.inp} placeholder="Nome completo" value={f.name} onChange={e=>set('name',e.target.value)}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={S.lbl}>WhatsApp</label><input style={S.inp} placeholder="(31) 99999-0000" value={f.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
          <div><label style={S.lbl}>Aniversário</label><input type="date" style={S.inp} value={f.birth_date||''} onChange={e=>set('birth_date',e.target.value)}/></div>
        </div>
        <label style={S.lbl}>Tipo de corte preferido</label>
        <input style={S.inp} placeholder="Ex: degradê na lateral..." value={f.preferred_cut||''} onChange={e=>set('preferred_cut',e.target.value)}/>
        <label style={S.lbl}>Alergias / Restrições</label>
        <input style={S.inp} placeholder="Ex: alergia a amônia..." value={f.allergies||''} onChange={e=>set('allergies',e.target.value)}/>
        <label style={S.lbl}>Notas internas</label>
        <textarea style={{...S.inp,resize:'none',minHeight:60}} placeholder="Obs para a equipe..." value={f.notes_internal||''} onChange={e=>set('notes_internal',e.target.value)}/>
        <div style={{display:'flex',gap:8,marginTop:18}}>
          <button onClick={save} disabled={saving||!f.name.trim()} style={{flex:1,padding:'13px',borderRadius:11,border:'none',background:saving||!f.name.trim()?'#E2E8F0':'#0B1E3D',color:saving||!f.name.trim()?'#94A3B8':'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
            {saving?'Salvando...':cliente?.id?'Salvar':'Adicionar'}
          </button>
          <button onClick={onClose} style={{padding:'13px 18px',borderRadius:11,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:13,cursor:'pointer'}}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const { salon } = useSalon()
  const [clientes, setClientes] = useState([])
  const [barbers,  setBarbers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filtroN,  setFiltroN]  = useState('todos')
  const [modal,    setModal]    = useState(null)
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const [{data:cl}, {data:ap}, {data:br}] = await Promise.all([
      sb.from('clients').select('*').eq('salon_id',salon.id).order('name'),
      sb.from('appointments').select('client_id,status,value,date').eq('salon_id',salon.id),
      sb.from('barbers').select('id,name,color').eq('salon_id',salon.id).eq('active',true),
    ])
    setBarbers(br||[])
    const apMap = {}
    ;(ap||[]).forEach(a => {
      if (!a.client_id) return
      if (!apMap[a.client_id]) apMap[a.client_id] = {visitas:0, ltv:0}
      if (a.status==='concluido') { apMap[a.client_id].visitas++; apMap[a.client_id].ltv+=(a.value||0) }
    })
    setClientes((cl||[]).map(c=>({
      ...c,
      visit_count: c.visit_count || apMap[c.id]?.visitas || 0,
      ltv: c.ltv || apMap[c.id]?.ltv || 0,
    })))
    setLoading(false)
  }, [salon?.id])

  useEffect(()=>{ load() },[load])

  const filtered = clientes.filter(c => {
    const mBusca = !search || (c.name||'').toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search)
    const mNivel = filtroN==='todos' || calcNivel(c)===filtroN
    return mBusca && mNivel
  })

  // Contagens por nível
  const cnts = { todos:clientes.length }
  clientes.forEach(c => { const k=calcNivel(c); cnts[k]=(cnts[k]||0)+1 })

  // Totais gerais
  const totalLTV    = clientes.reduce((s,c)=>s+(parseFloat(c.ltv)||0),0)
  const totalVis    = clientes.reduce((s,c)=>s+(c.visit_count||0),0)
  const emRiscoN    = cnts.em_risco||0
  const ticketMedio = totalVis>0 ? totalLTV/totalVis : 0

  return (
    <div className="pg">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div className="pg-h1">CRM · Clientes</div>
          <div className="pg-sub">{clientes.length} cadastrados · {salon?.name}</div>
        </div>
        <button onClick={()=>setModal('new')} className="btn-primary">+ Novo cliente</button>
      </div>

      {/* KPIs principais */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[
          {l:'Total de clientes', v:clientes.length, c:'#0B1E3D'},
          {l:'LTV acumulado',     v:`R$${totalLTV.toLocaleString('pt-BR',{maximumFractionDigits:0})}`, c:'#059669'},
          {l:'Ticket médio',      v:`R$${ticketMedio.toLocaleString('pt-BR',{maximumFractionDigits:0})}`, c:'#2451A0'},
          {l:'Em risco',          v:emRiscoN, c:'#DC2626'},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:9,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Níveis — chips horizontais clicáveis */}
      <div style={{overflowX:'auto',paddingBottom:6,marginBottom:14}}>
        <div style={{display:'flex',gap:6,minWidth:'max-content'}}>
          <button onClick={()=>setFiltroN('todos')}
            style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${filtroN==='todos'?'#0B1E3D':'#E2E8F0'}`,background:filtroN==='todos'?'#0B1E3D':'#fff',color:filtroN==='todos'?'#fff':'#64748B',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            Todos ({clientes.length})
          </button>
          {Object.entries(NIVEIS).map(([k,{label,icon,cor,bg,bd}])=>(
            <button key={k} onClick={()=>setFiltroN(filtroN===k?'todos':k)}
              style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${filtroN===k?cor:bd}`,background:filtroN===k?bg:'#fff',color:filtroN===k?cor:'#64748B',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>
              {icon} {label} {cnts[k]?`(${cnts[k]})`:'(0)'}
            </button>
          ))}
        </div>
      </div>

      {/* Busca */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 12px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',minHeight:42,marginBottom:14}}>
        <svg width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
          style={{flex:1,border:'none',outline:'none',fontSize:13,color:'#0B1E3D',background:'transparent'}}/>
        {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8',fontSize:16}}>×</button>}
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:40,textAlign:'center',color:'#94A3B8',fontSize:13}}>Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:40,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:10}}>👥</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0B1E3D',marginBottom:6}}>{search||filtroN!=='todos'?'Nenhum cliente encontrado':'Sem clientes cadastrados'}</div>
          <div style={{fontSize:12,color:'#64748B',marginBottom:14}}>{search?'Tente buscar por outro nome.':filtroN!=='todos'?`Nenhum cliente no nível ${NIVEIS[filtroN]?.label}.`:'Adicione o primeiro cliente.'}</div>
          {!search&&filtroN==='todos'&&<button onClick={()=>setModal('new')} className="btn-primary">+ Novo cliente</button>}
        </div>
      ) : (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden'}}>
          {filtered.map((c,i) => {
            const nKey   = calcNivel(c)
            const nivel  = NIVEIS[nKey]
            const phone  = (c.phone||'').replace(/\D/g,'')
            const dSV    = diasSV(c.last_visit)
            const barber = barbers.find(b=>b.id===c.last_barber_id)
            const visits = c.visit_count || 0
            const ltv    = parseFloat(c.ltv)||0
            return (
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderBottom:i<filtered.length-1?'1px solid #F1F5F9':'none'}}>
                {/* Avatar */}
                <Avatar name={c.name} color={c.avatar_color||'#1B3057'} size={40}/>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontWeight:800,fontSize:14,color:'#0B1E3D'}}>{c.name}</span>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:700,background:nivel.bg,color:nivel.cor,border:`1px solid ${nivel.bd}`}}>
                      {nivel.icon} {nivel.label}
                    </span>
                    {barber&&<span style={{fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:700,background:barber.color||'#1B3057',color:'#fff'}}>✂️ {barber.name?.split(' ')[0]}</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748B',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                    {c.phone&&<span>📱 {c.phone}</span>}
                    <span style={{fontWeight:700,color:'#2451A0'}}>{visits} visita{visits!==1?'s':''}</span>
                    {ltv>0&&<span style={{color:'#059669',fontWeight:700}}>R${ltv.toLocaleString('pt-BR',{maximumFractionDigits:0})}</span>}
                    {dSV!==null&&<span style={{color:dSV>45?'#DC2626':dSV>30?'#D97706':'#94A3B8'}}>{dSV}d</span>}
                  </div>
                  {(c.preferred_cut||c.allergies)&&(
                    <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>
                      {c.preferred_cut&&<span style={{marginRight:8}}>✂️ {c.preferred_cut.slice(0,30)}</span>}
                      {c.allergies&&<span style={{color:'#D97706'}}>⚠️ {c.allergies.slice(0,20)}</span>}
                    </div>
                  )}
                </div>
                {/* Ações */}
                <div style={{display:'flex',gap:5,flexShrink:0}}>
                  {phone&&<a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer"
                    style={{width:32,height:32,borderRadius:16,background:'#ECFDF5',border:'1px solid #6EE7B7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none'}}>💬</a>}
                  <Link href={`/dashboard/clientes/${c.id}`}
                    style={{width:32,height:32,borderRadius:16,background:'#EFF6FF',border:'1px solid #93C5FD',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',fontSize:13,color:'#2451A0',fontWeight:700}}>→</Link>
                  <button onClick={()=>setModal(c)}
                    style={{width:32,height:32,borderRadius:16,background:'#F8FAFC',border:'1px solid #E2E8F0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>✏️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal&&<ClienteModal salonId={salon?.id} cliente={modal==='new'?null:modal} onClose={()=>setModal(null)} onSaved={load}/>}
    </div>
  )
}
