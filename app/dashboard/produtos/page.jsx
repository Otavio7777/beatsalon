'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import { AlertTriangle, Search, X, Package, Scissors } from '../../../lib/icons'

const CATEGORIAS = ['capilar','barba','coloracao','skincare','outro']
const CAT_ICONS = { capilar:'💇', barba:'🪒', coloracao:'🎨', skincare:'🧴', outro:'📦' }
const CAT_LABELS = { capilar:'Capilar', barba:'Barba', coloracao:'Coloração', skincare:'Skincare', outro:'Outro' }

function ProdutoModal({ salonId, produto, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', category:'capilar', price:'', cost:'',
    stock:'', min_stock:'5', code:'', active:true, ...produto,
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...form, salon_id: salonId,
      price: Number(form.price)||0,
      cost: Number(form.cost)||0,
      stock: Number(form.stock)||0,
      min_stock: Number(form.min_stock)||5,
    }
    const { error } = produto?.id
      ? await sb.from('products').update(payload).eq('id', produto.id)
      : await sb.from('products').insert(payload)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  const s = {
    overlay: 'REPLACED_OVERLAY',
    box:     { background:'#fff',borderRadius:20,padding:'28px',width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' },
    hd:      { fontSize:18,fontWeight:800,marginBottom:18 },
    label:   { fontSize:11,fontWeight:700,color:'#8A87A0',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,display:'block',marginTop:12 },
    input:   { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',color:'#1A1825' },
    select:  { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #E3E1F0',fontSize:13,outline:'none',background:'#fff',color:'#1A1825' },
    grid2:   { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 },
    foot:    { display:'flex',gap:10,justifyContent:'flex-end',marginTop:20,paddingTop:16,borderTop:'1px solid #E3E1F0' },
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={s.hd}>{produto?.id ? 'Editar produto' : 'Novo produto'}</div>
        <div style={s.grid2}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={s.label}>Nome do produto *</label>
            <input style={s.input} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ex: Shampoo Profissional 500ml" />
          </div>
          <div>
            <label style={s.label}>Categoria</label>
            <select style={s.select} value={form.category} onChange={e=>set('category',e.target.value)}>
              {CATEGORIAS.map(c=><option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Código (SKU)</label>
            <input style={s.input} value={form.code} onChange={e=>set('code',e.target.value)} placeholder="SKU001" />
          </div>
          <div>
            <label style={s.label}>Preço de venda (R$)</label>
            <input style={s.input} type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={s.label}>Custo (R$)</label>
            <input style={s.input} type="number" value={form.cost} onChange={e=>set('cost',e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={s.label}>Estoque atual</label>
            <input style={s.input} type="number" value={form.stock} onChange={e=>set('stock',e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={s.label}>Estoque mínimo</label>
            <input style={s.input} type="number" value={form.min_stock} onChange={e=>set('min_stock',e.target.value)} placeholder="5" />
          </div>
        </div>
        <div style={s.foot}>
          <button onClick={onClose} style={{padding:'8px 18px',borderRadius:9,border:'1px solid #E3E1F0',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#8A87A0'}}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{padding:'8px 20px',borderRadius:9,border:'none',background:'#534AB7',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {saving ? 'Salvando...' : 'Salvar produto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProdutosPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [produtos, setProdutos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editProd, setEditProd]   = useState(null)
  const sb = createClient()

  const fetchProdutos = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const { data } = await sb.from('products').select('*').eq('salon_id', salon.id).order('name')
    setProdutos(data || [])
    setLoading(false)
  }, [salon?.id])

  useEffect(() => { fetchProdutos() }, [fetchProdutos])
  useEffect(() => { if (!salonLoading && !user) window.location.href = '/login' }, [salonLoading, user])

  const del = async (id) => {
    if (!confirm('Remover produto?')) return
    await sb.from('products').delete().eq('id', id)
    fetchProdutos()
  }

  const filtered = produtos.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.code||'').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'todos' || p.category === catFilter
    return matchSearch && matchCat
  })

  const baixoEstoque = produtos.filter(p => p.stock <= p.min_stock && p.active)
  const valorEstoque = produtos.filter(p=>p.active).reduce((s,p) => s + (p.stock||0)*(p.cost||0), 0)
  const margem = (p) => p.price > 0 ? Math.round((p.price - p.cost)/p.price*100) : 0

  const st = {
    page:    { padding:'28px 32px', maxWidth:1100 },
    h1:      { fontSize:24, fontWeight:800, color:'#1A1825' },
    sub:     { fontSize:13, color:'#8A87A0', marginTop:3 },
    metrics: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 },
    mc:      { background:'#fff', borderRadius:14, padding:'14px 16px', border:'1px solid #E3E1F0' },
    ml:      { fontSize:10, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, marginBottom:5 },
    mv:      { fontSize:22, fontWeight:800 },
    md:      { fontSize:11, marginTop:4, color:'#8A87A0' },
    toolbar: { display:'flex', gap:10, alignItems:'center', marginBottom:20, flexWrap:'wrap' },
    search:  { flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E3E1F0', borderRadius:10, padding:'9px 14px' },
    searchIn:{ border:'none', outline:'none', fontSize:13, flex:1, color:'#1A1825' },
    catBtn:  { padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #E3E1F0', cursor:'pointer', transition:'all .15s' },
    addBtn:  { padding:'9px 18px', background:'#534AB7', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 },
    table:   { background:'#fff', borderRadius:16, border:'1px solid #E3E1F0', overflow:'hidden' },
    thead:   { background:'#F2F1F8', borderBottom:'1px solid #E3E1F0' },
    th:      { padding:'10px 16px', fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', textAlign:'left' },
    tr:      { borderBottom:'1px solid #E3E1F0', transition:'background .1s' },
    td:      { padding:'12px 16px', fontSize:13 },
    empty:   { padding:'48px 16px', textAlign:'center', color:'#8A87A0' },
    actBtn:  { padding:'4px 10px', borderRadius:7, border:'1px solid #E3E1F0', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#8A87A0' },
    stockOk: { fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:700, background:'#E1F5EE', color:'#085041' },
    stockLow:{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:700, background:'#FAEEDA', color:'#633806' },
    stockOut:{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:700, background:'#FCEBEB', color:'#A32D2D' },
  }

  if (salonLoading) return <div style={{padding:40,color:'#8A87A0',textAlign:'center'}}>Carregando...</div>

  return (
    <div className="pg">
      <div style={{marginBottom:20}}>
        <div className="pg-h1">Produtos</div>
        <div className="pg-sub">Estoque e catálogo · {salon?.name || 'BeatSalon'}</div>
      </div>

      <div className="grid-3">
        <div style={st.mc}><div style={st.ml}>Total de produtos</div><div style={st.mv}>{produtos.length}</div><div style={st.md}>cadastrados</div></div>
        <div style={st.mc}><div style={st.ml}>Baixo estoque</div><div style={{...st.mv,color: baixoEstoque.length > 0 ? '#D85A30' : '#1D9E75'}}>{baixoEstoque.length}</div><div style={st.md}>precisam repor</div></div>
        <div style={st.mc}><div style={st.ml}>Valor em estoque</div><div style={st.mv}>R${Math.round(valorEstoque).toLocaleString('pt-BR')}</div><div style={st.md}>custo total</div></div>
        <div style={st.mc}><div style={st.ml}>Margem média</div><div style={st.mv}>{produtos.filter(p=>p.price>0).length > 0 ? Math.round(produtos.filter(p=>p.price>0).reduce((s,p)=>s+margem(p),0)/produtos.filter(p=>p.price>0).length) : 0}%</div><div style={st.md}>de lucro</div></div>
      </div>

      {baixoEstoque.length > 0 && (
        <div style={{display:'flex',gap:10,background:'#FAEEDA',border:'1px solid #F5D9A0',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
          <AlertTriangle size={18} color="#D97706"/>
          <span style={{fontSize:13,color:'#633806',fontWeight:600}}>
            {baixoEstoque.length} produto{baixoEstoque.length>1?'s':''} com estoque baixo: {baixoEstoque.map(p=>p.name).join(', ')}
          </span>
        </div>
      )}

      <div className="toolbar">
        <div style={st.search}>
          <Search size={16} color="#8A87A0"/>
          <input style={st.searchIn} placeholder="Buscar por nome ou SKU..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {['todos',...CATEGORIAS].map(cat => (
            <button key={cat} onClick={()=>setCatFilter(cat)} style={{...st.catBtn,
              background: catFilter===cat ? '#534AB7' : '#fff',
              color: catFilter===cat ? '#fff' : '#8A87A0',
              borderColor: catFilter===cat ? '#534AB7' : '#E3E1F0',
            }}>{cat==='todos' ? 'Todos' : ` ${CAT_LABELS[cat]}`}</button>
          ))}
        </div>
        <button style={st.addBtn} onClick={() => { setEditProd(null); setShowModal(true) }}>＋ Produto</button>
      </div>

      <div className="tbl-wrap">
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={st.thead}>
            <tr>
              <th style={st.th}>Produto</th>
              <th style={st.th}>Categoria</th>
              <th style={st.th}>Preço</th>
              <th style={st.th}>Custo</th>
              <th style={st.th}>Margem</th>
              <th style={st.th}>Estoque</th>
              <th style={st.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={st.empty}>Carregando produtos...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={st.empty}>
                {search || catFilter!=='todos' ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda. Clique em "+ Produto" para começar.'}
              </td></tr>
            ) : filtered.map(p => {
              const stk = p.stock || 0
              const min = p.min_stock || 5
              const stockStyle = stk === 0 ? st.stockOut : stk <= min ? st.stockLow : st.stockOk
              const stockLabel = stk === 0 ? 'Sem estoque' : stk <= min ? `${stk} (baixo)` : stk
              return (
                <tr key={p.id} style={st.tr}>
                  <td style={st.td}>
                    <div style={{fontWeight:700}}>{p.name}</div>
                    {p.code && <div style={{fontSize:11,color:'#8A87A0'}}>{p.code}</div>}
                  </td>
                  <td style={st.td}><span style={{fontSize:13}}>{''} {CAT_LABELS[p.category]||p.category}</span></td>
                  <td style={{...st.td,fontWeight:700,color:'#1D9E75'}}>{p.price ? `R$${Number(p.price).toLocaleString('pt-BR')}` : '—'}</td>
                  <td style={{...st.td,color:'#8A87A0'}}>{p.cost ? `R$${Number(p.cost).toLocaleString('pt-BR')}` : '—'}</td>
                  <td style={st.td}><span style={{fontWeight:700,color: margem(p)>30 ? '#1D9E75' : '#D85A30'}}>{p.price>0 ? `${margem(p)}%` : '—'}</span></td>
                  <td style={st.td}><span style={stockStyle}>{stockLabel}</span></td>
                  <td style={st.td}>
                    <div style={{display:'flex',gap:6}}>
                      <button style={st.actBtn} onClick={() => { setEditProd(p); setShowModal(true) }}>Editar</button>
                      <button style={{...st.actBtn,color:'#D85A30',borderColor:'#F5C4B3',display:'flex',alignItems:'center',justifyContent:'center',width:28,padding:'4px'}} onClick={() => del(p.id)}><X size={12} color="#D85A30"/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && salon && (
        <ProdutoModal salonId={salon.id} produto={editProd} onClose={() => setShowModal(false)} onSaved={fetchProdutos} />
      )}
    </div>
  )
}
