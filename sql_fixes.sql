
-- FIX 1: Função SECURITY DEFINER para INSERT em barbers (bypassa RLS)
CREATE OR REPLACE FUNCTION insert_barber(
  p_salon_id uuid, p_name text, p_email text, p_phone text,
  p_role text, p_commission_type text, p_commission_value numeric, p_color text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM salons WHERE id=p_salon_id AND owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO barbers (salon_id,name,email,phone,role,commission_type,commission_value,color,active)
  VALUES (p_salon_id,p_name,p_email,p_phone,p_role,p_commission_type,p_commission_value,p_color,true)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION insert_barber TO authenticated;

-- Função UPDATE barbers
CREATE OR REPLACE FUNCTION update_barber(
  p_id uuid, p_name text, p_email text, p_phone text,
  p_role text, p_commission_type text, p_commission_value numeric,
  p_color text, p_active boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM salons s JOIN barbers b ON s.id=b.salon_id
    WHERE b.id=p_id AND s.owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE barbers SET name=p_name,email=p_email,phone=p_phone,role=p_role,
    commission_type=p_commission_type,commission_value=p_commission_value,
    color=p_color,active=p_active WHERE id=p_id;
END; $$;
GRANT EXECUTE ON FUNCTION update_barber TO authenticated;

-- FIX 2: admin_emails INSERT/UPDATE/DELETE policies
DO $$ BEGIN
  CREATE POLICY "admin_emails_insert" ON admin_emails FOR INSERT
    WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_emails WHERE level='gestor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_emails_update" ON admin_emails FOR UPDATE
    USING (auth.jwt()->>'email' IN (SELECT email FROM admin_emails WHERE level='gestor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_emails_delete" ON admin_emails FOR DELETE
    USING (auth.jwt()->>'email' IN (SELECT email FROM admin_emails WHERE level='gestor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT INSERT,UPDATE,DELETE ON public.admin_emails TO authenticated;

-- Colunas de barbeiro em clients e appointments
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_barber_id uuid;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS barber_id uuid;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS barber_id uuid;
