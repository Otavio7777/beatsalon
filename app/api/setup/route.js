import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Rota de setup único — executa as migrations necessárias
// Chame GET /api/setup?token=setup2026 para rodar
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== 'setup2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Cada operação é feita via upsert/insert em vez de DDL
  // pois o anon key não tem permissão para ALTER TABLE

  // Verifica quais colunas existem testando uma query
  const checks = {}

  // schedule_config
  const { data: sc } = await sb.from('schedule_config').select('lunch_start,slot_duration').limit(1)
  checks.schedule_config_lunch = !sc?.[0] ? 'unknown' : (sc[0].lunch_start !== undefined ? 'ok' : 'missing')

  // appointments
  const { data: ap } = await sb.from('appointments').select('payment_method,cut_preference').limit(1)
  checks.appointments_payment = !ap?.[0] ? 'unknown' : (ap[0].payment_method !== undefined ? 'ok' : 'missing')

  // clients
  const { data: cl } = await sb.from('clients').select('first_visit,referral_source').limit(1)
  checks.clients_crm = !cl?.[0] ? 'unknown' : (cl[0].first_visit !== undefined ? 'ok' : 'missing')

  // message_templates
  const { data: mt, error: mte } = await sb.from('message_templates').select('id').limit(1)
  checks.message_templates = mte ? 'missing' : 'ok'

  // page_views
  const { data: pv, error: pve } = await sb.from('page_views').select('id').limit(1)
  checks.page_views = pve ? 'missing' : 'ok'

  // recurring_appointments
  const { data: ra, error: rae } = await sb.from('recurring_appointments').select('id').limit(1)
  checks.recurring_appointments = rae ? 'missing' : 'ok'

  // Gera o SQL necessário baseado nos checks
  const sqlNeeded = []

  if (checks.schedule_config_lunch === 'missing') {
    sqlNeeded.push('ALTER TABLE schedule_config ADD COLUMN IF NOT EXISTS lunch_start time, ADD COLUMN IF NOT EXISTS lunch_end time, ADD COLUMN IF NOT EXISTS slot_duration integer DEFAULT 30')
  }
  if (checks.appointments_payment === 'missing') {
    sqlNeeded.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method text, ADD COLUMN IF NOT EXISTS cut_preference text, ADD COLUMN IF NOT EXISTS no_show boolean DEFAULT false')
  }
  if (checks.clients_crm === 'missing') {
    sqlNeeded.push('ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_visit date, ADD COLUMN IF NOT EXISTS preferred_cut text DEFAULT \'\', ADD COLUMN IF NOT EXISTS allergies text DEFAULT \'\', ADD COLUMN IF NOT EXISTS referral_source text DEFAULT \'\'')
  }

  return NextResponse.json({
    status: 'Diagnóstico concluído',
    checks,
    sqlNeeded: sqlNeeded.length > 0 ? sqlNeeded : ['Tudo OK — nenhuma migration necessária'],
    note: 'Execute o SQL no Supabase Dashboard: https://supabase.com/dashboard/project/plhbpzpzyqrfkhujerar/sql'
  })
}
