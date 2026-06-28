// Configuração central de domínio — Meu Salão by Whatsale
// Quando o domínio mudar, alterar apenas AQUI
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'beatsalon.vercel.app'
export const APP_NAME   = 'Meu Salão'
export const APP_BRAND  = 'Meu Salão by Whatsale'

/** Retorna a URL de agendamento do salão */
export function bookingURL(salonId, barberId = null) {
  const base = `https://${APP_DOMAIN}/agendar/${salonId}`
  return barberId ? `${base}?barber=${barberId}` : base
}

/** Retorna a URL do perfil público do barbeiro */
export function barberProfileURL(barberId) {
  return `https://${APP_DOMAIN}/barber/${barberId}`
}

/** Retorna a URL de setup do barbeiro */
export function barberSetupURL(salonId, email, name) {
  return `https://${APP_DOMAIN}/barber/setup?salon=${salonId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
}
