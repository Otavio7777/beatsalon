-- ══════════════════════════════════════════
-- MIGRAÇÃO COMPLETA — MEUS SALÃO by Whatsale
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════

-- 1. Colunas faltando em tabelas existentes
ALTER TABLE schedule_config
  ADD COLUMN IF NOT EXISTS lunch_start   time,
  ADD COLUMN IF NOT EXISTS lunch_end     time,
  ADD COLUMN IF NOT EXISTS slot_duration integer DEFAULT 30;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_visit      date,
  ADD COLUMN IF NOT EXISTS preferred_cut    text DEFAULT '',
  ADD COLUMN IF NOT EXISTS allergies        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes_internal   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS referral_source  text DEFAULT '';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_method       text,
  ADD COLUMN IF NOT EXISTS cut_preference       text,
  ADD COLUMN IF NOT EXISTS no_show              boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reschedule_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS barber_id            uuid;

ALTER TABLE admin_emails
  ADD COLUMN IF NOT EXISTS level     text DEFAULT 'gestor',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS billing_period  text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;

-- 2. Novos planos
-- individual: 1 barbeiro (MEI)
-- equipe: 2-4 barbeiros
-- supremo: 4-10 barbeiros

-- 3. Tabela de barbeiros
CREATE TABLE IF NOT EXISTS barbers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id        uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id         uuid,
  name            text NOT NULL,
  email           text,
  phone           text,
  role            text DEFAULT 'barber',
  commission_type text DEFAULT 'percentage',
  commission_value numeric DEFAULT 40,
  active          boolean DEFAULT true,
  avatar_url      text,
  color           text DEFAULT '#1B3057',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "barbers_owner" ON barbers FOR ALL
    USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.barbers TO authenticated;

-- 4. Comissões
CREATE TABLE IF NOT EXISTS commissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id       uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  barber_id      uuid REFERENCES barbers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  type           text DEFAULT 'service',
  gross_value    numeric DEFAULT 0,
  commission_pct numeric DEFAULT 40,
  commission_val numeric DEFAULT 0,
  paid           boolean DEFAULT false,
  paid_at        timestamptz,
  date           date DEFAULT current_date,
  notes          text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "commissions_owner" ON commissions FOR ALL
    USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.commissions TO authenticated;

-- 5. Tabela de mensagens
CREATE TABLE IF NOT EXISTS message_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  type       text NOT NULL,
  message    text DEFAULT '',
  active     boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "mt_owner" ON message_templates FOR ALL
    USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.message_templates TO authenticated;

-- 6. Page views
CREATE TABLE IF NOT EXISTS page_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   uuid,
  type       text DEFAULT 'booking',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "pv_insert" ON page_views FOR INSERT WITH CHECK (true);
  CREATE POLICY "pv_select" ON page_views FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT INSERT ON public.page_views TO anon;
GRANT SELECT, INSERT ON public.page_views TO authenticated;

-- 7. Recorrências
CREATE TABLE IF NOT EXISTS recurring_appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name  text,
  service_value numeric DEFAULT 0,
  frequency     text NOT NULL,
  day_of_week   integer,
  time_slot     time NOT NULL,
  active        boolean DEFAULT true,
  notes         text DEFAULT '',
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE recurring_appointments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "rc_owner" ON recurring_appointments FOR ALL
    USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.recurring_appointments TO authenticated;

-- 8. Funções críticas
CREATE OR REPLACE FUNCTION admin_toggle_salon_status(p_salon_id uuid, p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE salons SET is_active = p_is_active WHERE id = p_salon_id;
END; $$;
GRANT EXECUTE ON FUNCTION admin_toggle_salon_status TO authenticated;

CREATE OR REPLACE FUNCTION auto_complete_past_appointments()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE appointments SET status = 'concluido'
  WHERE status = 'agendado' AND date < NOW() - INTERVAL '1 hour';
END; $$;
GRANT EXECUTE ON FUNCTION auto_complete_past_appointments TO authenticated;

-- 9. Políticas admin
DO $$ BEGIN
  CREATE POLICY "admin_full_access_salons" ON salons FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM admin_emails));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_emails_select" ON admin_emails FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.admin_emails TO authenticated;
