'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const STEPS = [
  { id:1, title:'Bem-vindo!',       sub:'Vamos configurar seu salão em 3 passos.' },
  { id:2, title:'Localização',      sub:'Onde seu salão fica?' },
  { id:3, title:'Identidade visual',sub:'Como seu salão aparece para os clientes.' },
]

export default function OnboardingPage() {
  const [step, setStep]   = useState(1)
  const [salon, setSalon] = useState(null)
  const [form,  setForm]  = useState({ name:'',phone:'',city:'',state:'',address:'',description:'',logo_url:'' })
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileRef = useRef()
  const router  = useRouter()
  const sb      = createClient()
  const set     = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    const init = async () => {
      const { data:{ user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:s } = await sb.from('salons').select('*').eq('owner_id', user.id).single()
      if (!s) { router.push('/login'); return }
      setSalon(s)
      setForm(f => ({ ...f, name:s.name||'', phone:s.phone||'', city:s.city||'', state:s.state||'', address:s.address||'', description:s.description||'', logo_url:s.logo_url||'' }))
      if (s.logo_url) setLogoPreview(s.logo_url)
      // Se já fez onboarding, vai pro dashboard
      if (s.onboarding_complete) { router.push('/dashboard'); return }
    }
    init()
  },[])

  const saveStep = async (nextStep) => {
    if (!salon?.id) return
    setSaving(true)
    await sb.from('salons').update({ ...form, onboarding_complete: nextStep > 3 }).eq('id', salon.id)
    setSaving(false)
    if (nextStep > 3) router.push('/dashboard')
    else setStep(nextStep)
  }

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result
      setLogoPreview(base64)
      set('logo_url', base64)
    }
    reader.readAsDataURL(file)
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: 'Inter', sans-serif; background: #F8FAFC }
    input, select, textarea { font-family: 'Inter', sans-serif }
    input::placeholder, textarea::placeholder { color: #94A3B8 }
    input:focus, textarea:focus, select:focus { border-color: #2451A0 !important; outline: none }
  `

  const inp = { width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid #E2E8F0', fontSize:14, color:'#0B1E3D', background:'#fff', transition:'border .2s', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:6, marginTop:14 }
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:"'Inter',sans-serif", display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>

        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:28}}>
          <img src="/logo-full.svg" alt="Meu Salão" style={{width:160, height:43, objectFit:'contain', display:'block', margin:'0 auto'}} />
        </div>

        {/* Progress */}
        <div style={{display:'flex', gap:8, marginBottom:28}}>
          {STEPS.map(s => (
            <div key={s.id} style={{display:'flex', alignItems:'center', gap:8}}>
              <div style={{
                width:28, height:28, borderRadius:14,
                background: step > s.id ? '#059669' : step===s.id ? '#1B3057' : '#E2E8F0',
                color: step >= s.id ? '#fff' : '#94A3B8',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, transition:'all .3s',
              }}>
                {step > s.id ? '✓' : s.id}
              </div>
              {s.id < 3 && <div style={{width:32, height:2, background: step > s.id ? '#059669' : '#E2E8F0', transition:'background .3s'}}/>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:20, padding:'28px', border:'1px solid #E2E8F0', boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>
          <div style={{fontSize:20, fontWeight:800, color:'#0B1E3D', marginBottom:4}}>{STEPS[step-1].title}</div>
          <div style={{fontSize:13, color:'#64748B', marginBottom:20}}>{STEPS[step-1].sub}</div>

          {/* PASSO 1: Nome e contato */}
          {step===1 && (
            <>
              <div style={{background:'#EFF6FF', borderRadius:12, padding:'14px 16px', marginBottom:18, display:'flex', gap:12, border:'1px solid #BFDBFE'}}>
                <span style={{fontSize:24}}>🎉</span>
                <div>
                  <div style={{fontWeight:700, color:'#1E3A5F', fontSize:14}}>Conta criada com sucesso!</div>
                  <div style={{fontSize:12, color:'#2451A0', marginTop:2}}>Agora vamos personalizar seu salão para começar a usar.</div>
                </div>
              </div>

              <label style={lbl}>Nome do salão *</label>
              <input style={inp} placeholder="Ex: Studio Bella Hair, Barbearia do João..." value={form.name} onChange={e=>set('name',e.target.value)} autoFocus />

              <label style={lbl}>WhatsApp / Telefone</label>
              <input style={inp} placeholder="(00) 00000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)} inputMode="tel" />

              <label style={lbl}>Descrição do salão</label>
              <textarea style={{...inp, height:72, resize:'none'}} placeholder="Ex: Especialistas em cortes masculinos modernos..." value={form.description} onChange={e=>set('description',e.target.value)} />
            </>
          )}

          {/* PASSO 2: Localização */}
          {step===2 && (
            <>
              <label style={lbl}>Endereço / Rua</label>
              <input style={inp} placeholder="Rua das Flores, 123 — Centro" value={form.address} onChange={e=>set('address',e.target.value)} />

              <div style={g2}>
                <div>
                  <label style={lbl}>Cidade</label>
                  <input style={inp} placeholder="Belo Horizonte" value={form.city} onChange={e=>set('city',e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Estado</label>
                  <input style={inp} placeholder="MG" value={form.state} onChange={e=>set('state',e.target.value)} maxLength={2} />
                </div>
              </div>
            </>
          )}

          {/* PASSO 3: Logo */}
          {step===3 && (
            <>
              <div style={{display:'flex', gap:16, alignItems:'flex-start', marginBottom:16}}>
                {logoPreview ? (
                  <img src={logoPreview} alt="" style={{width:80, height:80, borderRadius:16, objectFit:'cover', border:'2px solid #E2E8F0', flexShrink:0}}/>
                ) : (
                  <div style={{width:80, height:80, borderRadius:16, background:'#F1F5F9', border:'2px dashed #CBD5E1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <div style={{fontSize:28}}>🏪</div>
                    <div style={{fontSize:9, color:'#94A3B8', marginTop:4}}>Sem logo</div>
                  </div>
                )}
                <div style={{flex:1}}>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoFile}/>
                  <button onClick={()=>fileRef.current?.click()} style={{padding:'9px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, color:'#1E3A5F', fontWeight:700, fontSize:13, cursor:'pointer', display:'block', marginBottom:8}}>
                    📷 Escolher logo
                  </button>
                  <div style={{fontSize:11, color:'#94A3B8', lineHeight:1.6}}>JPG, PNG ou WebP<br/>Máx 2MB · Quadrada recomendada</div>
                </div>
              </div>

              <label style={lbl}>Ou cole a URL de uma imagem</label>
              <input style={inp} placeholder="https://..." value={form.logo_url} onChange={e=>{set('logo_url',e.target.value);setLogoPreview(e.target.value)}}/>

              <div style={{background:'#D1FAE5', borderRadius:12, padding:'12px 14px', marginTop:14, border:'1px solid #6EE7B7'}}>
                <div style={{fontWeight:700, color:'#065F46', fontSize:13, marginBottom:4}}>Tudo pronto! Aqui está seu resumo:</div>
                <div style={{fontSize:12, color:'#047857', lineHeight:1.8}}>
                  <div><strong>Salão:</strong> {form.name}</div>
                  <div><strong>WhatsApp:</strong> {form.phone||'—'}</div>
                  <div><strong>Cidade:</strong> {form.city||'—'}</div>
                </div>
              </div>
            </>
          )}

          {/* Botões */}
          <div style={{display:'flex', gap:10, marginTop:20}}>
            {step > 1 && (
              <button onClick={()=>setStep(s=>s-1)} style={{padding:'11px 18px', background:'#F1F5F9', border:'none', borderRadius:10, fontSize:14, fontWeight:600, color:'#64748B', cursor:'pointer'}}>
                ← Voltar
              </button>
            )}
            <button
              onClick={()=>saveStep(step+1)}
              disabled={saving || (step===1&&!form.name)}
              style={{
                flex:1, padding:'12px', borderRadius:10, border:'none',
                background: saving||(step===1&&!form.name) ? '#CBD5E1' : 'linear-gradient(135deg,#1B3057,#2451A0)',
                color:'#fff', fontSize:15, fontWeight:700, cursor: saving||(step===1&&!form.name) ? 'default' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(27,48,87,.25)',
              }}>
              {saving ? 'Salvando...' : step===3 ? '✓ Começar a usar!' : 'Próximo →'}
            </button>
          </div>
        </div>

        <div style={{marginTop:20, fontSize:12, color:'#CBD5E1', fontFamily:'Dancing Script,cursive'}}>
          Meu Salão by Whatsale © 2026
        </div>
      </div>
    </>
  )
}
