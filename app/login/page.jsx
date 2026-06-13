'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mode, setMode]         = useState('login') // login | signup
  const router = useRouter()

  const handle = async () => {
    setLoading(true); setError('')
    const sb = createClient()
    let result

    if (mode === 'login') {
      result = await sb.auth.signInWithPassword({ email, password })
    } else {
      result = await sb.auth.signUp({ email, password })
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    // Se novo cadastro, cria o salão automaticamente
    if (mode === 'signup' && result.data.user) {
      await sb.from('salons').insert({
        name: 'Meu Salão',
        owner_id: result.data.user.id,
      })
    }

    router.push('/dashboard/clientes')
  }

  const st = {
    page:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#16112B' },
    box:   { background:'#fff', borderRadius:20, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
    logo:  { fontSize:24, fontWeight:800, color:'#534AB7', marginBottom:6, textAlign:'center' },
    sub:   { fontSize:13, color:'#8A87A0', marginBottom:32, textAlign:'center' },
    label: { fontSize:12, fontWeight:600, color:'#1A1825', marginBottom:6, display:'block' },
    input: { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #E3E1F0', fontSize:14, color:'#1A1825', outline:'none', marginBottom:14 },
    btn:   { width:'100%', padding:'12px', background:'#534AB7', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', marginTop:8 },
    err:   { fontSize:12, color:'#D85A30', marginTop:8, textAlign:'center' },
    toggle:{ fontSize:12, color:'#534AB7', cursor:'pointer', textAlign:'center', marginTop:16, fontWeight:600 },
  }

  return (
    <div style={st.page}>
      <div style={st.box}>
        <div style={st.logo}>✂ BeatSalon</div>
        <div style={st.sub}>Gestão de relacionamento para salões e barbearias</div>

        <label style={st.label}>E-mail</label>
        <input style={st.input} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />

        <label style={st.label}>Senha</label>
        <input style={st.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()} />

        <button style={st.btn} onClick={handle} disabled={loading}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        {error && <div style={st.err}>{error}</div>}

        <div style={st.toggle} onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}>
          {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tenho conta — fazer login'}
        </div>
      </div>
    </div>
  )
}
