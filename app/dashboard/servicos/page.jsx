'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'

const CATEGORIAS = [
  {id:'cabelo',   label:'Cabelo'},
  {id:'barba',    label:'Barba'},
  {id:'coloracao',label:'Coloração'},
  {id:'estetica', label:'Estética'},
  {id:'unhas',    label:'Unhas'},
  {id:'sobrancelha',label:'Sobrancelha'},
  {id:'massagem', label:'Massagem'},
  {id:'geral',    label:'Geral'},
]
const catIcon = (c) => ''
const catLabel = (c) => CATEGORIAS.find(x=>x.id===c)?.label || c

function ServicoModal({ salonId, servico, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', category:'cabelo', price:'', cost:'', duration:60, description:'', active:true, ...servico
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { ...form, salon_id:salonId, price:Number(form.price)||0, duration:Number(form.duration)||60 }
    const { error } = servico?.id
      ? await sb.from('services').update(payload).eq('id',servico.id)
      : await sb.from('services').insert(payload)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={{fontSize:18,fontWeight:800,marginBottom:20}}>{servico?.id?'Editar serviço':'Novo serviço'}</div>

        <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6,display:'block'}}>Nome do serviço *</label>
        <input style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #E3E1F0',fontSize:14,outline:'none',marginBottom:12,boxSizing:'border-box'}}
          placeholder="Ex: Corte Masculino" value={form.name} onChange={e=>set('name',e.target.value)} />

        <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6,display:'block'}}>Categoria</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>
          {CATEGORIAS.map(c=>(
            <button key={c.id} onClick={()=>set('category',c.id)} style={{
              padding:'8px 4px',borderRadius:8,border:`2px solid ${form.category===c.id?'#534AB7':'#E3E1F0'}`,
              background:form.category===c.id?'#534AB7':'#fff',cursor:'pointer',textAlign:'center',
              color:form.category===c.id?'#fff':'#8A87A0',fontSize:11,fontWeight:600,
            }}>
              
              {c.label}
            </button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6,display:'block'}}>Preço (R$)</label>
            <input style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #E3E1F0',fontSize:14,outline:'none',boxSizing:'border-box'}}
              type="number" placeholder="0" value={form.price} onChange={e=>set('price',e.target.value)} />
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6,display:'block'}}>Duração (min)</label>
            <input style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #E3E1F0',fontSize:14,outline:'none',boxSizing:'border-box'}}
              type="number" placeholder="60" value={form.duration} onChange={e=>set('duration',e.target.value)} />
          </div>
        </div>

        <label style={{fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6,display:'block'}}>Descrição</label>
        <input style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #E3E1F0',fontSize:14,outline:'none',marginBottom:16,boxSizing:'border-box'}}
          placeholder="Descrição opcional do serviço" value={form.description} onChange={e=>set('description',e.target.value)} />

        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,padding:'12px',background:'#F2F1F8',borderRadius:10}}>
          <span style={{fontSize:13,fontWeight:600,flex:1}}>Serviço ativo (visível no link público)</span>
          <div onClick={()=>set('active',!form.active)} style={{width:44,height:24,borderRadius:12,background:form.active?'#534AB7':'#D4D2DF',cursor:'pointer',position:'relative',transition:'background .2s'}}>
            <div style={{width:20,height:20,borderRadius:10,background:'#fff',position:'absolute',top:2,left:form.active?22:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'9px 18px',borderRadius:10,border:'1px solid #E3E1F0',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#8A87A0'}}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{padding:'9px 20px',borderRadius:10,border:'none',background:'#534AB7',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {saving?'Salvando...':'Salvar serviço'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServicosPage() {
  const { salon, user, loading: sl } = useSalon()
  const [servicos, setServicos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSvc, setEditSvc]   = useState(null)
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('todos')
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const { data } = await sb.from('services').select('*').eq('salon_id',salon.id).order('name')
    setServicos(data||[])
    setLoading(false)
  },[salon?.id])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(!sl&&!user) window.location.href='/login' },[sl,user])

  const del = async (id) => {
    if (!confirm('Remover serviço?')) return
    await sb.from('services').delete().eq('id',id)
    load()
  }

  const toggleActive = async (svc) => {
    await sb.from('services').update({active:!svc.active}).eq('id',svc.id)
    load()
  }

  const filtered = servicos.filter(s=>{
    const ms = s.name.toLowerCase().includes(search.toLowerCase())
    const mc = catFilter==='todos' || s.category===catFilter
    return ms&&mc
  })

  const totalAtivos = servicos.filter(s=>s.active).length
  const receitaMedia = servicos.filter(s=>s.price>0).length>0
    ? servicos.filter(s=>s.price>0).reduce((sum,s)=>sum+(s.price||0),0)/servicos.filter(s=>s.price>0).length : 0

  return (
    <div className="pg">
      <div className="pg-hd">
        <div style={{fontSize:22,fontWeight:800,color:'#1A1825'}}>Serviços</div>
        <div style={{fontSize:12,color:'#8A87A0',marginTop:3}}>Catálogo de serviços · {salon?.name}</div>
      </div>

      <div className="grid-3" style={{marginBottom:20}}>
        <div className="mc"><div className="mc-label">Total</div><div className="mc-value">{servicos.length}</div><div className="mc-desc">serviços</div></div>
        <div className="mc"><div className="mc-label">Ativos</div><div className="mc-value" style={{color:'#1D9E75'}}>{totalAtivos}</div><div className="mc-desc">disponíveis</div></div>
        <div className="mc"><div className="mc-label">Preço médio</div><div className="mc-value">R${Math.round(receitaMedia)}</div><div className="mc-desc">por serviço</div></div>
      </div>

      <div className="toolbar">
        <div className="search-wrap" style={{flex:1}}>
          <span style={{fontSize:14,color:'#8A87A0'}}>🔍</span>
          <input className="search-inp" placeholder="Buscar serviço..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={()=>{setEditSvc(null);setShowModal(true)}}>＋ Serviço</button>
      </div>

      {/* Filtro categorias */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {['todos',...CATEGORIAS.map(c=>c.id)].map(c=>(
          <button key={c} onClick={()=>setCatFilter(c)} className={`filter-btn${catFilter===c?' active':''}`}>
            {c==='todos'?'Todos':catLabel(c)}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? <div style={{textAlign:'center',color:'#8A87A0',padding:32}}>Carregando...</div>
      : filtered.length===0 ? (
        <div style={{textAlign:'center',color:'#8A87A0',padding:32,background:'#fff',borderRadius:16,border:'1px solid #E3E1F0'}}>
          {search||catFilter!=='todos'?'Nenhum serviço encontrado.':'Nenhum serviço ainda. Clique em "+ Serviço" para adicionar.'}
        </div>
      ) : (
        <div style={{display:'grid',gap:8}}>
          {filtered.map(svc=>(
            <div key={svc.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid #E3E1F0',display:'flex',alignItems:'center',gap:12,opacity:svc.active?1:.6}}>
              <div style={{width:44,height:44,borderRadius:12,background:'#F2F1F8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:14}}>{svc.name}</span>
                  {!svc.active && <span style={{fontSize:10,padding:'2px 8px',borderRadius:8,background:'#F0EFF8',color:'#8A87A0',fontWeight:700}}>Inativo</span>}
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:8,background:'#F2F1F8',color:'#534AB7',fontWeight:600}}>{catLabel(svc.category)}</span>
                </div>
                <div style={{fontSize:12,color:'#8A87A0',marginTop:3,display:'flex',gap:12,flexWrap:'wrap'}}>
                  {svc.price>0 && <span style={{fontWeight:700,color:'#1D9E75'}}>R${Number(svc.price).toLocaleString('pt-BR')}</span>}
                  {svc.duration && <span>⏱ {svc.duration} min</span>}
                  {svc.description && <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>{svc.description}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <div onClick={()=>toggleActive(svc)} style={{width:36,height:20,borderRadius:10,background:svc.active?'#534AB7':'#D4D2DF',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
                  <div style={{width:16,height:16,borderRadius:8,background:'#fff',position:'absolute',top:2,left:svc.active?18:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                </div>
                <button className="btn-ghost" onClick={()=>{setEditSvc(svc);setShowModal(true)}}>Editar</button>
                <button className="btn-danger" onClick={()=>del(svc.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && salon && (
        <ServicoModal salonId={salon.id} servico={editSvc} onClose={()=>setShowModal(false)} onSaved={load} />
      )}
    </div>
  )
}
