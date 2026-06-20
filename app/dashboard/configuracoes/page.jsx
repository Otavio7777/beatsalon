'use client'
import { useState, useEffect } from 'react'
import { useSalon } from '../../../lib/useSalon'
import { createClient } from '../../../lib/supabase'

export default function ConfiguracoesPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [editando, setEditando] = useState(false)
  const [nomeSalao, setNomeSalao] = useState('')
  const [foneSalao, setFoneSalao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const sb = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    if (!salonLoading && !user) window.location.href = '/login'
  }, [salonLoading, user])

  useEffect(() => {
    if (salon) { setNomeSalao(salon.name || ''); setFoneSalao(salon.phone || '') }
  }, [salon])

  const bookingLink = salon ? `${origin}/agendar/${salon.id}` : ''

  const copiar = () => {
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const salvarSalao = async () => {
    if (!nomeSalao.trim() || !salon?.id) return
    setSalvando(true)
    await sb.from('salons').update({ name: nomeSalao, phone: foneSalao }).eq('id', salon.id)
    setSalvando(false)
    setEditando(false)
    window.location.reload()
  }

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Agende seu horário em ${salon?.name}: ${bookingLink}`)}`

  const st = {
    page:   { padding:'28px 32px', maxWidth:700 },
    h1:     { fontSize:24, fontWeight:800, color:'#1A1825' },
    sub:    { fontSize:13, color:'#8A87A0', marginTop:3, marginBottom:28 },
    card:   { background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #E3E1F0', marginBottom:16 },
    cardHd: { fontSize:16, fontWeight:800, marginBottom:4 },
    cardSb: { fontSize:12, color:'#8A87A0', marginBottom:16 },
    label:  { fontSize:11, fontWeight:700, color:'#8A87A0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, display:'block', marginTop:14 },
    input:  { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #E3E1F0', fontSize:14, outline:'none', color:'#1A1825', boxSizing:'border-box' },
    linkBox:{ display:'flex', alignItems:'center', gap:8, background:'#F2F1F8', borderRadius:12, padding:'12px 16px', border:'1px solid #E3E1F0', marginBottom:14 },
    linkTxt:{ flex:1, fontSize:13, color:'#534AB7', fontWeight:600, wordBreak:'break-all' },
    copyBtn:{ padding:'8px 16px', background:'#534AB7', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 },
    shareRow:{ display:'flex', gap:10, flexWrap:'wrap' },
    shareBtn:(bg,c)=>({ padding:'10px 18px', background:bg, color:c, border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }),
    infoRow:{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #F2F1F8' },
    infoLbl:{ fontSize:13, color:'#8A87A0' },
    infoVal:{ fontSize:13, fontWeight:700, color:'#1A1825' },
    saveBtn:{ padding:'9px 20px', background:'#534AB7', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', marginTop:16 },
    editBtn:{ padding:'8px 16px', background:'#F2F1F8', color:'#534AB7', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer' },
    badge:  { fontSize:12, padding:'3px 10px', borderRadius:20, background:'#E1F5EE', color:'#085041', fontWeight:700 },
  }

  if (salonLoading) return <div style={{padding:40,color:'#8A87A0',textAlign:'center'}}>Carregando...</div>

  return (
    <div className="pg">
      <div className="pg-h1">Configurações</div>
      <div className="pg-sub">Gerencie seu salão e link de agendamento · {salon?.name}</div>

      {/* Link de agendamento */}
      <div style={st.card}>
        <div style={st.cardHd}>Link de agendamento público</div>
        <div style={st.cardSb}>Compartilhe este link com seus clientes para que eles agendem diretamente, sem precisar de login.</div>

        {bookingLink ? (
          <>
            <div style={st.linkBox}>
              <span style={st.linkTxt}>{bookingLink}</span>
              <button style={{...st.copyBtn, background: copied ? '#1D9E75' : '#534AB7'}} onClick={copiar}>
                {copied ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>

            <div style={st.shareRow}>
              <a href={whatsappLink} target="_blank" rel="noreferrer"
                style={{textDecoration:'none',...st.shareBtn('#25D366','#fff')}}>
                💬 Compartilhar no WhatsApp
              </a>
              <button style={st.shareBtn('#F2F1F8','#534AB7')} onClick={() => window.open(`/agendar/${salon.id}`, '_blank')}>
                👁️ Visualizar página
              </button>
            </div>

            <div style={{marginTop:16, background:'#E6F1FB', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#0C447C'}}>
              <strong>Como funciona:</strong> O cliente acessa o link → escolhe o serviço → seleciona data e horário (blocos de 1 hora) → informa nome e telefone → agendamento criado automaticamente na sua Agenda.
            </div>
          </>
        ) : (
          <div style={{color:'#8A87A0',textAlign:'center',padding:20}}>Carregando link...</div>
        )}
      </div>

      {/* Configurações do horário */}
      <div style={st.card}>
        <div style={st.cardHd}>Horários disponíveis</div>
        <div style={st.cardSb}>Configuração atual dos slots de agendamento online.</div>
        <div style={st.infoRow}>
          <span style={st.infoLbl}>Horário de funcionamento</span>
          <span style={st.infoVal}>08:00 – 18:00</span>
        </div>
        <div style={st.infoRow}>
          <span style={st.infoLbl}>Duração de cada slot</span>
          <span style={st.badge}>1 hora</span>
        </div>
        <div style={st.infoRow}>
          <span style={st.infoLbl}>Slots por dia</span>
          <span style={st.infoVal}>10 horários (08:00 a 17:00)</span>
        </div>
        <div style={{...st.infoRow, borderBottom:'none'}}>
          <span style={st.infoLbl}>Agendamento online</span>
          <span style={{...st.badge, background:'#E1F5EE', color:'#085041'}}>✓ Ativo</span>
        </div>
        <div style={{marginTop:14, fontSize:12, color:'#8A87A0'}}>
          ℹ️ Slots já agendados ficam automaticamente bloqueados para novos clientes.
        </div>
      </div>

      {/* Dados do salão */}
      <div style={st.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
          <div style={st.cardHd}>Dados do salão</div>
          {!editando && <button style={st.editBtn} onClick={() => setEditando(true)}>Editar</button>}
        </div>
        <div style={st.cardSb}>Informações exibidas na página de agendamento público.</div>

        {!editando ? (
          <>
            <div style={st.infoRow}><span style={st.infoLbl}>Nome</span><span style={st.infoVal}>{salon?.name}</span></div>
            <div style={st.infoRow}><span style={st.infoLbl}>WhatsApp</span><span style={st.infoVal}>{salon?.phone || '—'}</span></div>
            <div style={{...st.infoRow, borderBottom:'none'}}><span style={st.infoLbl}>Plano</span><span style={st.badge}>{salon?.plan || 'trial'}</span></div>
          </>
        ) : (
          <>
            <label style={st.label}>Nome do salão</label>
            <input style={st.input} value={nomeSalao} onChange={e => setNomeSalao(e.target.value)} placeholder="Nome do seu salão" />
            <label style={st.label}>WhatsApp (com DDD)</label>
            <input style={st.input} value={foneSalao} onChange={e => setFoneSalao(e.target.value)} placeholder="(31) 99999-9999" />
            <div style={{display:'flex', gap:10, marginTop:16}}>
              <button style={st.saveBtn} onClick={salvarSalao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button style={{...st.editBtn, padding:'9px 16px'}} onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </>
        )}
      </div>

      {/* ID do salão */}
      <div style={st.card}>
        <div style={st.cardHd}>Informações técnicas</div>
        <div style={st.cardSb}>Dados para integração e suporte.</div>
        <div style={st.infoRow}><span style={st.infoLbl}>ID do salão</span><span style={{...st.infoVal, fontSize:11, color:'#8A87A0', fontFamily:'monospace'}}>{salon?.id}</span></div>
        <div style={{...st.infoRow, borderBottom:'none'}}><span style={st.infoLbl}>Proprietário</span><span style={st.infoVal}>{user?.email}</span></div>
      </div>
    </div>
  )
}
