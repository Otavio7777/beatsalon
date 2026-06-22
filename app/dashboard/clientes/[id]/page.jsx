'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { useSalon } from '../../../../lib/useSalon'

const badgeCfg = {
  ativo:    { bg:'#E1F5EE', color:'#085041', label:'Ativo' },
  em_risco: { bg:'#FAEEDA', color:'#633806', label:'Em risco' },
  inativo:  { bg:'#F0EFF8', color:'#8A87A0', label:'Inativo' },
}
const typeIcon = { aniversario:'🎂', evento:'🎉', reuniao:'💼', outro:'📌' }

function Av({ color='#534AB7', sz=56, name='' }) {
  const ini = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'
  return (
    <div style={{ width:sz, height:sz, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:sz*.34, flexShrink:0 }}>
      {ini}
    </div>
  )
}

// Modal de microdata
function MicrodataModal({ clientId, salonId, microdata, onClose, onSaved }) {
  const [form, setForm] = useState({ title:'', description:'', date:'', type:'outro', ...microdata })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.title || !form.date) return
    setSaving(true)
    const payload = { ...form, client_id: clientId, salon_id: salonId }
    if (microdata?.id)
      await sb.from('microdates').update(payload).eq('id', microdata.id)
    else
      await sb.from('microdates').insert(payload)
    onSaved(); onClose()
  }

  const ov = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16 },
    box: { background:'#fff',borderRadius:20,padding:'28px',width:'100%',maxWidth:420 },
    hd: { fontSize:17,fontWeight:800,marginBottom:18 },
    label: { fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,display:'block',marginTop:12 },
    input: { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',color:'#1A1825' },
    select: { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',background:'#fff',color:'#1A1825' },
    foot: { display:'flex',gap:10,justifyContent:'flex-end',marginTop:20,paddingTop:16,borderTop:'1px solid #E3E1F0' },
  }

  return (
    <div style={ov.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={ov.box}>
        <div style={ov.hd}>{microdata?.id ? 'Editar microdata' : 'Nova microdata'}</div>
        <label style={ov.label}>Título *</label>
        <input style={ov.input} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Ex: Aniversário da esposa" />
        <label style={ov.label}>Tipo</label>
        <select style={ov.select} value={form.type} onChange={e=>set('type',e.target.value)}>
          {Object.entries(typeIcon).map(([k,v])=><option key={k} value={k}>{v} {k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
        </select>
        <label style={ov.label}>Data *</label>
        <input style={ov.input} type="date" value={form.date} onChange={e=>set('date',e.target.value)} />
        <label style={ov.label}>Ação sugerida</label>
        <input style={ov.input} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Ex: Antecipar corte, enviar mensagem especial" />
        <div style={ov.foot}>
          <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:9,border:'1px solid #E3E1F0',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#8A87A0' }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ padding:'8px 20px',borderRadius:9,border:'none',background:'#534AB7',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        
          {/* Histórico de atendimentos */}
          <div className="card" style={{marginTop:0}}>
            <div style={{fontSize:14,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Histórico de atendimentos</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{appts.length} registro{appts.length!==1?'s':''}</div>
            {appts.length === 0 ? (
              <div style={{textAlign:'center',color:'var(--muted)',padding:'16px 0',fontSize:13}}>Nenhum atendimento registrado.</div>
            ) : appts.map((a,i) => {
              const dt = a.date ? new Date(a.date) : null
              const STATUS_C = { concluido:'var(--success)', agendado:'var(--navy-500)', cancelado:'var(--danger)', faltou:'var(--warning)' }
              return (
                <div key={a.id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:i<appts.length-1?'1px solid var(--gray-100)':'none',alignItems:'flex-start'}}>
                  <div style={{width:8,height:8,borderRadius:4,background:STATUS_C[a.status]||'var(--muted)',flexShrink:0,marginTop:5}}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:6}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{a.service_name||'Serviço'}</div>
                        {a.cut_preference && <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>✂️ {a.cut_preference}</div>}
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        {a.value > 0 && <div style={{fontSize:13,fontWeight:700,color:'var(--success)'}}>R${Number(a.value).toLocaleString('pt-BR')}</div>}
                        {a.payment_method && <div style={{fontSize:10,color:'var(--muted)'}}>{a.payment_method}</div>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
                      <span style={{fontSize:11,color:'var(--muted)'}}>{dt?dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</span>
                      <span style={{fontSize:10,fontWeight:700,color:STATUS_C[a.status]||'var(--muted)'}}>{a.status}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
</div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ClienteDetailPage() {
  const { id } = useParams()
  const router  = useRouter()
  const { salon } = useSalon()
  const [client,     setClient]     = useState(null)
  const [microdates, setMicrodates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showMDModal, setShowMDModal] = useState(false)
  const [editMD,      setEditMD]      = useState(null)
  const sb = createClient()

  const fetchClient = async () => {
    const { data } = await sb.from('clients').select('*').eq('id', id).single()
    const { data: appts } = await sb.from('appointments')
      .select('id,date,service_name,value,status,payment_method,cut_preference,notes')
      .eq('client_id', id)
      .order('date', { ascending: false })
      .limit(20)
    setClient(data)
    setLoading(false)
  }
  const fetchMicrodates = async () => {
    const { data } = await sb.from('microdates').select('*').eq('client_id', id).order('date')
    setMicrodates(data || [])
  }
  useEffect(() => { fetchClient(); fetchMicrodates() }, [id])

  const deleteMD = async (mdId) => {
    if (!confirm('Remover esta microdata?')) return
    await sb.from('microdates').delete().eq('id', mdId)
    fetchMicrodates()
  }

  const updateStatus = async (status) => {
    await sb.from('clients').update({ status }).eq('id', id)
    setClient(c => ({ ...c, status }))
  }

  const st = {
    page:  { padding:'28px 32px', maxWidth:900 },
    back:  { fontSize:13, color:'#534AB7', cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:5, fontWeight:600, border:'none', background:'none', padding:0 },
    card:  { background:'#fff', borderRadius:16, padding:'20px 24px', border:'1px solid #E3E1F0', marginBottom:16 },
    hd:    { fontSize:16, fontWeight:800, marginBottom:14, display:'flex', alignItems:'center', gap:6 },
    label: { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:700, marginBottom:3 },
    val:   { fontSize:14, fontWeight:600, color:'#1A1825' },
    grid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
    stat:  { textAlign:'center', padding:'14px', background:'#F2F1F8', borderRadius:12 },
    statV: { fontSize:22, fontWeight:800 },
    statK: { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', marginTop:3 },
    mdItem:{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid #E3E1F0' },
    mdIco: { width:32, height:32, borderRadius:'50%', background:'#FBEAF0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 },
    addBtn:{ padding:'7px 14px', background:'#534AB7', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer' },
    actBtn:{ padding:'4px 10px', borderRadius:7, border:'1px solid #E3E1F0', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#8A87A0' },
    statusBtns: { display:'flex', gap:7, flexWrap:'wrap' },
  }

  if (loading) return <div style={{ padding:40, color:'#8A87A0', textAlign:'center' }}>Carregando...</div>
  if (!client) return <div style={{ padding:40, color:'#8A87A0', textAlign:'center' }}>Cliente não encontrado.</div>

  const cfg = badgeCfg[client.status] || badgeCfg.ativo

  return (
    <div style={st.page}>
      <button style={st.back} onClick={()=>router.back()}>← Voltar para clientes</button>

      {/* Header do cliente */}
      <div style={{ ...st.card, display:'flex', alignItems:'flex-start', gap:20, marginBottom:16 }}>
        <Av color={client.avatar_color} sz={64} name={client.name} />
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div style={{ fontSize:22, fontWeight:800 }}>{client.name}</div>
            <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize:13, color:'#8A87A0', marginTop:3 }}>
            {client.phone && <span>📱 {client.phone} · </span>}
            {client.email && <span>✉️ {client.email} · </span>}
            <span>Canal: {client.canal}</span>
          </div>
          {client.notes && <div style={{ fontSize:12, color:'#8A87A0', marginTop:6, fontStyle:'italic' }}>"{client.notes}"</div>}
          <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
            {client.phone && (
              <a href={`https://wa.me/55${client.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                <button style={{ ...st.addBtn, background:'#1D9E75', display:'flex', alignItems:'center', gap:5 }}>💬 WhatsApp</button>
              </a>
            )}
            <div style={st.statusBtns}>
              {['ativo','em_risco','inativo'].map(s=>(
                <button key={s} onClick={()=>updateStatus(s)} style={{
                  ...st.actBtn,
                  background: client.status===s ? badgeCfg[s]?.bg : '#fff',
                  color: client.status===s ? badgeCfg[s]?.color : '#8A87A0',
                  borderColor: client.status===s ? badgeCfg[s]?.color : '#E3E1F0',
                  fontWeight: client.status===s ? 700 : 600,
                }}>{badgeCfg[s]?.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{ ...st.card }}>
        <div style={st.hd}>📈 Estatísticas</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            ['LTV acumulado', `R$${Number(client.ltv||0).toLocaleString('pt-BR',{minimumFractionDigits:0})}`, '#534AB7'],
            ['Visitas', client.visit_count||0, '#1D9E75'],
            ['Última visita', client.last_visit ? new Date(client.last_visit+'T00:00').toLocaleDateString('pt-BR') : '—', '#8A87A0'],
            ['1ª visita', client.first_visit ? new Date(client.first_visit+'T00:00').toLocaleDateString('pt-BR') : '—', '#8A87A0'],
            ['Serviço principal', client.main_service||'—', '#BA7517'],
            ['Estratégia', client.strategy||'Nenhuma', client.strategy?'#534AB7':'#8A87A0'],
          ].map(([k,v,c])=>(
            <div key={k} style={{ ...st.stat, flex:'1 1 130px' }}>
              <div style={{ ...st.statV, color:c, fontSize:v.toString().length>6?15:22 }}>{v}</div>
              <div style={st.statK}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Microdatas */}
      <div style={st.card}>
        <div style={{ ...st.hd, justifyContent:'space-between' }}>
          <span>🎯 Microdatas pessoais</span>
          <button style={st.addBtn} onClick={()=>{ setEditMD(null); setShowMDModal(true) }}>+ Adicionar</button>
        </div>
        {microdates.length === 0 ? (
          <div style={{ fontSize:13, color:'#8A87A0', textAlign:'center', padding:'16px 0' }}>
            Nenhuma microdata cadastrada. Adicione datas importantes como aniversários, eventos e reuniões.
          </div>
        ) : microdates.map(m => {
          const dt = new Date(m.date+'T00:00')
          const today = new Date()
          const diff  = Math.ceil((dt - today) / (1000*60*60*24))
          const past  = diff < 0
          return (
            <div key={m.id} style={{ ...st.mdItem, opacity: past ? 0.55 : 1 }}>
              <div style={{ ...st.mdIco, background: past ? '#F0EFF8' : '#FBEAF0' }}>
                {typeIcon[m.type]||'📌'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{m.title}</div>
                {m.description && <div style={{ fontSize:11, color:'#8A87A0', marginTop:2 }}>{m.description}</div>}
                <div style={{ fontSize:11, marginTop:3, fontWeight:700, color: past ? '#8A87A0' : diff <= 7 ? '#D85A30' : '#534AB7' }}>
                  {dt.toLocaleDateString('pt-BR')}
                  {!past && ` · em ${diff} dia${diff!==1?'s':''}`}
                  {past && ' · passada'}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button style={st.actBtn} onClick={()=>{ setEditMD(m); setShowMDModal(true) }}>Editar</button>
                <button style={{ ...st.actBtn, color:'#D85A30', borderColor:'#F5C4B3' }} onClick={()=>deleteMD(m.id)}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal microdata */}
      {showMDModal && salon && (
        <MicrodataModal
          clientId={id}
          salonId={salon.id}
          microdata={editMD}
          onClose={()=>setShowMDModal(false)}
          onSaved={fetchMicrodates}
        />
      )}
    </div>
  )
}
