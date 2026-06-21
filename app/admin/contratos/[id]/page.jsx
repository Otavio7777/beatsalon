'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'

export default function ContratoDetalhe({ params }) {
  const { id } = params
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState(false)
  const [editEmail, setEditEmail] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailErro,   setEmailErro]   = useState('')
  const [emailOk,     setEmailOk]     = useState('')
  const router = useRouter()
  const sb = createClient()

  const load = async () => {
    const [{ data:s },{ data:cl },{ data:ap }] = await Promise.all([
      sb.from('salons').select('*').eq('id',id).single(),
      sb.from('clients').select('*').eq('salon_id',id).order('name'),
      sb.from('appointments').select('*').eq('salon_id',id).order('date',{ascending:false}).limit(10),
    ])
    setData({ salon:s, clients:cl||[], appts:ap||[] })
    setNovoEmail('')
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const toggleAtivo = async () => {
    setToggling(true)
    const novoStatus = data.salon.is_active === false ? true : false
    await sb.from('salons').update({ is_active:novoStatus }).eq('id',id)
    await load()
    setToggling(false)
  }

  const savePlan = async (plan) => {
    await sb.from('salons').update({ plan }).eq('id',id)
    load()
  }

  const salvarEmail = async () => {
    if (!novoEmail.includes('@')) { setEmailErro('E-mail inválido.'); return }
    setSavingEmail(true); setEmailErro(''); setEmailOk('')
    const tk = JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')||'{}')?.access_token

    const payload = { email: novoEmail, email_confirm: true }
    if (novaSenha.length >= 6) payload.password = novaSenha

    try {
      const r = await fetch(
        `https://api.supabase.com/v1/projects/plhbpzpzyqrfkhujerar/auth/users/${data.salon.owner_id}`,
        { method:'PUT', headers:{ 'Authorization':'Bearer '+tk,'Content-Type':'application/json' }, body:JSON.stringify(payload) }
      )
      const d = await r.json()
      if (d.error || d.msg) throw new Error(d.msg||d.error)
      setEmailOk('✓ Acesso atualizado com sucesso!')
      setEditEmail(false)
      setNovaSenha('')
    } catch(e) {
      setEmailErro(e.message||'Erro ao atualizar.')
    }
    setSavingEmail(false)
  }

  /* Entra no dashboard do salão como manutenção */
  const entrarManutencao = () => {
    sessionStorage.setItem('ms_maintenance', JSON.stringify({
      salonId: id,
      salonName: data.salon.name,
      timestamp: Date.now(),
    }))
    window.open('/dashboard', '_blank')
  }

  if (loading) return <div style={{color:'rgba(255,255,255,.3)',padding:40,textAlign:'center'}}>Carregando...</div>
  if (!data?.salon) return <div style={{color:'#fff',padding:40}}>Não encontrado. <Link href="/admin/contratos" style={{color:'#6EE7B7'}}>← Voltar</Link></div>

  const { salon, clients, appts } = data
  const ativo   = salon.is_active !== false
  const receita = appts.filter(a=>a.status==='concluido').reduce((s,a)=>s+(a.value||0),0)
  const PLANOS  = {trial:'Trial',basic:'Básico',pro:'Pro',enterprise:'Enterprise'}
  const STATUS_C= {agendado:'#3B82F6',concluido:'#059669',cancelado:'#DC2626',faltou:'#D97706'}

  const st = {
    card:{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'20px',marginBottom:14 },
    h:   { fontSize:14,fontWeight:800,color:'#fff',marginBottom:12 },
    row: { display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:13 },
    lbl: { color:'rgba(255,255,255,.35)' },
    val: { color:'rgba(255,255,255,.8)',fontWeight:600,textAlign:'right',maxWidth:'60%',wordBreak:'break-all',fontSize:12 },
    th:  { padding:'8px 12px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.25)',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,.05)',textAlign:'left' },
    td:  { padding:'9px 12px',fontSize:12,color:'rgba(255,255,255,.7)',borderBottom:'1px solid rgba(255,255,255,.04)' },
    inp: { width:'100%',padding:'9px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',marginTop:8 },
  }

  return (
    <div>
      <Link href="/admin/contratos" style={{color:'rgba(255,255,255,.4)',fontSize:13,textDecoration:'none',display:'block',marginBottom:16}}>← Contratos</Link>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:20,flexWrap:'wrap'}}>
        {salon.logo_url ? (
          <img src={salon.logo_url} alt="" style={{width:56,height:56,borderRadius:14,objectFit:'cover'}}/>
        ) : (
          <div style={{width:56,height:56,borderRadius:14,background:'#1E3A6E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,color:'#fff',fontWeight:800,flexShrink:0}}>
            {salon.name?.charAt(0)}
          </div>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>{salon.name}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:10}}>{salon.city||'—'} · Plano: {PLANOS[salon.plan||'trial']}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={toggleAtivo} disabled={toggling}
              style={{padding:'8px 16px',borderRadius:9,fontWeight:700,fontSize:12,cursor:'pointer',border:'none',transition:'all .15s',
                background:toggling?'rgba(255,255,255,.05)':ativo?'rgba(220,38,38,.12)':'rgba(5,150,105,.15)',
                color:toggling?'rgba(255,255,255,.3)':ativo?'#FCA5A5':'#6EE7B7'}}>
              {toggling?'...' : ativo?'🚫 Suspender':'✅ Reativar'}
            </button>
            <select defaultValue={salon.plan||'trial'} onChange={e=>savePlan(e.target.value)}
              style={{padding:'8px 12px',borderRadius:9,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',fontSize:12,cursor:'pointer'}}>
              {Object.entries(PLANOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>

            {/* ── BOTÃO DE MANUTENÇÃO ── */}
            <button onClick={entrarManutencao}
              style={{padding:'8px 16px',borderRadius:9,fontWeight:700,fontSize:12,cursor:'pointer',border:'1px solid rgba(245,158,11,.3)',background:'rgba(245,158,11,.12)',color:'#FCD34D',display:'flex',alignItems:'center',gap:6}}>
              🔧 Entrar como manutenção
            </button>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <span style={{fontSize:13,padding:'5px 14px',borderRadius:20,fontWeight:700,
            background:ativo?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)',
            color:ativo?'#6EE7B7':'#FCA5A5',border:`1px solid ${ativo?'rgba(5,150,105,.25)':'rgba(220,38,38,.25)'}`}}>
            {ativo?'Ativo':'Suspenso'}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
        {[['Clientes',clients.length],['Agendamentos',appts.length],['Receita',`R$${receita.toLocaleString('pt-BR')}`]].map(([l,v])=>(
          <div key={l} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'14px'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.3)',textTransform:'uppercase',fontWeight:700,marginBottom:4}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:l==='Receita'?'#6EE7B7':'#fff'}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Email / Acesso */}
      <div style={st.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:editEmail?12:0}}>
          <div style={st.h}>Email e acesso</div>
          {!editEmail && (
            <button onClick={()=>{ setEditEmail(true); setEmailErro(''); setEmailOk('') }}
              style={{padding:'6px 14px',borderRadius:8,border:'1px solid rgba(110,231,183,.25)',background:'rgba(5,150,105,.08)',color:'#6EE7B7',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              ✏ Alterar email/senha
            </button>
          )}
        </div>

        {emailOk && <div style={{background:'rgba(5,150,105,.12)',border:'1px solid rgba(5,150,105,.25)',borderRadius:8,padding:'8px 13px',marginBottom:10,fontSize:13,color:'#6EE7B7',fontWeight:600}}>{emailOk}</div>}

        {!editEmail ? (
          <div>
            <div style={st.row}><span style={st.lbl}>Owner ID</span><span style={{...st.val,fontFamily:'monospace'}}>{salon.owner_id?.slice(0,20)}...</span></div>
            <div style={{...st.row,borderBottom:'none'}}><span style={st.lbl}>Plano</span><span style={st.val}>{PLANOS[salon.plan||'trial']}</span></div>
          </div>
        ) : (
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:4,display:'block'}}>Novo e-mail *</label>
            <input style={st.inp} type="email" placeholder="novo@email.com" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} />
            <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.6px',marginTop:10,marginBottom:4,display:'block'}}>
              Nova senha <span style={{fontWeight:400,textTransform:'none',color:'rgba(255,255,255,.2)'}}>(deixe vazio para manter)</span>
            </label>
            <input style={st.inp} type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
            {emailErro && <div style={{fontSize:12,color:'#FCA5A5',marginTop:8}}>{emailErro}</div>}
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={salvarEmail} disabled={savingEmail}
                style={{padding:'9px 18px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1E3A6E,#2451A0)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                {savingEmail?'Salvando...':'Salvar alterações'}
              </button>
              <button onClick={()=>{ setEditEmail(false); setNovaSenha(''); setEmailErro('') }}
                style={{padding:'9px 16px',borderRadius:9,border:'1px solid rgba(255,255,255,.12)',background:'transparent',color:'rgba(255,255,255,.5)',fontSize:13,cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dados do salão */}
      <div style={st.card}>
        <div style={st.h}>Dados cadastrais</div>
        {[['Nome',salon.name],['Telefone',salon.phone||'—'],['Cidade',salon.city||'—'],['Endereço',salon.address||'—'],['Plano',PLANOS[salon.plan||'trial']],['Status',ativo?'Ativo':'Suspenso'],['Criado em',salon.created_at?new Date(salon.created_at).toLocaleDateString('pt-BR'):'—']].map(([k,v])=>(
          <div key={k} style={st.row}><span style={st.lbl}>{k}</span><span style={st.val}>{v}</span></div>
        ))}
      </div>

      {/* Últimos agendamentos */}
      <div style={st.card}>
        <div style={st.h}>Últimos 10 agendamentos</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Cliente','Serviço','Data','Valor','Status'].map(h=><th key={h} style={st.th}>{h}</th>)}</tr></thead>
          <tbody>
            {appts.map(a=>{
              const dt=a.date?new Date(a.date):null
              return (
                <tr key={a.id}>
                  <td style={st.td}>{a.client_name}</td>
                  <td style={st.td}>{a.service_name||'—'}</td>
                  <td style={st.td}>{dt?`${dt.getDate()}/${dt.getMonth()+1} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`:'—'}</td>
                  <td style={{...st.td,color:'#6EE7B7',fontWeight:700}}>{a.value?`R$${a.value}`:'—'}</td>
                  <td style={st.td}><span style={{color:STATUS_C[a.status]||'#aaa',fontWeight:600}}>{a.status}</span></td>
                </tr>
              )
            })}
            {appts.length===0&&<tr><td colSpan={5} style={{...st.td,textAlign:'center',color:'rgba(255,255,255,.2)',padding:20}}>Sem agendamentos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
