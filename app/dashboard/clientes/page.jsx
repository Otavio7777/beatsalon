'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import Link from 'next/link'

const CANAIS  = ['instagram','google','indicacao','whatsapp','outro']
const STATUS  = ['ativo','em_risco','inativo']
const SERVICOS = ['Corte','Barba','Coloração','Corte + Barba','Tratamento Capilar','Hidratação','Sobrancelha']
const CORES   = ['#534AB7','#1D9E75','#D85A30','#D4537E','#BA7517','#378ADD','#3C3489']

const badgeCfg = {
  ativo:    { bg:'#E1F5EE', color:'#085041', label:'Ativo' },
  em_risco: { bg:'#FAEEDA', color:'#633806', label:'Em risco' },
  inativo:  { bg:'#F0EFF8', color:'#8A87A0', label:'Inativo' },
}
const canalIcon = { instagram:'📸', google:'🔍', indicacao:'🤝', whatsapp:'💬', outro:'✨' }

// ── Componentes base ─────────────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = badgeCfg[status] || badgeCfg.ativo
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
}

function Av({ color='#534AB7', sz=40, children }) {
  return (
    <div style={{ width:sz, height:sz, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:sz*.34, flexShrink:0 }}>
      {children}
    </div>
  )
}

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'
}

// ── Modal novo/editar cliente ─────────────────────────────────────────────────
function ClienteModal({ salonId, cliente, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', canal: 'instagram',
    status: 'ativo', main_service: '', strategy: '',
    notes: '', avatar_color: '#534AB7',
    ...cliente,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const sb = createClient()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    setSaving(true); setError('')
    const payload = { ...form, salon_id: salonId }
    const { error: err } = cliente?.id
      ? await sb.from('clients').update(payload).eq('id', cliente.id)
      : await sb.from('clients').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  const ov = {
    overlay: 'REPLACED_OVERLAY',
    box:     { background:'#fff', borderRadius:20, padding:'28px 28px 24px', width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' },
    hd:      { fontSize:18, fontWeight:800, marginBottom:20 },
    grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
    group:   { marginBottom:14 },
    label:   { fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5, display:'block' },
    input:   { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #E3E1F0', fontSize:13, color:'#1A1825', outline:'none' },
    select:  { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #E3E1F0', fontSize:13, color:'#1A1825', outline:'none', background:'#fff' },
    textarea:{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #E3E1F0', fontSize:13, color:'#1A1825', outline:'none', resize:'vertical', minHeight:70 },
    colors:  { display:'flex', gap:8, flexWrap:'wrap' },
    colorDot:{ width:26, height:26, borderRadius:'50%', cursor:'pointer' },
    foot:    { display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:'1px solid #E3E1F0' },
    btnCancel:{ padding:'8px 18px', borderRadius:9, border:'1px solid #E3E1F0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#8A87A0' },
    btnSave: { padding:'8px 20px', borderRadius:9, border:'none', background:'#534AB7', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' },
    err:     { fontSize:12, color:'#D85A30', marginTop:8 },
  }

  return (
    <div style={ov.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={ov.box}>
        <div style={ov.hd}>{cliente?.id ? 'Editar cliente' : 'Novo cliente'}</div>

        <div style={ov.grid2}>
          <div style={{...ov.group, gridColumn:'1/-1'}}>
            <label style={ov.label}>Nome completo *</label>
            <input style={ov.input} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div style={ov.group}>
            <label style={ov.label}>Telefone / WhatsApp</label>
            <input style={ov.input} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(31) 99999-9999" />
          </div>
          <div style={ov.group}>
            <label style={ov.label}>E-mail</label>
            <input style={ov.input} value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div style={ov.group}>
            <label style={ov.label}>Canal de captação</label>
            <select style={ov.select} value={form.canal} onChange={e=>set('canal',e.target.value)}>
              {CANAIS.map(c=><option key={c} value={c}>{canalIcon[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          <div style={ov.group}>
            <label style={ov.label}>Status</label>
            <select style={ov.select} value={form.status} onChange={e=>set('status',e.target.value)}>
              {STATUS.map(s=><option key={s} value={s}>{badgeCfg[s]?.label}</option>)}
            </select>
          </div>
          <div style={ov.group}>
            <label style={ov.label}>Serviço principal</label>
            <select style={ov.select} value={form.main_service} onChange={e=>set('main_service',e.target.value)}>
              <option value="">Selecionar...</option>
              {SERVICOS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={ov.group}>
            <label style={ov.label}>Estratégia ativa</label>
            <select style={ov.select} value={form.strategy} onChange={e=>set('strategy',e.target.value)}>
              <option value="">Nenhuma</option>
              <option value="upsell">Upsell</option>
              <option value="retencao">Retenção</option>
              <option value="reconquista">Reconquista</option>
            </select>
          </div>
        </div>

        <div style={ov.group}>
          <label style={ov.label}>Observações</label>
          <textarea style={ov.textarea} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Preferências, alergias, histórico..." />
        </div>

        <div style={ov.group}>
          <label style={ov.label}>Cor do avatar</label>
          <div style={ov.colors}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>set('avatar_color',c)} style={{
                ...ov.colorDot, background:c,
                outline: form.avatar_color===c ? `3px solid ${c}` : 'none',
                outlineOffset:2,
              }} />
            ))}
          </div>
        </div>

        {error && <div style={ov.err}>{error}</div>}

        <div style={ov.foot}>
          <button style={ov.btnCancel} onClick={onClose}>Cancelar</button>
          <button style={ov.btnSave} onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ClientesPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [clients,    setClients]    = useState([])
  const [appts,      setAppts]      = useState([])   // agendamentos futuros
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('todos')
  const [showModal,  setShowModal]  = useState(false)
  const [editCliente, setEditCliente] = useState(null)
  const sb = createClient()

  const fetchClients = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const [{ data: cls }, { data: aps }] = await Promise.all([
      sb.from('clients').select('*').eq('salon_id', salon.id).order('name'),
      sb.from('appointments')
        .select('id, client_id, service_name, date, status')
        .eq('salon_id', salon.id)
        .gte('date', new Date().toISOString())
        .in('status', ['agendado'])
        .order('date'),
    ])
    setClients(cls || [])
    setAppts(aps || [])
    setLoading(false)
  }, [salon?.id])

  // Próximo agendamento de cada cliente
  const nextAppt = (clientId) => appts.find(a => a.client_id === clientId)

  useEffect(() => { fetchClients() }, [fetchClients])

  // Redireciona se não logado
  useEffect(() => {
    if (!salonLoading && !user) window.location.href = '/login'
  }, [salonLoading, user])

  const deleteCliente = async (id) => {
    if (!confirm('Remover este cliente?')) return
    await sb.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
    const matchFilter = filter === 'todos' || c.status === filter
    return matchSearch && matchFilter
  })

  const risco   = clients.filter(c => c.status === 'em_risco').length
  const ativos  = clients.filter(c => c.status === 'ativo').length
  const totalLtv = clients.reduce((s, c) => s + (c.ltv || 0), 0)

  const st = {
    page:    { padding:'28px 32px', maxWidth:1100 },
    hd:      { marginBottom:24 },
    h1:      { fontSize:24, fontWeight:800, color:'#1A1825' },
    sub:     { fontSize:13, color:'#8A87A0', marginTop:3 },
    metrics: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 },
    mc:      { background:'#fff', borderRadius:14, padding:'14px 16px', border:'1px solid #E3E1F0' },
    ml:      { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, marginBottom:5 },
    mv:      { fontSize:22, fontWeight:800 },
    md:      { fontSize:11, marginTop:4, color:'#8A87A0' },
    toolbar: { display:'flex', gap:12, alignItems:'center', marginBottom:20, flexWrap:'wrap' },
    search:  { flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E3E1F0', borderRadius:10, padding:'9px 14px' },
    searchIn:{ border:'none', outline:'none', fontSize:13, flex:1, color:'#1A1825' },
    filters: { display:'flex', gap:6 },
    filterBtn:{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #E3E1F0', cursor:'pointer', transition:'all .15s' },
    addBtn:  { padding:'9px 18px', background:'#534AB7', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 },
    table:   { background:'#fff', borderRadius:16, border:'1px solid #E3E1F0', overflow:'hidden' },
    thead:   { background:'#F2F1F8', borderBottom:'1px solid #E3E1F0' },
    th:      { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', textAlign:'left' },
    tr:      { borderBottom:'1px solid #E3E1F0', transition:'background .1s' },
    td:      { padding:'12px 16px', fontSize:13 },
    empty:   { padding:'48px 16px', textAlign:'center', color:'#8A87A0' },
    actBtn:  { padding:'4px 10px', borderRadius:7, border:'1px solid #E3E1F0', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#8A87A0' },
  }

  if (salonLoading) return <div style={{ padding:40, color:'#8A87A0', textAlign:'center' }}>Carregando...</div>

  return (
    <div className="pg">
      {/* Cabeçalho */}
      <div style={st.hd}>
        <div className="pg-h1">Clientes — CRM</div>
        <div className="pg-sub">Gestão de relacionamento · {salon?.name || 'BeatSalon'}</div>
      </div>

      {/* Métricas */}
      <div className="grid-3">
        <div style={st.mc}><div style={st.ml}>Total de clientes</div><div style={st.mv}>{clients.length}</div><div style={st.md}>cadastrados</div></div>
        <div style={st.mc}><div style={st.ml}>Clientes ativos</div><div style={{...st.mv, color:'#1D9E75'}}>{ativos}</div><div style={st.md}>visitaram recentemente</div></div>
        <div style={st.mc}><div style={st.ml}>Em risco</div><div style={{...st.mv, color:'#D85A30'}}>{risco}</div><div style={st.md}>sem visita +30 dias</div></div>
        <div style={st.mc}><div style={st.ml}>LTV total</div><div style={st.mv}>R${totalLtv.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div><div style={st.md}>faturamento acumulado</div></div>
      </div>

      {/* Alerta de risco */}
      {risco > 0 && (
        <div style={{ display:'flex', gap:10, background:'#FAECE7', border:'1px solid #F5C4B3', borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <span style={{ fontSize:13, color:'#712B13', fontWeight:600 }}>
            {risco} cliente{risco>1?'s':''} em risco de abandono — clique em "Em risco" para ver quem precisa de atenção.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div style={st.search}>
          <span style={{ fontSize:16, color:'#8A87A0' }}>🔍</span>
          <input style={st.searchIn} placeholder="Buscar por nome ou telefone..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div style={st.filters}>
          {['todos','ativo','em_risco','inativo'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{
              ...st.filterBtn,
              background: filter===f ? '#534AB7' : '#fff',
              color: filter===f ? '#fff' : '#8A87A0',
              borderColor: filter===f ? '#534AB7' : '#E3E1F0',
            }}>
              {f==='todos' ? 'Todos' : badgeCfg[f]?.label}
              <span style={{ marginLeft:5, fontSize:10, opacity:.7 }}>({f==='todos' ? clients.length : clients.filter(c=>c.status===f).length})</span>
            </button>
          ))}
        </div>
        <button style={st.addBtn} onClick={()=>{ setEditCliente(null); setShowModal(true) }}>
          ＋ Novo cliente
        </button>
      </div>

      {/* Tabela */}
      <div className="tbl-wrap">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead style={st.thead}>
            <tr>
              <th style={st.th}>Cliente</th>
              <th style={st.th}>Telefone</th>
              <th style={st.th}>Canal</th>
              <th style={st.th}>Serviço principal</th>
              <th style={st.th}>LTV</th>
              <th style={st.th}>Visitas</th>
              <th style={st.th}>Próx. agenda</th>
              <th style={st.th}>Status</th>
              <th style={st.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={st.empty}>Carregando clientes...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={st.empty}>
                {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda. Clique em "+ Novo cliente" para começar.'}
              </td></tr>
            ) : filtered.map(c => {
              const prox = nextAppt(c.id)
              const proxDt = prox ? new Date(prox.date) : null
              return (
              <tr key={c.id} style={st.tr}>
                <td style={st.td}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Av color={c.avatar_color} sz={36}>{initials(c.name)}</Av>
                    <div>
                      <Link href={`/dashboard/clientes/${c.id}`} style={{ fontWeight:700, color:'#1A1825', textDecoration:'none' }}>
                        {c.name}
                      </Link>
                      {c.email && <div style={{ fontSize:11, color:'#8A87A0', marginTop:1 }}>{c.email}</div>}
                    </div>
                  </div>
                </td>
                <td style={st.td}><span style={{ color:'#8A87A0' }}>{c.phone || '—'}</span></td>
                <td style={st.td}><span title={c.canal}>{canalIcon[c.canal]||'✨'} {c.canal}</span></td>
                <td style={st.td}>{c.main_service || '—'}</td>
                <td style={{ ...st.td, fontWeight:700, color:'#1D9E75' }}>
                  {c.ltv ? `R$${Number(c.ltv).toLocaleString('pt-BR',{minimumFractionDigits:0})}` : '—'}
                </td>
                <td style={{ ...st.td, textAlign:'center' }}>{c.visit_count || 0}</td>
                <td style={st.td}>
                  {prox ? (
                    <div style={{ background:'#E6F1FB', borderRadius:7, padding:'3px 8px', fontSize:11, color:'#0C447C', fontWeight:600, display:'inline-block' }}>
                      📅 {proxDt.getDate()}/{proxDt.getMonth()+1} {proxDt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  ) : <span style={{ color:'#E3E1F0' }}>—</span>}
                </td>
                <td style={st.td}><Badge status={c.status} /></td>
                <td style={st.td}>
                  <div style={{ display:'flex', gap:6 }}>
                    <Link href={`/dashboard/clientes/${c.id}`}><button style={st.actBtn}>Ver</button></Link>
                    <button style={st.actBtn} onClick={()=>{ setEditCliente(c); setShowModal(true) }}>Editar</button>
                    <button style={{ ...st.actBtn, color:'#D85A30', borderColor:'#F5C4B3' }} onClick={()=>deleteCliente(c.id)}>Remover</button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && salon && (
        <ClienteModal
          salonId={salon.id}
          cliente={editCliente}
          onClose={()=>setShowModal(false)}
          onSaved={fetchClients}
        />
      )}
    </div>
  )
}
