'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

function SetupContent() {
  const params = useSearchParams()
  const router = useRouter()
  const salonId = params.get('salon')
  const email   = params.get('email')
  const name    = params.get('name')

  const [salon,    setSalon]    = useState(null)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const sb = createClient()

  useEffect(() => {
    if (!salonId) return
    sb.from('salons').select('name,logo_url').eq('id', salonId).single()
      .then(({ data }) => setSalon(data))
  }, [salonId])

  const criar = async () => {
    if (!password || password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true); setError('')

    // Tenta fazer signup
    const { data, error: e } = await sb.auth.signUp({ email: decodeURIComponent(email||''), password })
    if (e && !e.message.includes('already')) { setError(e.message); setLoading(false); return }

    // Se já existe, tenta login
    if (e?.message?.includes('already')) {
      const { error: e2 } = await sb.auth.signInWithPassword({ email: decodeURIComponent(email||''), password })
      if (e2) { setError('Este e-mail já tem uma senha definida. Acesse pelo login normal.'); setLoading(false); return }
    }

    // Vincula o user_id ao barbeiro
    const user = data?.user || (await sb.auth.getUser()).data?.user
    if (user) {
      await sb.from('barbers').update({ user_id: user.id })
        .eq('email', decodeURIComponent(email||''))
        .eq('salon_id', salonId)
    }

    router.push('/dashboard')
  }

  const INP = { width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontSize:15, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0B1E3D 0%,#1E3A6E 60%,#0f1c35 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'Inter',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;800&display=swap');input:focus{border-color:rgba(255,255,255,.4)!important;outline:none}`}</style>

      {/* Logo do salão */}
      <div style={{textAlign:'center',marginBottom:28}}>
        {salon?.logo_url
          ? <img src={salon.logo_url} style={{width:64,height:64,borderRadius:20,objectFit:'cover',margin:'0 auto 12px'}}/>
          : <div style={{width:64,height:64,borderRadius:20,background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:28}}>✂️</div>
        }
        <div style={{fontFamily:'Dancing Script,cursive',fontSize:24,color:'#fff',fontWeight:700}}>{salon?.name||'Meu Salão'}</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:2}}>Sistema de gestão · Acesso do barbeiro</div>
      </div>

      <div style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,padding:'28px 24px',backdropFilter:'blur(20px)'}}>
        <div style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:4}}>Olá, {decodeURIComponent(name||'Barbeiro')}!</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:20}}>Crie sua senha para acessar o sistema de {salon?.name||'seu salão'}.</div>

        <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>E-mail de acesso</div>
        <div style={{padding:'10px 16px',background:'rgba(255,255,255,.06)',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',fontSize:13,color:'rgba(255,255,255,.6)',marginBottom:16}}>{decodeURIComponent(email||'')}</div>

        <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Criar senha *</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={{...INP,marginBottom:12}}/>

        <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Confirmar senha *</label>
        <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repita a senha" style={{...INP,marginBottom:16}} onKeyDown={e=>e.key==='Enter'&&criar()}/>

        {error && <div style={{background:'rgba(220,38,38,.12)',border:'1px solid rgba(220,38,38,.25)',borderRadius:9,padding:'9px 14px',marginBottom:14,fontSize:13,color:'#FCA5A5'}}>{error}</div>}

        <button onClick={criar} disabled={loading}
          style={{width:'100%',padding:'13px',borderRadius:12,border:'none',background:loading?'rgba(255,255,255,.08)':'linear-gradient(135deg,#1E3A6E,#2451A0)',color:'#fff',fontSize:15,fontWeight:700,cursor:loading?'not-allowed':'pointer'}}>
          {loading?'Criando acesso...':'Criar minha senha e entrar'}
        </button>

        <div style={{textAlign:'center',marginTop:16,fontSize:12,color:'rgba(255,255,255,.3)'}}>
          Já tem senha? <a href="/login" style={{color:'rgba(255,255,255,.6)',fontWeight:700}}>Fazer login</a>
        </div>
      </div>
    </div>
  )
}

export default function BarberSetup() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#0B1E3D',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.3)'}}>Carregando...</div>}>
      <SetupContent/>
    </Suspense>
  )
}
