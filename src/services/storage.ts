import {
  Patient,
  PatientQueueEntry,
  VitalSigns,
  ClinicalEncounter,
  LabCatalogItem,
  LabOrder,
  MedicationItem,
  Prescription,
  ServiceItem,
  Invoice,
  InvoiceItem,
  Appointment,
  AuditLogEntry,
  UserProfile,
  ClinicSettings,
  NursingProcedure,
  AppNotification,
} from '../types/emr';

const STORAGE_KEYS = {
  PATIENTS: 'famart_emr_patients_v1',
  QUEUE: 'famart_emr_queue_v1',
  VITALS: 'famart_emr_vitals_v1',
  ENCOUNTERS: 'famart_emr_encounters_v1',
  LAB_CATALOG: 'famart_emr_lab_catalog_v1',
  LAB_ORDERS: 'famart_emr_lab_orders_v1',
  MEDICATIONS: 'famart_emr_medications_v1',
  PRESCRIPTIONS: 'famart_emr_prescriptions_v1',
  SERVICES: 'famart_emr_services_v1',
  INVOICES: 'famart_emr_invoices_v1',
  PROCEDURES: 'famart_emr_procedures_v1',
  APPOINTMENTS: 'famart_emr_appointments_v1',
  USERS: 'famart_emr_users_v1',
  AUDIT_LOGS: 'famart_emr_audit_logs_v1',
  SETTINGS: 'famart_emr_settings_v1',
  NOTIFICATIONS: 'famart_emr_notifications_v1',
};

// Initial Seed Data
const INITIAL_SETTINGS: ClinicSettings = {
  clinicName: 'Famart Clinic',
  subtitle: 'Electronic Medical Records & Clinic Management',
  domain: 'https://emr.famartclinic.co.ke',
  registrationNumber: 'MED/NRB/2022/8941',
  taxPin: 'P051892341Z',
  phoneNumber: '+254 712 345 678',
  email: 'famartmedicalskinclinic@gmail.com',
  address: 'Suite 402, Famart Medical Plaza, Argwings Kodhek Rd, Hurlingham',
  city: 'Nairobi',
  country: 'Kenya',
  timezone: 'Africa/Nairobi',
  currency: 'KES',
};

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Dr. Patrick Famart',
    email: 'admin@famartclinic.co.ke',
    username: 'admin.famart',
    loginPin: '8941',
    role: 'admin',
    title: 'Medical Director & Administrator',
    department: 'Administration & Clinical Practice',
    phone: '+254 722 100 001',
    licenseNumber: 'KMPDC-A4109',
    isActive: true,
    lastLogin: '2026-10-15 07:15',
  },
  {
    id: 'usr-2',
    name: 'Dr. Sarah Ochieng',
    email: 'dr.ochieng@famartclinic.co.ke',
    username: 'dr.ochieng',
    loginPin: '2026',
    role: 'doctor',
    title: 'Senior Clinical Officer / Physician',
    department: 'General Outpatient & Dermatology',
    phone: '+254 722 100 002',
    licenseNumber: 'KMPDC-CO892',
    isActive: true,
    lastLogin: '2026-10-15 07:30',
  },
  {
    id: 'usr-3',
    name: 'Florence Mwangi, RN',
    email: 'nurse.mwangi@famartclinic.co.ke',
    username: 'nurse.florence',
    loginPin: '1122',
    role: 'nurse',
    title: 'Triage & Nursing Officer',
    department: 'Triage & Injections',
    phone: '+254 722 100 003',
    licenseNumber: 'NCK-RN5182',
    isActive: true,
    lastLogin: '2026-10-15 07:10',
  },
  {
    id: 'usr-4',
    name: 'John Kiprop',
    email: 'reception@famartclinic.co.ke',
    username: 'reception.john',
    loginPin: '4455',
    role: 'receptionist',
    title: 'Head Receptionist & Patient Registrar',
    department: 'Front Desk & Patient Services',
    phone: '+254 722 100 004',
    isActive: true,
    lastLogin: '2026-10-15 06:55',
  },
  {
    id: 'usr-5',
    name: 'David Kamau, MLS',
    email: 'lab@famartclinic.co.ke',
    username: 'lab.david',
    loginPin: '7821',
    role: 'lab_technician',
    title: 'Medical Laboratory Scientist',
    department: 'Clinical Pathology & Microbiology',
    phone: '+254 722 100 005',
    licenseNumber: 'KMLTTB-7821',
    isActive: true,
    lastLogin: '2026-10-15 07:20',
  },
  {
    id: 'usr-6',
    name: 'Pharm. Grace Wanjiku',
    email: 'pharmacy@famartclinic.co.ke',
    username: 'pharmacy.grace',
    loginPin: '9030',
    role: 'pharmacist',
    title: 'Superintendent Pharmacist',
    department: 'Pharmacy & Drug Dispensary',
    phone: '+254 722 100 006',
    licenseNumber: 'PPB-PH903',
    isActive: true,
    lastLogin: '2026-10-15 07:25',
  },
  {
    id: 'usr-7',
    name: 'Mary Adhiambo',
    email: 'cashier@famartclinic.co.ke',
    username: 'cashier.mary',
    loginPin: '5566',
    role: 'billing_cashier',
    title: 'Cashier & Revenue Officer',
    department: 'Accounts & Billing',
    phone: '+254 722 100 007',
    isActive: true,
    lastLogin: '2026-10-15 07:05',
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Lab Result Verified & Published',
    message: 'Full Hemogram / CBC verified for Joyce Muthoni Kamau (FAM-2026-0042) by David Kamau, MLS. Eosinophilia (7.2%) detected.',
    timestamp: '2026-10-15 09:30',
    type: 'lab_verified',
    patientId: 'pat-2',
    patientName: 'Joyce Muthoni Kamau',
    testName: 'Full Hemogram / CBC',
    read: false,
    targetRole: 'doctor',
    linkView: 'consultation',
  },
  {
    id: 'notif-2',
    title: 'Nursing Procedure Completed',
    message: 'Wound Dressing & Aseptic Care completed for Samuel Kipchumba Koech (FAM-2026-0041) by Florence Mwangi, RN. Billed KES 800.',
    timestamp: '2026-10-15 08:30',
    type: 'procedure_completed',
    patientId: 'pat-1',
    patientName: 'Samuel Kipchumba Koech',
    procedureName: 'Wound Dressing & Aseptic Care',
    read: false,
    targetRole: 'doctor',
    linkView: 'procedures',
  },
  {
    id: 'notif-3',
    title: 'Lab Result Verified & Published',
    message: 'Liver Function Tests (LFTs) verified for Samuel Kipchumba Koech by David Kamau, MLS. Transaminases normal.',
    timestamp: '2026-10-15 08:45',
    type: 'lab_verified',
    patientId: 'pat-1',
    patientName: 'Samuel Kipchumba Koech',
    testName: 'Liver Function Tests (LFTs)',
    read: true,
    targetRole: 'doctor',
    linkView: 'consultation',
  },
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    patientNumber: 'FAM-2026-0041',
    firstName: 'Samuel',
    middleName: 'Kipchumba',
    lastName: 'Koech',
    dateOfBirth: '1988-06-14',
    gender: 'Male',
    phoneNumber: '+254 718 293 841',
    email: 'samuel.koech@example.com',
    address: 'Hurlingham, Nairobi',
    county: 'Nairobi',
    nationalId: '29812401',
    emergencyContactName: 'Faith Koech',
    emergencyContactPhone: '+254 718 293 842',
    emergencyContactRelation: 'Spouse',
    nextOfKinName: 'Faith Koech',
    nextOfKinPhone: '+254 718 293 842',
    allergies: [
      { id: 'alg-1', allergen: 'Penicillin', reaction: 'Urticaria & facial swelling', severity: 'severe', recordedAt: '2025-02-10' },
    ],
    chronicConditions: [
      { id: 'cc-1', condition: 'Essential Hypertension', diagnosedYear: '2022', notes: 'Managed on Amlodipine 5mg' },
    ],
    bloodGroup: 'O+',
    registrationDate: '2025-02-10',
    activeStatus: true,
    notes: 'Regular outpatient client for routine hypertensive checks and skin reviews.',
  },
  {
    id: 'pat-2',
    patientNumber: 'FAM-2026-0042',
    firstName: 'Joyce',
    middleName: 'Muthoni',
    lastName: 'Kamau',
    dateOfBirth: '1995-11-23',
    gender: 'Female',
    phoneNumber: '+254 720 918 234',
    email: 'joyce.kamau@example.com',
    address: 'Kilimani, Nairobi',
    county: 'Nairobi',
    nationalId: '32910481',
    emergencyContactName: 'Peter Kamau',
    emergencyContactPhone: '+254 720 918 235',
    emergencyContactRelation: 'Brother',
    allergies: [
      { id: 'alg-2', allergen: 'Sulfonamides (Bactrim)', reaction: 'Maculopapular rash', severity: 'moderate', recordedAt: '2026-01-18' },
    ],
    chronicConditions: [],
    bloodGroup: 'A+',
    registrationDate: '2026-01-18',
    activeStatus: true,
    notes: 'Presents with recurrent eczema and facial erythema.',
  },
  {
    id: 'pat-3',
    patientNumber: 'FAM-2026-0043',
    firstName: 'Brian',
    middleName: 'Otieno',
    lastName: 'Omondi',
    dateOfBirth: '1992-04-03',
    gender: 'Male',
    phoneNumber: '+254 733 112 233',
    email: 'brian.omondi@example.com',
    address: 'Kileleshwa, Nairobi',
    county: 'Nairobi',
    nationalId: '31049281',
    emergencyContactName: 'Mercy Achieng',
    emergencyContactPhone: '+254 733 112 234',
    emergencyContactRelation: 'Wife',
    allergies: [],
    chronicConditions: [
      { id: 'cc-2', condition: 'Type 2 Diabetes Mellitus', diagnosedYear: '2023', notes: 'On Metformin 500mg BD' },
    ],
    bloodGroup: 'B+',
    registrationDate: '2026-03-01',
    activeStatus: true,
  },
  {
    id: 'pat-4',
    patientNumber: 'FAM-2026-0044',
    firstName: 'Aisha',
    lastName: 'Hassan',
    dateOfBirth: '2001-08-19',
    gender: 'Female',
    phoneNumber: '+254 701 445 566',
    email: 'aisha.hassan@example.com',
    address: 'South C, Nairobi',
    county: 'Nairobi',
    nationalId: '38192849',
    emergencyContactName: 'Zainab Hassan',
    emergencyContactPhone: '+254 701 445 567',
    emergencyContactRelation: 'Mother',
    allergies: [],
    chronicConditions: [],
    bloodGroup: 'O+',
    registrationDate: '2026-09-12',
    activeStatus: true,
  },
  {
    id: 'pat-5',
    patientNumber: 'FAM-2026-0045',
    firstName: 'Daniel',
    middleName: 'Kariuki',
    lastName: 'Waweru',
    dateOfBirth: '1976-12-05',
    gender: 'Male',
    phoneNumber: '+254 711 889 900',
    address: 'Lavington, Nairobi',
    county: 'Nairobi',
    nationalId: '21094821',
    emergencyContactName: 'Esther Waweru',
    emergencyContactPhone: '+254 711 889 901',
    emergencyContactRelation: 'Wife',
    allergies: [
      { id: 'alg-3', allergen: 'Aspirin / NSAIDs', reaction: 'Gastric irritation & bronchospasm', severity: 'severe', recordedAt: '2024-05-14' },
    ],
    chronicConditions: [
      { id: 'cc-3', condition: 'Dyslipidemia', diagnosedYear: '2021', notes: 'Atorvastatin' },
    ],
    bloodGroup: 'O-',
    registrationDate: '2024-05-14',
    activeStatus: true,
  },
];

const INITIAL_VITALS: VitalSigns[] = [
  {
    id: 'vit-1',
    patientId: 'pat-1',
    visitNumber: 'VST-2026-0101',
    recordedAt: '2026-10-15 08:15',
    recordedBy: 'Florence Mwangi, RN',
    bloodPressureSystolic: 142,
    bloodPressureDiastolic: 92,
    pulseRate: 78,
    respiratoryRate: 18,
    temperature: 36.8,
    oxygenSaturation: 98,
    weightKg: 84.5,
    heightCm: 178,
    bmi: 26.7,
    bmiCategory: 'Overweight',
    painScore: 2,
    presentingComplaint: 'Mild headache for 2 days, routine blood pressure review',
    triageNotes: 'Elevated BP reading (142/92 mmHg). Alert and oriented.',
    isAbnormal: true,
  },
  {
    id: 'vit-2',
    patientId: 'pat-2',
    visitNumber: 'VST-2026-0102',
    recordedAt: '2026-10-15 08:45',
    recordedBy: 'Florence Mwangi, RN',
    bloodPressureSystolic: 118,
    bloodPressureDiastolic: 76,
    pulseRate: 72,
    respiratoryRate: 16,
    temperature: 37.1,
    oxygenSaturation: 99,
    weightKg: 62.0,
    heightCm: 165,
    bmi: 22.8,
    bmiCategory: 'Normal',
    painScore: 4,
    presentingComplaint: 'Severe itching and skin flare-up on cheeks and neck',
    triageNotes: 'Vitals stable. Marked erythematous pruritic papules noted on face.',
    isAbnormal: false,
  },
];

const INITIAL_QUEUE: PatientQueueEntry[] = [
  {
    id: 'q-1',
    patientId: 'pat-1',
    patientNumber: 'FAM-2026-0041',
    patientName: 'Samuel Kipchumba Koech',
    visitNumber: 'VST-2026-0101',
    stage: 'consultation',
    priority: 'normal',
    chiefComplaint: 'Headache & Hypertensive review',
    checkedInAt: '2026-10-15 08:05',
    assignedStaffName: 'Dr. Sarah Ochieng',
    status: 'in_progress',
    updatedAt: '2026-10-15 08:20',
  },
  {
    id: 'q-2',
    patientId: 'pat-2',
    patientNumber: 'FAM-2026-0042',
    patientName: 'Joyce Muthoni Kamau',
    visitNumber: 'VST-2026-0102',
    stage: 'laboratory',
    priority: 'normal',
    chiefComplaint: 'Facial rash and itching',
    checkedInAt: '2026-10-15 08:30',
    assignedStaffName: 'David Kamau, MLS',
    status: 'waiting',
    updatedAt: '2026-10-15 09:10',
  },
  {
    id: 'q-3',
    patientId: 'pat-3',
    patientNumber: 'FAM-2026-0043',
    patientName: 'Brian Otieno Omondi',
    visitNumber: 'VST-2026-0103',
    stage: 'triage',
    priority: 'normal',
    chiefComplaint: 'Routine diabetes check-up & refill',
    checkedInAt: '2026-10-15 09:20',
    assignedStaffName: 'Florence Mwangi, RN',
    status: 'waiting',
    updatedAt: '2026-10-15 09:20',
  },
  {
    id: 'q-4',
    patientId: 'pat-4',
    patientNumber: 'FAM-2026-0044',
    patientName: 'Aisha Hassan',
    visitNumber: 'VST-2026-0104',
    stage: 'reception',
    priority: 'normal',
    chiefComplaint: 'Skin consultation for acne vulgaris',
    checkedInAt: '2026-10-15 09:35',
    status: 'waiting',
    updatedAt: '2026-10-15 09:35',
  },
];

const INITIAL_LAB_CATALOG: LabCatalogItem[] = [
  { id: 'lab-1', code: 'CBC-01', name: 'Full Hemogram / Complete Blood Count (CBC)', category: 'Hematology', specimenType: 'Whole Blood (EDTA)', priceKes: 1200, turnaroundTimeMinutes: 30, units: 'Standard', referenceRange: 'Hb 12-17.5 g/dL, WBC 4-10 x10^9/L, PLT 150-450' },
  { id: 'lab-2', code: 'FBS-02', name: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', specimenType: 'Fluoride Plasma', priceKes: 600, turnaroundTimeMinutes: 20, units: 'mmol/L', referenceRange: '3.9 - 5.6 mmol/L' },
  { id: 'lab-3', code: 'LIP-03', name: 'Lipid Profile Full Panel', category: 'Biochemistry', specimenType: 'Serum', priceKes: 2500, turnaroundTimeMinutes: 45, units: 'mmol/L', referenceRange: 'Chol < 5.2, TG < 1.7, HDL > 1.0, LDL < 3.0' },
  { id: 'lab-4', code: 'URN-04', name: 'Urinalysis Complete Dipstick & Microscopy', category: 'Urinalysis', specimenType: 'Midstream Urine', priceKes: 800, turnaroundTimeMinutes: 25, units: '', referenceRange: 'Negative / Nil' },
  { id: 'lab-5', code: 'MAL-05', name: 'Malaria Rapid Test & Microscopy (mRDT & BS)', category: 'Parasitology', specimenType: 'Capillary / EDTA Blood', priceKes: 500, turnaroundTimeMinutes: 25, units: '', referenceRange: 'No parasites seen' },
  { id: 'lab-6', code: 'KOH-06', name: 'KOH Mount Skin Scraping (Fungal)', category: 'Dermatology', specimenType: 'Skin Scraping', priceKes: 1500, turnaroundTimeMinutes: 40, units: '', referenceRange: 'No fungal hyphae/spores seen' },
  { id: 'lab-7', code: 'LFT-07', name: 'Liver Function Tests (LFTs)', category: 'Biochemistry', specimenType: 'Serum', priceKes: 2800, turnaroundTimeMinutes: 60, units: 'U/L', referenceRange: 'ALT: 7-56, AST: 10-40, Bilirubin Total: 3-21 umol/L' },
  { id: 'lab-8', code: 'UEC-08', name: 'UECS / Renal Function (Urea, Electrolytes, Creatinine, eGFR)', category: 'Biochemistry', specimenType: 'Serum', priceKes: 2200, turnaroundTimeMinutes: 45, units: 'mmol/L', referenceRange: 'Creatinine: 62-106 umol/L, Urea: 2.5-7.8 mmol/L' },
  { id: 'lab-9', code: 'TB-09', name: 'TB Lab Request Test (GeneXpert MTB/RIF & ZN Smear)', category: 'Microbiology', specimenType: 'Sputum / Clinical Specimen', priceKes: 2000, turnaroundTimeMinutes: 120, units: '', referenceRange: 'MTB Not Detected, Smear Negative' },
  { id: 'lab-10', code: 'TFT-10', name: 'Thyroid Function Tests (TFTs - TSH, FT3, FT4)', category: 'Biochemistry', specimenType: 'Serum', priceKes: 3500, turnaroundTimeMinutes: 90, units: 'mIU/L', referenceRange: 'TSH: 0.27 - 4.20 mIU/L' },
  { id: 'lab-11', code: 'PSA-11', name: 'Prostate Specific Antigen (PSA Total & Free)', category: 'Biochemistry', specimenType: 'Serum', priceKes: 3000, turnaroundTimeMinutes: 60, units: 'ng/mL', referenceRange: '< 4.0 ng/mL' },
  { id: 'lab-12', code: 'HEP-12', name: 'Hepatitis Viral Serology Profile (A, B, C, D)', category: 'Serology', specimenType: 'Serum', priceKes: 3800, turnaroundTimeMinutes: 60, units: '', referenceRange: 'Non-Reactive' },
  { id: 'lab-13', code: 'VIT-13', name: 'Vitamin Profile (Vit D 25-OH, B12, Folate)', category: 'Biochemistry', specimenType: 'Serum', priceKes: 4800, turnaroundTimeMinutes: 120, units: 'ng/mL', referenceRange: 'Vit D: 30-100 ng/mL, B12: 200-900 pg/mL' },
  { id: 'lab-14', code: 'BON-14', name: 'Bone Chemistry Profile (Calcium, Phosphate, ALP, Mg)', category: 'Biochemistry', specimenType: 'Serum', priceKes: 2900, turnaroundTimeMinutes: 60, units: 'mmol/L', referenceRange: 'Calcium: 2.15-2.55 mmol/L, PO4: 0.8-1.5' },
  { id: 'lab-15', code: 'HPY-15', name: 'H. Pylori Antigen (Stool) & Antibody Serology', category: 'Microbiology', specimenType: 'Stool / Serum', priceKes: 1500, turnaroundTimeMinutes: 30, units: '', referenceRange: 'Negative / Non-Reactive' },
  { id: 'lab-16', code: 'RBS-16', name: 'Blood Sugar Panel (RBS, OGTT, FBS, HbA1c)', category: 'Biochemistry', specimenType: 'Whole Blood / Plasma', priceKes: 1800, turnaroundTimeMinutes: 30, units: '% / mmol/L', referenceRange: 'HbA1c < 5.7%, RBS < 7.8 mmol/L' },
  { id: 'lab-17', code: 'STL-17', name: 'Stool for Ova and Cysts (Microscopy & Occult Blood)', category: 'Parasitology', specimenType: 'Fresh Stool', priceKes: 800, turnaroundTimeMinutes: 30, units: '', referenceRange: 'No ova or cysts seen' },
  { id: 'lab-18', code: 'PRG-18', name: 'Pregnancy Test (Qualitative Urine & Serum β-hCG)', category: 'Serology', specimenType: 'Urine / Serum', priceKes: 700, turnaroundTimeMinutes: 15, units: '', referenceRange: 'Negative' },
  { id: 'lab-19', code: 'HIV-19', name: 'HIV 1 & 2 Rapid Diagnostic Test (Kenya National Algorithm)', category: 'Serology', specimenType: 'Whole Blood / Serum', priceKes: 600, turnaroundTimeMinutes: 20, units: '', referenceRange: 'Non-Reactive' },
];

const INITIAL_LAB_ORDERS: LabOrder[] = [
  {
    id: 'ord-1',
    orderNumber: 'LAB-2026-0312',
    patientId: 'pat-2',
    visitNumber: 'VST-2026-0102',
    patientName: 'Joyce Muthoni Kamau',
    orderedBy: 'Dr. Sarah Ochieng',
    orderedAt: '2026-10-15 09:00',
    priority: 'routine',
    clinicalNotes: 'Recurrent itchy dermatitis face/neck. Rule out fungal infection & check full hemogram.',
    items: [
      {
        id: 'loi-1',
        testId: 'lab-6',
        testCode: 'KOH-06',
        testName: 'KOH Mount Skin Scraping (Fungal)',
        category: 'Dermatology',
        specimenType: 'Skin Scraping',
        priceKes: 1500,
        resultValue: 'Negative',
        referenceRange: 'No fungal hyphae/spores seen',
        isAbnormal: false,
        notes: 'Examined under 10x and 40x. No dermatophytes or yeast identified.',
      },
      {
        id: 'loi-2',
        testId: 'lab-1',
        testCode: 'CBC-01',
        testName: 'Complete Blood Count (CBC)',
        category: 'Hematology',
        specimenType: 'Whole Blood (EDTA)',
        priceKes: 1200,
        resultValue: 'Hb: 13.8 g/dL, WBC: 6.8 x10^9/L, Platelets: 284 x10^9/L, Eosinophils: 7.2%',
        units: 'Standard',
        referenceRange: 'Eosinophils 1-4%',
        isAbnormal: true,
        notes: 'Mild peripheral eosinophilia consistent with allergic / atopic state.',
      },
    ],
    status: 'results_entered',
    specimenCollectedAt: '2026-10-15 09:15',
    specimenCollectedBy: 'David Kamau, MLS',
    resultsEnteredAt: '2026-10-15 09:40',
    resultsEnteredBy: 'David Kamau, MLS',
  },
];

const INITIAL_MEDICATIONS: MedicationItem[] = [
  { id: 'med-1', genericName: 'Amoxicillin / Clavulanic Acid', brandName: 'Augmentin', dosageForm: 'Tablet', strength: '625 mg', unitPriceKes: 180, availableStock: 420, reorderLevel: 50, batchNumber: 'BAT-2026-90', expiryDate: '2027-08-30' },
  { id: 'med-2', genericName: 'Paracetamol', brandName: 'Panadol Extra', dosageForm: 'Tablet', strength: '500 mg', unitPriceKes: 15, availableStock: 1850, reorderLevel: 200, batchNumber: 'BAT-2026-12', expiryDate: '2028-01-15' },
  { id: 'med-3', genericName: 'Amlodipine Besylate', brandName: 'Norvasc', dosageForm: 'Tablet', strength: '5 mg', unitPriceKes: 45, availableStock: 680, reorderLevel: 100, batchNumber: 'BAT-2025-44', expiryDate: '2027-11-20' },
  { id: 'med-4', genericName: 'Metformin Hydrochloride', brandName: 'Glucophage', dosageForm: 'Tablet', strength: '500 mg', unitPriceKes: 30, availableStock: 540, reorderLevel: 80, batchNumber: 'BAT-2026-03', expiryDate: '2027-09-10' },
  { id: 'med-5', genericName: 'Cetirizine Dihydrochloride', brandName: 'Zyrtec', dosageForm: 'Tablet', strength: '10 mg', unitPriceKes: 35, availableStock: 390, reorderLevel: 60, batchNumber: 'BAT-2025-88', expiryDate: '2027-04-18' },
  { id: 'med-6', genericName: 'Hydrocortisone Butyrate Cream', brandName: 'Locoid Lipocream', dosageForm: 'Cream / Ointment', strength: '0.1% 30g', unitPriceKes: 850, availableStock: 48, reorderLevel: 15, batchNumber: 'BAT-2026-55', expiryDate: '2026-12-31' },
  { id: 'med-7', genericName: 'Mometasone Furoate Ointment', brandName: 'Elocon', dosageForm: 'Cream / Ointment', strength: '0.1% 15g', unitPriceKes: 1200, availableStock: 32, reorderLevel: 10, batchNumber: 'BAT-2026-17', expiryDate: '2027-05-15' },
  { id: 'med-8', genericName: 'Omeprazole', brandName: 'Losec', dosageForm: 'Capsule', strength: '20 mg', unitPriceKes: 40, availableStock: 620, reorderLevel: 80, batchNumber: 'BAT-2026-08', expiryDate: '2027-10-25' },
  { id: 'med-9', genericName: 'Artemether + Lumefantrine', brandName: 'Coartem', dosageForm: 'Tablet', strength: '20/120 mg (24s)', unitPriceKes: 750, availableStock: 95, reorderLevel: 25, batchNumber: 'BAT-2026-31', expiryDate: '2027-06-30' },
  { id: 'med-10', genericName: 'Ciprofloxacin', brandName: 'Ciproxin', dosageForm: 'Tablet', strength: '500 mg', unitPriceKes: 95, availableStock: 280, reorderLevel: 50, batchNumber: 'BAT-2025-99', expiryDate: '2027-02-28' },
];

const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-1',
    prescriptionNumber: 'RX-2026-0419',
    patientId: 'pat-1',
    visitNumber: 'VST-2026-0101',
    patientName: 'Samuel Kipchumba Koech',
    prescribedBy: 'Dr. Sarah Ochieng',
    prescribedAt: '2026-10-15 08:40',
    items: [
      {
        id: 'rxi-1',
        medicationId: 'med-3',
        medicationName: 'Amlodipine Besylate',
        dosageForm: 'Tablet',
        strength: '5 mg',
        dose: '5 mg',
        route: 'Oral',
        frequency: 'Once daily',
        durationDays: 30,
        quantityPrescribed: 30,
        quantityDispensed: 30,
        instructions: 'Take 1 tablet every morning with or without food for blood pressure control.',
        dispensedStatus: 'dispensed',
      },
      {
        id: 'rxi-2',
        medicationId: 'med-2',
        medicationName: 'Paracetamol',
        dosageForm: 'Tablet',
        strength: '500 mg',
        dose: '1000 mg',
        route: 'Oral',
        frequency: 'Thrice daily (TDS)',
        durationDays: 3,
        quantityPrescribed: 18,
        quantityDispensed: 18,
        instructions: 'Take 2 tablets three times a day after meals as needed for headache.',
        dispensedStatus: 'dispensed',
      },
    ],
    dispensedAt: '2026-10-15 09:05',
    dispensedBy: 'Pharm. Grace Wanjiku',
    status: 'dispensed',
  },
];

const INITIAL_SERVICES: ServiceItem[] = [
  { id: 'srv-1', code: 'SRV-CONS-GEN', name: 'General Outpatient Consultation', category: 'Consultation', priceKes: 1500, taxable: false },
  { id: 'srv-2', code: 'SRV-CONS-SPEC', name: 'Specialist Dermatology Consultation', category: 'Consultation', priceKes: 3000, taxable: false },
  { id: 'srv-3', code: 'SRV-NURS-TRIAGE', name: 'Triage & Nursing Assessment', category: 'Nursing', priceKes: 500, taxable: false },
  { id: 'srv-4', code: 'SRV-PROC-DRESS', name: 'Wound Dressing & Aseptic Care', category: 'Nursing', priceKes: 800, taxable: false },
  { id: 'srv-5', code: 'SRV-PROC-BIOPSY', name: 'Skin Punch Biopsy Procedure', category: 'Procedure', priceKes: 4500, taxable: false },
  { id: 'srv-6', code: 'SRV-NURS-INJ', name: 'IM / IV Injection Administration', category: 'Nursing', priceKes: 500, taxable: false },
  { id: 'srv-7', code: 'SRV-NURS-CATH', name: 'Urinary Catheterization & Care', category: 'Nursing', priceKes: 1800, taxable: false },
  { id: 'srv-8', code: 'SRV-NURS-NEB', name: 'Nebulization Therapy Session', category: 'Nursing', priceKes: 1000, taxable: false },
  { id: 'srv-9', code: 'SRV-PROC-SUT', name: 'Minor Surgical Suturing / Laceration Repair', category: 'Procedure', priceKes: 2500, taxable: false },
  { id: 'srv-10', code: 'SRV-NURS-EAR', name: 'Ear Syringing & Irrigation (Bilateral)', category: 'Nursing', priceKes: 1500, taxable: false },
  { id: 'srv-11', code: 'SRV-PROC-INC', name: 'Incision & Drainage (Abscess / Boil)', category: 'Procedure', priceKes: 3000, taxable: false },
  { id: 'srv-12', code: 'SRV-NURS-IVF', name: 'Intravenous Fluid Infusion & Cannulation', category: 'Nursing', priceKes: 1200, taxable: false },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0811',
    patientId: 'pat-1',
    patientName: 'Samuel Kipchumba Koech',
    visitNumber: 'VST-2026-0101',
    issuedAt: '2026-10-15 08:50',
    issuedBy: 'Mary Adhiambo',
    items: [
      { id: 'ii-1', serviceCode: 'SRV-CONS-GEN', description: 'General Outpatient Consultation', category: 'Consultation', unitPriceKes: 1500, quantity: 1, totalPriceKes: 1500 },
      { id: 'ii-2', serviceCode: 'MED-NORV-5', description: 'Amlodipine Besylate 5mg (30 tabs)', category: 'Pharmacy', unitPriceKes: 45, quantity: 30, totalPriceKes: 1350 },
      { id: 'ii-3', serviceCode: 'MED-PARA-500', description: 'Paracetamol 500mg (18 tabs)', category: 'Pharmacy', unitPriceKes: 15, quantity: 18, totalPriceKes: 270 },
    ],
    subtotalKes: 3120,
    discountKes: 120,
    totalKes: 3000,
    amountPaidKes: 3000,
    balanceKes: 0,
    status: 'paid',
    payments: [
      {
        id: 'pay-1',
        amountKes: 3000,
        paymentMethod: 'M-Pesa',
        referenceNumber: 'SJK904812K',
        receivedAt: '2026-10-15 08:55',
        receivedBy: 'Mary Adhiambo',
        notes: 'M-Pesa Express verified transaction',
      },
    ],
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0812',
    patientId: 'pat-2',
    patientName: 'Joyce Muthoni Kamau',
    visitNumber: 'VST-2026-0102',
    issuedAt: '2026-10-15 09:05',
    issuedBy: 'Mary Adhiambo',
    items: [
      { id: 'ii-4', serviceCode: 'SRV-CONS-SPEC', description: 'Specialist Dermatology Consultation', category: 'Consultation', unitPriceKes: 3000, quantity: 1, totalPriceKes: 3000 },
      { id: 'ii-5', serviceCode: 'KOH-06', description: 'KOH Mount Skin Scraping (Fungal)', category: 'Laboratory', unitPriceKes: 1500, quantity: 1, totalPriceKes: 1500 },
      { id: 'ii-6', serviceCode: 'CBC-01', description: 'Complete Blood Count (CBC)', category: 'Laboratory', unitPriceKes: 1200, quantity: 1, totalPriceKes: 1200 },
    ],
    subtotalKes: 5700,
    discountKes: 0,
    totalKes: 5700,
    amountPaidKes: 5700,
    balanceKes: 0,
    status: 'paid',
    payments: [
      {
        id: 'pay-2',
        amountKes: 5700,
        paymentMethod: 'M-Pesa',
        referenceNumber: 'SKL491823M',
        receivedAt: '2026-10-15 09:10',
        receivedBy: 'Mary Adhiambo',
        notes: 'M-Pesa payment received in full',
      },
    ],
  },
];

const INITIAL_PROCEDURES: NursingProcedure[] = [
  {
    id: 'prc-1',
    procedureNumber: 'PRC-2026-0011',
    patientId: 'pat-1',
    patientName: 'Samuel Kipchumba Koech',
    visitNumber: 'VST-2026-0101',
    procedureName: 'Wound Dressing (Minor)',
    category: 'Wound Care',
    serviceCode: 'SRV-PROC-DRESS',
    chargeKes: 800,
    notes: 'Cleaned abrasion on right forearm with saline and betadine. Applied sterile non-adherent dressing.',
    performedBy: 'Florence Mwangi, RN',
    performedAt: '2026-10-15 08:25',
    status: 'completed',
  },
];

const INITIAL_ENCOUNTERS: ClinicalEncounter[] = [
  {
    id: 'enc-1',
    patientId: 'pat-1',
    visitNumber: 'VST-2026-0101',
    encounterDate: '2026-10-15 08:35',
    clinicianId: 'usr-2',
    clinicianName: 'Dr. Sarah Ochieng',
    chiefComplaint: 'Bitemporal throbbing headache for 2 days, accompanied by neck tension.',
    historyOfPresentingIllness: 'Samuel is a known hypertensive patient on Amlodipine 5mg. Reports mild medication non-compliance over the past weekend due to travel. No visual disturbances, chest pain, or focal neurological deficits.',
    pastMedicalHistory: 'Essential hypertension diagnosed in 2022. No previous surgeries. Non-smoker, occasional alcohol.',
    reviewOfSystems: 'Cardiovascular: Denies palpitations. Respiratory: No shortness of breath. CNS: Moderate frontal-bitemporal headache, no photophobia.',
    physicalExamination: 'General: Well-nourished male, alert and oriented x3. CVS: S1+S2 regular, no murmurs. BP 142/92 mmHg, Pulse 78 bpm regular. Chest: Clear bilaterally, vesicular breath sounds. Abdomen: Soft, non-tender, no organomegaly.',
    assessmentNotes: '1. Stage 1 Hypertension with mild subtherapeutic control secondary to skipped doses.\n2. Tension-type vascular headache.',
    treatmentPlan: '1. Re-enforce compliance with Amlodipine 5mg daily.\n2. Prescribe Paracetamol 1g TDS PRN for headache.\n3. Lifestyle counsel: sodium restriction < 2g/day, regular aerobic exercise.\n4. Review BP log in 2 weeks at clinic.',
    followUpDate: '2026-10-29',
    followUpInstructions: 'Return in 14 days with home BP diary. Report immediately if severe headache, blurred vision, or chest tightness occurs.',
    diagnoses: [
      { id: 'diag-1', code: 'I10', description: 'Essential (primary) hypertension', type: 'primary', certainty: 'confirmed' },
      { id: 'diag-2', code: 'G44.2', description: 'Tension-type headache', type: 'secondary', certainty: 'confirmed' },
    ],
    status: 'signed',
    signedAt: '2026-10-15 08:45',
    signedBy: 'Dr. Sarah Ochieng',
    amendments: [],
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    appointmentNumber: 'APT-2026-0201',
    patientId: 'pat-1',
    patientName: 'Samuel Kipchumba Koech',
    patientPhone: '+254 718 293 841',
    clinicianName: 'Dr. Sarah Ochieng',
    department: 'General Outpatient',
    appointmentDate: '2026-10-15',
    appointmentTime: '08:00',
    reason: 'Hypertension Follow-up',
    status: 'completed',
    createdAt: '2026-10-10',
  },
  {
    id: 'apt-2',
    appointmentNumber: 'APT-2026-0202',
    patientId: 'pat-2',
    patientName: 'Joyce Muthoni Kamau',
    patientPhone: '+254 720 918 234',
    clinicianName: 'Dr. Sarah Ochieng',
    department: 'Dermatology & Skin Clinic',
    appointmentDate: '2026-10-15',
    appointmentTime: '08:30',
    reason: 'Skin Flare-up & Rash Evaluation',
    status: 'checked_in',
    createdAt: '2026-10-14',
  },
  {
    id: 'apt-3',
    appointmentNumber: 'APT-2026-0203',
    patientId: 'pat-3',
    patientName: 'Brian Otieno Omondi',
    patientPhone: '+254 733 112 233',
    clinicianName: 'Dr. Patrick Famart',
    department: 'General Outpatient',
    appointmentDate: '2026-10-15',
    appointmentTime: '09:30',
    reason: 'Diabetes Management Review',
    status: 'confirmed',
    createdAt: '2026-10-12',
  },
  {
    id: 'apt-4',
    appointmentNumber: 'APT-2026-0204',
    patientId: 'pat-4',
    patientName: 'Aisha Hassan',
    patientPhone: '+254 701 445 566',
    clinicianName: 'Dr. Sarah Ochieng',
    department: 'Dermatology & Skin Clinic',
    appointmentDate: '2026-10-15',
    appointmentTime: '10:00',
    reason: 'Acne Vulgaris Management',
    status: 'scheduled',
    createdAt: '2026-10-13',
  },
  {
    id: 'apt-5',
    appointmentNumber: 'APT-2026-0205',
    patientId: 'pat-5',
    patientName: 'Daniel Kariuki Waweru',
    patientPhone: '+254 711 889 900',
    clinicianName: 'Dr. Patrick Famart',
    department: 'Cardiology / Outpatient',
    appointmentDate: '2026-10-16',
    appointmentTime: '11:00',
    reason: 'Lipid Profile & Wellness Check',
    status: 'scheduled',
    createdAt: '2026-10-14',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    timestamp: '2026-10-15 08:05:12',
    userId: 'usr-4',
    userName: 'John Kiprop',
    userRole: 'receptionist',
    action: 'CHECK_IN_PATIENT',
    entityType: 'patient',
    entityId: 'pat-1',
    details: 'Patient Samuel Kipchumba Koech checked in for visit VST-2026-0101',
    ipAddress: '192.168.1.104',
  },
  {
    id: 'aud-2',
    timestamp: '2026-10-15 08:15:30',
    userId: 'usr-3',
    userName: 'Florence Mwangi, RN',
    userRole: 'nurse',
    action: 'RECORD_VITALS',
    entityType: 'vitals',
    entityId: 'vit-1',
    details: 'Recorded BP 142/92, Pulse 78, Temp 36.8 for patient FAM-2026-0041',
    ipAddress: '192.168.1.103',
  },
  {
    id: 'aud-3',
    timestamp: '2026-10-15 08:45:04',
    userId: 'usr-2',
    userName: 'Dr. Sarah Ochieng',
    userRole: 'doctor',
    action: 'SIGN_CLINICAL_NOTE',
    entityType: 'encounter',
    entityId: 'enc-1',
    details: 'Doctor signed clinical encounter note for VST-2026-0101 with ICD-10 I10 & G44.2',
    ipAddress: '192.168.1.102',
  },
  {
    id: 'aud-4',
    timestamp: '2026-10-15 08:55:18',
    userId: 'usr-7',
    userName: 'Mary Adhiambo',
    userRole: 'billing_cashier',
    action: 'RECEIVE_PAYMENT',
    entityType: 'invoice',
    entityId: 'inv-1',
    details: 'Recorded M-Pesa payment of KES 3,000 (Ref: SJK904812K) for Invoice INV-2026-0811',
    ipAddress: '192.168.1.107',
  },
  {
    id: 'aud-5',
    timestamp: '2026-10-15 09:05:40',
    userId: 'usr-6',
    userName: 'Pharm. Grace Wanjiku',
    userRole: 'pharmacist',
    action: 'DISPENSE_PRESCRIPTION',
    entityType: 'prescription',
    entityId: 'rx-1',
    details: 'Dispensed 30 tabs Amlodipine 5mg and 18 tabs Paracetamol 500mg. Inventory decremented.',
    ipAddress: '192.168.1.106',
  },
];

// Helper to safely load data or initialize default
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error loading key ${key} from storage:`, err);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Trigger custom window event for inter-component reactive sync
    window.dispatchEvent(new CustomEvent('famart_storage_updated', { detail: { key } }));
  } catch (err) {
    console.error(`Error saving key ${key} to storage:`, err);
  }
}

export const StorageService = {
  // Settings
  getSettings: (): ClinicSettings => loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
  saveSettings: (settings: ClinicSettings) => saveToStorage(STORAGE_KEYS.SETTINGS, settings),

  // Users
  getUsers: (): UserProfile[] => loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS),
  saveUser: (user: UserProfile) => {
    const users = StorageService.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    saveToStorage(STORAGE_KEYS.USERS, users);
  },
  deleteUser: (id: string): boolean => {
    let users = StorageService.getUsers();
    const target = users.find(u => u.id === id);
    if (target?.role === 'admin') {
      const activeAdmins = users.filter(u => u.role === 'admin' && u.isActive && u.id !== id);
      if (activeAdmins.length === 0) {
        return false;
      }
    }
    users = users.filter(u => u.id !== id);
    saveToStorage(STORAGE_KEYS.USERS, users);
    return true;
  },
  setUserActiveStatus: (id: string, isActive: boolean) => {
    const users = StorageService.getUsers();
    const target = users.find(u => u.id === id);
    if (target) {
      target.isActive = isActive;
      saveToStorage(STORAGE_KEYS.USERS, users);
    }
  },

  // Patients
  getPatients: (): Patient[] => loadFromStorage(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS),
  getPatientById: (id: string): Patient | undefined => {
    return StorageService.getPatients().find(p => p.id === id);
  },
  savePatient: (patient: Patient) => {
    const patients = StorageService.getPatients();
    const idx = patients.findIndex(p => p.id === patient.id);
    if (idx >= 0) {
      patients[idx] = patient;
    } else {
      // Check for duplicate by phone number or exact first+last+dob
      const existing = patients.find(p => 
        (p.phoneNumber && patient.phoneNumber && p.phoneNumber === patient.phoneNumber) ||
        (p.firstName.toLowerCase() === patient.firstName.toLowerCase() &&
         p.lastName.toLowerCase() === patient.lastName.toLowerCase() &&
         p.dateOfBirth === patient.dateOfBirth)
      );
      if (existing) {
        const existIdx = patients.findIndex(p => p.id === existing.id);
        patients[existIdx] = {
          ...existing,
          ...patient,
          id: existing.id,
          patientNumber: existing.patientNumber,
        };
      } else {
        patients.unshift(patient);
      }
    }
    saveToStorage(STORAGE_KEYS.PATIENTS, patients);
  },
  generatePatientNumber: (): string => {
    const patients = StorageService.getPatients();
    const nextSeq = patients.length + 42;
    return `FAM-2026-${String(nextSeq).padStart(4, '0')}`;
  },

  // Queue
  getQueue: (): PatientQueueEntry[] => loadFromStorage(STORAGE_KEYS.QUEUE, INITIAL_QUEUE),
  saveQueueEntry: (entry: PatientQueueEntry) => {
    const queue = StorageService.getQueue();
    const idx = queue.findIndex(q => q.id === entry.id || (q.patientId === entry.patientId && q.visitNumber === entry.visitNumber && q.status !== 'completed' && q.status !== 'cancelled'));
    if (idx >= 0) {
      queue[idx] = { ...queue[idx], ...entry, id: queue[idx].id };
    } else {
      queue.unshift(entry);
    }
    saveToStorage(STORAGE_KEYS.QUEUE, queue);
  },
  updateQueueStage: (id: string, stage: PatientQueueEntry['stage'], status?: PatientQueueEntry['status']) => {
    const queue = StorageService.getQueue();
    const entry = queue.find(q => q.id === id);
    if (entry) {
      entry.stage = stage;
      if (status) entry.status = status;
      entry.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      saveToStorage(STORAGE_KEYS.QUEUE, queue);
    }
  },

  // Vital Signs
  getVitals: (): VitalSigns[] => loadFromStorage(STORAGE_KEYS.VITALS, INITIAL_VITALS),
  getVitalsByPatientId: (patientId: string): VitalSigns[] => {
    return StorageService.getVitals().filter(v => v.patientId === patientId);
  },
  saveVitals: (vitals: VitalSigns) => {
    const all = StorageService.getVitals();
    const idx = all.findIndex(v => v.id === vitals.id);
    if (idx >= 0) {
      all[idx] = vitals;
    } else {
      all.unshift(vitals);
    }
    saveToStorage(STORAGE_KEYS.VITALS, all);
  },

  // Clinical Encounters
  getEncounters: (): ClinicalEncounter[] => loadFromStorage(STORAGE_KEYS.ENCOUNTERS, INITIAL_ENCOUNTERS),
  getEncountersByPatientId: (patientId: string): ClinicalEncounter[] => {
    return StorageService.getEncounters().filter(e => e.patientId === patientId);
  },
  saveEncounter: (encounter: ClinicalEncounter) => {
    const all = StorageService.getEncounters();
    const idx = all.findIndex(e => e.id === encounter.id || (e.patientId === encounter.patientId && e.visitNumber === encounter.visitNumber));
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...encounter, id: all[idx].id };
    } else {
      all.unshift(encounter);
    }
    saveToStorage(STORAGE_KEYS.ENCOUNTERS, all);
  },

  // Laboratory Catalog & Orders
  getLabCatalog: (): LabCatalogItem[] => loadFromStorage(STORAGE_KEYS.LAB_CATALOG, INITIAL_LAB_CATALOG),
  getLabOrders: (): LabOrder[] => loadFromStorage(STORAGE_KEYS.LAB_ORDERS, INITIAL_LAB_ORDERS),
  getLabOrdersByPatientId: (patientId: string): LabOrder[] => {
    return StorageService.getLabOrders().filter(o => o.patientId === patientId);
  },
  saveLabOrder: (order: LabOrder) => {
    const orders = StorageService.getLabOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    saveToStorage(STORAGE_KEYS.LAB_ORDERS, orders);
  },
  saveLabCatalogItem: (item: LabCatalogItem) => {
    const catalog = StorageService.getLabCatalog();
    const idx = catalog.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      catalog[idx] = item;
    } else {
      catalog.unshift(item);
    }
    saveToStorage(STORAGE_KEYS.LAB_CATALOG, catalog);
  },
  deleteLabCatalogItem: (id: string) => {
    let catalog = StorageService.getLabCatalog();
    catalog = catalog.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.LAB_CATALOG, catalog);
  },

  // Medications & Inventory
  getMedications: (): MedicationItem[] => loadFromStorage(STORAGE_KEYS.MEDICATIONS, INITIAL_MEDICATIONS),
  saveMedication: (med: MedicationItem) => {
    const meds = StorageService.getMedications();
    const idx = meds.findIndex(m => m.id === med.id);
    if (idx >= 0) {
      meds[idx] = med;
    } else {
      meds.unshift(med);
    }
    saveToStorage(STORAGE_KEYS.MEDICATIONS, meds);
  },
  deleteMedication: (id: string) => {
    let meds = StorageService.getMedications();
    meds = meds.filter(m => m.id !== id);
    saveToStorage(STORAGE_KEYS.MEDICATIONS, meds);
  },
  decrementStock: (medicationId: string, quantity: number): boolean => {
    const meds = StorageService.getMedications();
    const item = meds.find(m => m.id === medicationId);
    if (item && item.availableStock >= quantity) {
      item.availableStock -= quantity;
      saveToStorage(STORAGE_KEYS.MEDICATIONS, meds);
      return true;
    }
    return false;
  },

  // Prescriptions
  getPrescriptions: (): Prescription[] => loadFromStorage(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS),
  getPrescriptionsByPatientId: (patientId: string): Prescription[] => {
    return StorageService.getPrescriptions().filter(p => p.patientId === patientId);
  },
  savePrescription: (prescription: Prescription) => {
    const prescriptions = StorageService.getPrescriptions();
    const idx = prescriptions.findIndex(p => p.id === prescription.id);
    if (idx >= 0) {
      prescriptions[idx] = prescription;
    } else {
      prescriptions.unshift(prescription);
    }
    saveToStorage(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
  },

  // Services Catalog
  getServices: (): ServiceItem[] => loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES),
  saveService: (service: ServiceItem) => {
    const services = StorageService.getServices();
    const idx = services.findIndex(s => s.id === service.id);
    if (idx >= 0) {
      services[idx] = service;
    } else {
      services.unshift(service);
    }
    saveToStorage(STORAGE_KEYS.SERVICES, services);
  },
  deleteService: (id: string) => {
    let services = StorageService.getServices();
    services = services.filter(s => s.id !== id);
    saveToStorage(STORAGE_KEYS.SERVICES, services);
  },

  // Invoices & Billing
  getInvoices: (): Invoice[] => loadFromStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES),
  getInvoicesByPatientId: (patientId: string): Invoice[] => {
    return StorageService.getInvoices().filter(i => i.patientId === patientId);
  },
  saveInvoice: (invoice: Invoice) => {
    const invoices = StorageService.getInvoices();
    const idx = invoices.findIndex(i => i.id === invoice.id);
    if (idx >= 0) {
      invoices[idx] = invoice;
    } else {
      invoices.unshift(invoice);
    }
    saveToStorage(STORAGE_KEYS.INVOICES, invoices);
  },

  // Automatic Billing: Appends line items (Consultation, Procedures, Labs, Prescriptions) directly to patient invoice
  addOrAppendInvoiceItem: (
    patientId: string,
    patientName: string,
    visitNumber: string,
    item: InvoiceItem,
    issuedBy?: string
  ): Invoice => {
    const invoices = StorageService.getInvoices();
    // Find active unpaid/partial invoice for this visit or patient
    let invoice = invoices.find(
      inv => (inv.visitNumber === visitNumber || inv.patientId === patientId) && inv.status !== 'paid'
    );

    if (!invoice) {
      // Create new invoice automatically
      invoice = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        invoiceNumber: `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
        patientId,
        patientName,
        visitNumber: visitNumber || `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
        issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        issuedBy: issuedBy || 'Automated Clinic Billing',
        items: [],
        subtotalKes: 0,
        discountKes: 0,
        totalKes: 0,
        amountPaidKes: 0,
        balanceKes: 0,
        status: 'unpaid',
        payments: [],
      };
      invoices.unshift(invoice);
    }

    // For Consultation category: prevent duplicate consultation fees on the same invoice!
    if (item.category === 'Consultation') {
      const existingConsultation = invoice.items.find(it => it.category === 'Consultation');
      if (existingConsultation) {
        // Consultation fee already added to invoice for this visit, do not duplicate!
        return invoice;
      }
    }

    // Check if identical item already exists (by serviceCode or matching description)
    const existingItem = invoice.items.find(
      it => it.serviceCode === item.serviceCode || (it.category === item.category && it.description === item.description)
    );

    if (existingItem) {
      if (item.category === 'Laboratory' || item.category === 'Procedure') {
        // Laboratory test or procedure already on invoice, do not duplicate
        return invoice;
      }
      existingItem.quantity += item.quantity;
      existingItem.totalPriceKes = existingItem.quantity * existingItem.unitPriceKes;
    } else {
      invoice.items.push(item);
    }

    // Recalculate totals
    invoice.subtotalKes = invoice.items.reduce((sum, it) => sum + it.totalPriceKes, 0);
    invoice.totalKes = Math.max(0, invoice.subtotalKes - invoice.discountKes);
    invoice.balanceKes = Math.max(0, invoice.totalKes - invoice.amountPaidKes);

    if (invoice.balanceKes === 0 && invoice.totalKes > 0) {
      invoice.status = 'paid';
    } else if (invoice.amountPaidKes > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'unpaid';
    }

    saveToStorage(STORAGE_KEYS.INVOICES, invoices);
    return invoice;
  },

  // Nursing Procedures Module
  getProcedures: (): NursingProcedure[] => loadFromStorage(STORAGE_KEYS.PROCEDURES, INITIAL_PROCEDURES),
  getProceduresByPatientId: (patientId: string): NursingProcedure[] => {
    return StorageService.getProcedures().filter(p => p.patientId === patientId);
  },
  saveProcedure: (procedure: NursingProcedure) => {
    const procedures = StorageService.getProcedures();
    const idx = procedures.findIndex(p => p.id === procedure.id);
    if (idx >= 0) {
      procedures[idx] = procedure;
    } else {
      procedures.unshift(procedure);
    }
    saveToStorage(STORAGE_KEYS.PROCEDURES, procedures);

    // AUTOMATIC BILLING: Automatically bill the procedure to the patient's invoice!
    StorageService.addOrAppendInvoiceItem(
      procedure.patientId,
      procedure.patientName,
      procedure.visitNumber,
      {
        id: `ii-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        serviceCode: procedure.serviceCode,
        description: procedure.procedureName,
        category: 'Procedure',
        unitPriceKes: procedure.chargeKes,
        quantity: 1,
        totalPriceKes: procedure.chargeKes,
      },
      procedure.performedBy
    );
  },

  // Appointments
  getAppointments: (): Appointment[] => loadFromStorage(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS),
  saveAppointment: (appointment: Appointment) => {
    const appointments = StorageService.getAppointments();
    const idx = appointments.findIndex(a => a.id === appointment.id);
    if (idx >= 0) {
      appointments[idx] = appointment;
    } else {
      appointments.unshift(appointment);
    }
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
  },

  // Audit Logs
  getAuditLogs: (): AuditLogEntry[] => loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
  logAction: (
    userId: string,
    userName: string,
    userRole: AuditLogEntry['userRole'],
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details: string
  ) => {
    const logs = StorageService.getAuditLogs();
    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '192.168.1.101',
    };
    logs.unshift(newLog);
    // Keep max 200 logs
    if (logs.length > 200) logs.pop();
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  // Real-time Notifications
  getNotifications: (): AppNotification[] => loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
  addNotification: (notification: AppNotification) => {
    const notifs = StorageService.getNotifications();
    notifs.unshift(notification);
    if (notifs.length > 100) notifs.pop();
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },
  markNotificationAsRead: (id: string) => {
    const notifs = StorageService.getNotifications();
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.read = true;
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  },
  markAllNotificationsAsRead: () => {
    const notifs = StorageService.getNotifications();
    notifs.forEach(n => { n.read = true; });
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },
  clearNotifications: () => {
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  },

  // Reset to factory defaults if ever needed
  resetToSeedData: () => {
    localStorage.clear();
    saveToStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    saveToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    saveToStorage(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
    saveToStorage(STORAGE_KEYS.VITALS, INITIAL_VITALS);
    saveToStorage(STORAGE_KEYS.QUEUE, INITIAL_QUEUE);
    saveToStorage(STORAGE_KEYS.LAB_CATALOG, INITIAL_LAB_CATALOG);
    saveToStorage(STORAGE_KEYS.LAB_ORDERS, INITIAL_LAB_ORDERS);
    saveToStorage(STORAGE_KEYS.MEDICATIONS, INITIAL_MEDICATIONS);
    saveToStorage(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS);
    saveToStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    saveToStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    saveToStorage(STORAGE_KEYS.PROCEDURES, INITIAL_PROCEDURES);
    saveToStorage(STORAGE_KEYS.ENCOUNTERS, INITIAL_ENCOUNTERS);
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    window.location.reload();
  },
};
