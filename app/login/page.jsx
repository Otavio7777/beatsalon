'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode,     setMode]    = useState('login')
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)
  const router = useRouter()
  const sb     = createClient()

  const submit = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return }
    setLoading(true); setError('')
    if (mode === 'login') {
      const { error: e } = await sb.auth.signInWithPassword({ email, password })
      if (e) { setError(e.message === 'Email not confirmed' ? 'E-mail não confirmado.' : e.message); setLoading(false); return }
    } else {
      const { data, error: e } = await sb.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      if (data.user) {
        await sb.from('salons').insert({ name: 'Meu Salão', owner_id: data.user.id, phone: '', plan: 'trial' })
      }
    }
    router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--navy-900)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'var(--font-sans)'}}>
      <div style={{width:'100%',maxWidth:400}}>
        {/* Brand */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontFamily:'var(--font-cursive)',fontSize:40,fontWeight:700,color:'#fff',marginBottom:4}}>
            Meu Salão
          </div>
          <div style={{fontFamily:'var(--font-cursive)',fontSize:16,color:'rgba(255,255,255,.45)'}}>
            by Whatsale
          </div>
        </div>

        {/* Card */}
        <div style={{background:'var(--white)',borderRadius:20,padding:'32px 28px',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <h2 style={{fontSize:20,fontWeight:800,color:'var(--navy-900)',marginBottom:6}}>
            {mode==='login' ? 'Entrar na conta' : 'Criar conta gratuita'}
          </h2>
          <p style={{fontSize:13,color:'var(--muted)',marginBottom:24}}>
            {mode==='login' ? 'Gerencie seu salão com inteligência.' : 'Comece a usar em menos de 1 minuto.'}
          </p>

          <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--border)',fontSize:14,outline:'none',marginBottom:14,color:'var(--text)',boxSizing:'border-box',transition:'border .2s'}}
            onFocus={e=>e.target.style.borderColor='var(--navy-400)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'}
          />

          <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••"
            style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--border)',fontSize:14,outline:'none',marginBottom:20,color:'var(--text)',boxSizing:'border-box',transition:'border .2s'}}
            onFocus={e=>e.target.style.borderColor='var(--navy-400)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'}
            onKeyDown={e=>e.key==='Enter'&&submit()}
          />

          {error && (
            <div style={{background:'var(--danger-light)',border:'1px solid #FCA5A5',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'var(--danger)',fontWeight:600}}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{width:'100%',padding:'13px',background:loading?'var(--navy-300)':'var(--navy-600)',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?'default':'pointer',transition:'background .2s',marginBottom:16}}
          >
            {loading ? 'Aguarde...' : mode==='login' ? 'Entrar' : 'Criar conta'}
          </button>

          <div style={{textAlign:'center',fontSize:13,color:'var(--muted)'}}>
            {mode==='login' ? 'Não tem conta? ' : 'Já tem conta? '}
            <button
              onClick={()=>{setMode(m=>m==='login'?'signup':'login');setError('')}}
              style={{background:'none',border:'none',color:'var(--navy-600)',fontWeight:700,cursor:'pointer',fontSize:13}}
            >
              {mode==='login' ? 'Criar agora' : 'Entrar'}
            </button>
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:24,fontFamily:'var(--font-cursive)',fontSize:14,color:'rgba(255,255,255,.25)'}}>
          Meu Salão by Whatsale
        </div>
      </div>
    </div>
  )
}
