import React, { useState, useEffect } from 'react';
import {
  Bandage,
  Syringe,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  ShieldCheck,
  FileText,
  Activity,
  X
} from 'lucide-react';
import { NursingProcedure, Patient, PatientQueueEntry } from '../types/emr';
import { StorageService } from '../services/storage';
import { SearchAsYouGoPatientSelect } from '../components/SearchAsYouGoPatientSelect';
import { useAuth } from '../context/AuthContext';

interface NursingProceduresViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
}

const PREDEFINED_PROCEDURES = [
  { name: 'Wound Dressing (Minor)', category: 'Wound Care' as const, serviceCode: 'PROC-DRS-MIN', chargeKes: 800 },
  { name: 'Wound Dressing & Debridement (Major)', category: 'Wound Care' as const, serviceCode: 'PROC-DRS-MAJ', chargeKes: 1500 },
  { name: 'Suture / Staple Removal', category: 'Wound Care' as const, serviceCode: 'PROC-SUT-REM', chargeKes: 600 },
  { name: 'IM / IV Injection Administration', category: 'Injections' as const, serviceCode: 'PROC-INJ-GEN', chargeKes: 300 },
  { name: 'Tetanus Toxoid Injection', category: 'Injections' as const, serviceCode: 'PROC-INJ-TT', chargeKes: 400 },
  { name: 'IV Cannulation & Infusion Setup', category: 'Injections' as const, serviceCode: 'PROC-IV-CANN', chargeKes: 1000 },
  { name: 'Nebulization Therapy Session', category: 'Respiratory' as const, serviceCode: 'PROC-RESP-NEB', chargeKes: 750 },
  { name: 'Bedside Blood Glucose (RBS) Test', category: 'Diagnostic' as const, serviceCode: 'PROC-BED-GLUC', chargeKes: 300 },
  { name: 'Urethral Catheterization', category: 'Catheterization' as const, serviceCode: 'PROC-CATH-UR', chargeKes: 1200 },
];

export const NursingProceduresView: React.FC<NursingProceduresViewProps> = ({
  initialPatientId,
  onSelectPatient,
}) => {
  const { currentUser } = useAuth();
  const [procedures, setProcedures] = useState<NursingProcedure[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<PatientQueueEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Procedure Entry Form State
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '');
  const [selectedPredefinedIndex, setSelectedPredefinedIndex] = useState(0);
  const [customName, setCustomName] = useState('');
  const [customCharge, setCustomCharge] = useState(800);
  const [procedureNotes, setProcedureNotes] = useState('');

  const loadData = () => {
    setProcedures(StorageService.getProcedures());
    setPatients(StorageService.getPatients());
    setQueue(StorageService.getQueue());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  const handleOpenModal = (patientId?: string) => {
    if (patientId) {
      setSelectedPatientId(patientId);
    } else if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
    setIsModalOpen(true);
  };

  const handleSubmitProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === selectedPatientId);
    if (!pat) {
      alert('Please select a valid patient.');
      return;
    }

    const selectedPredef = PREDEFINED_PROCEDURES[selectedPredefinedIndex];
    const procName = selectedPredef ? selectedPredef.name : customName;
    const procCharge = selectedPredef ? selectedPredef.chargeKes : customCharge;
    const procCategory = selectedPredef ? selectedPredef.category : 'Wound Care';
    const procCode = selectedPredef ? selectedPredef.serviceCode : 'PROC-CUST';

    const queueItem = queue.find(q => q.patientId === pat.id);
    const visitNumber = queueItem?.visitNumber || `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newProcedure: NursingProcedure = {
      id: `prc-${Date.now()}`,
      procedureNumber: `PRC-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      visitNumber,
      procedureName: procName,
      category: procCategory,
      serviceCode: procCode,
      chargeKes: procCharge,
      notes: procedureNotes,
      performedBy: currentUser.name,
      performedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'completed',
    };

    // Save procedure (which automatically adds the charge to the patient's billing invoice!)
    StorageService.saveProcedure(newProcedure);

    // Alert Doctor and clinical team
    StorageService.addNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: 'Nursing Procedure Completed',
      message: `${newProcedure.procedureName} completed for ${newProcedure.patientName} by ${currentUser.name}. Billed KES ${newProcedure.chargeKes.toLocaleString()}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'procedure_completed',
      patientId: newProcedure.patientId,
      patientName: newProcedure.patientName,
      procedureName: newProcedure.procedureName,
      read: false,
      targetRole: 'doctor',
      linkView: 'procedures',
    });

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'PERFORM_NURSING_PROCEDURE',
      'procedure',
      newProcedure.id,
      `Performed ${newProcedure.procedureName} (KES ${newProcedure.chargeKes}) on ${newProcedure.patientName}. Automatically billed to invoice.`
    );

    setIsModalOpen(false);
    setProcedureNotes('');
    setSuccessMsg(
      `Procedure "${newProcedure.procedureName}" recorded and automatically added to Billing Invoice (KES ${newProcedure.chargeKes.toLocaleString()})!`
    );
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const filteredProcedures = procedures.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.procedureName.toLowerCase().includes(q) ||
      p.patientName.toLowerCase().includes(q) ||
      p.procedureNumber.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bandage className="w-5 h-5 text-emerald-600" />
            Nursing Procedures & Treatments Desk
          </h1>
          <p className="text-xs text-slate-500">
            Document nursing interventions (wound dressing, injections, catheterization, nebulization) with automatic billing synchronization.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Perform Procedure
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Procedures List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search procedure, patient, or ref..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none bg-white"
            />
          </div>
          <span className="text-xs text-slate-500">
            {filteredProcedures.length} Procedure{filteredProcedures.length !== 1 ? 's' : ''} Documented
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ref / Date</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Procedure & Category</th>
                <th className="py-3 px-4">Service Charge</th>
                <th className="py-3 px-4">Performing Nurse</th>
                <th className="py-3 px-4">Notes & Observations</th>
                <th className="py-3 px-4 text-right">Billing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProcedures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No nursing procedures recorded yet.
                  </td>
                </tr>
              ) : (
                filteredProcedures.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{proc.procedureNumber}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{proc.performedAt}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div
                        onClick={() => onSelectPatient(proc.patientId)}
                        className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                      >
                        {proc.patientName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Ref: {proc.visitNumber}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{proc.procedureName}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                        {proc.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      KES {proc.chargeKes.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {proc.performedBy}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {proc.notes || 'Routine procedure completed aseptically.'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Billed to Invoice
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Perform Procedure Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Bandage className="w-4 h-4 text-emerald-400" />
                Perform Nursing Procedure
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProcedure} className="p-5 space-y-4 text-xs">
              <div>
                <SearchAsYouGoPatientSelect
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  label="Select Patient (Search-as-you-go):"
                  placeholder="Search by name, FAM-#, phone number..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Procedure & Service Tariff *
                </label>
                <select
                  value={selectedPredefinedIndex}
                  onChange={(e) => setSelectedPredefinedIndex(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                >
                  {PREDEFINED_PROCEDURES.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {p.name} [{p.category}] — KES {p.chargeKes.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                    Automatic Billing Charge
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {PREDEFINED_PROCEDURES[selectedPredefinedIndex]?.name}
                  </span>
                </div>
                <div className="text-base font-bold text-emerald-800 font-mono">
                  KES {PREDEFINED_PROCEDURES[selectedPredefinedIndex]?.chargeKes.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nursing Clinical Notes & Site Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={procedureNotes}
                  onChange={(e) => setProcedureNotes(e.target.value)}
                  placeholder="e.g. Cleaned wound bed with normal saline and iodine. Sterile gauze dressing applied. Patient tolerated procedure well."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save & Bill Procedure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
