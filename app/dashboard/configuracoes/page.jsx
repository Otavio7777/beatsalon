'use client'
import { useState, useEffect, useRef } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { createClient } from '../../../lib/supabase'
import { Settings, Link, Check, AlertCircle } from '../../../lib/icons'

export default function ConfiguracoesPage() {
  const { salon, user, loading: sl } = useSalon()
  const [tab,      setTab]     = useState('perfil')
  const [form,     setForm]    = useState({})
  const [saving,   setSaving]  = useState(false)
  const [saved,    setSaved]   = useState(false)
  const [copied,   setCopied]  = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileRef = useRef()
  const sb = createClient()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (salon) {
      setForm({
        name:        salon.name || '',
        phone:       salon.phone || '',
        address:     salon.address || '',
        city:        salon.city || '',
        state:       salon.state || '',
        zip:         salon.zip || '',
        description: salon.description || '',
        logo_url:    salon.logo_url || '',
        instagram:   salon.instagram || '',
        website:     salon.website || '',
      })
      if (salon.logo_url) setLogoPreview(salon.logo_url)
    }
  }, [salon])

  useEffect(() => { if (!sl && !user) window.location.href = '/login' }, [sl, user])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const bookingLink = salon ? `${origin}/agendar/${salon.id}` : ''

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Logo deve ter no máximo 2MB'); return }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const uploadLogo = async () => {
    if (!logoFile || !salon?.id) return null
    setUploadingLogo(true)

    // Tenta upload via Supabase Storage
    try {
      const ext  = logoFile.name.split('.').pop()
      const path = `${salon.id}/logo.${ext}`
      const { data, error } = await sb.storage.from('salon-assets').upload(path, logoFile, { upsert: true, contentType: logoFile.type })
      if (!error) {
        const { data: { publicUrl } } = sb.storage.from('salon-assets').getPublicUrl(path)
        setUploadingLogo(false)
        return publicUrl
      }
    } catch(e) {}

    // Fallback: base64
    const reader = new FileReader()
    return new Promise(resolve => {
      reader.onloadend = () => { setUploadingLogo(false); resolve(reader.result) }
      reader.readAsDataURL(logoFile)
    })
  }

  const save = async () => {
    if (!salon?.id) return
    setSaving(true); setSaved(false)

    let logo_url = form.logo_url
    if (logoFile) {
      const uploaded = await uploadLogo()
      if (uploaded) logo_url = uploaded
    }

    // Tenta salvar tudo; se falhar (colunas não existem), salva só o básico
    const fullPayload = { ...form, logo_url }
    const { error: e1 } = await sb.from('salons').update(fullPayload).eq('id', salon.id)
    if (e1) {
      // Fallback: apenas campos que certamente existem
      const { error: e2 } = await sb.from('salons').update({ name: form.name, phone: form.phone }).eq('id', salon.id)
      if (e2) console.error('Erro ao salvar:', e2)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const copiar = () => {
    navigator.clipboard.writeText(bookingLink)
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  if (sl) return <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Carregando...</div>

  const inp = { width:'100%', padding:'10px 14px', borderRadius:'var(--radius)', border:'1px solid var(--border)', fontSize:13, outline:'none', color:'var(--text)', background:'var(--white)', boxSizing:'border-box', transition:'border .2s' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5, marginTop:12 }
  const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Configurações</div>
        <div className="pg-sub">Perfil e personalização · {salon?.name}</div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['perfil','Perfil do Salão'],['link','Link de Agendamento'],['horarios','Horários'],['plano','Plano']].map(([k,l])=>(
          <button key={k} className={`tab-btn${tab===k?' active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── PERFIL ── */}
      {tab==='perfil' && (
        <div>
          {/* Logo */}
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Logo e identidade</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>A logo aparece na página pública de agendamento e no painel.</div>

            <div style={{display:'flex',alignItems:'flex-start',gap:20,flexWrap:'wrap'}}>
              {/* Preview */}
              <div style={{flexShrink:0}}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{width:96,height:96,borderRadius:16,objectFit:'cover',border:'2px solid var(--border)'}}/>
                ) : (
                  <div style={{width:96,height:96,borderRadius:16,background:'var(--navy-50)',border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>
                    <div style={{fontSize:32}}>🏪</div>
                    <div style={{fontSize:10,marginTop:4}}>Sem logo</div>
                  </div>
                )}
                {logoPreview && (
                  <button onClick={()=>{setLogoPreview(null);setLogoFile(null);set('logo_url','')}}
                    style={{display:'block',width:'100%',marginTop:8,padding:'5px',borderRadius:6,border:'1px solid var(--border)',background:'#fff',fontSize:11,color:'var(--danger)',cursor:'pointer'}}>
                    Remover
                  </button>
                )}
              </div>

              <div style={{flex:1,minWidth:200}}>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoFile} />
                <button onClick={()=>fileRef.current?.click()} className="btn-primary" style={{marginBottom:10}}>
                  {uploadingLogo ? 'Fazendo upload...' : '📷 Escolher imagem'}
                </button>
                <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
                  Formatos aceitos: JPG, PNG, WebP<br/>
                  Tamanho máximo: 2MB<br/>
                  Recomendado: 400×400px (quadrado)
                </div>
                <div style={{marginTop:10}}>
                  <label style={lbl}>Ou cole a URL de uma imagem</label>
                  <input style={inp} value={form.logo_url||''} onChange={e=>{set('logo_url',e.target.value);setLogoPreview(e.target.value)}} placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>

          {/* Dados básicos */}
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Dados do salão</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Informações exibidas na página pública de agendamento.</div>

            <label style={lbl}>Nome do salão *</label>
            <input style={inp} value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="Nome do seu salão" />

            <label style={lbl}>Descrição / Slogan</label>
            <textarea style={{...inp,height:72,resize:'vertical'}} value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Descreva seu salão em poucas palavras..." />

            <div style={g2}>
              <div>
                <label style={lbl}>Telefone / WhatsApp</label>
                <input style={inp} value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
              </div>
              <div>
                <label style={lbl}>Instagram</label>
                <input style={inp} value={form.instagram||''} onChange={e=>set('instagram',e.target.value)} placeholder="@meusalao" />
              </div>
            </div>

            <label style={lbl}>Website</label>
            <input style={inp} value={form.website||''} onChange={e=>set('website',e.target.value)} placeholder="https://meusalao.com.br" />
          </div>

          {/* Endereço */}
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Endereço</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Exibido na página de agendamento para os clientes.</div>

            <label style={lbl}>Rua / Logradouro</label>
            <input style={inp} value={form.address||''} onChange={e=>set('address',e.target.value)} placeholder="Rua das Flores, 123 — Sala 2" />

            <div style={g2}>
              <div>
                <label style={lbl}>Cidade</label>
                <input style={inp} value={form.city||''} onChange={e=>set('city',e.target.value)} placeholder="Belo Horizonte" />
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <input style={inp} value={form.state||''} onChange={e=>set('state',e.target.value)} placeholder="MG" maxLength={2} />
              </div>
            </div>

            <div style={{maxWidth:200}}>
              <label style={lbl}>CEP</label>
              <input style={inp} value={form.zip||''} onChange={e=>set('zip',e.target.value)} placeholder="00000-000" inputMode="numeric" />
            </div>
          </div>

          {/* Botão salvar */}
          <button onClick={save} disabled={saving||uploadingLogo} className="btn-primary" style={{width:'100%',padding:'13px',fontSize:15,borderRadius:12,justifyContent:'center'}}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo com sucesso!' : 'Salvar alterações'}
          </button>
        </div>
      )}

      {/* ── LINK DE AGENDAMENTO ── */}
      {tab==='link' && (
        <div>
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Link público de agendamento</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Compartilhe com seus clientes para que agendem sem precisar de login.</div>

            <div style={{display:'flex',gap:8,background:'var(--navy-50)',borderRadius:12,padding:'12px 16px',border:'1px solid var(--navy-200)',marginBottom:14}}>
              <span style={{flex:1,fontSize:13,color:'var(--navy-700)',fontWeight:600,wordBreak:'break-all'}}>{bookingLink}</span>
              <button onClick={copiar} className="btn-primary" style={{flexShrink:0,fontSize:12,padding:'6px 14px',background:copied?'var(--success)':'var(--navy-600)'}}>
                {copied?'✓ Copiado!':'Copiar'}
              </button>
            </div>

            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Agende no ${salon?.name}: ${bookingLink}`)}`} target="_blank" rel="noreferrer"
                className="btn-primary" style={{background:'#25D366',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
                💬 Compartilhar no WhatsApp
              </a>
              <button onClick={()=>window.open(bookingLink,'_blank')} className="btn-secondary" style={{display:'flex',alignItems:'center',gap:6}}>
                👁 Visualizar página
              </button>
            </div>

            <div style={{marginTop:14,background:'var(--navy-50)',borderRadius:10,padding:'12px 14px',fontSize:12,color:'var(--navy-700)',lineHeight:1.7}}>
              <strong>Como funciona:</strong> O cliente acessa o link → seleciona o serviço (com preço e duração) → escolhe data e horário (blocos de 1h) → informa nome e WhatsApp → agendamento criado automaticamente e vinculado ao CRM.
            </div>
          </div>

          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>QR Code do link</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Use para imprimir no salão ou adicionar ao seu cardápio digital.</div>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingLink)}`} target="_blank" rel="noreferrer">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingLink)}`} alt="QR Code" style={{width:160,height:160,border:'1px solid var(--border)',borderRadius:12}} />
            </a>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Clique para abrir em tamanho maior.</div>
          </div>
        </div>
      )}

      {/* ── HORÁRIOS ── */}
      {tab==='horarios' && (
        <div className="card">
          <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Configuração de horários</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Gerencie seus horários de atendimento na página dedicada.</div>
          <a href="/dashboard/horarios" className="btn-primary" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14,padding:'11px 20px'}}>
            Ir para Gestão de Horários →
          </a>
          <div style={{marginTop:16,background:'var(--navy-50)',borderRadius:10,padding:'12px 14px',fontSize:12,color:'var(--navy-700)'}}>
            Na gestão de horários você pode configurar os dias e horários de atendimento, bloquear datas específicas e controlar a disponibilidade do link de agendamento.
          </div>
        </div>
      )}

      {/* ── PLANO ── */}
      {tab==='plano' && (
        <div>
          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:4}}>Seu plano atual</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Gerencie sua assinatura.</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:10,background:'var(--navy-100)',borderRadius:12,padding:'12px 18px',marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:18,color:'var(--navy-700)'}}>{(salon?.plan||'trial').toUpperCase()}</div>
              {(salon?.plan||'trial')==='trial' && <span style={{fontSize:11,color:'var(--warning)',fontWeight:700}}>Período de teste</span>}
            </div>
            <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7}}>
              Para alterar seu plano ou gerenciar pagamentos, entre em contato:<br/>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer" style={{color:'var(--navy-600)',fontWeight:700}}>💬 Falar com suporte via WhatsApp</a>
            </div>
          </div>

          <div className="card">
            <div style={{fontWeight:800,fontSize:15,color:'var(--navy-900)',marginBottom:14}}>Informações da conta</div>
            {[
              ['Email', user?.email],
              ['ID do Salão', salon?.id],
              ['Proprietário', user?.id?.slice(0,16) + '...'],
            ].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <span style={{fontSize:13,color:'var(--muted)'}}>{l}</span>
                <span style={{fontSize:12,fontWeight:600,color:'var(--navy-700)',fontFamily:'monospace'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
