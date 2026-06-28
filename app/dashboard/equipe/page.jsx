'use client'
import { Users, Scissors, Mail, Smartphone, Key, Check, Eye, Link as LinkIcon, LogIn } from '../../../lib/icons'
import { useState, useEffect } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { barberProfileURL, barberSetupURL } from '../../../lib/config'
import { createClient } from '../../../lib/supabase'

const PLAN_LIMITS = {
  individual: 1, trial: 1, basic: 1,
  equipe: 4, pro: 4,
  supremo: 10, enterprise: 10,
}
const PLAN_NAMES = {
  individual:'Individual', trial:'Trial', equipe:'Equipe', supremo:'Supremo', pro:'Pro', basic:'Básico', enterprise:'Enterprise'
}
const COLORS = ['#1B3057','#059669','#7C3AED','#DC2626','#D97706','#0891B2','#BE185D','#065F46','#1D4ED8','#92400E']

function Avatar({ name, color='#1B3057', size=40 }) {
  const ini = (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
  return (
    <div style={{width:size,height:size,borderRadius:size/2,background:color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.35,fontWeight:800,flexShrink:0}}>
      {ini}
    </div>
  )
}

export default function EquipePage() {
  const { salon } = useSalon()
  const [barbers, setBarbers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding,  setAdding]    = useState(false)
  const [editing, setEditing]   = useState(null)
  const [msg,     setMsg]       = useState(null)
  const [form,    setForm]      = useState({
    name:'', email:'', phone:'', role:'barber',
    commission_type:'percentage', commission_value:40, color:'#1B3057',
  })
  const sb = createClient()

  const planLimit = PLAN_LIMITS[salon?.plan||'individual'] || 1
  const planName  = PLAN_NAMES[salon?.plan||'individual'] || 'Individual'
  const canAdd    = barbers.filter(b=>b.active).length < planLimit

  const load = async () => {
    if (!salon?.id) return
    setLoading(true)
    const { data } = await sb.from('barbers').select('*').eq('salon_id', salon.id).order('created_at')
    setBarbers(data||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [salon?.id])

  const showMsg = (ok, text) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),4000) }

  const enterAsBarber = (barber) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ms_barber_view', JSON.stringify({
        barberId: barber.id,
        barberName: barber.name,
        salonId: salon.id,
      }))
      window.location.href = '/dashboard'
    }
  }

  const save = async () => {
    if (!form.name.trim()) { showMsg(false,'Nome é obrigatório.'); return }
    if (!form.email.trim()||!form.email.includes('@')) { showMsg(false,'E-mail inválido.'); return }
    if (barbers.some(b=>b.email===form.email.trim()&&b.id!==editing)) { showMsg(false,'E-mail já cadastrado nesta equipe.'); return }

    const payload = {
      salon_id: salon.id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role,
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value)||0,
      color: form.color,
      active: true,
    }

    let error
    if (editing) {
      const { error: e } = await sb.rpc('update_barber', {
        p_id: editing,
        p_name: form.name.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_phone: form.phone.trim(),
        p_role: form.role,
        p_commission_type: form.commission_type,
        p_commission_value: Number(form.commission_value)||0,
        p_color: form.color,
        p_active: true,
      })
      error = e
    } else {
      if (!canAdd) { showMsg(false, `Limite de ${planLimit} barbeiro${planLimit>1?'s':''} atingido. Faça upgrade do plano.`); return }
      const { error: e } = await sb.rpc('insert_barber', {
        p_salon_id: salon.id,
        p_name: form.name.trim(),
        p_email: form.email.trim().toLowerCase(),
        p_phone: form.phone.trim(),
        p_role: form.role,
        p_commission_type: form.commission_type,
        p_commission_value: Number(form.commission_value)||0,
        p_color: form.color,
      })
      error = e
    }

    if (error) { showMsg(false, error.message||'Erro ao salvar.'); return }
    showMsg(true, editing ? 'Barbeiro atualizado!' : 'Barbeiro adicionado!')
    setAdding(false); setEditing(null)
    setForm({ name:'', email:'', phone:'', role:'barber', commission_type:'percentage', commission_value:40, color:'#1B3057' })
    load()
  }

  const toggleActive = async (b) => {
    await sb.rpc('update_barber', {
      p_id: b.id, p_name: b.name, p_email: b.email, p_phone: b.phone||'',
      p_role: b.role, p_commission_type: b.commission_type,
      p_commission_value: b.commission_value, p_color: b.color, p_active: !b.active,
    })
    load()
  }

  const startEdit = (b) => {
    setForm({ name:b.name, email:b.email, phone:b.phone||'', role:b.role||'barber',
      commission_type:b.commission_type||'percentage', commission_value:b.commission_value||40, color:b.color||'#1B3057' })
    setEditing(b.id); setAdding(true)
  }

  const cancel = () => {
    setAdding(false); setEditing(null)
    setForm({ name:'', email:'', phone:'', role:'barber', commission_type:'percentage', commission_value:40, color:'#1B3057' })
  }

  const copyLink = (url) => { navigator.clipboard.writeText(url).then(()=>showMsg(true,'Link copiado!')) }

  const INP = { width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', color:'#0B1E3D', boxSizing:'border-box', fontFamily:'inherit', background:'#fff' }
  const LBL = { display:'block', fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5, marginTop:14 }

  if (!salon) return null

  return (
    <div className="pg">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, gap:10 }}>
        <div>
          <div className="pg-h1">Equipe</div>
          <div className="pg-sub">Plano {planName} · {barbers.filter(b=>b.active).length}/{planLimit} barbeiro{planLimit>1?'s':''}</div>
        </div>
        {!adding && canAdd && (
          <button onClick={()=>setAdding(true)} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            + Barbeiro
          </button>
        )}
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:14, fontSize:13, fontWeight:600,
          background: msg.ok ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${msg.ok ? '#BBF7D0' : '#FECACA'}`,
          color: msg.ok ? '#166534' : '#B91C1C',
        }}>{msg.text}</div>
      )}

      {/* Form */}
      {adding && (
        <div style={{ background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:14, padding:'20px', marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#0B1E3D', marginBottom:4 }}>
            {editing ? 'Editar barbeiro' : 'Novo barbeiro'}
          </div>
          <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>O barbeiro receberá um link para criar sua senha de acesso.</div>

          <label style={LBL}>Nome *</label>
          <input style={INP} placeholder="Nome completo" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />

          <label style={LBL}>E-mail *</label>
          <input style={INP} type="email" placeholder="email@exemplo.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />

          <label style={LBL}>Telefone</label>
          <input style={INP} placeholder="(00) 00000-0000" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={LBL}>Cargo</label>
              <select style={{...INP}} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="barber">Barbeiro</option>
                <option value="owner">Proprietário</option>
                <option value="assistant">Assistente</option>
              </select>
            </div>
            <div>
              <label style={LBL}>Comissão (%)</label>
              <input style={INP} type="number" min="0" max="100" value={form.commission_value} onChange={e=>setForm(f=>({...f,commission_value:e.target.value}))} />
            </div>
          </div>

          <label style={LBL}>Cor do avatar</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:2 }}>
            {COLORS.map(c=>(
              <div key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{
                width:28, height:28, borderRadius:8, background:c, cursor:'pointer',
                border: form.color===c ? '3px solid #0B1E3D' : '2px solid transparent',
              }}/>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, marginTop:20 }}>
            <button onClick={save} className="btn-primary" style={{ flex:1 }}>
              {editing ? 'Salvar alterações' : 'Adicionar barbeiro'}
            </button>
            <button onClick={cancel} style={{ padding:'11px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#64748B' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:13 }}>Carregando...</div>
      ) : barbers.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'48px 20px', textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12, opacity:.25 }}><Users size={40}/></div>
          <div style={{ fontSize:14, fontWeight:700, color:'#0B1E3D', marginBottom:6 }}>Nenhum barbeiro cadastrado</div>
          <div style={{ fontSize:12, color:'#64748B', marginBottom:16 }}>Adicione o primeiro membro da equipe.</div>
          {canAdd && <button onClick={()=>setAdding(true)} className="btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>+ Barbeiro</button>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {barbers.map((b,i)=>{
            const setupLink = barberSetupURL(salon.id, b.email, b.name)
            const profileLink = barberProfileURL(b.id)
            return (
              <div key={b.id} style={{
                background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:14,
                padding:'16px', opacity: b.active ? 1 : .55,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <Avatar name={b.name} color={b.color||'#1B3057'} size={44}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'#0B1E3D' }}>{b.name}</div>
                    <div style={{ fontSize:12, color:'#64748B' }}>
                      {b.role==='owner'?'Proprietário':b.role==='assistant'?'Assistente':'Barbeiro'}
                      {b.commission_value > 0 && ` · ${b.commission_value}% comissão`}
                    </div>
                  </div>
                  {!b.active && (
                    <span style={{ fontSize:10, padding:'3px 8px', borderRadius:8, background:'#F1F5F9', color:'#94A3B8', fontWeight:700 }}>INATIVO</span>
                  )}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#64748B' }}>
                    <Mail size={13}/> {b.email}
                  </div>
                  {b.phone && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#64748B' }}>
                      <Smartphone size={13}/> {b.phone}
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color: b.user_id ? '#059669' : '#D97706' }}>
                    <Key size={13}/>
                    {b.user_id ? 'Acesso configurado' : 'Aguardando configuração de senha'}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {/* Entrar como barbeiro */}
                  {b.active && (
                    <button onClick={()=>enterAsBarber(b)} style={{
                      display:'flex', alignItems:'center', gap:5,
                      padding:'7px 12px', borderRadius:9, border:'1.5px solid #2451A0',
                      background:'#EEF5FD', color:'#2451A0', fontSize:12, fontWeight:700, cursor:'pointer',
                    }}>
                      <LogIn size={13}/> Entrar como
                    </button>
                  )}
                  <button onClick={()=>startEdit(b)} style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'7px 12px', borderRadius:9, border:'1.5px solid #E2E8F0',
                    background:'#F8FAFC', color:'#64748B', fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>
                    Editar
                  </button>
                  <button onClick={()=>toggleActive(b)} style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'7px 12px', borderRadius:9,
                    border: b.active ? '1.5px solid #FECACA' : '1.5px solid #BBF7D0',
                    background: b.active ? '#FEF2F2' : '#F0FDF4',
                    color: b.active ? '#B91C1C' : '#166534',
                    fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>
                    {b.active ? 'Desativar' : 'Reativar'}
                  </button>
                  <button onClick={()=>copyLink(setupLink)} style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'7px 12px', borderRadius:9, border:'1.5px solid #E2E8F0',
                    background:'#fff', color:'#64748B', fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>
                    <Key size={12}/> Link de acesso
                  </button>
                  <button onClick={()=>copyLink(profileLink)} style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'7px 12px', borderRadius:9, border:'1.5px solid #E2E8F0',
                    background:'#fff', color:'#64748B', fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>
                    <LinkIcon size={12}/> Link de agendamento
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
