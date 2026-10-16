import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  Download,
  Printer,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Send
} from 'lucide-react';
import {
  Patient,
  VitalSigns,
  ClinicalEncounter,
  LabOrder,
  Prescription,
  Invoice,
  PatientQueueEntry
} from '../types/emr';
import { StorageService } from '../services/storage';
import { PDFService } from '../services/pdfGenerator';
import { useAuth } from '../context/AuthContext';

interface PatientProfileViewProps {
  patientId: string;
  onBack: () => void;
  onNavigateToTriage: (patientId: string) => void;
  onNavigateToConsultation: (patientId: string) => void;
  onNavigateToLab: (patientId: string) => void;
  onNavigateToPharmacy: (patientId: string) => void;
  onNavigateToBilling: (patientId: string) => void;
}

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({
  patientId,
  onBack,
  onNavigateToTriage,
  onNavigateToConsultation,
  onNavigateToLab,
  onNavigateToPharmacy,
  onNavigateToBilling,
}) => {
  const { currentUser, canAccess } = useAuth();
  const [patient, setPatient] = useState<Patient | undefined>(() => StorageService.getPatientById(patientId));
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'consultations' | 'labs' | 'prescriptions' | 'billing'>('overview');

  const loadPatientData = () => {
    const p = StorageService.getPatientById(patientId);
    setPatient(p);
    if (p) {
      setVitals(StorageService.getVitalsByPatientId(p.id));
      setEncounters(StorageService.getEncountersByPatientId(p.id));
      setLabOrders(StorageService.getLabOrdersByPatientId(p.id));
      setPrescriptions(StorageService.getPrescriptionsByPatientId(p.id));
      setInvoices(StorageService.getInvoicesByPatientId(p.id));
    }
  };

  useEffect(() => {
    loadPatientData();
    window.addEventListener('famart_storage_updated', loadPatientData);
    return () => window.removeEventListener('famart_storage_updated', loadPatientData);
  }, [patientId]);

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Patient record not found.</p>
        <button
          onClick={onBack}
          className="mt-3 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs"
        >
          Return to Patients Directory
        </button>
      </div>
    );
  }

  const birthYear = new Date(patient.dateOfBirth).getFullYear();
  const age = new Date().getFullYear() - birthYear;
  const settings = StorageService.getSettings();

  const handleStartNewVisit = () => {
    const visitNumber = `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newQueue: PatientQueueEntry = {
      id: `q-${Date.now()}`,
      patientId: patient.id,
      patientNumber: patient.patientNumber,
      patientName: `${patient.firstName} ${patient.lastName}`,
      visitNumber,
      stage: 'triage',
      priority: 'normal',
      chiefComplaint: 'Outpatient Consultation Visit',
      checkedInAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'waiting',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    StorageService.saveQueueEntry(newQueue);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'OPEN_VISIT',
      'patient',
      patient.id,
      `Opened visit ${visitNumber} and placed patient in Triage queue`
    );
    onNavigateToTriage(patient.id);
  };

  const handleDownloadSummaryPDF = () => {
    PDFService.generatePatientSummary(
      patient,
      encounters,
      vitals,
      labOrders,
      prescriptions,
      settings,
      currentUser.name
    );
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'EXPORT_PATIENT_SUMMARY_PDF',
      'patient',
      patient.id,
      `Generated full clinical summary PDF for ${patient.patientNumber}`
    );
  };

  const handleBrowserPrint = () => {
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'PRINT_PATIENT_MEDICAL_RECORD',
      'patient',
      patient.id,
      `Printed standardized medical record document for ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
    );
    window.print();
  };

  return (
    <>
      <div className="space-y-5 no-print">
        {/* Top action and back breadcrumb */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Directory
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Print standardized clinical document via browser printer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Clinical Record
            </button>

            <button
              onClick={handleDownloadSummaryPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download full printable clinical summary PDF"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Export Patient Summary (PDF)
            </button>

            {canAccess('registration') && (
              <button
                onClick={handleStartNewVisit}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Check In / Send to Triage
              </button>
            )}
          </div>
        </div>

      {/* Patient Master Identification Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">
                  {patient.firstName} {patient.middleName || ''} {patient.lastName}
                </h1>
                <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  {patient.patientNumber}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                  {patient.gender} · {age} yrs ({patient.dateOfBirth})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {patient.phoneNumber}
                </span>
                <span>Locality: {patient.address}</span>
                {patient.nationalId && <span className="font-mono">ID: {patient.nationalId}</span>}
                <span className="font-semibold text-slate-800">Blood Group: {patient.bloodGroup || 'Unspecified'}</span>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs min-w-[220px]">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
              Emergency Contact & Next of Kin
            </div>
            <div className="font-semibold text-slate-900">{patient.emergencyContactName}</div>
            <div className="text-slate-600 font-mono text-[11px]">{patient.emergencyContactPhone}</div>
            <div className="text-slate-400 text-[10px]">Relation: {patient.emergencyContactRelation}</div>
          </div>
        </div>

        {/* Allergy Alert Banner if recorded */}
        {patient.allergies && patient.allergies.length > 0 ? (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-900">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] text-red-700">Documented Allergies: </span>
              {patient.allergies.map((a, i) => (
                <span key={a.id} className="font-semibold mr-2">
                  {a.allergen} ({a.reaction} · {a.severity}){i < patient.allergies.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>No drug allergies currently documented for this patient.</span>
          </div>
        )}
      </div>

      {/* Longitudinal Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px text-xs font-semibold">
        {[
          { id: 'overview', label: 'Chart Overview', icon: FileText, allowedRoles: ['admin', 'doctor', 'receptionist', 'nurse', 'billing_cashier'] },
          { id: 'vitals', label: `Vital Signs (${vitals.length})`, icon: Activity, allowedRoles: ['admin', 'doctor', 'nurse'] },
          { id: 'consultations', label: `Clinical Notes (${encounters.length})`, icon: Stethoscope, allowedRoles: ['admin', 'doctor'] },
          { id: 'labs', label: `Lab Investigations (${labOrders.length})`, icon: FlaskConical, allowedRoles: ['admin', 'doctor', 'lab_technician'] },
          { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})`, icon: Pill, allowedRoles: ['admin', 'doctor', 'pharmacist'] },
          { id: 'billing', label: `Invoices & Billing (${invoices.length})`, icon: CreditCard, allowedRoles: ['admin', 'billing_cashier'] },
        ]
          .filter((tab) => tab.allowedRoles.includes(currentUser.role))
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
      </div>


      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Quick summary col 1 & 2 */}
          <div className="md:col-span-2 space-y-5">
            {/* Latest Vitals */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Latest Recorded Vital Signs
                </h3>
                {vitals.length > 0 && (
                  <span className="text-[11px] font-mono text-slate-400">{vitals[0].recordedAt}</span>
                )}
              </div>

              {vitals.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No vitals recorded yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium">Blood Pressure</span>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {vitals[0].bloodPressureSystolic}/{vitals[0].bloodPressureDiastolic} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium">Pulse Rate</span>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {vitals[0].pulseRate} <span className="text-[10px] font-normal text-slate-400">bpm</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium">Temperature</span>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {vitals[0].temperature} <span className="text-[10px] font-normal text-slate-400">°C</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium">BMI / Weight</span>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {vitals[0].bmi} <span className="text-[10px] font-normal text-slate-400">({vitals[0].bmiCategory})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Latest Encounter Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Most Recent Clinical Encounter
                </h3>
                {encounters.length > 0 && (
                  <span className="text-[11px] font-mono text-slate-400">{encounters[0].encounterDate}</span>
                )}
              </div>

              {encounters.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No consultation notes recorded yet.</p>
              ) : (
                <div className="text-xs space-y-2 text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">Chief Complaint: </span>
                    {encounters[0].chiefComplaint}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Assessment: </span>
                    {encounters[0].assessmentNotes}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Treatment Plan: </span>
                    {encounters[0].treatmentPlan}
                  </div>
                  {encounters[0].diagnoses && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {encounters[0].diagnoses.map((d) => (
                        <span key={d.id} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-medium">
                          {d.code} - {d.description}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 pt-1">
                    Signed by {encounters[0].clinicianName} on {encounters[0].signedAt || encounters[0].encounterDate}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Notes Col 3 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Clinical Workflow Actions
              </h3>
              <button
                onClick={() => onNavigateToTriage(patient.id)}
                className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Record New Triage Vitals</span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateToConsultation(patient.id)}
                className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Open Doctor Consultation</span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateToLab(patient.id)}
                className="w-full text-left px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Order Laboratory Investigations</span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateToPharmacy(patient.id)}
                className="w-full text-left px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Dispense Medication</span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateToBilling(patient.id)}
                className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Generate Invoice / Payment</span>
                <span>→</span>
              </button>
            </div>

            {/* Registration Metadata */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Administrative Record</div>
              <div>Registered on: {patient.registrationDate}</div>
              <div>County: {patient.county || 'Nairobi'}</div>
              <div>Status: {patient.activeStatus ? 'Active Outpatient' : 'Inactive'}</div>
              {patient.notes && <div className="text-[11px] text-slate-500 italic mt-1">"{patient.notes}"</div>}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vital Signs */}
      {activeTab === 'vitals' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Vital Signs Flowsheet</h3>
            <button
              onClick={() => onNavigateToTriage(patient.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              + Record Triage Measurement
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date/Time</th>
                  <th className="py-2.5 px-4">BP (mmHg)</th>
                  <th className="py-2.5 px-4">Pulse (bpm)</th>
                  <th className="py-2.5 px-4">Temp (°C)</th>
                  <th className="py-2.5 px-4">SpO2 (%)</th>
                  <th className="py-2.5 px-4">BMI / Wt</th>
                  <th className="py-2.5 px-4">Recorded By</th>
                  <th className="py-2.5 px-4">Complaint / Triage Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vitals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No vitals recorded for this patient.
                    </td>
                  </tr>
                ) : (
                  vitals.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-medium">{v.recordedAt}</td>
                      <td className={`py-3 px-4 font-mono font-bold ${v.bloodPressureSystolic >= 140 ? 'text-red-600' : 'text-slate-900'}`}>
                        {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}
                      </td>
                      <td className="py-3 px-4 font-mono">{v.pulseRate}</td>
                      <td className="py-3 px-4 font-mono">{v.temperature}</td>
                      <td className="py-3 px-4 font-mono">{v.oxygenSaturation}%</td>
                      <td className="py-3 px-4">
                        <span className="font-mono">{v.bmi}</span> ({v.weightKg}kg)
                      </td>
                      <td className="py-3 px-4 text-slate-500">{v.recordedBy}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{v.presentingComplaint}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Consultations */}
      {activeTab === 'consultations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Longitudinal Clinical Encounters & SOAP Notes</h3>
            <button
              onClick={() => onNavigateToConsultation(patient.id)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              + New Consultation
            </button>
          </div>

          {encounters.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No clinical consultations recorded yet.
            </div>
          ) : (
            encounters.map((enc) => (
              <div key={enc.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-bold text-sm text-slate-900">Encounter {enc.visitNumber}</span>
                    <span className="text-xs text-slate-500 ml-2">· {enc.encounterDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      enc.status === 'signed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {enc.status}
                    </span>
                    <span className="text-xs font-medium text-slate-600">by {enc.clinicianName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-0.5">Subjective (Chief Complaint & HPI)</h4>
                    <p className="text-slate-700 whitespace-pre-line">{enc.chiefComplaint}</p>
                    <p className="text-slate-600 mt-1 whitespace-pre-line">{enc.historyOfPresentingIllness}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-0.5">Objective (Physical Examination)</h4>
                    <p className="text-slate-700 whitespace-pre-line">{enc.physicalExamination}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-0.5">Assessment & Diagnoses</h4>
                    <p className="text-slate-700 whitespace-pre-line">{enc.assessmentNotes}</p>
                    {enc.diagnoses && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {enc.diagnoses.map((d) => (
                          <span key={d.id} className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded">
                            {d.code} - {d.description} ({d.type})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-0.5">Plan & Treatment</h4>
                    <p className="text-slate-700 whitespace-pre-line">{enc.treatmentPlan}</p>
                    {enc.followUpDate && (
                      <div className="text-[11px] font-semibold text-blue-700 mt-2">
                        Follow-up Scheduled: {enc.followUpDate} ({enc.followUpInstructions})
                      </div>
                    )}
                  </div>
                </div>

                {enc.amendments && enc.amendments.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700">Audit Amendment: </span>
                    {enc.amendments.map((am, i) => (
                      <div key={i} className="text-[11px] mt-0.5">
                        Amended on {am.amendedAt} by {am.amendedBy}: "{am.reason}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Labs */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Laboratory Investigations</h3>
            <button
              onClick={() => onNavigateToLab(patient.id)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
            >
              + Order Lab Test
            </button>
          </div>

          {labOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No laboratory orders recorded.
            </div>
          ) : (
            labOrders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{ord.orderNumber}</span>
                    <span className="text-slate-500 ml-2">Ordered on {ord.orderedAt} by {ord.orderedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      {ord.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => PDFService.generateLabReportPDF(ord, patient, settings)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      Print Lab Report
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="py-1.5 px-3">Test Investigation</th>
                        <th className="py-1.5 px-3">Result Value</th>
                        <th className="py-1.5 px-3">Reference Interval</th>
                        <th className="py-1.5 px-3">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ord.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.testName}</td>
                          <td className={`py-2 px-3 font-mono font-bold ${item.isAbnormal ? 'text-red-600' : 'text-slate-800'}`}>
                            {item.resultValue || 'Pending Result'}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{item.referenceRange || 'N/A'}</td>
                          <td className="py-2 px-3">
                            {item.isAbnormal ? (
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                ABNORMAL
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Medications & Prescriptions</h3>
            <button
              onClick={() => onNavigateToConsultation(patient.id)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              + Prescribe Medication
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No prescriptions found for this patient.
            </div>
          ) : (
            prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{rx.prescriptionNumber}</span>
                    <span className="text-slate-500 ml-2">Prescribed by {rx.prescribedBy} on {rx.prescribedAt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      rx.status === 'dispensed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {rx.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => PDFService.generatePrescriptionPDF(rx, patient, settings)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      Print Rx Slip
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {rx.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{item.medicationName} ({item.strength})</span>
                        <div className="text-slate-600 mt-0.5">
                          {item.dose} · {item.route} · {item.frequency} for {item.durationDays} days.
                        </div>
                        <div className="text-blue-700 text-[11px]">Instructions: {item.instructions}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-800">Qty: {item.quantityPrescribed}</div>
                        <span className="text-[10px] text-slate-500 uppercase">{item.dispensedStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 6: Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Invoices & Financial Ledger</h3>
            <button
              onClick={() => onNavigateToBilling(patient.id)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              + Create Invoice
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No invoices generated for this patient yet.
            </div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                    <span className="text-slate-500 ml-2">Issued on {inv.issuedAt} by {inv.issuedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      inv.status === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {inv.status}
                    </span>
                    <button
                      onClick={() => PDFService.generateInvoiceReceiptPDF(inv, patient, settings)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      Print Receipt
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="py-1 px-3">Item Description</th>
                        <th className="py-1 px-3">Qty</th>
                        <th className="py-1 px-3">Unit (KES)</th>
                        <th className="py-1 px-3 text-right">Total (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inv.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{it.description}</td>
                          <td className="py-1.5 px-3 font-mono">{it.quantity}</td>
                          <td className="py-1.5 px-3 font-mono">{it.unitPriceKes.toLocaleString()}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-900 text-right">{it.totalPriceKes.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-2 text-xs">
                  <div className="space-y-0.5 text-right font-mono">
                    <div>Total: <span className="font-bold text-slate-900">KES {inv.totalKes.toLocaleString()}</span></div>
                    <div>Paid: <span className="text-emerald-700 font-bold">KES {inv.amountPaidKes.toLocaleString()}</span></div>
                    {inv.balanceKes > 0 && (
                      <div className="text-red-600 font-bold">Balance: KES {inv.balanceKes.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>

      {/* Standardized Print Layout - Formatted for @media print styles */}
      <div id="printable-document" className="hidden print:block text-slate-900 bg-white">
        {/* Clinic Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                {settings.clinicName || 'FAMART CLINIC'}
              </h1>
              <p className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                {settings.subtitle || 'Electronic Medical Records & Clinic Management'}
              </p>
              <div className="text-[10px] text-slate-600 space-y-0.5 mt-1">
                <div>{settings.address || 'Hurlingham, Argwings Kodhek Rd, Nairobi'} · {settings.city || 'Nairobi'}, {settings.country || 'Kenya'}</div>
                <div>Tel: {settings.phoneNumber || '+254 712 345 678'} · Email: {settings.email || 'famartmedicalskinclinic@gmail.com'}</div>
                <div>Reg No: {settings.registrationNumber || 'MED/NRB/2022/8941'} · Tax PIN: {settings.taxPin || 'P051892341Z'}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-bold tracking-widest uppercase rounded">
                PATIENT MEDICAL RECORD
              </span>
              <div className="text-[9px] text-slate-500 font-mono mt-1">
                Doc Ref: EMR-SUM-{patient.patientNumber}
              </div>
              <div className="text-[9px] text-slate-500 font-mono">
                Printed: {new Date().toISOString().replace('T', ' ').substring(0, 16)} EAT
              </div>
              <div className="text-[9px] text-slate-500">
                Printed by: {currentUser.name} ({currentUser.title})
              </div>
            </div>
          </div>
        </div>

        {/* Patient Master Demographics Card */}
        <div className="avoid-break border border-slate-300 rounded p-3 mb-4 bg-slate-50/50">
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="font-bold text-slate-500 uppercase block">Patient Full Name:</span>
              <span className="text-xs font-bold text-slate-900">{patient.firstName} {patient.middleName || ''} {patient.lastName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">Patient Record #:</span>
              <span className="text-xs font-mono font-bold text-red-700">{patient.patientNumber}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">DOB / Age:</span>
              <span className="text-xs font-semibold text-slate-900">{patient.dateOfBirth} ({age} years)</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">Gender / Blood Group:</span>
              <span className="text-xs font-semibold text-slate-900">{patient.gender} · {patient.bloodGroup || 'Unspecified'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">Phone Contact:</span>
              <span className="font-mono text-slate-800">{patient.phoneNumber}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">National ID:</span>
              <span className="font-mono text-slate-800">{patient.nationalId || 'N/A'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">Emergency Contact:</span>
              <span className="text-slate-800">{patient.emergencyContactName} ({patient.emergencyContactRelation})</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase block">Registration Date:</span>
              <span className="font-mono text-slate-800">{patient.registrationDate}</span>
            </div>
          </div>

          {/* Allergies & Chronic Conditions */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="font-bold text-red-800 uppercase block">Documented Allergies:</span>
              {patient.allergies && patient.allergies.length > 0 ? (
                <span className="font-semibold text-red-700">
                  {patient.allergies.map(a => `${a.allergen} (${a.reaction} - ${a.severity})`).join(', ')}
                </span>
              ) : (
                <span className="text-slate-600">No known drug allergies (NKDA)</span>
              )}
            </div>
            <div>
              <span className="font-bold text-slate-700 uppercase block">Chronic Medical Conditions:</span>
              {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                <span className="font-semibold text-slate-800">
                  {patient.chronicConditions.map(c => `${c.condition}${c.diagnosedYear ? ` (since ${c.diagnosedYear})` : ''}`).join(', ')}
                </span>
              ) : (
                <span className="text-slate-600">None documented</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Vital Signs Record */}
        <div className="avoid-break mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
            1. Longitudinal Vital Signs Record
          </h2>
          {vitals.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">No vital signs recorded.</p>
          ) : (
            <table className="w-full text-[10px] border border-slate-300">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-1 border border-slate-300 text-left">Date/Time</th>
                  <th className="p-1 border border-slate-300">BP (mmHg)</th>
                  <th className="p-1 border border-slate-300">Pulse</th>
                  <th className="p-1 border border-slate-300">Temp</th>
                  <th className="p-1 border border-slate-300">SpO2</th>
                  <th className="p-1 border border-slate-300">Resp Rate</th>
                  <th className="p-1 border border-slate-300">Weight</th>
                  <th className="p-1 border border-slate-300">BMI</th>
                  <th className="p-1 border border-slate-300 text-left">Triage Officer</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map(v => (
                  <tr key={v.id} className="text-center">
                    <td className="p-1 border border-slate-300 font-mono text-left">{v.recordedAt}</td>
                    <td className="p-1 border border-slate-300 font-bold">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</td>
                    <td className="p-1 border border-slate-300">{v.pulseRate} bpm</td>
                    <td className="p-1 border border-slate-300">{v.temperature}°C</td>
                    <td className="p-1 border border-slate-300">{v.oxygenSaturation}%</td>
                    <td className="p-1 border border-slate-300">{v.respiratoryRate}/min</td>
                    <td className="p-1 border border-slate-300">{v.weightKg} kg</td>
                    <td className="p-1 border border-slate-300">{v.bmi} ({v.bmiCategory})</td>
                    <td className="p-1 border border-slate-300 text-left">{v.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Clinical Consultation Notes */}
        <div className="avoid-break mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
            2. Clinical Consultations & Physician SOAP Notes
          </h2>
          {encounters.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">No consultation notes recorded.</p>
          ) : (
            <div className="space-y-4">
              {encounters.map((enc) => (
                <div key={enc.id} className="avoid-break border border-slate-300 rounded p-3 text-[10px] space-y-1.5">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">Consultation Encounter: {enc.encounterDate}</span>
                      <span className="ml-2 font-mono text-slate-500">[Visit: {enc.visitNumber}]</span>
                    </div>
                    <div className="font-semibold text-slate-700">
                      Clinician: {enc.clinicianName} · <span className="uppercase text-emerald-800 font-bold">{enc.status}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold uppercase text-slate-600 block">Subjective / Chief Complaint:</span>
                    <p className="text-slate-900">{enc.chiefComplaint}</p>
                    {enc.historyOfPresentingIllness && (
                      <p className="text-slate-700 mt-0.5"><span className="font-semibold">HPI:</span> {enc.historyOfPresentingIllness}</p>
                    )}
                  </div>

                  {enc.physicalExamination && (
                    <div>
                      <span className="font-bold uppercase text-slate-600 block">Objective / Physical Examination:</span>
                      <p className="text-slate-800">{enc.physicalExamination}</p>
                    </div>
                  )}

                  <div>
                    <span className="font-bold uppercase text-slate-600 block">Assessment & Diagnoses (ICD-10):</span>
                    <p className="text-slate-900 font-semibold">{enc.assessmentNotes}</p>
                    {enc.diagnoses && enc.diagnoses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enc.diagnoses.map(d => (
                          <span key={d.id} className="inline-block bg-slate-100 border border-slate-300 px-1.5 py-0.5 font-mono text-[9px] rounded">
                            {d.code} - {d.description} ({d.type})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="font-bold uppercase text-slate-600 block">Plan & Clinical Management:</span>
                    <p className="text-slate-900">{enc.treatmentPlan}</p>
                    {enc.followUpDate && (
                      <p className="text-slate-700 mt-0.5 font-semibold">
                        Follow-up scheduled on: {enc.followUpDate} {enc.followUpInstructions ? `(${enc.followUpInstructions})` : ''}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[9px] text-slate-500 border-t border-slate-200">
                    <span>Electronically signed & locked by: {enc.signedBy || enc.clinicianName}</span>
                    <span>Timestamp: {enc.signedAt || enc.encounterDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Diagnostic Laboratory Results */}
        <div className="avoid-break mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
            3. Clinical Pathology & Diagnostic Laboratory Results
          </h2>
          {labOrders.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">No laboratory investigations requested.</p>
          ) : (
            <div className="space-y-3">
              {labOrders.map((ord) => (
                <div key={ord.id} className="avoid-break border border-slate-300 rounded p-2.5">
                  <div className="flex justify-between items-center text-[10px] mb-1.5 pb-1 border-b border-slate-200">
                    <span className="font-bold font-mono text-purple-900">
                      Order: {ord.orderNumber} ({ord.orderedAt})
                    </span>
                    <span className="text-slate-600">
                      Ordered By: {ord.orderedBy} · Status: <strong className="uppercase">{ord.status}</strong>
                      {ord.verifiedBy && ` · Verified by: ${ord.verifiedBy}`}
                    </span>
                  </div>

                  <table className="w-full text-[10px] border border-slate-300">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-1 border border-slate-300 text-left">Test Name</th>
                        <th className="p-1 border border-slate-300">Specimen</th>
                        <th className="p-1 border border-slate-300">Observed Result</th>
                        <th className="p-1 border border-slate-300">Reference Range</th>
                        <th className="p-1 border border-slate-300">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ord.items.map((item) => (
                        <tr key={item.id} className="text-center">
                          <td className="p-1 border border-slate-300 text-left font-semibold">{item.testName}</td>
                          <td className="p-1 border border-slate-300">{item.specimenType}</td>
                          <td className="p-1 border border-slate-300 font-mono font-bold text-slate-900">{item.resultValue || 'Pending'}</td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-600">{item.referenceRange || 'N/A'}</td>
                          <td className="p-1 border border-slate-300 font-bold">
                            {item.isAbnormal ? (
                              <span className="text-red-700">ABNORMAL</span>
                            ) : (
                              <span className="text-emerald-700">NORMAL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Pharmacy Prescriptions & Dispensing Log */}
        <div className="avoid-break mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
            4. Prescriptions & Medication Dispensing Log
          </h2>
          {prescriptions.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">No prescriptions recorded.</p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="avoid-break border border-slate-300 rounded p-2.5">
                  <div className="flex justify-between items-center text-[10px] mb-1.5 pb-1 border-b border-slate-200">
                    <span className="font-bold font-mono text-teal-900">
                      Prescription Ref: {rx.prescriptionNumber} ({rx.prescribedAt})
                    </span>
                    <span className="text-slate-600">
                      Prescriber: {rx.prescribedBy} · Status: <strong className="uppercase">{rx.status}</strong>
                      {rx.dispensedBy && ` · Dispensed by: ${rx.dispensedBy} (${rx.dispensedAt})`}
                    </span>
                  </div>

                  <table className="w-full text-[10px] border border-slate-300">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-1 border border-slate-300 text-left">Medication Name</th>
                        <th className="p-1 border border-slate-300">Dosage & Route</th>
                        <th className="p-1 border border-slate-300">Frequency & Duration</th>
                        <th className="p-1 border border-slate-300">Prescribed / Dispensed</th>
                        <th className="p-1 border border-slate-300 text-left">Instructions (Sig)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.items.map((item, idx) => (
                        <tr key={idx} className="text-center">
                          <td className="p-1 border border-slate-300 text-left font-semibold">{item.medicationName} ({item.strength})</td>
                          <td className="p-1 border border-slate-300">{item.dose} · {item.route}</td>
                          <td className="p-1 border border-slate-300">{item.frequency} x {item.durationDays}d</td>
                          <td className="p-1 border border-slate-300 font-mono font-bold">Qty: {item.quantityPrescribed} (Disp: {item.quantityDispensed || item.quantityPrescribed})</td>
                          <td className="p-1 border border-slate-300 text-left italic text-slate-700">{item.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Legal & Clinical Certification Sign-off */}
        <div className="avoid-break border-t-2 border-slate-900 pt-3 mt-6 text-[10px]">
          <p className="text-slate-700 italic mb-4">
            Certified true extract of electronic medical records from Famart Clinic EMR. This document is confidential and subject to medical practitioner-patient privilege and Kenya Data Protection Act 2019.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-2">
            <div>
              <div className="border-b border-slate-400 h-8"></div>
              <div className="font-bold text-slate-900 mt-1">Attending Clinician / Physician</div>
              <div className="text-[9px] text-slate-500">Signature & Date</div>
            </div>

            <div>
              <div className="border-b border-slate-400 h-8"></div>
              <div className="font-bold text-slate-900 mt-1">Medical Superintendent / Director</div>
              <div className="text-[9px] text-slate-500">Official Sign-off</div>
            </div>

            <div className="border-2 border-dashed border-slate-400 rounded p-2 text-center h-16 flex flex-col justify-center items-center">
              <span className="font-bold uppercase text-[9px] text-slate-500">OFFICIAL CLINIC STAMP / SEAL</span>
              <span className="text-[8px] text-slate-400">Famart Medical Plaza, Hurlingham</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
