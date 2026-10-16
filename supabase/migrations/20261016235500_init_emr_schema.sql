-- ============================================================================
-- Famart Clinic EMR — initial schema
-- Target: dedicated Supabase project for emr.famart (Famartclinic/emr.famart)
--
-- Conventions mirror the hmis-master-admin Supabase project so this facility can
-- later be onboarded by the master panel:
--   * TEXT facility ids and TEXT business keys supplied by the app, TIMESTAMPTZ everywhere
--   * facility_id tenancy column on every clinical table
--   * RLS enabled on every table, shared role helpers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Generic helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Platform / tenancy layer
-- ============================================================================

CREATE TABLE public.facilities (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  logo_url          TEXT,
  plan_tier         TEXT NOT NULL DEFAULT 'basic_1200'
                      CHECK (plan_tier IN ('basic_1200','standard_2500','pro_3500')),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('active','suspended','pending')),
  is_demo           BOOLEAN NOT NULL DEFAULT false,
  next_billing_date TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  full_name      TEXT NOT NULL,
  username       TEXT,
  role           TEXT NOT NULL DEFAULT 'receptionist'
                   CHECK (role IN ('admin','receptionist','nurse','doctor',
                                   'lab_technician','pharmacist','billing_cashier')),
  title          TEXT,
  department     TEXT,
  phone          TEXT,
  license_number TEXT,
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  is_superadmin  BOOLEAN NOT NULL DEFAULT false,
  facility_id    TEXT REFERENCES public.facilities(id) ON DELETE SET NULL,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_profiles_facility_idx ON public.user_profiles(facility_id);

-- Key/value clinic configuration (clinicName, taxPin, timezone, currency, ...).
CREATE TABLE public.clinic_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Patients
-- ============================================================================

CREATE TABLE public.patients (
  id                         TEXT PRIMARY KEY,
  facility_id                TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_number             TEXT NOT NULL,
  first_name                 TEXT NOT NULL,
  middle_name                TEXT,
  last_name                  TEXT NOT NULL,
  date_of_birth              DATE NOT NULL,
  gender                     TEXT NOT NULL CHECK (gender IN ('Male','Female','Other')),
  phone_number               TEXT NOT NULL,
  email                      TEXT,
  address                    TEXT,
  county                     TEXT,
  national_id                TEXT,
  emergency_contact_name     TEXT,
  emergency_contact_phone    TEXT,
  emergency_contact_relation TEXT,
  next_of_kin_name           TEXT,
  next_of_kin_phone          TEXT,
  blood_group                TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  registration_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  active_status              BOOLEAN NOT NULL DEFAULT true,
  notes                      TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, patient_number)
);

CREATE INDEX patients_facility_idx ON public.patients(facility_id);
CREATE INDEX patients_name_idx ON public.patients(facility_id, last_name, first_name);

CREATE TABLE public.patient_allergies (
  id          TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_id  TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  allergen    TEXT NOT NULL,
  reaction    TEXT,
  severity    TEXT NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX patient_allergies_patient_idx ON public.patient_allergies(patient_id);

CREATE TABLE public.patient_chronic_conditions (
  id             TEXT PRIMARY KEY,
  facility_id    TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_id     TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  condition      TEXT NOT NULL,
  diagnosed_year TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX patient_chronic_conditions_patient_idx ON public.patient_chronic_conditions(patient_id);

-- ============================================================================
-- 4. Front-desk queue, vitals, encounters
-- ============================================================================

CREATE TABLE public.patient_queue (
  id                  TEXT PRIMARY KEY,
  facility_id         TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_id          TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_number      TEXT NOT NULL,
  patient_name        TEXT NOT NULL,
  visit_number        TEXT NOT NULL,
  stage               TEXT NOT NULL DEFAULT 'reception'
                        CHECK (stage IN ('reception','triage','consultation','laboratory',
                                         'pharmacy','billing','completed')),
  priority            TEXT NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('normal','urgent','emergency')),
  chief_complaint     TEXT,
  checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_staff_id   TEXT,
  assigned_staff_name TEXT,
  status              TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting','in_progress','completed','cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, visit_number)
);

CREATE INDEX patient_queue_facility_idx ON public.patient_queue(facility_id, status);

CREATE TABLE public.vitals (
  id                       TEXT PRIMARY KEY,
  facility_id              TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_id               TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_number             TEXT NOT NULL,
  recorded_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by              TEXT,
  blood_pressure_systolic  INTEGER,
  blood_pressure_diastolic INTEGER,
  pulse_rate               INTEGER,
  respiratory_rate         INTEGER,
  temperature              NUMERIC(4,1),
  oxygen_saturation        INTEGER,
  weight_kg                NUMERIC(5,2),
  height_cm                NUMERIC(5,1),
  bmi                      NUMERIC(4,1),
  bmi_category             TEXT CHECK (bmi_category IN ('Underweight','Normal','Overweight','Obese')),
  pain_score               INTEGER CHECK (pain_score BETWEEN 0 AND 10),
  presenting_complaint     TEXT,
  triage_notes             TEXT,
  is_abnormal              BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX vitals_patient_idx ON public.vitals(facility_id, patient_id);
CREATE INDEX vitals_visit_idx ON public.vitals(facility_id, visit_number);

CREATE TABLE public.encounters (
  id                            TEXT PRIMARY KEY,
  facility_id                   TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  patient_id                    TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_number                  TEXT NOT NULL,
  encounter_date                TIMESTAMPTZ NOT NULL DEFAULT now(),
  clinician_id                  TEXT,
  clinician_name                TEXT,
  chief_complaint               TEXT,
  history_of_presenting_illness TEXT,
  past_medical_history          TEXT,
  review_of_systems             TEXT,
  physical_examination          TEXT,
  assessment_notes              TEXT,
  treatment_plan                TEXT,
  follow_up_date                DATE,
  follow_up_instructions        TEXT,
  status                        TEXT NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','signed','amended')),
  signed_at                     TIMESTAMPTZ,
  signed_by                     TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, visit_number)
);

CREATE INDEX encounters_patient_idx ON public.encounters(facility_id, patient_id);

CREATE TABLE public.encounter_diagnoses (
  id           TEXT PRIMARY KEY,
  facility_id  TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  code         TEXT,
  description  TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'primary'
                 CHECK (type IN ('primary','secondary','differential')),
  certainty    TEXT NOT NULL DEFAULT 'provisional'
                 CHECK (certainty IN ('confirmed','suspected','provisional')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX encounter_diagnoses_encounter_idx ON public.encounter_diagnoses(encounter_id);

CREATE TABLE public.encounter_amendments (
  id               TEXT PRIMARY KEY,
  facility_id      TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  encounter_id     TEXT NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  amended_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  amended_by       TEXT,
  reason           TEXT NOT NULL,
  previous_content TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX encounter_amendments_encounter_idx ON public.encounter_amendments(encounter_id);

-- ============================================================================
-- 5. Laboratory
-- ============================================================================

CREATE TABLE public.lab_catalog (
  id                      TEXT PRIMARY KEY,
  facility_id             TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  code                    TEXT NOT NULL,
  name                    TEXT NOT NULL,
  category                TEXT NOT NULL
                            CHECK (category IN ('Hematology','Biochemistry','Microbiology','Serology',
                                                'Urinalysis','Parasitology','Dermatology')),
  specimen_type           TEXT,
  price_kes               NUMERIC(12,2) NOT NULL DEFAULT 0,
  turnaround_time_minutes INTEGER,
  units                   TEXT,
  reference_range         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, code)
);

CREATE TABLE public.lab_orders (
  id                    TEXT PRIMARY KEY,
  facility_id           TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  order_number          TEXT NOT NULL,
  patient_id            TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_number          TEXT NOT NULL,
  patient_name          TEXT NOT NULL,
  ordered_by            TEXT,
  ordered_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  priority              TEXT NOT NULL DEFAULT 'routine'
                          CHECK (priority IN ('routine','urgent','stat')),
  clinical_notes        TEXT,
  status                TEXT NOT NULL DEFAULT 'ordered'
                          CHECK (status IN ('ordered','sample_collected','processing',
                                            'results_entered','verified','cancelled')),
  specimen_collected_at TIMESTAMPTZ,
  specimen_collected_by TEXT,
  results_entered_at    TIMESTAMPTZ,
  results_entered_by    TEXT,
  verified_at           TIMESTAMPTZ,
  verified_by           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, order_number)
);

CREATE INDEX lab_orders_patient_idx ON public.lab_orders(facility_id, patient_id);
CREATE INDEX lab_orders_status_idx ON public.lab_orders(facility_id, status);

CREATE TABLE public.lab_order_items (
  id              TEXT PRIMARY KEY,
  facility_id     TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  lab_order_id    TEXT NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  test_id         TEXT REFERENCES public.lab_catalog(id) ON DELETE SET NULL,
  test_code       TEXT,
  test_name       TEXT NOT NULL,
  category        TEXT,
  specimen_type   TEXT,
  price_kes       NUMERIC(12,2) NOT NULL DEFAULT 0,
  result_value    TEXT,
  units           TEXT,
  reference_range TEXT,
  is_abnormal     BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lab_order_items_order_idx ON public.lab_order_items(lab_order_id);

-- ============================================================================
-- 6. Pharmacy
-- ============================================================================

CREATE TABLE public.medications (
  id              TEXT PRIMARY KEY,
  facility_id     TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  generic_name    TEXT NOT NULL,
  brand_name      TEXT,
  dosage_form     TEXT NOT NULL
                    CHECK (dosage_form IN ('Tablet','Capsule','Syrup','Injection',
                                           'Cream / Ointment','Eye Drops','Inhaler')),
  strength        TEXT,
  unit_price_kes  NUMERIC(12,2) NOT NULL DEFAULT 0,
  available_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level   INTEGER NOT NULL DEFAULT 0,
  batch_number    TEXT,
  expiry_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX medications_facility_idx ON public.medications(facility_id, generic_name);

CREATE TABLE public.prescriptions (
  id                  TEXT PRIMARY KEY,
  facility_id         TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  prescription_number TEXT NOT NULL,
  patient_id          TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_number        TEXT NOT NULL,
  patient_name        TEXT NOT NULL,
  prescribed_by       TEXT,
  prescribed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispensed_at        TIMESTAMPTZ,
  dispensed_by        TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','dispensed','partially_dispensed','cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, prescription_number)
);

CREATE INDEX prescriptions_patient_idx ON public.prescriptions(facility_id, patient_id);
CREATE INDEX prescriptions_status_idx ON public.prescriptions(facility_id, status);

CREATE TABLE public.prescription_items (
  id                  TEXT PRIMARY KEY,
  facility_id         TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  prescription_id     TEXT NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id       TEXT REFERENCES public.medications(id) ON DELETE SET NULL,
  medication_name     TEXT NOT NULL,
  dosage_form         TEXT,
  strength            TEXT,
  dose                TEXT,
  route               TEXT CHECK (route IN ('Oral','Topical','Intravenous','Intramuscular',
                                            'Subcutaneous','Inhalation','Ophthalmic')),
  frequency           TEXT CHECK (frequency IN ('Once daily','Twice daily (BD)','Thrice daily (TDS)',
                                                'Four times daily (QDS)','Every 8 hours','As needed (PRN)')),
  duration_days       INTEGER,
  quantity_prescribed INTEGER NOT NULL DEFAULT 0,
  quantity_dispensed  INTEGER NOT NULL DEFAULT 0,
  instructions        TEXT,
  warnings            TEXT,
  dispensed_status    TEXT NOT NULL DEFAULT 'pending'
                        CHECK (dispensed_status IN ('pending','dispensed','partially_dispensed','cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX prescription_items_prescription_idx ON public.prescription_items(prescription_id);

-- ============================================================================
-- 7. Billing
-- ============================================================================

CREATE TABLE public.services (
  id          TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL
                CHECK (category IN ('Consultation','Laboratory','Pharmacy','Procedure',
                                    'Nursing','Administrative')),
  price_kes   NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxable     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, code)
);

CREATE TABLE public.invoices (
  id              TEXT PRIMARY KEY,
  facility_id     TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  patient_id      TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name    TEXT NOT NULL,
  visit_number    TEXT,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by       TEXT,
  subtotal_kes    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_kes    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_kes       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_kes     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (status IN ('unpaid','partial','paid','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, invoice_number)
);

CREATE INDEX invoices_patient_idx ON public.invoices(facility_id, patient_id);
CREATE INDEX invoices_status_idx ON public.invoices(facility_id, status);

CREATE TABLE public.invoice_items (
  id              TEXT PRIMARY KEY,
  facility_id     TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  invoice_id      TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_code    TEXT,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Other'
                    CHECK (category IN ('Consultation','Laboratory','Pharmacy','Procedure','Other')),
  unit_price_kes  NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity        INTEGER NOT NULL DEFAULT 1,
  total_price_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX invoice_items_invoice_idx ON public.invoice_items(invoice_id);

CREATE TABLE public.payments (
  id               TEXT PRIMARY KEY,
  facility_id      TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  invoice_id       TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_kes       NUMERIC(12,2) NOT NULL,
  payment_method   TEXT NOT NULL
                     CHECK (payment_method IN ('M-Pesa','Cash','Credit/Debit Card',
                                               'Bank Transfer','Insurance')),
  reference_number TEXT,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_invoice_idx ON public.payments(invoice_id);

-- ============================================================================
-- 8. Nursing procedures & appointments
-- ============================================================================

CREATE TABLE public.nursing_procedures (
  id               TEXT PRIMARY KEY,
  facility_id      TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  procedure_number TEXT NOT NULL,
  patient_id       TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name     TEXT NOT NULL,
  visit_number     TEXT,
  procedure_name   TEXT NOT NULL,
  category         TEXT CHECK (category IN ('Wound Care','Injections','Catheterization',
                                            'Respiratory','Minor Surgery','Diagnostic')),
  service_code     TEXT,
  charge_kes       NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  performed_by     TEXT,
  performed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status           TEXT NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('completed','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, procedure_number)
);

CREATE INDEX nursing_procedures_patient_idx ON public.nursing_procedures(facility_id, patient_id);

CREATE TABLE public.appointments (
  id                 TEXT PRIMARY KEY,
  facility_id        TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  appointment_number TEXT NOT NULL,
  patient_id         TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name       TEXT NOT NULL,
  patient_phone      TEXT,
  clinician_name     TEXT,
  department         TEXT,
  appointment_date   DATE NOT NULL,
  appointment_time   TIME NOT NULL,
  reason             TEXT,
  status             TEXT NOT NULL DEFAULT 'scheduled'
                       CHECK (status IN ('scheduled','confirmed','checked_in',
                                         'completed','cancelled','no_show')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, appointment_number)
);

CREATE INDEX appointments_date_idx ON public.appointments(facility_id, appointment_date);
CREATE INDEX appointments_patient_idx ON public.appointments(facility_id, patient_id);

-- ============================================================================
-- 9. Audit trail & notifications
-- ============================================================================

CREATE TABLE public.audit_logs (
  id          TEXT PRIMARY KEY,
  facility_id TEXT REFERENCES public.facilities(id) ON DELETE SET NULL,
  user_id     TEXT,
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('patient','encounter','vitals','procedure','lab_order',
                                          'prescription','invoice','inventory','auth','settings')),
  entity_id   TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_facility_idx ON public.audit_logs(facility_id, created_at DESC);

CREATE TABLE public.notifications (
  id             TEXT PRIMARY KEY,
  facility_id    TEXT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  message        TEXT,
  type           TEXT NOT NULL DEFAULT 'general'
                   CHECK (type IN ('lab_verified','procedure_completed','billing_alert','general')),
  patient_id     TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name   TEXT,
  test_name      TEXT,
  procedure_name TEXT,
  is_read        BOOLEAN NOT NULL DEFAULT false,
  target_role    TEXT,
  link_view      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_facility_idx ON public.notifications(facility_id, is_read, created_at DESC);

-- ============================================================================
-- 10. updated_at triggers
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'facilities','user_profiles','clinic_settings','patients','patient_queue','vitals',
    'encounters','lab_catalog','lab_orders','medications','prescriptions','services',
    'invoices','nursing_procedures','appointments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- 11. Role helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_facility_id(_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.facility_id FROM public.user_profiles p WHERE p.id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = _user_id AND p.is_superadmin = true AND p.is_active = true
  );
$$;

-- Any active member of the facility (read access).
CREATE OR REPLACE FUNCTION public.is_facility_member(_user_id UUID, _facility_id TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = _user_id
      AND p.is_active = true
      AND (p.is_superadmin = true OR p.facility_id = _facility_id)
  );
$$;

-- Member of the facility holding one of the given roles (write access).
CREATE OR REPLACE FUNCTION public.can_write(_user_id UUID, _facility_id TEXT, _roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = _user_id
      AND p.is_active = true
      AND (p.is_superadmin = true OR p.facility_id = _facility_id)
      AND (p.is_superadmin = true OR p.role = ANY(_roles))
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = _user_id AND p.is_active = true AND p.role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_facility_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_facility_member(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write(UUID, TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_facility_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_facility_member(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write(UUID, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 12. Grants + RLS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.facilities                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_chronic_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_queue              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_diagnoses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_amendments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_catalog                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_procedures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;

-- --- facilities ------------------------------------------------------------
CREATE POLICY "members read own facility" ON public.facilities
  FOR SELECT TO authenticated
  USING (id = public.current_facility_id(auth.uid()) OR public.is_superadmin(auth.uid()));

CREATE POLICY "superadmin manages facilities" ON public.facilities
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- --- user_profiles ---------------------------------------------------------
CREATE POLICY "members read own profile and colleagues" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid()
         OR public.is_superadmin(auth.uid())
         OR (facility_id IS NOT NULL AND facility_id = public.current_facility_id(auth.uid())));

CREATE POLICY "own profile update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND is_superadmin = false);

CREATE POLICY "admins manage profiles" ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
         AND (id = auth.uid() OR facility_id = public.current_facility_id(auth.uid())))
  WITH CHECK (public.has_role(auth.uid(), 'admin')
              AND (facility_id = public.current_facility_id(auth.uid()) OR id = auth.uid()));

CREATE POLICY "superadmin manages all profiles" ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- --- clinic_settings (shared key/value config) -----------------------------
CREATE POLICY "settings read" ON public.clinic_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins write settings" ON public.clinic_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --- patients (+ clinical children) ---------------------------------------
CREATE POLICY "clinical read" ON public.patients FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id,
    ARRAY['admin','doctor','nurse','receptionist']));
CREATE POLICY "clinical update" ON public.patients FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','receptionist']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','receptionist']));
CREATE POLICY "admin delete" ON public.patients FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.patient_allergies FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.patient_allergies FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical update" ON public.patient_allergies FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical delete" ON public.patient_allergies FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));

CREATE POLICY "clinical read" ON public.patient_chronic_conditions FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.patient_chronic_conditions FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical update" ON public.patient_chronic_conditions FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical delete" ON public.patient_chronic_conditions FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));

-- --- patient_queue ---------------------------------------------------------
CREATE POLICY "clinical read" ON public.patient_queue FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.patient_queue FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id,
    ARRAY['admin','receptionist','nurse','doctor']));
CREATE POLICY "clinical update" ON public.patient_queue FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','receptionist','nurse','doctor']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','receptionist','nurse','doctor']));
CREATE POLICY "admin delete" ON public.patient_queue FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- vitals ----------------------------------------------------------------
CREATE POLICY "clinical read" ON public.vitals FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','nurse','doctor']));
CREATE POLICY "clinical update" ON public.vitals FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','nurse','doctor']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','nurse','doctor']));
CREATE POLICY "admin delete" ON public.vitals FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- encounters ------------------------------------------------------------
CREATE POLICY "clinical read" ON public.encounters FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.encounters FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical update" ON public.encounters FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "admin delete" ON public.encounters FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.encounter_diagnoses FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.encounter_diagnoses FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical update" ON public.encounter_diagnoses FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));
CREATE POLICY "clinical delete" ON public.encounter_diagnoses FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse']));

CREATE POLICY "clinical read" ON public.encounter_amendments FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.encounter_amendments FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor']));

-- --- laboratory ------------------------------------------------------------
CREATE POLICY "clinical read" ON public.lab_catalog FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.lab_catalog FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','lab_technician']));
CREATE POLICY "clinical update" ON public.lab_catalog FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','lab_technician']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','lab_technician']));
CREATE POLICY "admin delete" ON public.lab_catalog FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.lab_orders FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.lab_orders FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','lab_technician']));
CREATE POLICY "clinical update" ON public.lab_orders FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','lab_technician']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','lab_technician']));
CREATE POLICY "admin delete" ON public.lab_orders FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.lab_order_items FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.lab_order_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','lab_technician']));
CREATE POLICY "clinical update" ON public.lab_order_items FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','lab_technician']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','nurse','lab_technician']));
CREATE POLICY "admin delete" ON public.lab_order_items FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- pharmacy --------------------------------------------------------------
CREATE POLICY "clinical read" ON public.medications FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.medications FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','pharmacist']));
CREATE POLICY "clinical update" ON public.medications FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','pharmacist']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','pharmacist']));
CREATE POLICY "admin delete" ON public.medications FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.prescriptions FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor']));
CREATE POLICY "clinical update" ON public.prescriptions FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','pharmacist']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','pharmacist']));
CREATE POLICY "admin delete" ON public.prescriptions FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.prescription_items FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.prescription_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor']));
CREATE POLICY "clinical update" ON public.prescription_items FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','pharmacist']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','doctor','pharmacist']));
CREATE POLICY "admin delete" ON public.prescription_items FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- billing ---------------------------------------------------------------
CREATE POLICY "clinical read" ON public.services FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin']));
CREATE POLICY "clinical update" ON public.services FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin']));
CREATE POLICY "admin delete" ON public.services FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']));
CREATE POLICY "clinical update" ON public.invoices FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']));
CREATE POLICY "admin delete" ON public.invoices FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']));
CREATE POLICY "clinical update" ON public.invoice_items FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']));
CREATE POLICY "admin delete" ON public.invoice_items FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

CREATE POLICY "clinical read" ON public.payments FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier','receptionist']));
CREATE POLICY "clinical update" ON public.payments FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','billing_cashier']));
CREATE POLICY "admin delete" ON public.payments FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- nursing procedures ----------------------------------------------------
CREATE POLICY "clinical read" ON public.nursing_procedures FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.nursing_procedures FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','nurse']));
CREATE POLICY "clinical update" ON public.nursing_procedures FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','nurse']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','nurse']));
CREATE POLICY "admin delete" ON public.nursing_procedures FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- appointments ----------------------------------------------------------
CREATE POLICY "clinical read" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "clinical write" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid(), facility_id,
    ARRAY['admin','receptionist','nurse','doctor']));
CREATE POLICY "clinical update" ON public.appointments FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin','receptionist','nurse','doctor']))
  WITH CHECK (public.can_write(auth.uid(), facility_id, ARRAY['admin','receptionist','nurse','doctor']));
CREATE POLICY "admin delete" ON public.appointments FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- --- audit_logs (append-only for staff, readable by admins) ----------------
CREATE POLICY "staff append audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id)
         AND (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid())));

-- --- notifications ---------------------------------------------------------
CREATE POLICY "members read notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "members write notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "members update notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_facility_member(auth.uid(), facility_id))
  WITH CHECK (public.is_facility_member(auth.uid(), facility_id));
CREATE POLICY "admin delete notifications" ON public.notifications FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), facility_id, ARRAY['admin']));

-- ============================================================================
-- 13. Auto-provision a profile for every new auth user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New user'),
    'receptionist',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
