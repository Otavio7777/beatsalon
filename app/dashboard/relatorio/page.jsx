'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useSalon } from '../../../lib/useSalon'

const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function BarChart({ data, color = '#534AB7' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, marginTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9, color: '#8A87A0', fontWeight: 600 }}>{d.value > 0 ? `R$${Math.round(d.value / 1000)}k` : ''}</div>
          <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', height: `${Math.max((d.value / max) * 100, 2)}%`, opacity: i === data.length - 1 ? 1 : 0.5, transition: 'height .3s' }} title={`${d.label}: R$${Number(d.value).toLocaleString('pt-BR')}`} />
          <div style={{ fontSize: 9, color: '#8A87A0', fontWeight: 600 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

function CountChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9, color: '#8A87A0', fontWeight: 600 }}>{d.value || ''}</div>
          <div style={{ width: '100%', background: '#1D9E75', borderRadius: '4px 4px 0 0', height: `${Math.max((d.value / max) * 100, 2)}%`, opacity: i === data.length - 1 ? 1 : 0.5 }} />
          <div style={{ fontSize: 9, color: '#8A87A0', fontWeight: 600 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function RelatorioPage() {
  const { salon, user, loading: salonLoading } = useSalon()
  const [clients, setClients] = useState([])
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const sb = createClient()

  const fetchData = useCallback(async () => {
    if (!salon?.id) return
    setLoading(true)
    const [{ data: cls }, { data: aps }] = await Promise.all([
      sb.from('clients').select('*').eq('salon_id', salon.id),
      sb.from('appointments').select('*').eq('salon_id', salon.id).order('date'),
    ])
    setClients(cls || [])
    setAppts(aps || [])
    setLoading(false)
  }, [salon?.id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (!salonLoading && !user) window.location.href = '/login' }, [salonLoading, user])

  const now = new Date()

  const filterAppts = (list) => list.filter(a => {
    const d = new Date(a.date)
    if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (periodo === 'trimestre') { const diff = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth(); return diff >= 0 && diff < 3 }
    return d.getFullYear() === now.getFullYear()
  })

  const filtrados  = filterAppts(appts)
  const concluidos = filtrados.filter(a => a.status === 'concluido')
  const receita    = concluidos.reduce((s, a) => s + (a.value || 0), 0)
  const ticketMedio = concluidos.length > 0 ? receita / concluidos.length : 0

  /* Receita por mês (últimos 6 meses) */
  const receitaMeses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const val = appts.filter(a => {
      const dt = new Date(a.date)
      return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear() && a.status === 'concluido'
    }).reduce((s, a) => s + (a.value || 0), 0)
    return { label: MESES_CURTOS[d.getMonth()], value: val }
  })

  /* Atendimentos por mês */
  const atendMeses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const cnt = appts.filter(a => {
      const dt = new Date(a.date)
      return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear() && a.status === 'concluido'
    }).length
    return { label: MESES_CURTOS[d.getMonth()], value: cnt }
  })

  /* Top serviços no período */
  const svcCounts = {}
  filtrados.forEach(a => { if (a.service_name) svcCounts[a.service_name] = (svcCounts[a.service_name] || 0) + 1 })
  const topServicos = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  /* Top clientes por LTV (dos clientes com agendamentos concluídos no período) */
  const clientReceita = {}
  concluidos.forEach(a => {
    if (a.client_id) clientReceita[a.client_id] = (clientReceita[a.client_id] || 0) + (a.value || 0)
  })
  const topClientes = clients
    .filter(c => clientReceita[c.id] || c.ltv > 0)
    .map(c => ({ ...c, periodoReceita: clientReceita[c.id] || 0 }))
    .sort((a, b) => b.periodoReceita - a.periodoReceita)
    .slice(0, 5)

  /* Clientes que retornaram (mais de 1 agendamento concluído no período) */
  const clientApptCount = {}
  concluidos.forEach(a => {
    if (a.client_id) clientApptCount[a.client_id] = (clientApptCount[a.client_id] || 0) + 1
  })
  const retornoClientes = Object.values(clientApptCount).filter(n => n > 1).length
  const novosClientes = filtrados.filter(a => {
    const c = clients.find(c => c.id === a.client_id)
    return c && c.visit_count <= 1
  }).length

  /* Canal de captação */
  const canalCounts = {}
  clients.forEach(c => { canalCounts[c.canal || 'outro'] = (canalCounts[c.canal || 'outro'] || 0) + 1 })
  const canais = Object.entries(canalCounts).sort((a, b) => b[1] - a[1])

  const emRisco  = clients.filter(c => c.status === 'em_risco').length
  const inativos = clients.filter(c => c.status === 'inativo').length

  /* Frequência média (dias entre visitas, baseado em ltv/visit_count) */
  const taxaRetorno = clients.length > 0 ? Math.round(clients.filter(c => c.visit_count > 1).length / clients.length * 100) : 0

  const st = {
    page:   { padding: '28px 32px', maxWidth: 1100 },
    h1:     { fontSize: 24, fontWeight: 800, color: '#1A1825' },
    sub:    { fontSize: 13, color: '#8A87A0', marginTop: 3 },
    grid4:  { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
    grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
    grid3:  { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 },
    mc:     { background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E3E1F0' },
    ml:     { fontSize: 10, color: '#8A87A0', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 5 },
    mv:     { fontSize: 22, fontWeight: 800 },
    md:     { fontSize: 11, marginTop: 4, color: '#8A87A0' },
    card:   { background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #E3E1F0', marginBottom: 16 },
    cardHd: { fontSize: 15, fontWeight: 800, marginBottom: 4 },
    cardSb: { fontSize: 12, color: '#8A87A0', marginBottom: 12 },
    row:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F2F1F8' },
    badge:  { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700 },
    periodo:{ display: 'flex', gap: 6, marginBottom: 20 },
    pBtn:   { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #E3E1F0', cursor: 'pointer' },
  }

  if (salonLoading) return <div style={{ padding: 40, color: '#8A87A0', textAlign: 'center' }}>Carregando...</div>

  return (
    <div className="pg">
      <div style={{ marginBottom: 20 }}>
        <div className="pg-h1">📊 Relatórios</div>
        <div className="pg-sub">Métricas integradas de clientes e agendamentos · {salon?.name || 'BeatSalon'}</div>
      </div>

      <div style={st.periodo}>
        {[['mes', 'Este mês'], ['trimestre', 'Trimestre'], ['ano', 'Este ano']].map(([k, l]) => (
          <button key={k} onClick={() => setPeriodo(k)} style={{ ...st.pBtn, background: periodo === k ? '#534AB7' : '#fff', color: periodo === k ? '#fff' : '#8A87A0', borderColor: periodo === k ? '#534AB7' : '#E3E1F0' }}>{l}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid-4">
        <div style={st.mc}><div style={st.ml}>Receita</div><div style={{ ...st.mv, color: '#1D9E75' }}>R${receita.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div><div style={st.md}>concluídos</div></div>
        <div style={st.mc}><div style={st.ml}>Atendimentos</div><div style={st.mv}>{concluidos.length}</div><div style={st.md}>realizados</div></div>
        <div style={st.mc}><div style={st.ml}>Ticket médio</div><div style={st.mv}>R${ticketMedio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div><div style={st.md}>por atendimento</div></div>
        <div style={st.mc}><div style={st.ml}>Clientes</div><div style={st.mv}>{clients.length}</div><div style={st.md}>na base total</div></div>
      </div>

      {/* Gráficos lado a lado */}
      <div className="cols-2">
        <div style={st.card}>
          <div style={st.cardHd}>Receita mensal</div>
          <div style={st.cardSb}>Últimos 6 meses (atendimentos concluídos)</div>
          {loading ? <div style={{ color: '#8A87A0', textAlign: 'center', padding: 20 }}>Carregando...</div> : <BarChart data={receitaMeses} />}
        </div>
        <div style={st.card}>
          <div style={st.cardHd}>Atendimentos por mês</div>
          <div style={st.cardSb}>Últimos 6 meses</div>
          {loading ? <div style={{ color: '#8A87A0', textAlign: 'center', padding: 20 }}>Carregando...</div> : <CountChart data={atendMeses} />}
        </div>
      </div>

      {/* Clientes + Retenção */}
      <div className="cols-3">
        {/* Saúde da base */}
        <div style={st.card}>
          <div style={st.cardHd}>Saúde da base</div>
          <div style={st.cardSb}>Status atual dos clientes</div>
          {[
            ['Ativos', clients.filter(c => c.status === 'ativo').length, '#1D9E75', '#E1F5EE'],
            ['Em risco', emRisco, '#D85A30', '#FAECE7'],
            ['Inativos', inativos, '#8A87A0', '#F0EFF8'],
          ].map(([label, val, color, bg]) => (
            <div key={label} style={st.row}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#F2F1F8', borderRadius: 20, height: 5, width: 60, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${clients.length > 0 ? val / clients.length * 100 : 0}%`, background: color, borderRadius: 20 }} />
                </div>
                <span style={{ ...st.badge, background: bg, color }}>{val}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F2F1F8' }}>
            <div style={{ fontSize: 10, color: '#8A87A0', fontWeight: 700, marginBottom: 6 }}>TAXA DE RETORNO</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#534AB7' }}>{taxaRetorno}%</div>
            <div style={{ fontSize: 11, color: '#8A87A0' }}>clientes com 2+ visitas</div>
          </div>
        </div>

        {/* Clientes no período */}
        <div style={st.card}>
          <div style={st.cardHd}>Clientes no período</div>
          <div style={st.cardSb}>Baseado nos agendamentos</div>
          <div style={st.row}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Com atendimentos</span>
            <span style={{ ...st.badge, background: '#EEEDFE', color: '#534AB7' }}>{Object.keys(clientReceita).length}</span>
          </div>
          <div style={st.row}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Retornaram</span>
            <span style={{ ...st.badge, background: '#E1F5EE', color: '#085041' }}>{retornoClientes}</span>
          </div>
          <div style={st.row}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Novos</span>
            <span style={{ ...st.badge, background: '#FAE6FD', color: '#7B0D8A' }}>{novosClientes}</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F2F1F8' }}>
            <div style={{ fontSize: 10, color: '#8A87A0', fontWeight: 700, marginBottom: 6 }}>RECEITA MÉDIA/CLIENTE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1D9E75' }}>
              R${Object.keys(clientReceita).length > 0 ? Math.round(receita / Object.keys(clientReceita).length).toLocaleString('pt-BR') : 0}
            </div>
            <div style={{ fontSize: 11, color: '#8A87A0' }}>no período selecionado</div>
          </div>
        </div>

        {/* Top serviços */}
        <div style={st.card}>
          <div style={st.cardHd}>Top serviços</div>
          <div style={st.cardSb}>Mais realizados no período</div>
          {topServicos.length === 0
            ? <div style={{ color: '#8A87A0', textAlign: 'center', padding: 20 }}>Nenhum dado ainda</div>
            : topServicos.map(([svc, count], i) => (
              <div key={svc} style={st.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#534AB7', minWidth: 18 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{svc}</span>
                </div>
                <span style={{ ...st.badge, background: '#EEEDFE', color: '#534AB7' }}>{count}x</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top clientes por receita no período */}
      <div style={st.card}>
        <div style={st.cardHd}>Top clientes por receita no período</div>
        <div style={st.cardSb}>Clientes vinculados ao CRM com agendamentos concluídos</div>
        {topClientes.length === 0
          ? <div style={{ color: '#8A87A0', textAlign: 'center', padding: 20 }}>
            {concluidos.length === 0 ? 'Nenhum atendimento concluído ainda.' : 'Vincule clientes do CRM nos agendamentos para ver este ranking.'}
          </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
            {topClientes.map((c, i) => (
              <div key={c.id} style={{ background: '#F2F1F8', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.avatar_color || '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#8A87A0' }}>#{i + 1} do período</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#8A87A0' }}>Período</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1D9E75' }}>R${c.periodoReceita.toLocaleString('pt-BR')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#8A87A0' }}>LTV total</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#534AB7' }}>R${Number(c.ltv || 0).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#8A87A0' }}>{c.visit_count || 0} visitas no total · {c.main_service || '–'}</div>
              </div>
            ))}
          </div>}
      </div>

      {/* Canal de captação */}
      <div style={st.card}>
        <div style={st.cardHd}>Canal de captação</div>
        <div style={st.cardSb}>De onde vêm seus clientes</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
          {canais.length === 0
            ? <div style={{ color: '#8A87A0' }}>Nenhum dado ainda</div>
            : canais.map(([canal, count]) => {
              const icons = { instagram: '📸', google: '🔍', indicacao: '🤝', whatsapp: '💬', outro: '✨' }
              const pct = clients.length > 0 ? Math.round(count / clients.length * 100) : 0
              return (
                <div key={canal} style={{ background: '#F2F1F8', borderRadius: 12, padding: '12px 16px', minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>{icons[canal] || '✨'}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: '#8A87A0', marginTop: 2, textTransform: 'capitalize' }}>{canal}</div>
                  <div style={{ fontSize: 10, color: '#534AB7', fontWeight: 600 }}>{count} clientes</div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
