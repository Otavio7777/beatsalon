'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import { AlertTriangle, Search, X, Package, Edit, Trash, Plus } from '../../../lib/icons'

/* ── Categorias ── */
const CATS = [
  { id:'capilar',   label:'Capilar',    color:'#2451A0', bg:'#EEF5FD' },
  { id:'barba',     label:'Barba',      color:'#065F46', bg:'#ECFDF5' },
  { id:'coloracao', label:'Coloração',  color:'#7C3AED', bg:'#F5F3FF' },
  { id:'skincare',  label:'Skincare',   color:'#BE185D', bg:'#FDF2F8' },
  { id:'outro',     label:'Outro',      color:'#475569', bg:'#F8FAFC' },
]
const catInfo = (id) => CATS.find(c => c.id === id) || CATS[4]

/* ── Inicial do produto (avatar) ── */
function ProdAvatar({ name = '?', category }) {
  const cat = catInfo(category)
  const ini = (name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
      background: cat.bg, border: `1.5px solid ${cat.color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, fontWeight: 800, color: cat.color,
    }}>{ini}</div>
  )
}

/* ── Badge de estoque ── */
function StockBadge({ stock, minStock }) {
  const s = stock ?? 0
  const m = minStock ?? 5
  if (s === 0)   return <span style={{fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:700,background:'#FEF2F2',color:'#B91C1C'}}>Sem estoque</span>
  if (s <= m)    return <span style={{fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:700,background:'#FFFBEB',color:'#92400E'}}>{s} — baixo</span>
  return             <span style={{fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:700,background:'#F0FDF4',color:'#166534'}}>{s} un.</span>
}

/* ── Modal de produto ── */
function ProdutoModal({ salonId, produto, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', category: 'capilar', price: '', cost: '',
    stock: '', min_stock: '5', code: '', active: true,
    ...produto,
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...form, salon_id: salonId,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 5,
    }
    const { error } = produto?.id
      ? await sb.from('products').update(payload).eq('id', produto.id)
      : await sb.from('products').insert(payload)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none',
    color: '#0B1E3D', background: '#fff', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const lbl = {
    display: 'block', fontSize: 10, fontWeight: 700, color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4, marginTop: 14,
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Handle bar mobile */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E2E8F0', margin: '0 auto 20px' }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0B1E3D', marginBottom: 4 }}>
          {produto?.id ? 'Editar produto' : 'Novo produto'}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>
          {produto?.id ? 'Altere os dados e salve.' : 'Preencha os dados do produto.'}
        </div>

        <label style={lbl}>Nome do produto *</label>
        <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Shampoo Profissional 500ml" />

        <label style={lbl}>Categoria</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => set('category', c.id)} style={{
              padding: '9px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              border: `1.5px solid ${form.category === c.id ? c.color : '#E2E8F0'}`,
              background: form.category === c.id ? c.bg : '#fff',
              color: form.category === c.id ? c.color : '#64748B',
              fontSize: 12, fontWeight: 700, transition: 'all .15s',
            }}>
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Preço de venda (R$)</label>
            <input style={inp} type="number" inputMode="decimal" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label style={lbl}>Custo (R$)</label>
            <input style={inp} type="number" inputMode="decimal" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label style={lbl}>Estoque atual</label>
            <input style={inp} type="number" inputMode="numeric" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={lbl}>Estoque mínimo</label>
            <input style={inp} type="number" inputMode="numeric" value={form.min_stock} onChange={e => set('min_stock', e.target.value)} placeholder="5" />
          </div>
        </div>

        <label style={lbl}>Código (SKU)</label>
        <input style={inp} value={form.code} onChange={e => set('code', e.target.value)} placeholder="SKU001 — opcional" />

        {/* Ativo toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0B1E3D' }}>Produto ativo</span>
          <div onClick={() => set('active', !form.active)} style={{
            width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
            background: form.active ? '#059669' : '#CBD5E1', transition: 'background .2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute',
              top: 2, left: form.active ? 22 : 2, transition: 'left .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={save} disabled={saving || !form.name.trim()} style={{
            flex: 1, padding: '13px', borderRadius: 11, border: 'none',
            background: saving || !form.name.trim() ? '#E2E8F0' : '#0B1E3D',
            color: saving || !form.name.trim() ? '#94A3B8' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            {saving ? 'Salvando...' : produto?.id ? 'Salvar alterações' : 'Adicionar produto'}
          </button>
          <button onClick={onClose} style={{
            padding: '13px 18px', borderRadius: 11, border: '1.5px solid #E2E8F0',
            background: '#fff', color: '#64748B', fontSize: 13, cursor: 'pointer',
          }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

/* ── Linha de produto no mobile (card) ── */
function ProdCard({ p, margem, onEdit, onDel }) {
  const cat = catInfo(p.category)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 16px', borderBottom: '1px solid #F1F5F9',
    }}>
      <ProdAvatar name={p.name} category={p.category} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0B1E3D', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
          {!p.active && <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 6px', borderRadius: 8, background: '#F1F5F9', color: '#94A3B8', fontWeight: 700 }}>INATIVO</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: cat.bg, color: cat.color }}>{cat.label}</span>
          {p.price > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>R${Number(p.price).toLocaleString('pt-BR')}</span>}
          {p.price > 0 && <span style={{ fontSize: 11, color: margem(p) > 30 ? '#059669' : '#D97706', fontWeight: 600 }}>{margem(p)}% mg</span>}
          <StockBadge stock={p.stock} minStock={p.min_stock} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{
          width: 38, height: 38, borderRadius: 10, border: '1.5px solid #E2E8F0',
          background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Edit size={14} color="#64748B" /></button>
        <button onClick={onDel} style={{
          width: 38, height: 38, borderRadius: 10, border: '1.5px solid #FCA5A5',
          background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Trash size={14} color="#DC2626" /></button>
      </div>
    </div>
  )
}

/* ── Página principal ── */
export default function ProdutosPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editProd, setEditProd]   = useState(null)
  const sb = createClient()

  const load = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const { data } = await sb.from('products').select('*').eq('salon_id', salon.id).order('name')
    setProdutos(data || [])
    setLoading(false)
  }, [salon?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (!salonLoading && !user) window.location.href = '/login' }, [salonLoading, user])

  const del = async (id) => {
    if (!confirm('Remover produto?')) return
    await sb.from('products').delete().eq('id', id)
    load()
  }

  const openEdit = (p) => { setEditProd(p); setShowModal(true) }
  const openNew  = () => { setEditProd(null); setShowModal(true) }

  const filtered = produtos.filter(p => {
    const ms = (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.code || '').toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'todos' || p.category === catFilter
    return ms && mc
  })

  const baixoEstoque = produtos.filter(p => (p.stock ?? 0) <= (p.min_stock ?? 5) && p.active)
  const valorEstoque = produtos.filter(p => p.active).reduce((s, p) => s + (p.stock || 0) * (p.cost || 0), 0)
  const margem = (p) => p.price > 0 ? Math.round((p.price - p.cost) / p.price * 100) : 0
  const margemMedia = () => {
    const ativos = produtos.filter(p => p.price > 0)
    return ativos.length > 0 ? Math.round(ativos.reduce((s, p) => s + margem(p), 0) / ativos.length) : 0
  }

  if (salonLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando...</div>

  return (
    <div className="pg">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 10 }}>
        <div>
          <div className="pg-h1">Produtos</div>
          <div className="pg-sub">Estoque e catálogo · {salon?.name}</div>
        </div>
        <button onClick={openNew} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <Plus size={14} color="#fff" /> Produto
        </button>
      </div>

      {/* ── KPIs — 2 colunas mobile, 4 desktop ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10, marginBottom: 16,
      }}
        className="produtos-kpis"
      >
        {[
          { l: 'Total', v: produtos.length, d: 'cadastrados', c: '#0B1E3D' },
          { l: 'Baixo estoque', v: baixoEstoque.length, d: 'precisam repor', c: baixoEstoque.length > 0 ? '#DC2626' : '#059669' },
          { l: 'Valor em estoque', v: `R$${Math.round(valorEstoque).toLocaleString('pt-BR')}`, d: 'custo total', c: '#2451A0' },
          { l: 'Margem média', v: `${margemMedia()}%`, d: 'de lucro', c: margemMedia() > 30 ? '#059669' : '#D97706' },
        ].map(({ l, v, d, c }) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>

      {/* ── Alerta de estoque baixo ── */}
      {baixoEstoque.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>
              {baixoEstoque.length} produto{baixoEstoque.length > 1 ? 's' : ''} com estoque baixo
            </div>
            <div style={{ fontSize: 11, color: '#B45309' }}>
              {baixoEstoque.map(p => p.name).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* ── Busca ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px', borderRadius: 10,
        border: '1.5px solid #E2E8F0', background: '#fff',
        minHeight: 44, marginBottom: 10,
      }}>
        <Search size={14} color="#94A3B8" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0B1E3D', background: 'transparent' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
            <X size={14} color="#94A3B8" />
          </button>
        )}
      </div>

      {/* ── Filtro categorias — scroll horizontal no mobile ── */}
      <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: 14, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content', paddingRight: 4 }}>
          <button onClick={() => setCatFilter('todos')} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            border: `1.5px solid ${catFilter === 'todos' ? '#0B1E3D' : '#E2E8F0'}`,
            background: catFilter === 'todos' ? '#0B1E3D' : '#fff',
            color: catFilter === 'todos' ? '#fff' : '#64748B',
          }}>
            Todos ({produtos.length})
          </button>
          {CATS.map(cat => (
            <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? 'todos' : cat.id)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1.5px solid ${catFilter === cat.id ? cat.color : '#E2E8F0'}`,
              background: catFilter === cat.id ? cat.bg : '#fff',
              color: catFilter === cat.id ? cat.color : '#64748B',
            }}>
              {cat.label} ({produtos.filter(p => p.category === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de produtos ── */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
          Carregando produtos...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: .25 }}>
            <Package size={40} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1E3D', marginBottom: 6 }}>
            {search || catFilter !== 'todos' ? 'Nenhum produto encontrado' : 'Sem produtos cadastrados'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
            {search ? 'Tente buscar por outro nome ou SKU.' : catFilter !== 'todos' ? `Nenhum produto na categoria ${catInfo(catFilter).label}.` : 'Clique em "+ Produto" para adicionar o primeiro.'}
          </div>
          {!search && catFilter === 'todos' && (
            <button onClick={openNew} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} color="#fff" /> Novo produto
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="produtos-list-mobile" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {filtered.map(p => (
              <ProdCard
                key={p.id}
                p={p}
                margem={margem}
                onEdit={() => openEdit(p)}
                onDel={() => del(p.id)}
              />
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="produtos-table-desktop tbl-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  {['Produto', 'Categoria', 'Preço', 'Custo', 'Margem', 'Estoque', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cat = catInfo(p.category)
                  const mg = margem(p)
                  return (
                    <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ProdAvatar name={p.name} category={p.category} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0B1E3D' }}>
                              {p.name}
                              {!p.active && <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#F1F5F9', color: '#94A3B8', fontWeight: 700 }}>INATIVO</span>}
                            </div>
                            {p.code && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{p.code}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: cat.bg, color: cat.color }}>{cat.label}</span>
                      </td>
                      <td style={{ padding: '13px 14px', fontWeight: 700, color: '#059669', fontSize: 13 }}>
                        {p.price ? `R$${Number(p.price).toLocaleString('pt-BR')}` : '—'}
                      </td>
                      <td style={{ padding: '13px 14px', color: '#94A3B8', fontSize: 13 }}>
                        {p.cost ? `R$${Number(p.cost).toLocaleString('pt-BR')}` : '—'}
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: mg > 30 ? '#059669' : '#D97706' }}>
                          {p.price > 0 ? `${mg}%` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <StockBadge stock={p.stock} minStock={p.min_stock} />
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(p)} style={{
                            padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                            background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748B',
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            <Edit size={12} color="#64748B" /> Editar
                          </button>
                          <button onClick={() => del(p.id)} style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #FCA5A5',
                            background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Trash size={13} color="#DC2626" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && salon && (
        <ProdutoModal
          salonId={salon.id}
          produto={editProd}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
