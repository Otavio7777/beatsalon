'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()
  const sb     = createClient()

  const login = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return }
    setLoading(true); setError('')
    const { error: e } = await sb.auth.signInWithPassword({ email, password })
    if (e) {
      setError('E-mail ou senha incorretos. Fale com o administrador se não tiver acesso.')
      setLoading(false); return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(160deg, #0B1E3D 0%, #122347 60%, #0f1c35 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:20, fontFamily:"'Inter',-apple-system,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box }
        input { font-family: 'Inter', sans-serif }
        input::placeholder { color: #8A9BBE }
        input:focus { border-color: #2451A0 !important; outline: none }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade { animation: fadeUp .4s ease both }
      `}</style>

      {/* Brand */}
      <div className="fade" style={{textAlign:'center', marginBottom:36}}>
        <div style={{
          width:64, height:64, borderRadius:20,
          background:'linear-gradient(135deg,#1E3A6E,#2451A0)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 14px',
          boxShadow:'0 8px 32px rgba(36,81,160,.35)',
        }}>
          <span style={{fontFamily:'Dancing Script,cursive',fontSize:34,color:'#fff',fontWeight:700,lineHeight:1}}>M</span>
        </div>
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:30,fontWeight:700,color:'#fff',lineHeight:1,marginBottom:4}}>
          Meu Salão
        </div>
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:14,color:'rgba(255,255,255,.35)'}}>
          by Whatsale
        </div>
      </div>

      {/* Card */}
      <div className="fade" style={{
        width:'100%', maxWidth:400,
        background:'rgba(255,255,255,.05)',
        border:'1px solid rgba(255,255,255,.09)',
        borderRadius:20, padding:'32px 28px',
        backdropFilter:'blur(20px)',
        boxShadow:'0 24px 60px rgba(0,0,0,.35)',
      }}>
        <h2 style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:6}}>Entrar na conta</h2>
        <p style={{fontSize:13,color:'rgba(255,255,255,.4)',marginBottom:24}}>
          Gerencie seu salão com inteligência.
        </p>

        <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>E-mail</label>
        <input
          type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          style={{
            width:'100%', padding:'11px 14px', borderRadius:10, marginBottom:14,
            border:'1px solid rgba(255,255,255,.12)',
            background:'rgba(255,255,255,.07)', color:'#fff', fontSize:14,
            transition:'border .2s',
          }}
        />

        <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>Senha</label>
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            width:'100%', padding:'11px 14px', borderRadius:10, marginBottom:20,
            border:'1px solid rgba(255,255,255,.12)',
            background:'rgba(255,255,255,.07)', color:'#fff', fontSize:14,
            transition:'border .2s',
          }}
          onKeyDown={e => e.key === 'Enter' && login()}
        />

        {error && (
          <div style={{
            background:'rgba(220,38,38,.12)', border:'1px solid rgba(220,38,38,.25)',
            borderRadius:10, padding:'10px 14px', marginBottom:16,
            fontSize:13, color:'#FCA5A5', fontWeight:500,
          }}>
            {error}
          </div>
        )}

        <button onClick={login} disabled={loading} style={{
          width:'100%', padding:'13px',
          background: loading ? 'rgba(255,255,255,.08)' : 'linear-gradient(135deg,#1E3A6E,#2451A0)',
          color:'#fff', border:'none', borderRadius:12,
          fontSize:15, fontWeight:700, cursor: loading ? 'default' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(36,81,160,.4)',
          transition:'all .2s',
        }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'rgba(255,255,255,.2)',lineHeight:1.6}}>
          Não tem acesso? Entre em contato com o administrador da plataforma.
        </div>
      </div>

      <div style={{marginTop:24,fontFamily:'Dancing Script,cursive',fontSize:13,color:'rgba(255,255,255,.2)'}}>
        Meu Salão by Whatsale © 2026
      </div>
    </div>
  )
}
