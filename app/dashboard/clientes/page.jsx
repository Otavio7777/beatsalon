'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import Link from 'next/link'

const STATUS_CFG = {
  ativo:    { bg:'#D1FAE5', color:'#065F46', label:'Ativo',    bd:'#6EE7B7' },
  em_risco: { bg:'#FEF3C7', color:'#92400E', label:'Em risco', bd:'#FCD34D' },
  inativo:  { bg:'#F1F5F9', color:'#64748B', label:'Inativo',  bd:'#CBD5E1' },
}

function dias(last) {
  if (!last) return null
  return Math.floor((Date.now()-new Date(last+'T00:00').getTime())/86400000)
}

function Avatar({ name, color='#1B3057', size=38 }) {
  const ini = (name||'?').trim().split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?'
  return (
    <div style={{width:size,height:size,borderRadius:size/2,background:color,color:'#fff',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*.33,fontWeight:800,flexShrink:0,userSelect:'none'}}>
      {ini}
    </div>
  )
}

function NovoClienteModal({ salonId, cliente, onClose, onSaved }) {
  const [f, setF] = useState({
    name:'', phone:'', email:'', birth_date:'', canal:'', status:'ativo',
    preferred_cut:'', allergies:'', notes_internal:'', avatar_color:'#1B3057',
    ...cliente,
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const save = async () => {
    if (!f.name.trim()) return
    setSaving(true)
    const payload = {...f, salon_id:salonId}
    const { error } = cliente?.id
      ? await sb.from('clients').update(payload).eq('id',cliente.id)
      : await sb.from('clients').insert(payload)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  const CORES = ['#1B3057','#059669','#DC2626','#D97706','#7C3AED','#0891B2','#BE185D','#374151']
  const INP = {width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',boxSizing:'border-box',background:'#fff',color:'#0B1E3D',fontFamily:'inherit'}
  const LBL = {display:'block',fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,marginTop:14}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 -8px 40px rgba(0,0,0,.15)'}}>
        <div style={{width:40,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 20px'}}/>
        <div style={{fontSize:17,fontWeight:800,color:'#0B1E3D',marginBottom:16}}>
          {cliente?.id ? 'Editar cliente' : 'Novo cliente'}
        </div>

        {/* Avatar color */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
          <Avatar name={f.name||'?'} color={f.avatar_color||'#1B3057'} size={48}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>set('avatar_color',c)}
                style={{width:22,height:22,borderRadius:11,background:c,cursor:'pointer',
                  border:f.avatar_color===c?'3px solid #0B1E3D':'2px solid transparent',
                  boxShadow:f.avatar_color===c?'0 0 0 1px #fff inset':'none'}}/>
            ))}
          </div>
        </div>

        <label style={LBL}>Nome *</label>
        <input style={INP} placeholder="Nome completo" value={f.name} onChange={e=>set('name',e.target.value)}/>

        <label style={LBL}>WhatsApp</label>
        <input style={INP} placeholder="(31) 99999-0000" value={f.phone||''} onChange={e=>set('phone',e.target.value)}/>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div>
            <label style={LBL}>E-mail</label>
            <input style={INP} type="email" placeholder="email@..." value={f.email||''} onChange={e=>set('email',e.target.value)}/>
          </div>
          <div>
            <label style={LBL}>Aniversário</label>
            <input style={INP} type="date" value={f.birth_date||''} onChange={e=>set('birth_date',e.target.value)}/>
          </div>
        </div>

        <label style={LBL}>Tipo de corte preferido</label>
        <input style={INP} placeholder="Ex: degradê na lateral, franja..." value={f.preferred_cut||''} onChange={e=>set('preferred_cut',e.target.value)}/>

        <label style={LBL}>Alergias / Observações</label>
        <input style={INP} placeholder="Ex: alergia a amônia, sensibilidade..." value={f.allergies||''} onChange={e=>set('allergies',e.target.value)}/>

        <label style={LBL}>Notas internas</label>
        <textarea style={{...INP,resize:'none',minHeight:60}} placeholder="Observações para a equipe..." value={f.notes_internal||''} onChange={e=>set('notes_internal',e.target.value)}/>

        <label style={LBL}>Status</label>
        <select style={{...INP,cursor:'pointer'}} value={f.status||'ativo'} onChange={e=>set('status',e.target.value)}>
          <option value="ativo">Ativo</option>
          <option value="em_risco">Em risco</option>
          <option value="inativo">Inativo</option>
        </select>

        <div style={{display:'flex',gap:8,marginTop:18}}>
          <button onClick={save} disabled={saving||!f.name.trim()}
            style={{flex:1,padding:'13px',borderRadius:12,border:'none',background:saving||!f.name.trim()?'#E2E8F0':'#0B1E3D',color:saving||!f.name.trim()?'#94A3B8':'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
            {saving?'Salvando...' : cliente?.id?'Salvar alterações':'Adicionar cliente'}
          </button>
          <button onClick={onClose} style={{padding:'13px 20px',borderRadius:12,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const { salon } = useSalon()
  const [clientes,  setClientes]  = useState([])
  const [barbers,   setBarbers]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtro,    setFiltro]    = useState('todos')
  const [modal,     setModal]     = useState(null) // null | 'new' | cliente obj
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const [{ data: cl }, { data: ap }, { data: br }] = await Promise.all([
      sb.from('clients').select('*').eq('salon_id', salon.id).order('name'),
      sb.from('appointments').select('client_id,service_name,date,status,value').eq('salon_id', salon.id),
      sb.from('barbers').select('id,name,color').eq('salon_id', salon.id).eq('active', true),
    ])
    setBarbers(br||[])

    // Enriquece clientes com dados de agendamentos
    const apMap = {}
    ;(ap||[]).forEach(a => {
      if (!a.client_id) return
      if (!apMap[a.client_id]) apMap[a.client_id] = { count:0, receita:0, ultimo:null }
      apMap[a.client_id].count++
      if (a.status==='concluido') apMap[a.client_id].receita += (a.value||0)
      if (!apMap[a.client_id].ultimo || a.date > apMap[a.client_id].ultimo) apMap[a.client_id].ultimo = a.date
    })

    // Busca barbeiros por last_barber_id sem join (mais confiável)
    const enriched = (cl||[]).map(c => ({
      ...c,
      _ap: apMap[c.id] || { count:0, receita:0, ultimo:null },
    }))
    setClientes(enriched)
    setLoading(false)
  }, [salon?.id])

  useEffect(() => { load() }, [load])

  const del = async (id) => {
    if (!confirm('Remover este cliente?')) return
    await sb.from('clients').delete().eq('id', id)
    load()
  }

  const filtered = clientes.filter(c => {
    const ms = search
      ? (c.name||'').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone||'').includes(search)
      : true
    const mf = filtro === 'todos' ||
      (filtro === 'ativo'    && c.status !== 'inativo' && c.status !== 'em_risco') ||
      (filtro === 'em_risco' && c.status === 'em_risco') ||
      (filtro === 'inativo'  && c.status === 'inativo')
    return ms && mf
  })

  const ks = { ativo:0, em_risco:0, inativo:0 }
  clientes.forEach(c => { const k = c.status||'ativo'; if(ks[k]!==undefined) ks[k]++ })

  return (
    <div className="pg">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div className="pg-h1">Clientes</div>
          <div className="pg-sub">{clientes.length} cadastrados · {salon?.name}</div>
        </div>
        <button onClick={()=>setModal('new')} className="btn-primary" style={{display:'flex',alignItems:'center',gap:7}}>
          + Novo cliente
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[['Ativos',ks.ativo,'#059669','#D1FAE5','#6EE7B7'],['Em risco',ks.em_risco,'#D97706','#FEF3C7','#FCD34D'],['Inativos',ks.inativo,'#64748B','#F1F5F9','#CBD5E1']].map(([l,v,c,bg,bd])=>(
          <div key={l} style={{background:'#fff',border:`1px solid ${bd}`,borderRadius:12,padding:'14px 16px',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{l}</div>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Busca e filtros */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <div style={{flex:'1 1 220px',display:'flex',alignItems:'center',gap:8,padding:'0 12px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',minHeight:40}}>
          <svg width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
            style={{flex:1,border:'none',outline:'none',fontSize:13,color:'#0B1E3D',background:'transparent'}}/>
        </div>
        {['todos','ativo','em_risco','inativo'].map(k=>(
          <button key={k} onClick={()=>setFiltro(k)}
            style={{padding:'8px 14px',borderRadius:20,border:`1.5px solid ${filtro===k?'#0B1E3D':'#E2E8F0'}`,
              background:filtro===k?'#0B1E3D':'#fff',color:filtro===k?'#fff':'#64748B',
              fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            {k==='todos'?'Todos':k==='ativo'?'Ativos':k==='em_risco'?'Em risco':'Inativos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:40,textAlign:'center',color:'#94A3B8'}}>Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:40,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:10}}>👥</div>
          <div style={{fontSize:15,fontWeight:700,color:'#0B1E3D',marginBottom:6}}>
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </div>
          <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>
            {search ? 'Tente buscar por outro nome ou telefone.' : 'Adicione o primeiro cliente da sua barbearia.'}
          </div>
          {!search&&<button onClick={()=>setModal('new')} className="btn-primary">+ Adicionar cliente</button>}
        </div>
      ) : (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden'}}>
          {filtered.map((c,i) => {
            const cfg = STATUS_CFG[c.status||'ativo']||STATUS_CFG.ativo
            const phone = (c.phone||'').replace(/\D/g,'')
            const diasSV = dias(c.last_visit || c._ap?.ultimo?.slice(0,10))
            const barber = barbers.find(b=>b.id===c.last_barber_id)
            const waLink = phone ? `https://wa.me/55${phone}` : null
            return (
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
                borderBottom:i<filtered.length-1?'1px solid #F1F5F9':'none',
                transition:'background .1s'}} className="tbl-tr">
                {/* Avatar */}
                <Avatar name={c.name} color={c.avatar_color||'#1B3057'}/>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontWeight:800,fontSize:14,color:'#0B1E3D'}}>{c.name}</span>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:700,
                      background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.bd}`}}>
                      {cfg.label}
                    </span>
                    {barber&&<span style={{fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:700,
                      background:barber.color||'#1B3057',color:'#fff'}}>✂️ {barber.name?.split(' ')[0]}</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748B',display:'flex',gap:10,flexWrap:'wrap'}}>
                    {c.phone&&<span>📱 {c.phone}</span>}
                    <span style={{color:'#2451A0',fontWeight:700}}>
                      {(c.visit_count||c._ap?.count||0)} visita{(c.visit_count||c._ap?.count||0)!==1?'s':''}
                    </span>
                    {(c.ltv||0)>0&&<span style={{color:'#059669',fontWeight:700}}>R${Number(c.ltv).toLocaleString('pt-BR')}</span>}
                    {diasSV!==null&&<span style={{color:diasSV>60?'#DC2626':diasSV>30?'#D97706':'#94A3B8'}}>{diasSV}d sem visita</span>}
                  </div>
                  {(c.preferred_cut||c.allergies)&&(
                    <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>
                      {c.preferred_cut&&<span style={{marginRight:8}}>✂️ {c.preferred_cut.slice(0,25)}{c.preferred_cut.length>25?'...':''}</span>}
                      {c.allergies&&<span>⚠️ {c.allergies.slice(0,20)}</span>}
                    </div>
                  )}
                </div>
                {/* Ações */}
                <div style={{display:'flex',gap:5,flexShrink:0,alignItems:'center'}}>
                  {waLink&&<a href={waLink} target="_blank" rel="noreferrer"
                    style={{width:32,height:32,borderRadius:16,background:'#ECFDF5',border:'1px solid #6EE7B7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,textDecoration:'none'}}
                    title="WhatsApp">💬</a>}
                  <Link href={`/dashboard/clientes/${c.id}`}
                    style={{width:32,height:32,borderRadius:16,background:'#EFF6FF',border:'1px solid #93C5FD',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',fontSize:12,color:'#2451A0',fontWeight:800}}
                    title="Ver perfil">→</Link>
                  <button onClick={()=>setModal(c)}
                    style={{width:32,height:32,borderRadius:16,background:'#F8FAFC',border:'1px solid #E2E8F0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}
                    title="Editar">✏️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <NovoClienteModal
          salonId={salon?.id}
          cliente={modal==='new'?null:modal}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
