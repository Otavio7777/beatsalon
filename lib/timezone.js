// Brasília timezone utilities (UTC-3 / America/Sao_Paulo)
export const TZ = 'America/Sao_Paulo'

/** Data/hora atual em Brasília */
export function nowBRT() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

/** String YYYY-MM-DD de hoje em Brasília */
export function todayBRT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Converte ISO string ou Date para horário de Brasília */
export function toBRT(date) {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.toLocaleString('en-US', { timeZone: TZ }))
}

/** Formata data pt-BR no fuso Brasília */
export function fmtDataBRT(date, opts = {}) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, ...opts })
}

/** Formata hora HH:MM no fuso Brasília */
export function fmtHoraBRT(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

/** Alias mantido para compatibilidade */
export const fmtDateBRT = fmtDataBRT
export const fmtTimeBRT = fmtHoraBRT

/** Formata "HH:MM" — alias para agenda */
export function fmtHM(dateStr) {
  return fmtHoraBRT(dateStr)
}

/** Verifica se agendamento é hoje (Brasília) */
export function isTodayBRT(dateStr) {
  if (!dateStr) return false
  const apptDate = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: TZ })
  return apptDate === todayBRT()
}

/** Verifica se agendamento é em dayStr (YYYY-MM-DD) no fuso Brasília */
export function isSameDayBRT(dateStr, dayStr) {
  if (!dateStr || !dayStr) return false
  return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: TZ }) === dayStr
}

/** Retorna o dia da semana (0=Dom…6=Sáb) no fuso Brasília */
export function dayOfWeekBRT(dateStr) {
  if (!dateStr) return 0
  // usa meio-dia para evitar problemas de DST
  return new Date(new Date(dateStr + 'T12:00:00').toLocaleString('en-US', { timeZone: TZ })).getDay()
}

/** Retorna "YYYY-MM" do mês atual em Brasília */
export function monthYearBRT() {
  return todayBRT().slice(0, 7)
}

/** Converte "YYYY-MM-DD HH:MM" para ISO string com fuso Brasília */
export function toISOBRT(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00`
}
