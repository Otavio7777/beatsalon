'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

const NIVEIS = {
  gestor:    { label:'Gestor',    desc:'Acesso total — adiciona admins, exclui contas, altera tudo.',        cor:'#059669', bg:'#D1FAE5', bd:'#6EE7B7' },
  dev:       { label:'Dev',       desc:'Acesso técnico — altera contas e entra em manutenção, sem adicionar admins.', cor:'#2451A0', bg:'#DBEAFE', bd:'#93C5FD' },
  comercial: { label:'Comercial', desc:'Acesso comercial — visualiza contratos e entra em manutenção.',     cor:'#D97706', bg:'#FEF3C7', bd:'#FCD34D' },
}

const T = { // tokens de estilo
  page: { padding:0 },
  h1:   { fontSize:22, fontWeight:800, color:'#0B1E3D', marginBottom:4 },
  sub:  { fontSize:13, color:'#64748B', marginBottom:24 },
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'20px', marginBottom:16 },
  cH:   { fontSize:15, fontWeight:800, color:'#0B1E3D', marginBottom:4 },
  cS:   { fontSize:12, color:'#64748B', marginBottom:14 },
  lbl:  { display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 },
  inp:  { width:'100%', padding:'9px 14px', borderRadius:9, border:'1px solid #E2E8F0', fontSize:13, color:'#0B1E3D', outline:'none', boxSizing:'border-box', background:'#fff', fontFamily:'inherit' },
  row:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #F1F5F9' },
  note: { fontSize:11, color:'#94A3B8', marginTop:10 },
  msg:  (ok) => ({ display:'flex', gap:8, padding:'9px 14px', background:ok?'#D1FAE5':'#FEE2E2', border:`1px solid ${ok?'#6EE7B7':'#FCA5A5'}`, borderRadius:8, fontSize:13, color:ok?'#065F46':'#991B1B', fontWeight:600, marginBottom:14 }),
}

export default function AdminsPage() {
  const [admins,  setAdmins]  = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ email:'', name:'', level:'gestor' })
  const [adding,  setAdding]  = useState(false)
  const [msg,     setMsg]     = useState(null) // {ok, text}
  const sb = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('admin_emails').select('*').order('created_at')
    setAdmins(data||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const showMsg = (ok, text) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3500) }

  const add = async () => {
    if (!form.email.trim()||!form.email.includes('@')) { showMsg(false,'E-mail inválido.'); return }
    if (admins.find(a=>a.email===form.email.trim())) { showMsg(false,'E-mail já cadastrado.'); return }
    setAdding(true)
    const { error } = await sb.rpc('insert_admin_email', { p_email: form.email.trim(), p_name: form.name.trim()||form.email.trim(), p_level: form.level })
    setAdding(false)
    if (error) { showMsg(false, error.message); return }
    setForm({ email:'', name:'', level:'gestor' })
    showMsg(true, 'Administrador adicionado com sucesso.')
    load()
  }

  const remove = async (email) => {
    if (!confirm(`Remover acesso de ${email}?`)) return
    await sb.rpc('delete_admin_email', { p_email: email })
    showMsg(true, 'Acesso removido.'); load()
  }

  const updateLevel = async (email, level) => {
    // Reutiliza insert_admin_email que faz UPSERT
    const existing = admins.find(a=>a.email===email)
    await sb.rpc('insert_admin_email', { p_email: email, p_name: existing?.name||email, p_level: level })
    load()
  }

  return (
    <div>
      <div style={T.h1}>Administradores</div>
      <div style={T.sub}>Gerencie quem tem acesso ao painel administrativo da plataforma</div>

      {/* Níveis */}
      <div style={T.card}>
        <div style={T.cH}>Níveis de acesso</div>
        <div style={T.cS}>Cada nível define o que o administrador pode fazer dentro do painel.</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
          {Object.entries(NIVEIS).map(([k,{label,desc,cor,bg,bd}])=>(
            <div key={k} style={{padding:'14px 16px', background:bg, border:`1px solid ${bd}`, borderRadius:12}}>
              <div style={{fontSize:14, fontWeight:800, color:cor, marginBottom:6}}>{label}</div>
              <div style={{fontSize:12, color:'#475569', lineHeight:1.6}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar */}
      <div style={T.card}>
        <div style={T.cH}>Adicionar novo administrador</div>
        <div style={T.cS}>O e-mail informado terá acesso ao painel administrativo.</div>
        {msg && <div style={T.msg(msg.ok)}>{msg.text}</div>}
        <div style={{display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr auto', gap:10, alignItems:'flex-end'}}>
          <div>
            <label style={T.lbl}>E-mail *</label>
            <input style={T.inp} type="email" placeholder="admin@email.com.br" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&add()} />
          </div>
          <div>
            <label style={T.lbl}>Nome</label>
            <input style={T.inp} placeholder="Nome completo" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label style={T.lbl}>Nível</label>
            <select style={{...T.inp, cursor:'pointer'}} value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>
              {Object.entries(NIVEIS).map(([k,{label}])=><option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <button onClick={add} disabled={adding} style={{padding:'9px 18px', borderRadius:9, border:'none', background:'#0B1E3D', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', height:37}}>
            {adding?'Adicionando...':'+ Adicionar'}
          </button>
        </div>
        <div style={T.note}>Atenção: administradores têm acesso a dados de todos os salões. Adicione apenas e-mails de confiança.</div>
      </div>

      {/* Lista */}
      <div style={T.card}>
        <div style={T.cH}>Admins ativos ({admins.length})</div>
        {loading ? (
          <div style={{textAlign:'center', color:'#64748B', padding:20, fontSize:13}}>Carregando...</div>
        ) : admins.length===0 ? (
          <div style={{textAlign:'center', color:'#94A3B8', padding:20, fontSize:13}}>Nenhum administrador cadastrado.</div>
        ) : admins.map((a,i)=>{
          const nivel = NIVEIS[a.level||'gestor']
          return (
            <div key={a.email} style={{...T.row, borderBottom:i<admins.length-1?'1px solid #F1F5F9':'none', gap:16, flexWrap:'wrap'}}>
              <div style={{display:'flex', alignItems:'center', gap:12, flex:1}}>
                <div style={{width:40, height:40, borderRadius:20, background:'#0B1E3D', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, flexShrink:0}}>
                  {(a.name||a.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:14, fontWeight:700, color:'#0B1E3D'}}>{a.name||'—'}</div>
                  <div style={{fontSize:12, color:'#64748B', marginTop:2}}>{a.email}</div>
                  {a.created_at && <div style={{fontSize:11, color:'#94A3B8', marginTop:1}}>Desde {new Date(a.created_at).toLocaleDateString('pt-BR')}</div>}
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <select value={a.level||'gestor'} onChange={e=>updateLevel(a.email,e.target.value)}
                  style={{padding:'6px 12px', borderRadius:8, border:`1px solid ${nivel.bd}`, background:nivel.bg, color:nivel.cor, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit'}}>
                  {Object.entries(NIVEIS).map(([k,{label}])=><option key={k} value={k}>{label}</option>)}
                </select>
                <button onClick={()=>remove(a.email)}
                  style={{padding:'6px 14px', borderRadius:8, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#DC2626', fontSize:12, fontWeight:700, cursor:'pointer'}}>
                  Remover
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
