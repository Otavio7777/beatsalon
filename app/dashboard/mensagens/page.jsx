'use client'
import { useState, useEffect } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { createClient } from '../../../lib/supabase'
import { MessageSquare, Check } from '../../../lib/icons'

const TIPOS = [
  {
    id:'aniversario',
    label:'Aniversário',
    desc:'Enviada automaticamente no dia do aniversário do cliente',
    icon:'🎂',
    default:'Feliz aniversário, {nome}! 🎂 Que o seu dia seja incrível! Como presente especial, temos um mimo para você na sua próxima visita ao {salao}. Agende pelo link: {link}',
    vars:['{nome}','{salao}','{link}'],
  },
  {
    id:'agendamento',
    label:'Confirmação de agendamento',
    desc:'Enviada logo após o cliente realizar um agendamento online',
    icon:'📅',
    default:'Olá {nome}! ✅ Seu agendamento em *{salao}* está confirmado!\n\n📌 Serviço: {servico}\n📅 Data: {data}\n⏰ Horário: {hora}\n\nQualquer dúvida, fale conosco. Até lá! 😊',
    vars:['{nome}','{salao}','{servico}','{data}','{hora}'],
  },
  {
    id:'pre_atendimento',
    label:'Lembrete pré-atendimento',
    desc:'Enviada 24h antes do agendamento como lembrete',
    icon:'⏰',
    default:'Oi {nome}! 👋 Lembrando do seu horário amanhã às *{hora}* para *{servico}* em {salao}.\n\nEstamos te esperando! Caso precise reagendar, avisa com antecedência. 😊',
    vars:['{nome}','{salao}','{servico}','{hora}'],
  },
  {
    id:'pos_atendimento',
    label:'Mensagem pós-atendimento',
    desc:'Enviada após conclusão do atendimento',
    icon:'⭐',
    default:'Obrigado pela visita, {nome}! 🙏 Foi um prazer te atender em *{salao}*.\n\nEsperamos que tenha gostado do resultado! Para reagendar ou tirar dúvidas, é só chamar aqui. 😊',
    vars:['{nome}','{salao}'],
  },
]

function PhonePreview({ text }) {
  const formatado = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>').replace(/\n/g,'<br/>')
  return (
    <div style={{ background:'#ECE5DD', borderRadius:12, padding:'12px', minHeight:80 }}>
      <div style={{ background:'#fff', borderRadius:'12px 12px 12px 4px', padding:'10px 14px', display:'inline-block', maxWidth:'85%', boxShadow:'0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize:13, color:'#1C1C1C', lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: formatado||'Digite a mensagem...' }}/>
        <div style={{ fontSize:10, color:'#94A3B8', textAlign:'right', marginTop:4 }}>14:30 ✓✓</div>
      </div>
    </div>
  )
}

export default function MensagensPage() {
  const { salon } = useSalon()
  const [tab,     setTab]     = useState('aniversario')
  const [texts,   setTexts]   = useState({})
  const [active,  setActive]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const sb = createClient()

  const tipo = TIPOS.find(t=>t.id===tab)

  useEffect(() => {
    if (!salon?.id) return
    sb.from('message_templates').select('*').eq('salon_id', salon.id)
      .then(({ data }) => {
        const t = {}, a = {}
        TIPOS.forEach(tp => {
          const row = data?.find(r=>r.type===tp.id)
          t[tp.id] = row?.message || tp.default
          a[tp.id] = row?.active ?? true
        })
        setTexts(t); setActive(a)
      })
  },[salon?.id])

  const save = async () => {
    if (!salon?.id) return
    setSaving(true); setSaved(false)
    // Upsert
    for (const tp of TIPOS) {
      const { data: existing } = await sb.from('message_templates').select('id').eq('salon_id',salon.id).eq('type',tp.id).maybeSingle()
      if (existing) {
        await sb.from('message_templates').update({ message:texts[tp.id]||tp.default, active:active[tp.id]??true, updated_at:new Date().toISOString() }).eq('id',existing.id)
      } else {
        await sb.from('message_templates').insert({ salon_id:salon.id, type:tp.id, message:texts[tp.id]||tp.default, active:active[tp.id]??true })
      }
    }
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),3000)
  }

  const insertVar = (v) => {
    const el = document.getElementById('msg-textarea')
    if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    const newText = (texts[tab]||'').slice(0,s) + v + (texts[tab]||'').slice(e)
    setTexts(t=>({...t,[tab]:newText}))
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+v.length,s+v.length) },0)
  }

  const waHref = (text) => {
    const link = typeof window !== 'undefined'
      ? `${window.location.origin}/agendar/${salon?.id||''}`
      : `beatsalon.vercel.app/agendar/${salon?.id||''}`
    const preview = (text||'')
      .replace(/\{nome\}/g,'Maria Silva')
      .replace(/\{salao\}/g, salon?.name||'Meu Salão')
      .replace(/\{servico\}/g,'Corte + Barba')
      .replace(/\{data\}/g,'Segunda, 23/06')
      .replace(/\{hora\}/g,'14:00')
      .replace(/\{link\}/g, link)
    return `https://wa.me/?text=${encodeURIComponent(preview)}`
  }

  // Preview com substituição real
  const previewText = (text) => {
    const link = typeof window !== 'undefined'
      ? `${window.location.origin}/agendar/${salon?.id||''}`
      : ''
    return (text||'')
      .replace(/\{nome\}/g,'Maria Silva')
      .replace(/\{salao\}/g, salon?.name||'Meu Salão')
      .replace(/\{servico\}/g,'Corte + Barba')
      .replace(/\{data\}/g,'Segunda, 23/06')
      .replace(/\{hora\}/g,'14:00')
      .replace(/\{link\}/g, link)
  }

  return (
    <div className="pg">
      <div className="pg-hd">
        <div className="pg-h1">Mensagens</div>
        <div className="pg-sub">Configure as mensagens automáticas enviadas via WhatsApp · {salon?.name}</div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{marginBottom:20}}>
        {TIPOS.map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            <span style={{marginRight:4}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start'}}>
        {/* Editor */}
        <div style={{flex:'1 1 300px', minWidth:0}}>
          <div className="card">
            <div style={{fontSize:15,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>{tipo?.icon} {tipo?.label}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>{tipo?.desc}</div>

            {/* Toggle ativo */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,padding:'10px 12px',background:'var(--gray-50)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Mensagem ativa</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Será enviada automaticamente quando aplicável</div>
              </div>
              <button onClick={()=>setActive(a=>({...a,[tab]:!a[tab]}))}
                style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',background:active[tab]?'var(--navy-600)':'#CBD5E1',transition:'background .2s'}}>
                <div style={{position:'absolute',top:2,left:active[tab]?'50%':'4%',width:20,height:20,borderRadius:10,background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
              </button>
            </div>

            {/* Variáveis disponíveis */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Variáveis disponíveis</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {tipo?.vars.map(v=>(
                  <button key={v} onClick={()=>insertVar(v)}
                    style={{padding:'3px 10px',borderRadius:6,border:'1px solid var(--navy-200)',background:'var(--navy-50)',color:'var(--navy-700)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'monospace'}}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              id="msg-textarea"
              value={texts[tab]||tipo?.default||''}
              onChange={e=>setTexts(t=>({...t,[tab]:e.target.value}))}
              style={{width:'100%',height:180,padding:'12px 14px',borderRadius:10,border:'1px solid var(--border)',fontSize:13,color:'var(--text)',resize:'vertical',fontFamily:'inherit',outline:'none',lineHeight:1.6,boxSizing:'border-box'}}
              placeholder="Digite a mensagem..."
            />

            {/* Formatos */}
            <div style={{fontSize:11,color:'var(--muted)',marginTop:6,lineHeight:1.7}}>
              Use *texto* para <strong>negrito</strong> no WhatsApp. Quebras de linha funcionam normalmente.
            </div>
          </div>

          <button onClick={save} disabled={saving} className="btn-primary" style={{width:'100%',padding:'13px',fontSize:14,borderRadius:12,justifyContent:'center',marginTop:12}}>
            {saving?'Salvando...' : saved?<><Check size={14} color="#fff" style={{marginRight:6}}/>Salvo!</>:'Salvar todas as mensagens'}
          </button>
        </div>

        {/* Preview */}
        <div style={{flex:'1 1 280px', minWidth:0}}>
          <div className="card">
            <div style={{fontSize:14,fontWeight:800,color:'var(--navy-900)',marginBottom:4}}>Preview — WhatsApp</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>Exemplo com dados fictícios</div>
            <PhonePreview text={previewText(texts[tab]||tipo?.default||'')} />
            <div style={{marginTop:14,display:'flex',gap:10,flexWrap:'wrap'}}>
              <a href={waHref(texts[tab]||tipo?.default)} target="_blank" rel="noreferrer" className="btn-primary" style={{fontSize:12,padding:'8px 16px',display:'inline-flex',alignItems:'center',gap:6,background:'#25D366',border:'none'}}>
                <MessageSquare size={13} color="#fff"/> Testar no WhatsApp
              </a>
            </div>
          </div>

          {/* Instruções */}
          <div className="card" style={{marginTop:14}}>
            <div style={{fontSize:13,fontWeight:800,color:'var(--navy-900)',marginBottom:10}}>Como funciona</div>
            {[
              ['Aniversário','Enviada no dia do aniversário do cliente (data cadastrada no CRM)'],
              ['Confirmação','Enviada automaticamente após o cliente fazer agendamento online'],
              ['Pré-atendimento','Enviada 24h antes do horário — use os lembretes na Agenda'],
              ['Pós-atendimento','Enviada ao marcar o atendimento como concluído — via botão na Agenda'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <div style={{width:6,height:6,borderRadius:3,background:'var(--navy-400)',flexShrink:0,marginTop:5}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--navy-700)'}}>{k}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
