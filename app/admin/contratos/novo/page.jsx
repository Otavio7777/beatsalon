'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'

export default function NovoContrato() {
  const [step,    setStep]    = useState(1)
  const [form,    setForm]    = useState({ email:'', password:'', confirmPassword:'', salonName:'', phone:'', city:'', plan:'trial' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [created, setCreated] = useState(null)
  const sb = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const criar = async () => {
    setError('')
    if (!form.email||!form.password||!form.salonName) { setError('Preencha todos os campos obrigatórios.'); return }
    if (form.password !== form.confirmPassword)        { setError('As senhas não coincidem.'); return }
    if (form.password.length < 6)                     { setError('Senha deve ter ao menos 6 caracteres.'); return }
    if (!form.email.includes('@'))                     { setError('E-mail inválido.'); return }
    setLoading(true)

    const { data: authData, error: authErr } = await sb.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { salon_name: form.salonName } }
    })
    if (authErr) { setError('Erro ao criar conta: ' + authErr.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Erro ao obter ID do usuário.'); setLoading(false); return }

    const { data: salonData, error: salonErr } = await sb.from('salons').insert({
      name: form.salonName, phone: form.phone, city: form.city,
      plan: form.plan, owner_id: userId, is_active: true,
    }).select().single()

    if (salonErr) { setError('Conta criada mas erro no salão: ' + salonErr.message); setLoading(false); return }

    setCreated({ email: form.email, password: form.password, salon: salonData })
    setStep(2)
    setLoading(false)
  }

  const PLANOS = { trial:'Trial (gratuito)', basic:'Básico', pro:'Pro', enterprise:'Enterprise' }
  const s = {
    lbl: { display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6,marginTop:14 },
    inp: { width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' },
    card:{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:'24px',marginBottom:14 },
    g2:  { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 },
    div: { height:1,background:'rgba(255,255,255,.06)',margin:'20px 0' },
  }

  if (step===2&&created) return (
    <div>
      <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Contrato criado!</div>
      <div style={{fontSize:13,color:'rgba(110,231,183,.7)',marginBottom:24}}>Conta ativa e pronta para uso.</div>

      <div style={{...s.card,border:'1px solid rgba(5,150,105,.25)',background:'rgba(5,150,105,.07)'}}>
        <div style={{fontSize:15,fontWeight:800,color:'#6EE7B7',marginBottom:14}}>Credenciais de acesso</div>
        <div style={{background:'rgba(0,0,0,.3)',borderRadius:10,padding:'14px 16px',fontFamily:'monospace',fontSize:13,lineHeight:2.2}}>
          <span style={{color:'rgba(255,255,255,.4)'}}>E-mail: </span><span style={{color:'#6EE7B7',fontWeight:700}}>{created.email}</span><br/>
          <span style={{color:'rgba(255,255,255,.4)'}}>Senha: </span><span style={{color:'#6EE7B7',fontWeight:700}}>{created.password}</span><br/>
          <span style={{color:'rgba(255,255,255,.4)'}}>Salão: </span><span style={{color:'#fff',fontWeight:700}}>{created.salon?.name}</span>
        </div>
        <div style={{marginTop:10,fontSize:12,color:'rgba(110,231,183,.5)'}}>Compartilhe estas credenciais com o cliente. Ele pode alterar a senha após o primeiro acesso.</div>
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Link href={'/admin/contratos/' + created.salon?.id}
          style={{padding:'10px 20px',background:'rgba(255,255,255,.1)',color:'#fff',borderRadius:10,textDecoration:'none',fontWeight:600,fontSize:13}}>
          Ver contrato →
        </Link>
        <button onClick={()=>{ setStep(1); setForm({email:'',password:'',confirmPassword:'',salonName:'',phone:'',city:'',plan:'trial'}); setCreated(null) }}
          style={{padding:'10px 20px',background:'rgba(5,150,105,.15)',color:'#6EE7B7',borderRadius:10,fontWeight:600,fontSize:13,border:'1px solid rgba(5,150,105,.25)',cursor:'pointer'}}>
          + Criar outro
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <Link href="/admin/contratos" style={{color:'rgba(255,255,255,.4)',fontSize:13,textDecoration:'none',display:'block',marginBottom:16}}>← Contratos</Link>
      <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Criar novo contrato</div>
      <div style={{fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:24}}>Crie a conta e configure o salão do cliente.</div>

      <div style={s.card}>
        <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>Acesso à plataforma</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.25)',marginBottom:4}}>Credenciais que o cliente usará em /login</div>

        <label style={s.lbl}>E-mail do cliente *</label>
        <input style={s.inp} type="email" placeholder="cliente@email.com" value={form.email} onChange={e=>set('email',e.target.value)} />

        <div style={s.g2}>
          <div><label style={s.lbl}>Senha *</label><input style={s.inp} type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e=>set('password',e.target.value)} /></div>
          <div><label style={s.lbl}>Confirmar senha *</label><input style={s.inp} type="password" placeholder="Repita a senha" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)} /></div>
        </div>

        <div style={s.div}/>
        <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>Dados do salão</div>

        <label style={s.lbl}>Nome do salão *</label>
        <input style={s.inp} placeholder="Ex: Studio Bella Hair" value={form.salonName} onChange={e=>set('salonName',e.target.value)} />

        <div style={s.g2}>
          <div><label style={s.lbl}>Telefone</label><input style={s.inp} placeholder="(31) 99999-9999" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          <div><label style={s.lbl}>Cidade</label><input style={s.inp} placeholder="Belo Horizonte" value={form.city} onChange={e=>set('city',e.target.value)} /></div>
        </div>

        <label style={s.lbl}>Plano inicial</label>
        <select style={{...s.inp}} value={form.plan} onChange={e=>set('plan',e.target.value)}>
          {Object.entries(PLANOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>

        {error && <div style={{background:'rgba(220,38,38,.12)',border:'1px solid rgba(220,38,38,.25)',borderRadius:10,padding:'10px 14px',marginTop:16,fontSize:13,color:'#FCA5A5'}}>{error}</div>}

        <button onClick={criar} disabled={loading} style={{
          width:'100%',padding:'13px',marginTop:20,
          background:loading?'rgba(255,255,255,.06)':'linear-gradient(135deg,#1E3A6E,#2451A0)',
          color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?'default':'pointer',
          boxShadow:loading?'none':'0 4px 16px rgba(36,81,160,.4)',
        }}>
          {loading?'Criando conta e salão...':'Criar contrato'}
        </button>
      </div>
    </div>
  )
}
