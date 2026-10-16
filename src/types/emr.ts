export type UserRole = 
  | 'admin'
  | 'receptionist'
  | 'nurse'
  | 'doctor'
  | 'lab_technician'
  | 'pharmacist'
  | 'billing_cashier';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  phone?: string;
  licenseNumber?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
  username?: string;
  loginPin?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'lab_verified' | 'procedure_completed' | 'billing_alert' | 'general';
  patientId?: string;
  patientName?: string;
  testName?: string;
  procedureName?: string;
  read: boolean;
  targetRole?: UserRole | 'all';
  linkView?: string;
}

export type Gender = 'Male' | 'Female' | 'Other';

export interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  recordedAt: string;
}

export interface ChronicCondition {
  id: string;
  condition: string;
  diagnosedYear?: string;
  notes?: string;
}

export interface Patient {
  id: string;
  patientNumber: string; // e.g. FAM-2026-0042
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: Gender;
  phoneNumber: string;
  email?: string;
  address: string;
  county?: string;
  nationalId?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  allergies: Allergy[];
  chronicConditions: ChronicCondition[];
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  registrationDate: string;
  activeStatus: boolean;
  notes?: string;
}

export type QueueStage = 
  | 'reception'
  | 'triage'
  | 'consultation'
  | 'laboratory'
  | 'pharmacy'
  | 'billing'
  | 'completed';

export type QueuePriority = 'normal' | 'urgent' | 'emergency';

export interface PatientQueueEntry {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  visitNumber: string; // e.g. VST-2026-0891
  stage: QueueStage;
  priority: QueuePriority;
  chiefComplaint?: string;
  checkedInAt: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  updatedAt: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  visitNumber: string;
  recordedAt: string;
  recordedBy: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  pulseRate: number; // bpm
  respiratoryRate: number; // breaths/min
  temperature: number; // Celsius
  oxygenSaturation: number; // %
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiCategory: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  painScore: number; // 0-10
  presentingComplaint: string;
  triageNotes?: string;
  isAbnormal?: boolean;
}

export type NoteStatus = 'draft' | 'signed' | 'amended';

export interface ClinicalNoteAmendment {
  amendedAt: string;
  amendedBy: string;
  reason: string;
  previousContent: string;
}

export interface Diagnosis {
  id: string;
  code: string; // e.g. ICD-10 or clinical code
  description: string;
  type: 'primary' | 'secondary' | 'differential';
  certainty: 'confirmed' | 'suspected' | 'provisional';
  notes?: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  visitNumber: string;
  encounterDate: string;
  clinicianId: string;
  clinicianName: string;
  chiefComplaint: string;
  historyOfPresentingIllness: string;
  pastMedicalHistory?: string;
  reviewOfSystems?: string;
  physicalExamination: string;
  assessmentNotes: string;
  treatmentPlan: string;
  followUpDate?: string;
  followUpInstructions?: string;
  diagnoses: Diagnosis[];
  status: NoteStatus;
  signedAt?: string;
  signedBy?: string;
  amendments: ClinicalNoteAmendment[];
}

export type LabPriority = 'routine' | 'urgent' | 'stat';
export type LabOrderStatus = 
  | 'ordered' 
  | 'sample_collected' 
  | 'processing' 
  | 'results_entered' 
  | 'verified' 
  | 'cancelled';

export interface LabCatalogItem {
  id: string;
  code: string;
  name: string;
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Serology' | 'Urinalysis' | 'Parasitology' | 'Dermatology';
  specimenType: string;
  priceKes: number;
  turnaroundTimeMinutes: number;
  units?: string;
  referenceRange?: string;
}

export interface LabOrderItem {
  id: string;
  testId: string;
  testCode: string;
  testName: string;
  category: string;
  specimenType: string;
  priceKes: number;
  resultValue?: string;
  units?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  notes?: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string; // e.g. LAB-2026-0312
  patientId: string;
  visitNumber: string;
  patientName: string;
  orderedBy: string;
  orderedAt: string;
  priority: LabPriority;
  clinicalNotes?: string;
  items: LabOrderItem[];
  status: LabOrderStatus;
  specimenCollectedAt?: string;
  specimenCollectedBy?: string;
  resultsEnteredAt?: string;
  resultsEnteredBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface MedicationItem {
  id: string;
  genericName: string;
  brandName?: string;
  dosageForm: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream / Ointment' | 'Eye Drops' | 'Inhaler';
  strength: string;
  unitPriceKes: number;
  availableStock: number;
  reorderLevel: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PrescriptionItem {
  id: string;
  medicationId: string;
  medicationName: string;
  dosageForm: string;
  strength: string;
  dose: string; // e.g. "500 mg"
  route: 'Oral' | 'Topical' | 'Intravenous' | 'Intramuscular' | 'Subcutaneous' | 'Inhalation' | 'Ophthalmic';
  frequency: 'Once daily' | 'Twice daily (BD)' | 'Thrice daily (TDS)' | 'Four times daily (QDS)' | 'Every 8 hours' | 'As needed (PRN)';
  durationDays: number;
  quantityPrescribed: number;
  quantityDispensed?: number;
  instructions: string;
  warnings?: string;
  dispensedStatus: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
}

export interface Prescription {
  id: string;
  prescriptionNumber: string; // e.g. RX-2026-0419
  patientId: string;
  visitNumber: string;
  patientName: string;
  prescribedBy: string;
  prescribedAt: string;
  items: PrescriptionItem[];
  dispensedAt?: string;
  dispensedBy?: string;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: 'Consultation' | 'Laboratory' | 'Pharmacy' | 'Procedure' | 'Nursing' | 'Administrative';
  priceKes: number;
  taxable: boolean;
}

export interface InvoiceItem {
  id: string;
  serviceCode: string;
  description: string;
  category: 'Consultation' | 'Laboratory' | 'Pharmacy' | 'Procedure' | 'Other';
  unitPriceKes: number;
  quantity: number;
  totalPriceKes: number;
}

export type PaymentMethod = 'M-Pesa' | 'Cash' | 'Credit/Debit Card' | 'Bank Transfer' | 'Insurance';

export interface PaymentTransaction {
  id: string;
  amountKes: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string; // e.g. M-Pesa transaction ID
  receivedAt: string;
  receivedBy: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0812
  patientId: string;
  patientName: string;
  visitNumber: string;
  issuedAt: string;
  issuedBy: string;
  items: InvoiceItem[];
  subtotalKes: number;
  discountKes: number;
  totalKes: number;
  amountPaidKes: number;
  balanceKes: number;
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
  payments: PaymentTransaction[];
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  clinicianName: string;
  department: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
  notes?: string;
}

export interface NursingProcedure {
  id: string;
  procedureNumber: string;
  patientId: string;
  patientName: string;
  visitNumber: string;
  procedureName: string;
  category: 'Wound Care' | 'Injections' | 'Catheterization' | 'Respiratory' | 'Minor Surgery' | 'Diagnostic';
  serviceCode: string;
  chargeKes: number;
  notes?: string;
  performedBy: string;
  performedAt: string;
  status: 'completed' | 'cancelled';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'patient' | 'encounter' | 'vitals' | 'procedure' | 'lab_order' | 'prescription' | 'invoice' | 'inventory' | 'auth' | 'settings';
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface ClinicSettings {
  clinicName: string;
  subtitle: string;
  domain: string;
  registrationNumber: string;
  taxPin: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
}
