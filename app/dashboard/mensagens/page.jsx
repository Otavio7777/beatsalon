'use client'
import { useState, useEffect } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { createClient } from '../../../lib/supabase'
import { Gift, Calendar, Bell, Send, MessageSquare, AlertTriangle, Check } from '../../../lib/icons'

const TIPOS = [
  {
    id:'aniversario',
    label:'Aniversário',
    desc:'Enviada automaticamente no dia do aniversário do cliente',
    Icon: Gift,
    default:'Feliz aniversário, {nome}! 🎂 Que o seu dia seja incrível! Como presente especial, temos um mimo para você na sua próxima visita ao {salao}. Agende pelo link: {link}',
    vars:['{nome}','{salao}','{link}'],
  },
  {
    id:'agendamento',
    label:'Confirmação de agendamento',
    desc:'Enviada logo após o cliente realizar um agendamento online',
    Icon: Calendar,
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

  { id:'segmento', label:'Enviar por segmento', desc:'Selecione clientes e envie mensagens personalizadas com dados reais', Icon: Send,
    default:'Olá {nome}! Temos novidades especiais para você em {salao}. Que tal agendar? {link}',
    vars:['{nome}','{salao}','{link}'],
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
        <div style={{ fontSize:10, color:'#94A3B8', textAlign:'right', marginTop:4, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:1 }}>14:30 <Check size={9} color="#94A3B8"/><Check size={9} color="#94A3B8"/></div>
      </div>
    </div>
  )
}

export default function MensagensPage() {
  const { salon, isBarber } = useSalon()
  const [tab,     setTab]     = useState('aniversario')
  const [texts,   setTexts]   = useState({})
  const [active,  setActive]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [clientesSeg, setClientesSeg] = useState([])
  const [loadingCli, setLoadingCli]   = useState(false)
  const [selectedCli, setSelectedCli] = useState([])
  const sb = createClient()

  const tipo = TIPOS.find(t=>t.id===tab)

  // Carrega clientes para envio segmentado
  const loadClientes = async () => {
    if (!salon?.id) return
    setLoadingCli(true)
    const { data } = await sb.from('clients')
      .select('id,name,phone,status,last_visit,visit_count,birth_date')
      .eq('salon_id', salon.id)
      .order('name')
    setClientesSeg(data||[])
    setLoadingCli(false)
  }

  useEffect(() => {
    if (tab === 'segmento') loadClientes()
  },[tab, salon?.id])

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
            <span style={{marginRight:4}}>{t.Icon && <t.Icon size={16} color="currentColor"/>}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start'}}>
        {/* Editor */}
        <div style={{flex:'1 1 300px', minWidth:0}}>
          {isBarber && (
            <div style={{padding:'10px 14px',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:10,marginBottom:14,fontSize:12,color:'#92400E',fontWeight:600}}>
              <span style={{display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={13} color="var(--warning)"/> Visualização apenas. Barbeiros não podem editar os templates de mensagem.</span>
            </div>
          )}
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


            {/* Envio por segmento */}
            {tab === 'segmento' && (
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>
                  Selecionar destinatários
                </div>
                {loadingCli
                  ? <div style={{color:'var(--muted)',fontSize:13}}>Carregando clientes...</div>
                  : (
                    <div style={{maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10}}>
                      {clientesSeg.length===0
                        ? <div style={{padding:16,textAlign:'center',color:'var(--muted)',fontSize:13}}>Nenhum cliente cadastrado.</div>
                        : clientesSeg.map(cl => {
                          const sel = selectedCli.includes(cl.id)
                          const phone = cl.phone?.replace(/\D/g,'')
                          const hasPhone = phone?.length >= 10
                          return (
                            <div key={cl.id} onClick={()=>hasPhone&&setSelectedCli(p=>sel?p.filter(x=>x!==cl.id):[...p,cl.id])}
                              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'1px solid var(--gray-100)',cursor:hasPhone?'pointer':'not-allowed',background:sel?'var(--navy-50)':hasPhone?'transparent':'#FAFAFA',opacity:hasPhone?1:.5}}>
                              <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${sel?'var(--navy-600)':'var(--border)'}`,background:sel?'var(--navy-600)':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                {sel&&<Check size={10} color="#fff"/>}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{cl.name}</div>
                                <div style={{fontSize:11,color:'var(--muted)'}}>{hasPhone?`(${phone.slice(0,2)}) ${phone.slice(2)}`:'Sem telefone'} · {cl.visit_count||0} visitas</div>
                              </div>
                              <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,fontWeight:600,background:cl.status==='ativo'?'var(--success-light)':'var(--gray-100)',color:cl.status==='ativo'?'var(--success)':'var(--muted)'}}>{cl.status||'ativo'}</span>
                            </div>
                          )
                        })
                      }
                    </div>
                  )
                }
                {selectedCli.length>0 && (
                  <div style={{marginTop:12,padding:'10px 14px',background:'var(--navy-50)',borderRadius:10,border:'1px solid var(--navy-200)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                    <div style={{fontSize:12,color:'var(--navy-700)',fontWeight:600}}>{selectedCli.length} cliente{selectedCli.length!==1?'s':''} selecionado{selectedCli.length!==1?'s':''}</div>
                    <a href={`https://wa.me/?text=${encodeURIComponent(previewText(texts[tab]||tipo?.default||''))}`} target="_blank" rel="noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:7,padding:'8px 14px',background:'#25D366',borderRadius:9,color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>
                      <MessageSquare size={13} color="currentColor"/> Abrir WhatsApp
                    </a>
                  </div>
                )}
              </div>
            )}
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

          <button onClick={save} disabled={saving||isBarber} className="btn-primary" style={{width:'100%',padding:'13px',fontSize:14,borderRadius:12,justifyContent:'center',marginTop:12}}>
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
