import React, { useState, useEffect } from 'react';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Scale,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Send,
  User,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { VitalSigns, Patient, PatientQueueEntry } from '../types/emr';
import { StorageService } from '../services/storage';
import { SearchAsYouGoPatientSelect } from '../components/SearchAsYouGoPatientSelect';
import { useAuth } from '../context/AuthContext';

interface TriageViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
  onForwardToDoctor: (patientId: string) => void;
}

export const TriageView: React.FC<TriageViewProps> = ({
  initialPatientId,
  onSelectPatient,
  onForwardToDoctor,
}) => {
  const { currentUser } = useAuth();
  const [queue, setQueue] = useState<PatientQueueEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '');
  const [recentVitals, setRecentVitals] = useState<VitalSigns[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Vitals
  const [vitalsData, setVitalsData] = useState({
    systolic: 120,
    diastolic: 80,
    pulseRate: 75,
    respiratoryRate: 16,
    temperature: 36.8,
    oxygenSaturation: 98,
    weightKg: 70,
    heightCm: 170,
    painScore: 0,
    presentingComplaint: '',
    triageNotes: '',
  });

  const loadData = () => {
    const q = StorageService.getQueue();
    const p = StorageService.getPatients();
    setQueue(q);
    setPatients(p);

    if (!selectedPatientId && q.length > 0) {
      // Pick first waiting in triage
      const triageItem = q.find(item => item.stage === 'triage');
      if (triageItem) {
        setSelectedPatientId(triageItem.patientId);
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
      setRecentVitals(v);
      const queueItem = queue.find(q => q.patientId === selectedPatientId);
      if (queueItem && queueItem.chiefComplaint) {
        setVitalsData(prev => ({
          ...prev,
          presentingComplaint: queueItem.chiefComplaint || '',
        }));
      }
    }
  }, [selectedPatientId, queue]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Auto-calculated BMI
  const heightMeters = vitalsData.heightCm > 0 ? vitalsData.heightCm / 100 : 1;
  const bmiRaw = vitalsData.weightKg / (heightMeters * heightMeters);
  const bmi = Number(bmiRaw.toFixed(1));

  let bmiCategory: 'Underweight' | 'Normal' | 'Overweight' | 'Obese' = 'Normal';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi < 25) bmiCategory = 'Normal';
  else if (bmi < 30) bmiCategory = 'Overweight';
  else bmiCategory = 'Obese';

  // Blood Pressure classification
  let bpCategory = 'Normal';
  let isBpAbnormal = false;
  if (vitalsData.systolic >= 180 || vitalsData.diastolic >= 120) {
    bpCategory = 'Hypertensive Crisis (Emergency)';
    isBpAbnormal = true;
  } else if (vitalsData.systolic >= 140 || vitalsData.diastolic >= 90) {
    bpCategory = 'Stage 2 Hypertension';
    isBpAbnormal = true;
  } else if (vitalsData.systolic >= 130 || vitalsData.diastolic >= 80) {
    bpCategory = 'Stage 1 Hypertension';
    isBpAbnormal = true;
  } else if (vitalsData.systolic >= 120 && vitalsData.diastolic < 80) {
    bpCategory = 'Elevated';
  } else if (vitalsData.systolic < 90 || vitalsData.diastolic < 60) {
    bpCategory = 'Hypotension';
    isBpAbnormal = true;
  }

  const isFever = vitalsData.temperature > 37.5;
  const isHypoxia = vitalsData.oxygenSaturation < 95;
  const isAbnormalOverall = isBpAbnormal || isFever || isHypoxia || vitalsData.pulseRate > 100 || vitalsData.pulseRate < 60;

  const handleSaveTriage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const queueItem = queue.find(q => q.patientId === selectedPatient.id);
    const visitNumber = queueItem?.visitNumber || `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newVitals: VitalSigns = {
      id: `vit-${Date.now()}`,
      patientId: selectedPatient.id,
      visitNumber,
      recordedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recordedBy: `${currentUser.name} (${currentUser.title})`,
      bloodPressureSystolic: Number(vitalsData.systolic),
      bloodPressureDiastolic: Number(vitalsData.diastolic),
      pulseRate: Number(vitalsData.pulseRate),
      respiratoryRate: Number(vitalsData.respiratoryRate),
      temperature: Number(vitalsData.temperature),
      oxygenSaturation: Number(vitalsData.oxygenSaturation),
      weightKg: Number(vitalsData.weightKg),
      heightCm: Number(vitalsData.heightCm),
      bmi,
      bmiCategory,
      painScore: Number(vitalsData.painScore),
      presentingComplaint: vitalsData.presentingComplaint || 'Outpatient triage',
      triageNotes: vitalsData.triageNotes,
      isAbnormal: isAbnormalOverall,
    };

    StorageService.saveVitals(newVitals);

    // Update queue stage to consultation so doctor receives patient
    if (queueItem) {
      StorageService.updateQueueStage(queueItem.id, 'consultation', 'in_progress');
    } else {
      StorageService.saveQueueEntry({
        id: `q-${Date.now()}`,
        patientId: selectedPatient.id,
        patientNumber: selectedPatient.patientNumber,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        visitNumber,
        stage: 'consultation',
        priority: isAbnormalOverall ? 'urgent' : 'normal',
        chiefComplaint: vitalsData.presentingComplaint,
        checkedInAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'in_progress',
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'RECORD_TRIAGE_VITALS',
      'vitals',
      newVitals.id,
      `Recorded vitals for ${selectedPatient.firstName} ${selectedPatient.lastName}: BP ${vitalsData.systolic}/${vitalsData.diastolic}, Temp ${vitalsData.temperature}°C, BMI ${bmi}`
    );

    setSuccessMessage(`Vital signs saved & patient routed to Doctor Consultation desk.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onForwardToDoctor(selectedPatient.id);
    }, 1200);
  };

  const triageWaitingQueue = queue.filter(q => q.stage === 'triage');

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Triage & Nursing Assessment Station
          </h1>
          <p className="text-xs text-slate-500">
            Record physiological measurements, automated BMI, vital signs flags, and forward to clinical officer / doctor.
          </p>
        </div>

        {selectedPatient && (
          <button
            onClick={() => onSelectPatient(selectedPatient.id)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            Open Full Patient Chart →
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Main Grid: Waiting Queue Selector on Left (1 col) and Triage Form on Right (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Triage Waiting Queue */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Waiting for Triage ({triageWaitingQueue.length})
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                Queue
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {triageWaitingQueue.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No patients waiting in triage queue.
                </div>
              ) : (
                triageWaitingQueue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPatientId(item.patientId)}
                    className={`p-3 text-xs cursor-pointer transition-colors ${
                      selectedPatientId === item.patientId
                        ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{item.patientName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.patientNumber} · Ref: {item.visitNumber}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      {item.chiefComplaint || 'Consultation intake'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Patient Switcher (Search-as-you-go) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <SearchAsYouGoPatientSelect
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              label="Select Outpatient (Search-as-you-go):"
              placeholder="Search by name, FAM-#, phone..."
            />
          </div>

          {/* Prior Vitals History */}
          {recentVitals.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Previous Vitals for this Patient
              </h3>
              <div className="space-y-2 text-xs">
                {recentVitals.slice(0, 3).map((rv) => (
                  <div key={rv.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                    <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                      <span>BP: {rv.bloodPressureSystolic}/{rv.bloodPressureDiastolic} mmHg</span>
                      <span className="text-slate-500 font-normal">{rv.recordedAt}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Pulse: {rv.pulseRate} bpm · Temp: {rv.temperature}°C · BMI: {rv.bmi} ({rv.bmiCategory})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Triage Recording Form (2 cols) */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <form onSubmit={handleSaveTriage} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Selected Patient Banner */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-sm">
                    {selectedPatient.firstName[0]}
                    {selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {selectedPatient.patientNumber} · {selectedPatient.gender} · {new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()} yrs
                    </div>
                  </div>
                </div>

                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    Allergies: {selectedPatient.allergies.map(a => a.allergen).join(', ')}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-5 text-xs">
                {/* 1. Cardiovascular & Respiratory */}
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 text-red-700">
                    <Heart className="w-4 h-4" />
                    Cardiovascular & Respiratory Vitals
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Systolic BP (mmHg) *
                      </label>
                      <input
                        type="number"
                        required
                        min="50"
                        max="260"
                        value={vitalsData.systolic}
                        onChange={(e) => setVitalsData({ ...vitalsData, systolic: Number(e.target.value) })}
                        className={`w-full px-3 py-1.5 border rounded-lg font-mono font-bold outline-none ${
                          isBpAbnormal ? 'border-red-400 bg-red-50/30 text-red-700' : 'border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Diastolic BP (mmHg) *
                      </label>
                      <input
                        type="number"
                        required
                        min="30"
                        max="160"
                        value={vitalsData.diastolic}
                        onChange={(e) => setVitalsData({ ...vitalsData, diastolic: Number(e.target.value) })}
                        className={`w-full px-3 py-1.5 border rounded-lg font-mono font-bold outline-none ${
                          isBpAbnormal ? 'border-red-400 bg-red-50/30 text-red-700' : 'border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Pulse Rate (bpm) *
                      </label>
                      <input
                        type="number"
                        required
                        min="30"
                        max="220"
                        value={vitalsData.pulseRate}
                        onChange={(e) => setVitalsData({ ...vitalsData, pulseRate: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Respiratory Rate (bpm)
                      </label>
                      <input
                        type="number"
                        min="8"
                        max="60"
                        value={vitalsData.respiratoryRate}
                        onChange={(e) => setVitalsData({ ...vitalsData, respiratoryRate: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* BP Auto Classification banner */}
                  <div className="mt-2 text-[11px] flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span>
                      BP Interpretation: <strong className={isBpAbnormal ? 'text-red-700' : 'text-slate-800'}>{bpCategory}</strong>
                    </span>
                    <span className="text-slate-400 font-mono">Target: &lt;120/80 mmHg</span>
                  </div>
                </div>

                {/* 2. Temperature & Oxygen Saturation */}
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 text-blue-700">
                    <Thermometer className="w-4 h-4" />
                    Temperature & Oxygenation
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Body Temperature (°C) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          required
                          min="30"
                          max="44"
                          value={vitalsData.temperature}
                          onChange={(e) => setVitalsData({ ...vitalsData, temperature: Number(e.target.value) })}
                          className={`w-full px-3 py-1.5 border rounded-lg font-mono font-bold outline-none ${
                            isFever ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300'
                          }`}
                        />
                        <span className="absolute right-3 top-2 text-slate-400">°C</span>
                      </div>
                      {isFever && (
                        <p className="text-[11px] text-red-600 font-bold mt-1">Pyrexia / Fever detected (&gt;37.5°C)</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Oxygen Saturation SpO2 (%) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="50"
                          max="100"
                          value={vitalsData.oxygenSaturation}
                          onChange={(e) => setVitalsData({ ...vitalsData, oxygenSaturation: Number(e.target.value) })}
                          className={`w-full px-3 py-1.5 border rounded-lg font-mono font-bold outline-none ${
                            isHypoxia ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300'
                          }`}
                        />
                        <span className="absolute right-3 top-2 text-slate-400">%</span>
                      </div>
                      {isHypoxia && (
                        <p className="text-[11px] text-red-600 font-bold mt-1">Hypoxemia alert (&lt;95%)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Anthropometrics & Auto BMI */}
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 text-slate-700">
                    <Scale className="w-4 h-4" />
                    Anthropometry & Automatic BMI Calculation
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Weight (kg) *</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        min="2"
                        max="250"
                        value={vitalsData.weightKg}
                        onChange={(e) => setVitalsData({ ...vitalsData, weightKg: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Height (cm) *</label>
                      <input
                        type="number"
                        required
                        min="40"
                        max="240"
                        value={vitalsData.heightCm}
                        onChange={(e) => setVitalsData({ ...vitalsData, heightCm: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold outline-none"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center">
                      <span className="text-[10px] text-slate-500 font-medium">Calculated BMI</span>
                      <div className="text-base font-bold text-slate-900 font-mono">
                        {bmi} <span className="text-xs font-semibold text-blue-700">({bmiCategory})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Pain Score & Complaint */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Pain Score: {vitalsData.painScore} / 10
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={vitalsData.painScore}
                      onChange={(e) => setVitalsData({ ...vitalsData, painScore: Number(e.target.value) })}
                      className="w-full accent-red-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0 - No Pain</span>
                      <span>5 - Moderate</span>
                      <span>10 - Worst Possible</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Presenting Complaint (Patient's Own Words) *
                    </label>
                    <input
                      type="text"
                      required
                      value={vitalsData.presentingComplaint}
                      onChange={(e) => setVitalsData({ ...vitalsData, presentingComplaint: e.target.value })}
                      placeholder="e.g. Throbbing headache for 2 days, skin itching and facial rash"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Triage Nursing Notes & Initial Observations
                    </label>
                    <textarea
                      rows={2}
                      value={vitalsData.triageNotes}
                      onChange={(e) => setVitalsData({ ...vitalsData, triageNotes: e.target.value })}
                      placeholder="e.g. Patient ambulatory, alert. Mild facial erythema visible. Denies chest pain."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="text-[11px] text-slate-500">
                    Signing Nurse: <strong className="text-slate-800">{currentUser.name}</strong>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Save Vitals & Send to Doctor
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              Please select a patient to record triage measurements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
