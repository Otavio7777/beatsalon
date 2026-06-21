'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'

const PLANOS = {
  trial:      { label:'Trial',      desc:'Gratuito, funcionalidades básicas', cor:'#D97706' },
  basic:      { label:'Básico',     desc:'Ideal para salões pequenos',         cor:'#2451A0' },
  pro:        { label:'Pro',        desc:'Mais recursos e automações',         cor:'#7C3AED' },
  enterprise: { label:'Enterprise', desc:'Sem limites, suporte prioritário',   cor:'#059669' },
}

const S = {
  page:  { maxWidth:640, margin:'0 auto' },
  h1:    { fontSize:22, fontWeight:800, color:'#0B1E3D', marginBottom:4 },
  sub:   { fontSize:13, color:'#64748B', marginBottom:28 },
  card:  { background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, padding:'24px', marginBottom:16 },
  sec:   { fontSize:12, fontWeight:800, color:'#0B1E3D', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:3, marginTop:4 },
  secS:  { fontSize:11, color:'#64748B', marginBottom:14 },
  lbl:   { display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5, marginTop:14 },
  inp:   { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #E2E8F0', fontSize:14, color:'#0B1E3D', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border .2s', background:'#fff' },
  g2:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  div:   { height:1, background:'#F1F5F9', margin:'18px 0' },
  err:   { display:'flex', gap:8, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:9, fontSize:13, color:'#DC2626', fontWeight:600, marginTop:14 },
  ok:    { display:'flex', gap:8, padding:'10px 14px', background:'#D1FAE5', border:'1px solid #6EE7B7', borderRadius:9, fontSize:13, color:'#065F46', fontWeight:600, marginBottom:14 },
  note:  { fontSize:11, color:'#94A3B8', marginTop:8, lineHeight:1.6 },
  planBox:(sel, cor) => ({ padding:'12px 14px', borderRadius:11, border:`2px solid ${sel?cor:'#E2E8F0'}`, background:sel?`${cor}10`:'#fff', cursor:'pointer', transition:'all .15s' }),
}

export default function NovoContrato() {
  const [form, setForm] = useState({ email:'', password:'', confirmPassword:'', salonName:'', phone:'', city:'', plan:'trial' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [created, setCreated] = useState(null)
  const sb  = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const criar = async () => {
    setError('')
    const { email, password, confirmPassword, salonName } = form
    if (!email||!password||!salonName) { setError('Preencha e-mail, senha e nome do salão.'); return }
    if (!email.includes('@'))          { setError('E-mail inválido.'); return }
    if (password.length < 6)          { setError('Senha mínima: 6 caracteres.'); return }
    if (password !== confirmPassword)  { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const { data: authData, error: authErr } = await sb.auth.signUp({
      email, password,
      options: { data: { salon_name: salonName } }
    })
    if (authErr) { setError('Erro ao criar conta: ' + authErr.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Não foi possível obter o ID do usuário.'); setLoading(false); return }

    const { data: salon, error: salonErr } = await sb.from('salons').insert({
      name: salonName.trim(), phone: form.phone.trim(), city: form.city.trim(),
      plan: form.plan, owner_id: userId, is_active: true, onboarding_complete: false,
    }).select().single()

    if (salonErr) { setError('Conta criada, mas erro no salão: ' + salonErr.message); setLoading(false); return }
    setCreated({ email, password, salon }); setLoading(false)
  }

  /* ── Sucesso ── */
  if (created) return (
    <div style={S.page}>
      <Link href="/admin/contratos" style={{display:'inline-flex',alignItems:'center',gap:6,color:'#64748B',fontSize:13,textDecoration:'none',marginBottom:20}}>
        ← Contratos
      </Link>
      <div style={S.h1}>Contrato criado!</div>
      <div style={S.sub}>A conta está ativa e pronta para uso.</div>

      <div style={{...S.card, border:'1px solid #6EE7B7', background:'#F0FDF4'}}>
        <div style={{fontSize:15,fontWeight:800,color:'#065F46',marginBottom:14}}>Credenciais de acesso</div>
        <div style={{background:'#fff',border:'1px solid #D1FAE5',borderRadius:10,padding:'16px',fontFamily:'monospace',fontSize:13,lineHeight:2.2}}>
          <div><span style={{color:'#94A3B8',fontFamily:'Inter,sans-serif',fontSize:11}}>E-MAIL</span></div>
          <div style={{fontWeight:800,color:'#0B1E3D',marginBottom:6}}>{created.email}</div>
          <div><span style={{color:'#94A3B8',fontFamily:'Inter,sans-serif',fontSize:11}}>SENHA INICIAL</span></div>
          <div style={{fontWeight:800,color:'#0B1E3D',marginBottom:6}}>{created.password}</div>
          <div><span style={{color:'#94A3B8',fontFamily:'Inter,sans-serif',fontSize:11}}>SALÃO</span></div>
          <div style={{fontWeight:800,color:'#0B1E3D'}}>{created.salon?.name}</div>
        </div>
        <div style={{fontSize:11,color:'#059669',marginTop:10,lineHeight:1.6}}>
          Anote e envie estas credenciais ao cliente. Ele poderá alterar a senha após o primeiro acesso em <strong>/configuracoes</strong>.
        </div>
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button onClick={()=>setCreated(null)} style={{padding:'10px 20px',background:'#fff',border:'1px solid #E2E8F0',borderRadius:10,fontWeight:600,fontSize:13,color:'#64748B',cursor:'pointer'}}>
          + Criar outro
        </button>
        <Link href={`/admin/contratos/${created.salon?.id}`}
          style={{padding:'10px 20px',background:'#0B1E3D',borderRadius:10,fontWeight:700,fontSize:13,color:'#fff',textDecoration:'none'}}>
          Ver contrato →
        </Link>
      </div>
    </div>
  )

  /* ── Formulário ── */
  return (
    <div style={S.page}>
      <Link href="/admin/contratos" style={{display:'inline-flex',alignItems:'center',gap:6,color:'#64748B',fontSize:13,textDecoration:'none',marginBottom:20}}>
        ← Contratos
      </Link>
      <div style={S.h1}>Criar novo contrato</div>
      <div style={S.sub}>Crie a conta de acesso e configure os dados iniciais do salão cliente.</div>

      <div style={S.card}>
        <div style={S.sec}>Acesso à plataforma</div>
        <div style={S.secS}>Credenciais que o cliente usará para entrar em <code style={{fontSize:11,background:'#F8FAFC',padding:'1px 5px',borderRadius:4}}>/login</code></div>

        <label style={S.lbl}>E-mail do cliente *</label>
        <input style={S.inp} type="email" placeholder="cliente@email.com.br"
          value={form.email} onChange={e=>set('email',e.target.value)} />

        <div style={S.g2}>
          <div>
            <label style={S.lbl}>Senha inicial *</label>
            <input style={S.inp} type="password" placeholder="Mínimo 6 caracteres"
              value={form.password} onChange={e=>set('password',e.target.value)} />
          </div>
          <div>
            <label style={S.lbl}>Confirmar senha *</label>
            <input style={S.inp} type="password" placeholder="Repita a senha"
              value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)} />
          </div>
        </div>

        <div style={S.note}>
          O cliente poderá alterar a senha após o primeiro acesso. Sugerimos usar uma senha padrão temporária.
        </div>
      </div>

      <div style={S.card}>
        <div style={S.sec}>Dados do salão</div>
        <div style={S.secS}>Informações iniciais. O cliente poderá completar o perfil após o acesso.</div>

        <label style={S.lbl}>Nome do salão *</label>
        <input style={S.inp} placeholder="Ex: Studio Bella Hair, Barbearia do João..."
          value={form.salonName} onChange={e=>set('salonName',e.target.value)} />

        <div style={S.g2}>
          <div>
            <label style={S.lbl}>Telefone / WhatsApp</label>
            <input style={S.inp} placeholder="(31) 99999-9999" inputMode="tel"
              value={form.phone} onChange={e=>set('phone',e.target.value)} />
          </div>
          <div>
            <label style={S.lbl}>Cidade</label>
            <input style={S.inp} placeholder="Belo Horizonte"
              value={form.city} onChange={e=>set('city',e.target.value)} />
          </div>
        </div>

        <div style={S.div}/>
        <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Plano inicial</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
          {Object.entries(PLANOS).map(([k,{label,desc,cor}])=>(
            <div key={k} style={S.planBox(form.plan===k, cor)} onClick={()=>set('plan',k)}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:14,height:14,borderRadius:7,border:`2px solid ${cor}`,background:form.plan===k?cor:'transparent',flexShrink:0}}/>
                <span style={{fontSize:13,fontWeight:700,color:form.plan===k?cor:'#0B1E3D'}}>{label}</span>
              </div>
              <div style={{fontSize:11,color:'#64748B',marginTop:4,marginLeft:22}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={S.err}>⚠ {error}</div>}

      <button onClick={criar} disabled={loading} style={{
        width:'100%', padding:'14px', borderRadius:12, border:'none',
        background: loading ? '#E2E8F0' : '#0B1E3D',
        color: loading ? '#94A3B8' : '#fff',
        fontSize:15, fontWeight:700, cursor: loading ? 'default' : 'pointer',
        boxShadow: loading ? 'none' : '0 4px 16px rgba(11,30,61,.2)',
      }}>
        {loading ? 'Criando conta e salão...' : 'Criar contrato'}
      </button>
    </div>
  )
}
