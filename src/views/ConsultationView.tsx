import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Activity,
  AlertCircle,
  FileCheck2,
  FlaskConical,
  Pill,
  Send,
  Plus,
  Trash2,
  Lock,
  Edit3,
  CheckCircle2,
  Printer,
  ShieldAlert
} from 'lucide-react';
import {
  Patient,
  ClinicalEncounter,
  VitalSigns,
  Diagnosis,
  LabCatalogItem,
  LabOrder,
  MedicationItem,
  Prescription,
  PrescriptionItem,
  PatientQueueEntry
} from '../types/emr';
import { StorageService } from '../services/storage';
import { PDFService } from '../services/pdfGenerator';
import { SearchAsYouGoPatientSelect } from '../components/SearchAsYouGoPatientSelect';
import { useAuth } from '../context/AuthContext';

interface ConsultationViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
  onNavigateToBilling: (patientId: string) => void;
}

export const ConsultationView: React.FC<ConsultationViewProps> = ({
  initialPatientId,
  onSelectPatient,
  onNavigateToBilling,
}) => {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<PatientQueueEntry[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '');
  const [labCatalog, setLabCatalog] = useState<LabCatalogItem[]>([]);
  const [medCatalog, setMedCatalog] = useState<MedicationItem[]>([]);

  // Selected Patient Clinical Records
  const [vitalsHistory, setVitalsHistory] = useState<VitalSigns[]>([]);
  const [previousEncounters, setPreviousEncounters] = useState<ClinicalEncounter[]>([]);

  // Active SOAP Encounter Form
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [pastHistory, setPastHistory] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [assessment, setAssessment] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');

  // Diagnoses List
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([
    { id: 'd-1', code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', type: 'primary', certainty: 'confirmed' }
  ]);
  const [newDiagCode, setNewDiagCode] = useState('');
  const [newDiagDesc, setNewDiagDesc] = useState('');
  const [newDiagType, setNewDiagType] = useState<'primary' | 'secondary'>('secondary');

  // Lab Orders
  const [orderedLabTests, setOrderedLabTests] = useState<{ test: LabCatalogItem; priority: 'routine' | 'urgent' | 'stat'; indication: string }[]>([]);
  const [selectedLabId, setSelectedLabId] = useState('');

  // Prescriptions
  const [prescribedMeds, setPrescribedMeds] = useState<Omit<PrescriptionItem, 'id' | 'dispensedStatus'>[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [rxDose, setRxDose] = useState('1 tablet');
  const [rxRoute, setRxRoute] = useState<'Oral' | 'Topical' | 'Intravenous' | 'Intramuscular' | 'Inhalation'>('Oral');
  const [rxFrequency, setRxFrequency] = useState<'Once daily' | 'Twice daily (BD)' | 'Thrice daily (TDS)' | 'Four times daily (QDS)' | 'As needed (PRN)'>('Twice daily (BD)');
  const [rxDurationDays, setRxDurationDays] = useState(5);
  const [rxQuantity, setRxQuantity] = useState(10);
  const [rxInstructions, setRxInstructions] = useState('Take after meals');

  // Active note state
  const [noteStatus, setNoteStatus] = useState<'draft' | 'signed'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadData = () => {
    const p = StorageService.getPatients();
    const q = StorageService.getQueue();
    setPatients(p);
    setQueue(q);
    setLabCatalog(StorageService.getLabCatalog());
    setMedCatalog(StorageService.getMedications());

    if (!selectedPatientId && q.length > 0) {
      const consultItem = q.find(item => item.stage === 'consultation');
      if (consultItem) {
        setSelectedPatientId(consultItem.patientId);
      } else if (p.length > 0) {
        setSelectedPatientId(p[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const v = StorageService.getVitalsByPatientId(selectedPatientId);
      setVitalsHistory(v);
      const enc = StorageService.getEncountersByPatientId(selectedPatientId);
      setPreviousEncounters(enc);

      // Check if patient already has a signed encounter for the current visit or today
      const today = new Date().toISOString().substring(0, 10);
      const queueItem = queue.find(q => q.patientId === selectedPatientId);
      const visitNumber = queueItem?.visitNumber;

      const existingSignedEnc = enc.find(e => 
        e.status === 'signed' && (e.visitNumber === visitNumber || e.encounterDate.startsWith(today))
      );

      if (existingSignedEnc) {
        setChiefComplaint(existingSignedEnc.chiefComplaint);
        setHpi(existingSignedEnc.historyOfPresentingIllness || '');
        setPastHistory(existingSignedEnc.pastMedicalHistory || '');
        setPhysicalExam(existingSignedEnc.physicalExamination || '');
        setAssessment(existingSignedEnc.assessmentNotes || '');
        setTreatmentPlan(existingSignedEnc.treatmentPlan || '');
        setFollowUpDate(existingSignedEnc.followUpDate || '');
        setFollowUpInstructions(existingSignedEnc.followUpInstructions || '');
        if (existingSignedEnc.diagnoses && existingSignedEnc.diagnoses.length > 0) {
          setDiagnoses(existingSignedEnc.diagnoses);
        }
        setNoteStatus('signed');
      } else {
        setNoteStatus('draft');
        setIsSubmitting(false);
        // Pre-populate complaint from latest vitals or queue
        if (v.length > 0) {
          setChiefComplaint(v[0].presentingComplaint || '');
        } else {
          if (queueItem) setChiefComplaint(queueItem.chiefComplaint || '');
        }
      }
    }
  }, [selectedPatientId]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const latestVitals = vitalsHistory.length > 0 ? vitalsHistory[0] : null;

  // Add diagnosis
  const handleAddDiagnosis = () => {
    if (!newDiagDesc) return;
    const newD: Diagnosis = {
      id: `diag-${Date.now()}`,
      code: newDiagCode.trim() || 'R69',
      description: newDiagDesc.trim(),
      type: newDiagType,
      certainty: 'confirmed',
    };
    setDiagnoses([...diagnoses, newD]);
    setNewDiagCode('');
    setNewDiagDesc('');
  };

  const handleRemoveDiagnosis = (id: string) => {
    setDiagnoses(diagnoses.filter(d => d.id !== id));
  };

  // Add Lab Test
  const handleAddLabTest = () => {
    const item = labCatalog.find(l => l.id === selectedLabId);
    if (!item) return;
    if (orderedLabTests.some(t => t.test.id === item.id)) return;
    setOrderedLabTests([
      ...orderedLabTests,
      { test: item, priority: 'routine', indication: chiefComplaint || 'Clinical evaluation' },
    ]);
    setSelectedLabId('');
  };

  const handleRemoveLabTest = (testId: string) => {
    setOrderedLabTests(orderedLabTests.filter(t => t.test.id !== testId));
  };

  // Add Medication to Prescription
  const handleAddPrescriptionItem = () => {
    const med = medCatalog.find(m => m.id === selectedMedId);
    if (!med) return;

    // Allergy safety check!
    if (selectedPatient?.allergies) {
      const allergyMatch = selectedPatient.allergies.find(
        a => med.genericName.toLowerCase().includes(a.allergen.toLowerCase()) ||
             (med.brandName && med.brandName.toLowerCase().includes(a.allergen.toLowerCase()))
      );
      if (allergyMatch) {
        if (!confirm(`ALLERGY WARNING: Patient has documented allergy to ${allergyMatch.allergen} (${allergyMatch.reaction}). Do you still wish to prescribe ${med.genericName}?`)) {
          return;
        }
      }
    }

    const newItem: Omit<PrescriptionItem, 'id' | 'dispensedStatus'> = {
      medicationId: med.id,
      medicationName: med.genericName + (med.brandName ? ` (${med.brandName})` : ''),
      dosageForm: med.dosageForm,
      strength: med.strength,
      dose: rxDose,
      route: rxRoute,
      frequency: rxFrequency,
      durationDays: Number(rxDurationDays),
      quantityPrescribed: Number(rxQuantity),
      instructions: rxInstructions,
    };

    setPrescribedMeds([...prescribedMeds, newItem]);
    setSelectedMedId('');
  };

  const handleRemoveMedItem = (index: number) => {
    setPrescribedMeds(prescribedMeds.filter((_, i) => i !== index));
  };

  const handleNextInQueue = () => {
    const nextItem = queue.find(q => q.stage === 'consultation' && q.patientId !== selectedPatientId && (q.status === 'in_progress' || q.status === 'waiting'));
    if (nextItem) {
      setSelectedPatientId(nextItem.patientId);
    } else {
      const anyOther = patients.find(p => p.id !== selectedPatientId);
      if (anyOther) {
        setSelectedPatientId(anyOther.id);
      }
    }
  };

  // Complete & Sign Encounter
  const handleSaveEncounter = (statusToSet: 'draft' | 'signed') => {
    if (!selectedPatient) return;
    if (isSubmitting || noteStatus === 'signed') return;

    if (!chiefComplaint || !assessment) {
      alert('Please fill in Chief Complaint and Clinical Assessment before saving.');
      return;
    }

    if (statusToSet === 'signed') {
      setIsSubmitting(true);
      setNoteStatus('signed');
    }

    const queueItem = queue.find(q => q.patientId === selectedPatient.id);
    const visitNumber = queueItem?.visitNumber || `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const patientFullName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;

    const newEncounter: ClinicalEncounter = {
      id: `enc-${Date.now()}`,
      patientId: selectedPatient.id,
      visitNumber,
      encounterDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      clinicianId: currentUser.id,
      clinicianName: currentUser.name,
      chiefComplaint,
      historyOfPresentingIllness: hpi,
      pastMedicalHistory: pastHistory,
      physicalExamination: physicalExam,
      assessmentNotes: assessment,
      treatmentPlan,
      followUpDate: followUpDate || undefined,
      followUpInstructions: followUpInstructions || undefined,
      diagnoses,
      status: statusToSet,
      signedAt: statusToSet === 'signed' ? new Date().toISOString().replace('T', ' ').substring(0, 16) : undefined,
      signedBy: statusToSet === 'signed' ? currentUser.name : undefined,
      amendments: [],
    };

    StorageService.saveEncounter(newEncounter);

    // AUTOMATIC BILLING 1: Consultation Fee
    StorageService.addOrAppendInvoiceItem(
      selectedPatient.id,
      patientFullName,
      visitNumber,
      {
        id: `ii-cons-${Date.now()}`,
        serviceCode: 'SRV-CONS-GEN',
        description: 'Doctor / Clinical Officer Consultation Fee',
        category: 'Consultation',
        unitPriceKes: 1500,
        quantity: 1,
        totalPriceKes: 1500,
      },
      currentUser.name
    );

    // Save Lab Order if any tests selected & AUTOMATIC BILLING 2: Lab tests
    if (orderedLabTests.length > 0) {
      const newLabOrder: LabOrder = {
        id: `ord-${Date.now()}`,
        orderNumber: `LAB-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
        patientId: selectedPatient.id,
        visitNumber,
        patientName: patientFullName,
        orderedBy: currentUser.name,
        orderedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        priority: orderedLabTests.some(t => t.priority === 'stat') ? 'stat' : 'routine',
        clinicalNotes: chiefComplaint,
        status: 'ordered',
        items: orderedLabTests.map((t, idx) => ({
          id: `loi-${Date.now()}-${idx}`,
          testId: t.test.id,
          testCode: t.test.code,
          testName: t.test.name,
          category: t.test.category,
          specimenType: t.test.specimenType,
          priceKes: t.test.priceKes,
          referenceRange: t.test.referenceRange,
        })),
      };
      StorageService.saveLabOrder(newLabOrder);

      // Automatically append each ordered lab investigation to invoice
      orderedLabTests.forEach((t) => {
        StorageService.addOrAppendInvoiceItem(
          selectedPatient.id,
          patientFullName,
          visitNumber,
          {
            id: `ii-lab-${t.test.id}-${Date.now()}`,
            serviceCode: t.test.code,
            description: `Laboratory: ${t.test.name}`,
            category: 'Laboratory',
            unitPriceKes: t.test.priceKes,
            quantity: 1,
            totalPriceKes: t.test.priceKes,
          },
          currentUser.name
        );
      });
    }

    // Save Prescription if any meds selected & AUTOMATIC BILLING 3: Pharmacy Medications
    if (prescribedMeds.length > 0) {
      const newRx: Prescription = {
        id: `rx-${Date.now()}`,
        prescriptionNumber: `RX-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
        patientId: selectedPatient.id,
        visitNumber,
        patientName: patientFullName,
        prescribedBy: currentUser.name,
        prescribedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'pending',
        items: prescribedMeds.map((m, idx) => ({
          ...m,
          id: `rxi-${Date.now()}-${idx}`,
          dispensedStatus: 'pending',
        })),
      };
      StorageService.savePrescription(newRx);

      // Automatically append each prescribed drug to invoice
      prescribedMeds.forEach((m) => {
        const medStockItem = medCatalog.find(mc => mc.id === m.medicationId);
        const unitPrice = medStockItem ? medStockItem.unitPriceKes : 50;
        const totalMedPrice = unitPrice * m.quantityPrescribed;

        StorageService.addOrAppendInvoiceItem(
          selectedPatient.id,
          patientFullName,
          visitNumber,
          {
            id: `ii-med-${m.medicationId}-${Date.now()}`,
            serviceCode: m.medicationId,
            description: `Pharmacy: ${m.medicationName} (${m.strength}) x ${m.quantityPrescribed}`,
            category: 'Pharmacy',
            unitPriceKes: unitPrice,
            quantity: m.quantityPrescribed,
            totalPriceKes: totalMedPrice,
          },
          currentUser.name
        );
      });
    }

    // Determine next queue stage
    let nextStage: PatientQueueEntry['stage'] = 'billing';
    if (orderedLabTests.length > 0) {
      nextStage = 'laboratory';
    } else if (prescribedMeds.length > 0) {
      nextStage = 'pharmacy';
    }

    if (queueItem) {
      StorageService.updateQueueStage(queueItem.id, nextStage, 'waiting');
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      statusToSet === 'signed' ? 'SIGN_CLINICAL_NOTE' : 'SAVE_DRAFT_CLINICAL_NOTE',
      'encounter',
      newEncounter.id,
      `Clinician ${currentUser.name} ${statusToSet} encounter note for ${patientFullName}. Routed to ${nextStage}. Automatic billing items updated.`
    );

    setNoteStatus(statusToSet);
    setSuccessBanner(
      `Consultation note signed and locked! All charges (Consultation, ${orderedLabTests.length} Lab test(s), ${prescribedMeds.length} Medication(s)) have been automatically forwarded to Billing.`
    );
  };

  const consultQueue = queue.filter(q => q.stage === 'consultation');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Clinical Officer & Doctor Consultation Desk
          </h1>
          <p className="text-xs text-slate-500">
            Structured SOAP consultation, ICD-10 diagnostic coding, laboratory orders, and clinical prescriptions.
          </p>
        </div>

        {selectedPatient && (
          <button
            onClick={() => onSelectPatient(selectedPatient.id)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            Open Complete Patient Chart →
          </button>
        )}
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successBanner}
        </div>
      )}

      {/* Grid: Left Column: Doctor Queue & Vitals Summary (1 col) | Right Column: Consultation SOAP & Orders (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Waiting Consultations Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Patients in Consultation Queue ({consultQueue.length})
              </span>
              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                Active
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {consultQueue.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No patients currently waiting for doctor consultation.
                </div>
              ) : (
                consultQueue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPatientId(item.patientId)}
                    className={`p-3 text-xs cursor-pointer transition-colors ${
                      selectedPatientId === item.patientId
                        ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{item.patientName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.patientNumber} · Ref: {item.visitNumber}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      {item.chiefComplaint}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Patient Quick Selector (Search-as-you-go) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <SearchAsYouGoPatientSelect
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              label="Search Outpatient (Search-as-you-go):"
              placeholder="Search by name, FAM-#, phone..."
            />
          </div>

          {/* Patient Clinical Summary & Triage Snapshot */}
          {selectedPatient && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <div className="font-bold text-sm text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {selectedPatient.patientNumber} · {selectedPatient.gender} · {new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()}y
                </div>
              </div>

              {/* Allergy Alert */}
              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900">
                  <span className="font-bold flex items-center gap-1 text-[11px] text-red-700 mb-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    ALLERGIES:
                  </span>
                  {selectedPatient.allergies.map(a => `${a.allergen} (${a.reaction})`).join('; ')}
                </div>
              )}

              {/* Latest Vitals */}
              {latestVitals ? (
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                    Triage Vital Signs ({latestVitals.recordedAt})
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Blood Pressure</span>
                      <span className="font-bold font-mono text-slate-900">{latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic} mmHg</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Pulse Rate</span>
                      <span className="font-bold font-mono text-slate-900">{latestVitals.pulseRate} bpm</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Temperature</span>
                      <span className="font-bold font-mono text-slate-900">{latestVitals.temperature} °C</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">BMI & Category</span>
                      <span className="font-bold font-mono text-slate-900">{latestVitals.bmi} ({latestVitals.bmiCategory})</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded">
                  No vitals recorded for this visit yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: SOAP Consultation Workspace (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {selectedPatient ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
              {/* SOAP Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Encounter Consultation Workspace</h2>
                  <span className="text-[11px] text-slate-500">Documenting as {currentUser.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    noteStatus === 'signed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {noteStatus}
                  </span>
                </div>
              </div>

              {noteStatus === 'signed' && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-emerald-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <div className="font-bold">Consultation Signed & Finalized (Locked)</div>
                      <div className="text-[11px] text-emerald-800 font-normal mt-0.5">
                        This encounter note is sealed under medical record regulations. Diagnoses, lab orders, and prescriptions have been billed and routed to corresponding desks.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextInQueue}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    Next Patient in Queue →
                  </button>
                </div>
              )}

              {/* 1. Subjective (S) */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-blue-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">S</span>
                  Subjective (Chief Complaint & HPI)
                </h3>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Chief Complaint *</label>
                  <input
                    type="text"
                    required
                    disabled={noteStatus === 'signed'}
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Throbbing headache and facial skin itching for 3 days"
                    className={`w-full px-3 py-1.5 border rounded-lg outline-none ${
                      noteStatus === 'signed' ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed' : 'border-slate-300 focus:border-red-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">History of Presenting Illness (HPI)</label>
                  <textarea
                    rows={2}
                    disabled={noteStatus === 'signed'}
                    value={hpi}
                    onChange={(e) => setHpi(e.target.value)}
                    placeholder="Onset, character, exacerbating factors, severity, systemic review..."
                    className={`w-full px-3 py-1.5 border rounded-lg outline-none ${
                      noteStatus === 'signed' ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed' : 'border-slate-300 focus:border-red-600'
                    }`}
                  />
                </div>
              </div>

              {/* 2. Objective (O) */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">O</span>
                  Objective (Physical Examination)
                </h3>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Physical Examination Findings</label>
                  <textarea
                    rows={2}
                    value={physicalExam}
                    onChange={(e) => setPhysicalExam(e.target.value)}
                    placeholder="General appearance, vitals correlation, chest, abdomen, skin/dermatological exam..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* 3. Assessment & Diagnoses (A) */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-purple-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px]">A</span>
                  Assessment & Diagnoses (ICD-10)
                </h3>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Clinical Impression / Assessment Notes *</label>
                  <textarea
                    rows={2}
                    required
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Summary clinical assessment, differential diagnoses..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>

                {/* Diagnosis items */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-800 text-xs">Documented Diagnoses:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnoses.map((d) => (
                      <span key={d.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs">
                        <strong className="text-blue-700 font-mono">{d.code}</strong>
                        <span>{d.description}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">({d.type})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDiagnosis(d.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newDiagCode}
                      onChange={(e) => setNewDiagCode(e.target.value)}
                      placeholder="Code (e.g. L20.9, I10)"
                      className="w-24 px-2 py-1 border border-slate-300 rounded bg-white font-mono"
                    />
                    <input
                      type="text"
                      value={newDiagDesc}
                      onChange={(e) => setNewDiagDesc(e.target.value)}
                      placeholder="Diagnosis Description (e.g. Atopic dermatitis)"
                      className="flex-1 min-w-[160px] px-2 py-1 border border-slate-300 rounded bg-white"
                    />
                    <select
                      value={newDiagType}
                      onChange={(e) => setNewDiagType(e.target.value as any)}
                      className="px-2 py-1 border border-slate-300 rounded bg-white"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDiagnosis}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Plan: Lab Orders, Prescriptions, Treatment (P) */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-red-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-[10px]">P</span>
                  Plan (Treatment, Labs & Prescriptions)
                </h3>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Non-pharmacological & General Treatment Plan</label>
                  <textarea
                    rows={2}
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="Patient counseling, lifestyle advice, wound dressing instructions, dietary guidelines..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>

                {/* Laboratory Order Section */}
                <div className="border border-purple-200 bg-purple-50/30 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-purple-700" />
                    Order Laboratory Investigations
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedLabId}
                      onChange={(e) => setSelectedLabId(e.target.value)}
                      className="flex-1 min-w-[200px] px-2.5 py-1.5 border border-purple-200 rounded-lg bg-white"
                    >
                      <option value="">-- Choose lab investigation from catalog --</option>
                      {labCatalog.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.code}) - KES {l.priceKes.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddLabTest}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold"
                    >
                      + Order Test
                    </button>
                  </div>

                  {orderedLabTests.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {orderedLabTests.map((t) => (
                        <div key={t.test.id} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                          <div>
                            <span className="font-bold text-slate-900">{t.test.name}</span>
                            <span className="text-slate-500 font-mono text-[11px] ml-2">({t.test.specimenType})</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-purple-800">KES {t.test.priceKes.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLabTest(t.test.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medication Prescriptions Section */}
                <div className="border border-teal-200 bg-teal-50/30 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-teal-700" />
                    Prescribe Medication
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={selectedMedId}
                      onChange={(e) => setSelectedMedId(e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 border border-teal-200 rounded-lg bg-white"
                    >
                      <option value="">-- Choose drug from pharmacy inventory --</option>
                      {medCatalog.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.genericName} {m.brandName ? `(${m.brandName})` : ''} - {m.strength} [Stock: {m.availableStock}]
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={rxDose}
                      onChange={(e) => setRxDose(e.target.value)}
                      placeholder="Dose (e.g. 500mg)"
                      className="px-2 py-1.5 border border-teal-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={rxRoute}
                      onChange={(e) => setRxRoute(e.target.value as any)}
                      className="px-2 py-1 border border-teal-200 rounded bg-white"
                    >
                      <option value="Oral">Oral</option>
                      <option value="Topical">Topical</option>
                      <option value="Intravenous">Intravenous</option>
                      <option value="Intramuscular">Intramuscular</option>
                      <option value="Inhalation">Inhalation</option>
                    </select>

                    <select
                      value={rxFrequency}
                      onChange={(e) => setRxFrequency(e.target.value as any)}
                      className="px-2 py-1 border border-teal-200 rounded bg-white"
                    >
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily (BD)">Twice daily (BD)</option>
                      <option value="Thrice daily (TDS)">Thrice daily (TDS)</option>
                      <option value="Four times daily (QDS)">Four times daily (QDS)</option>
                      <option value="As needed (PRN)">As needed (PRN)</option>
                    </select>

                    <input
                      type="number"
                      value={rxDurationDays}
                      onChange={(e) => setRxDurationDays(Number(e.target.value))}
                      placeholder="Days"
                      className="px-2 py-1 border border-teal-200 rounded bg-white font-mono"
                    />

                    <input
                      type="number"
                      value={rxQuantity}
                      onChange={(e) => setRxQuantity(Number(e.target.value))}
                      placeholder="Total Qty"
                      className="px-2 py-1 border border-teal-200 rounded bg-white font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rxInstructions}
                      onChange={(e) => setRxInstructions(e.target.value)}
                      placeholder="Instructions (e.g. Take 1 tablet twice a day after meals)"
                      className="flex-1 px-2.5 py-1.5 border border-teal-200 rounded-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddPrescriptionItem}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold"
                    >
                      + Add Drug
                    </button>
                  </div>

                  {prescribedMeds.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {prescribedMeds.map((pm, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-teal-100">
                          <div>
                            <span className="font-bold text-slate-900">{pm.medicationName}</span>
                            <div className="text-[11px] text-slate-600">
                              {pm.dose} · {pm.route} · {pm.frequency} x {pm.durationDays}d (Qty: {pm.quantityPrescribed})
                            </div>
                            <div className="text-[10px] text-teal-800 italic">Sig: {pm.instructions}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedItem(idx)}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow-up Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Follow-up Review Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Follow-up Instructions</label>
                    <input
                      type="text"
                      value={followUpInstructions}
                      onChange={(e) => setFollowUpInstructions(e.target.value)}
                      placeholder="e.g. Return in 14 days for BP re-check or earlier if rash worsens"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={noteStatus === 'signed' || isSubmitting}
                  onClick={() => handleSaveEncounter('draft')}
                  className={`px-4 py-2 border rounded-lg font-semibold flex items-center gap-1.5 ${
                    noteStatus === 'signed'
                      ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-slate-500" />
                  Save Draft Note
                </button>

                <div className="flex items-center gap-2">
                  {noteStatus === 'signed' ? (
                    <>
                      <div className="px-5 py-2 rounded-lg font-bold shadow-xs flex items-center gap-2 bg-emerald-100 text-emerald-800 border-2 border-emerald-400 cursor-not-allowed">
                        <Lock className="w-4 h-4 text-emerald-700" />
                        Signed & Locked (Consultation Completed)
                      </div>
                      <button
                        type="button"
                        onClick={handleNextInQueue}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        Next Patient in Queue →
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveEncounter('signed')}
                      className="px-5 py-2 rounded-lg font-semibold shadow-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      Sign & Complete Consultation
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              Please select a patient to open their consultation desk.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
