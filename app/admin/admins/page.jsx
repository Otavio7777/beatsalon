'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

export default function AdminsPage() {
  const [admins,  setAdmins]  = useState([])
  const [loading, setLoading] = useState(true)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoNome,  setNovoNome]  = useState('')
  const [adding,  setAdding]  = useState(false)
  const [erro,    setErro]    = useState('')
  const sb = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('admin_emails').select('*').order('created_at')
    setAdmins(data||[])
    setLoading(false)
  }

  useEffect(()=>{ load() },[])

  const add = async () => {
    if (!novoEmail.trim()||!novoEmail.includes('@')) { setErro('E-mail inválido.'); return }
    setAdding(true); setErro('')
    const { error } = await sb.from('admin_emails').insert({ email:novoEmail.trim(), name:novoNome.trim() })
    if (error) { setErro(error.message); setAdding(false); return }
    setNovoEmail(''); setNovoNome('')
    load(); setAdding(false)
  }

  const remove = async (email) => {
    if (!confirm(`Remover acesso admin de ${email}?`)) return
    await sb.from('admin_emails').delete().eq('email', email)
    load()
  }

  const st = {
    h1:  { fontSize:22,fontWeight:800,color:'#fff',marginBottom:4 },
    sub: { fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:24 },
    card:{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'20px',marginBottom:14 },
    inp: { padding:'9px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit' },
    row: { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,.05)' },
  }

  return (
    <div>
      <div style={st.h1}>Administradores</div>
      <div style={st.sub}>E-mails com acesso ao painel administrativo</div>

      {/* Adicionar */}
      <div style={st.card}>
        <div style={{fontSize:14,fontWeight:800,color:'#fff',marginBottom:14}}>Adicionar administrador</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:erro?10:0}}>
          <input style={{...st.inp,flex:2,minWidth:200}} type="email" placeholder="email@empresa.com.br" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} />
          <input style={{...st.inp,flex:1,minWidth:150}} placeholder="Nome (opcional)" value={novoNome} onChange={e=>setNovoNome(e.target.value)} />
          <button onClick={add} disabled={adding} style={{padding:'9px 20px',borderRadius:10,border:'none',background:'rgba(5,150,105,.2)',color:'#6EE7B7',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {adding?'Adicionando...':'Adicionar'}
          </button>
        </div>
        {erro && <div style={{fontSize:12,color:'#FCA5A5',marginTop:6}}>{erro}</div>}
        <div style={{fontSize:12,color:'rgba(255,255,255,.25)',marginTop:10}}>
          ⚠️ Administradores têm acesso total ao painel. Adicione apenas e-mails de confiança.
        </div>
      </div>

      {/* Lista */}
      <div style={st.card}>
        <div style={{fontSize:14,fontWeight:800,color:'#fff',marginBottom:12}}>Admins ativos ({admins.length})</div>
        {loading ? <div style={{color:'rgba(255,255,255,.3)',textAlign:'center',padding:20}}>Carregando...</div>
        : admins.map(a=>(
          <div key={a.email} style={st.row}>
            <div>
              <div style={{fontWeight:700,color:'#fff',fontSize:13}}>{a.name||'—'}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:2}}>{a.email}</div>
              {a.created_at&&<div style={{fontSize:10,color:'rgba(255,255,255,.2)',marginTop:2}}>Adicionado em {new Date(a.created_at).toLocaleDateString('pt-BR')}</div>}
            </div>
            <button onClick={()=>remove(a.email)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid rgba(220,38,38,.2)',background:'rgba(220,38,38,.08)',color:'#FCA5A5',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
