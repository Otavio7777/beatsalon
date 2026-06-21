'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'
import { Plus, Trash, Check, AlertCircle } from '../../../lib/icons'

const NIVEIS = {
  gestor:    { label:'Gestor',    desc:'Acesso total — pode adicionar admins, excluir contas, alterar tudo.',       cor:'#059669' },
  dev:       { label:'Dev',       desc:'Acesso técnico — pode alterar contas e entrar como manutenção, mas não adicionar admins.',cor:'#2451A0' },
  comercial: { label:'Comercial', desc:'Acesso comercial — pode visualizar contratos e entrar como manutenção.', cor:'#D97706' },
}

export default function AdminsPage() {
  const { adminLevel } = useSalon()
  const [admins,  setAdmins]  = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ email:'', name:'', level:'gestor' })
  const [adding,  setAdding]  = useState(false)
  const [msg,     setMsg]     = useState({ type:'', text:'' })
  const sb = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('admin_emails').select('*').order('created_at')
    setAdmins(data||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const isGestor = adminLevel === 'gestor'

  const showMsg = (type, text) => {
    setMsg({type,text})
    setTimeout(()=>setMsg({type:'',text:''}), 3000)
  }

  const add = async () => {
    if (!isGestor) return
    if (!form.email.trim()||!form.email.includes('@')) { showMsg('err','E-mail inválido.'); return }
    if (admins.find(a=>a.email===form.email.trim())) { showMsg('err','E-mail já cadastrado.'); return }
    setAdding(true)
    const { error } = await sb.from('admin_emails').insert({ email:form.email.trim(), name:form.name.trim(), level:form.level })
    if (error) { showMsg('err', error.message); setAdding(false); return }
    setForm({ email:'', name:'', level:'gestor' })
    load(); setAdding(false)
    showMsg('ok', 'Administrador adicionado.')
  }

  const remove = async (email) => {
    if (!isGestor) return
    if (!confirm(`Remover acesso de ${email}?`)) return
    await sb.from('admin_emails').delete().eq('email', email)
    load(); showMsg('ok', 'Acesso removido.')
  }

  const updateLevel = async (email, level) => {
    if (!isGestor) return
    await sb.from('admin_emails').update({ level }).eq('email', email)
    load()
  }

  const s = {
    h1:  { fontSize:22,fontWeight:800,color:'#fff',marginBottom:4 },
    sub: { fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:24 },
    card:{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'20px',marginBottom:14 },
    h:   { fontSize:14,fontWeight:800,color:'#fff',marginBottom:12 },
    inp: { padding:'9px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit' },
    lbl: { fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',display:'block',marginBottom:5 },
    row: { display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,.05)' },
    sel: { background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',padding:'4px 10px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit' },
  }

  return (
    <div>
      <div style={s.h1}>Administradores</div>
      <div style={s.sub}>Gerencie quem tem acesso ao painel administrativo</div>

      {/* Níveis de acesso */}
      <div style={s.card}>
        <div style={s.h}>Níveis de acesso</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {Object.entries(NIVEIS).map(([k,{label,desc,cor}])=>(
            <div key={k} style={{background:'rgba(255,255,255,.03)',border:`1px solid ${cor}25`,borderRadius:12,padding:'14px'}}>
              <div style={{fontSize:13,fontWeight:800,color:cor,marginBottom:4}}>{label}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.35)',lineHeight:1.5}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar */}
      {isGestor&&(
        <div style={s.card}>
          <div style={s.h}>Adicionar administrador</div>
          {msg.text&&<div style={{background:msg.type==='ok'?'rgba(5,150,105,.12)':'rgba(220,38,38,.12)',border:`1px solid ${msg.type==='ok'?'rgba(5,150,105,.25)':'rgba(220,38,38,.25)'}`,borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:13,color:msg.type==='ok'?'#6EE7B7':'#FCA5A5',display:'flex',gap:8}}>{msg.type==='ok'?<Check size={14} color="#6EE7B7"/>:<AlertCircle size={14} color="#FCA5A5"/>}{msg.text}</div>}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1.5fr 1fr auto',gap:8,alignItems:'flex-end'}}>
            <div>
              <label style={s.lbl}>E-mail *</label>
              <input style={{...s.inp,width:'100%',boxSizing:'border-box'}} type="email" placeholder="admin@empresa.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div>
              <label style={s.lbl}>Nome</label>
              <input style={{...s.inp,width:'100%',boxSizing:'border-box'}} placeholder="Nome do admin" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            </div>
            <div>
              <label style={s.lbl}>Nível</label>
              <select style={{...s.sel,width:'100%'}} value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>
                {Object.entries(NIVEIS).map(([k,{label}])=><option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <button onClick={add} disabled={adding}
              style={{padding:'9px 14px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1E3A6E,#2451A0)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <Plus size={14} color="#fff"/> {adding?'Adicionando...':'Adicionar'}
            </button>
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.2)',marginTop:10}}>Apenas e-mails registrados podem acessar o painel admin.</div>
        </div>
      )}

      {/* Lista */}
      <div style={s.card}>
        <div style={s.h}>Admins ativos ({admins.length})</div>
        {loading ? <div style={{color:'rgba(255,255,255,.3)',textAlign:'center',padding:20}}>Carregando...</div>
        : admins.map((a,i)=>{
          const nivel = NIVEIS[a.level||'gestor']
          return (
            <div key={a.email} style={{...s.row, borderBottom:i<admins.length-1?'1px solid rgba(255,255,255,.05)':'none'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <div style={{fontWeight:700,color:'#fff',fontSize:13}}>{a.name||'—'}</div>
                  {isGestor ? (
                    <select value={a.level||'gestor'} onChange={e=>updateLevel(a.email,e.target.value)} style={s.sel}>
                      {Object.entries(NIVEIS).map(([k,{label}])=><option key={k} value={k}>{label}</option>)}
                    </select>
                  ) : (
                    <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,background:`${nivel.cor}18`,color:nivel.cor,border:`1px solid ${nivel.cor}25`}}>
                      {nivel.label}
                    </span>
                  )}
                </div>
                <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:3}}>{a.email}</div>
                {a.created_at&&<div style={{fontSize:10,color:'rgba(255,255,255,.2)',marginTop:2}}>Adicionado em {new Date(a.created_at).toLocaleDateString('pt-BR')}</div>}
              </div>
              {isGestor&&(
                <button onClick={()=>remove(a.email)}
                  style={{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(220,38,38,.2)',background:'rgba(220,38,38,.08)',color:'#FCA5A5',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                  <Trash size={12} color="#FCA5A5"/> Remover
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
