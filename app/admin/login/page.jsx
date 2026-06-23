'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']

export default function AdminLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()
  const sb     = createClient()

  const login = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return }
    setLoading(true); setError('')

    const { data, error: e } = await sb.auth.signInWithPassword({ email, password })
    if (e) { setError('Credenciais inválidas.'); setLoading(false); return }

    if (!ADMIN_EMAILS.includes(data.user?.email)) {
      await sb.auth.signOut()
      setError('Acesso negado. Este e-mail não tem permissão de administrador.')
      setLoading(false); return
    }

    router.push('/admin')
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: 'Inter', sans-serif }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .fade-up { animation: fadeUp .4s ease both }
    input::placeholder { color: rgba(255,255,255,.25) }
    input:focus { border-color: rgba(255,255,255,.35) !important; outline: none }
  `

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight:'100vh',
        background:'radial-gradient(ellipse at 30% 20%, #1a2f5e 0%, #0B1E3D 50%, #060e1f 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20, fontFamily:"'Inter',sans-serif",
      }}>
        <div className="fade-up" style={{width:'100%', maxWidth:400}}>

          {/* Brand */}
          <div style={{textAlign:'center', marginBottom:40}}>
            <div style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width:72, height:72, borderRadius:22,
              background:'linear-gradient(135deg,#1E3A6E,#2451A0)',
              marginBottom:18,
              boxShadow:'0 8px 32px rgba(36,81,160,.4)',
            }}>
              <img src="/logo-mark.svg" alt="M" style={{width:46,height:46,objectFit:'contain',filter:'brightness(0) invert(1)'}} />
            </div>
            <img src="/logo-full.svg" alt="Meu Salão" style={{width:180,height:48,objectFit:'contain',filter:'brightness(0) invert(1)',display:'block',margin:'0 auto'}} />
            <div style={{
              display:'inline-block', marginTop:10,
              fontSize:10, fontWeight:800, letterSpacing:'2px', textTransform:'uppercase',
              color:'#D97706', background:'rgba(217,119,6,.12)',
              border:'1px solid rgba(217,119,6,.25)',
              padding:'4px 14px', borderRadius:20,
            }}>
              Painel Administrativo
            </div>
          </div>

          {/* Card */}
          <div style={{
            background:'rgba(255,255,255,.04)',
            border:'1px solid rgba(255,255,255,.08)',
            borderRadius:20, padding:'32px 28px',
            backdropFilter:'blur(20px)',
            boxShadow:'0 24px 64px rgba(0,0,0,.4)',
          }}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:6}}>
              Acesso restrito
            </h2>
            <p style={{fontSize:13,color:'rgba(255,255,255,.4)',marginBottom:24}}>
              Apenas administradores autorizados.
            </p>

            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>E-mail</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="admin@whatsale.com.br"
                style={{
                  width:'100%',padding:'11px 14px',borderRadius:10,
                  border:'1px solid rgba(255,255,255,.12)',
                  background:'rgba(255,255,255,.06)',
                  color:'#fff',fontSize:14,fontFamily:'inherit',
                  transition:'border .2s',
                }}
              />
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>Senha</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width:'100%',padding:'11px 14px',borderRadius:10,
                  border:'1px solid rgba(255,255,255,.12)',
                  background:'rgba(255,255,255,.06)',
                  color:'#fff',fontSize:14,fontFamily:'inherit',
                  transition:'border .2s',
                }}
                onKeyDown={e=>e.key==='Enter'&&login()}
              />
            </div>

            {error && (
              <div style={{
                background:'rgba(220,38,38,.15)',border:'1px solid rgba(220,38,38,.3)',
                borderRadius:10,padding:'10px 14px',marginBottom:16,
                fontSize:13,color:'#FCA5A5',fontWeight:600,
              }}>
                {error}
              </div>
            )}

            <button onClick={login} disabled={loading} style={{
              width:'100%',padding:'13px',
              background: loading ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#1E3A6E,#2451A0)',
              color:'#fff',border:'none',borderRadius:12,
              fontSize:15,fontWeight:700,cursor:loading?'default':'pointer',
              transition:'all .2s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(36,81,160,.4)',
            }}>
              {loading ? 'Verificando...' : 'Entrar como Admin'}
            </button>
          </div>

          <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'rgba(255,255,255,.2)'}}>
            Acesso monitorado · Meu Salão by Whatsale © 2026
          </div>
        </div>
      </div>
    </>
  )
}
