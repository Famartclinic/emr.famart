-- ============================================================================
-- Seed the single facility this dedicated project serves, plus its clinic
-- settings. Mirrors INITIAL_SETTINGS in src/services/storage.ts.
-- ============================================================================

INSERT INTO public.facilities (id, name, email, phone, plan_tier, status)
VALUES (
  'famart-main',
  'Famart Clinic',
  'famartmedicalskinclinic@gmail.com',
  '+254 712 345 678',
  'pro_3500',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clinic_settings (key, value) VALUES
  ('facility_id',        to_jsonb('famart-main'::text)),
  ('clinicName',         to_jsonb('Famart Clinic'::text)),
  ('subtitle',           to_jsonb('Electronic Medical Records & Clinic Management'::text)),
  ('domain',             to_jsonb('https://emr.famartclinic.co.ke'::text)),
  ('registrationNumber', to_jsonb('MED/NRB/2022/8941'::text)),
  ('taxPin',             to_jsonb('P051892341Z'::text)),
  ('phoneNumber',        to_jsonb('+254 712 345 678'::text)),
  ('email',              to_jsonb('famartmedicalskinclinic@gmail.com'::text)),
  ('address',            to_jsonb('Suite 402, Famart Medical Plaza, Argwings Kodhek Rd, Hurlingham'::text)),
  ('city',               to_jsonb('Nairobi'::text)),
  ('country',            to_jsonb('Kenya'::text)),
  ('timezone',           to_jsonb('Africa/Nairobi'::text)),
  ('currency',           to_jsonb('KES'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
