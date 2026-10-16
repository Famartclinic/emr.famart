import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  Receipt,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { Patient, PatientQueueEntry, Appointment, Invoice, LabOrder, Prescription } from '../types/emr';

interface DashboardViewProps {
  onNavigate: (view: string, patientId?: string) => void;
  onOpenRegisterModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenRegisterModal,
}) => {
  const { currentUser, canAccess } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<PatientQueueEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const loadData = () => {
    setPatients(StorageService.getPatients());
    setQueue(StorageService.getQueue());
    setAppointments(StorageService.getAppointments());
    setLabOrders(StorageService.getLabOrders());
    setPrescriptions(StorageService.getPrescriptions());
    setInvoices(StorageService.getInvoices());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  // Compute metrics from centralized billing & clinical queue
  const waitingTriage = queue.filter(q => q.stage === 'triage' && q.status === 'waiting').length;
  const inConsultation = queue.filter(q => q.stage === 'consultation').length;
  const pendingLabs = labOrders.filter(o => o.status !== 'verified' && o.status !== 'cancelled').length;
  const pendingRx = prescriptions.filter(p => p.status === 'pending').length;

  // Real-time Centralized Billing Summary Metrics
  const activePatientCount = queue.filter(q => q.status === 'waiting' || q.status === 'in_progress').length;
  const pendingInvoicesList = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
  const pendingInvoicesCount = pendingInvoicesList.length;
  const todayRevenue = invoices.reduce((acc, inv) => acc + (inv.amountPaidKes || 0), 0);
  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.totalKes || 0), 0);
  const outstandingBal = invoices.reduce((acc, inv) => acc + (inv.balanceKes || 0), 0);

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'reception': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'triage': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'consultation': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'laboratory': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'pharmacy': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'billing': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
              <span>Famart Clinic Outpatient EMR</span>
              <span>·</span>
              <span>Nairobi Facility</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Good day, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Real-time clinical flow, patient queues, and department workloads for today at Famart Clinic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canAccess('registration') && (
              <button
                onClick={onOpenRegisterModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Register New Patient
              </button>
            )}

            <button
              onClick={() => onNavigate('appointments')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-blue-400" />
              Manage Queue
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Summary Cards Section (Pulling data from Centralized Billing System) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-600" />
              Real-Time Centralized Operations & Billing Summary
            </h2>
            <p className="text-xs text-slate-500">
              Live automated data synchronized across Triage, Consultation, Laboratory, Pharmacy, and Invoicing.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Live Billing Sync
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Today's Total Revenue */}
          <div className="p-4 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Today's Total Revenue
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Central Billing
              </span>
            </div>
            {canAccess('billing') ? (
              <>
                <div className="text-2xl font-bold font-mono text-emerald-800 tabular-nums mt-1">
                  KES {todayRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>M-Pesa, Cash & Insurance</span>
                  <span className="font-mono text-slate-700">Billed: KES {totalBilled.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Financial revenue restricted to Billing/Admin role</span>
              </div>
            )}
          </div>

          {/* Card 2: Pending Invoices */}
          <div
            onClick={() => canAccess('billing') && onNavigate('billing')}
            className={`p-4 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs ${canAccess('billing') ? 'cursor-pointer hover:border-amber-300 transition-colors' : ''}`}
          >
            <div className="flex items-center justify-between text-xs text-amber-900 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                Pending Invoices
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                {pendingInvoicesCount} Pending
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-900 tabular-nums mt-1">
              {pendingInvoicesCount} <span className="text-sm font-normal text-slate-500">invoice{pendingInvoicesCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Unpaid / Partial settlement</span>
              {canAccess('billing') ? (
                <span className="font-mono font-bold text-red-600">Bal: KES {outstandingBal.toLocaleString()}</span>
              ) : (
                <span className="text-amber-700 font-medium">Awaiting payment</span>
              )}
            </div>
          </div>

          {/* Card 3: Active Patient Count */}
          <div
            onClick={() => onNavigate('appointments')}
            className="p-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-blue-900 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Active Patient Count
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                In Clinic Flow
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-blue-900 tabular-nums mt-1">
              {activePatientCount} <span className="text-sm font-normal text-slate-500">active patient{activePatientCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{waitingTriage} triage · {inConsultation} consult</span>
              <span className="text-blue-700 font-medium">View live queue →</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Patients */}
        <div
          onClick={() => onNavigate('patients')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Registered Patients</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {patients.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Active records</span>
            <span className="text-red-700 font-medium">View directory →</span>
          </div>
        </div>

        {/* Waiting Triage */}
        <div
          onClick={() => onNavigate('triage')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Waiting for Triage</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {waitingTriage}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Needs vitals check</span>
            <span className="text-emerald-700 font-medium">Open triage →</span>
          </div>
        </div>

        {/* Consultations */}
        <div
          onClick={() => onNavigate('consultation')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">In Doctor Queue</span>
            <Stethoscope className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
            {inConsultation}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Ready for doctor</span>
            <span className="text-blue-700 font-medium">Open desk →</span>
          </div>
        </div>

        {/* Pending Labs & Rx */}
        <div
          onClick={() => onNavigate('laboratory')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Labs / Rx</span>
            <FlaskConical className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 font-mono tabular-nums">
            {pendingLabs} <span className="text-xs font-normal text-slate-400">labs</span> · {pendingRx} <span className="text-xs font-normal text-slate-400">Rx</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Diagnostics pending</span>
            <span className="text-purple-700 font-medium">Review labs →</span>
          </div>
        </div>
      </div>

      {/* Financial strip for authorized users */}
      {canAccess('billing') && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Today's Revenue Collections (M-Pesa & Cash)
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                KES {todayRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-400">Total Billed:</span>
              <div className="font-semibold text-slate-800 font-mono">KES {totalBilled.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-slate-400">Outstanding Balance:</span>
              <div className="font-semibold text-red-600 font-mono">KES {outstandingBal.toLocaleString()}</div>
            </div>
            <button
              onClick={() => onNavigate('billing')}
              className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1 cursor-pointer"
            >
              Billing Ledger <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Clinical Patient Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Active Patient Queue</h2>
              <p className="text-xs text-slate-500">Patients currently progressing through Famart Clinic stages</p>
            </div>
            <button
              onClick={() => onNavigate('appointments')}
              className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1"
            >
              Full Queue View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {queue.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No patients currently in the active queue.
              </div>
            ) : (
              queue.slice(0, 6).map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {q.patientName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => onNavigate('patient_detail', q.patientId)}
                          className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-red-700 cursor-pointer truncate"
                        >
                          {q.patientName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                          {q.patientNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {q.chiefComplaint || 'Consultation visit'} · Ref: {q.visitNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getStageBadge(q.stage)}`}>
                      {q.stage}
                    </span>

                    <button
                      onClick={() => {
                        if (q.stage === 'triage') onNavigate('triage', q.patientId);
                        else if (q.stage === 'consultation') onNavigate('consultation', q.patientId);
                        else if (q.stage === 'laboratory') onNavigate('laboratory', q.patientId);
                        else if (q.stage === 'pharmacy') onNavigate('pharmacy', q.patientId);
                        else onNavigate('patient_detail', q.patientId);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-white bg-slate-100 hover:bg-red-700 rounded-md transition-colors"
                    >
                      Action →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Today's Appointments & Quick Links */}
        <div className="space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Today's Bookings
              </h2>
              <span className="text-xs font-mono font-bold text-slate-500">{appointments.length} Total</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {appointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="p-3 text-xs hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{apt.patientName}</span>
                    <span className="font-mono text-blue-700 font-bold">{apt.appointmentTime}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5 flex items-center justify-between">
                    <span>{apt.reason}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      apt.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : apt.status === 'checked_in'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Department Portals */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Direct Clinical Desks
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {canAccess('triage') && (
                <button
                  onClick={() => onNavigate('triage')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-colors cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-600 mb-1" />
                  <div className="font-semibold text-slate-900">Triage Station</div>
                  <div className="text-[10px] text-slate-500">Record vitals & triage</div>
                </button>
              )}

              {canAccess('procedures') && (
                <button
                  onClick={() => onNavigate('procedures')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-colors cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-600 mb-1" />
                  <div className="font-semibold text-slate-900">Nursing Procedures</div>
                  <div className="text-[10px] text-slate-500">Dressing, injections & care</div>
                </button>
              )}

              {canAccess('consultation') && (
                <button
                  onClick={() => onNavigate('consultation')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-colors cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-blue-600 mb-1" />
                  <div className="font-semibold text-slate-900">Doctor Desk</div>
                  <div className="text-[10px] text-slate-500">SOAP notes & orders</div>
                </button>
              )}

              {canAccess('laboratory') && (
                <button
                  onClick={() => onNavigate('laboratory')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-left transition-colors cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4 text-purple-600 mb-1" />
                  <div className="font-semibold text-slate-900">Lab Orders</div>
                  <div className="text-[10px] text-slate-500">Enter & verify results</div>
                </button>
              )}

              {canAccess('pharmacy') && (
                <button
                  onClick={() => onNavigate('pharmacy')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-left transition-colors cursor-pointer"
                >
                  <Pill className="w-4 h-4 text-teal-600 mb-1" />
                  <div className="font-semibold text-slate-900">Pharmacy</div>
                  <div className="text-[10px] text-slate-500">Dispense & inventory</div>
                </button>
              )}

              {canAccess('reception_billing') && (
                <button
                  onClick={() => onNavigate('reception_billing')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-red-600 mb-1" />
                  <div className="font-semibold text-slate-900">Consultation Fee Desk</div>
                  <div className="text-[10px] text-slate-500">Front desk receipts</div>
                </button>
              )}

              {canAccess('billing') && (
                <button
                  onClick={() => onNavigate('billing')}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-indigo-600 mb-1" />
                  <div className="font-semibold text-slate-900">Billing & Invoices</div>
                  <div className="text-[10px] text-slate-500">Financial cashiering</div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
