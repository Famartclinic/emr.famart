-- ============================================================================
-- Enable Realtime (postgres_changes) for every table the EMR syncs.
--
-- The client only uses the events as a "something changed" signal and then
-- re-fetches through PostgREST, so no replica-identity change is needed and the
-- re-fetch stays subject to RLS.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'facilities','user_profiles','clinic_settings',
    'patients','patient_allergies','patient_chronic_conditions',
    'patient_queue','vitals','encounters','encounter_diagnoses','encounter_amendments',
    'lab_catalog','lab_orders','lab_order_items',
    'medications','prescriptions','prescription_items',
    'services','invoices','invoice_items','payments',
    'nursing_procedures','appointments','audit_logs','notifications'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;

SELECT count(*) AS realtime_tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
