import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Stethoscope,
  FlaskConical,
  CreditCard,
  UserPlus,
  ArrowRight,
  Clock,
  AlertTriangle,
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

  const stageCounts = {
    reception: queue.filter(q => q.stage === 'reception').length,
    triage: queue.filter(q => q.stage === 'triage').length,
    consultation: queue.filter(q => q.stage === 'consultation').length,
    laboratory: queue.filter(q => q.stage === 'laboratory').length,
    pharmacy: queue.filter(q => q.stage === 'pharmacy').length,
    billing: queue.filter(q => q.stage === 'billing').length,
  };
  const queueTotal = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  const stageMeta = [
    { key: 'reception', label: 'Reception', dot: 'bg-slate-400' },
    { key: 'triage', label: 'Triage', dot: 'bg-emerald-500' },
    { key: 'consultation', label: 'Consultation', dot: 'bg-blue-500' },
    { key: 'laboratory', label: 'Laboratory', dot: 'bg-violet-500' },
    { key: 'pharmacy', label: 'Pharmacy', dot: 'bg-teal-500' },
    { key: 'billing', label: 'Billing', dot: 'bg-indigo-500' },
  ] as const;

  const getStageDot = (stage: string) => {
    switch (stage) {
      case 'reception': return 'bg-slate-400';
      case 'triage': return 'bg-emerald-500';
      case 'consultation': return 'bg-blue-500';
      case 'laboratory': return 'bg-violet-500';
      case 'pharmacy': return 'bg-teal-500';
      case 'billing': return 'bg-indigo-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Clinical Overview · Nairobi Facility
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Good day, {currentUser.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Today's clinical flow, patient queues and department workload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canAccess('registration') && (
            <button onClick={onOpenRegisterModal} className="btn-primary">
              <UserPlus className="w-4 h-4" />
              Register Patient
            </button>
          )}
          <button
            onClick={() => onNavigate('appointments')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            Manage Queue
          </button>
        </div>
      </div>

      {/* Consolidated financial widget */}
      {canAccess('billing') ? (
        <div className="card p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                Revenue Today
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  KES {todayRevenue.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">collected</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                M-Pesa, cash and insurance settlements across all desks.
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Billed</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                  KES {totalBilled.toLocaleString()}
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Outstanding</div>
                <div className={`mt-1 text-sm font-semibold tabular-nums ${outstandingBal > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  KES {outstandingBal.toLocaleString()}
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open invoices</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                  {pendingInvoicesCount}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Consultation, laboratory and pharmacy charges settle at the cashiering desk.
            </span>
            <button
              onClick={() => onNavigate('billing')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0 cursor-pointer"
            >
              Billing ledger <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </span>
          <div>
            <div className="text-xs font-semibold text-slate-900">Financial summary</div>
            <p className="text-xs text-slate-500">
              Revenue and billing totals are visible to billing and administrator roles.
            </p>
          </div>
        </div>
      )}

      {/* Operational metric strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active patients */}
        <button
          onClick={() => onNavigate('appointments')}
          className="card p-4 text-left transition-all hover:border-slate-300 hover:shadow cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Active Patients</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {activePatientCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">In clinic flow</div>
        </button>

        {/* Waiting triage */}
        <button
          onClick={() => onNavigate('triage')}
          className="card p-4 text-left transition-all hover:border-slate-300 hover:shadow cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Waiting Triage</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {waitingTriage}
            </span>
            {waitingTriage > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-100">
                <AlertTriangle className="w-3 h-3" />
                Urgent
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Awaiting vitals assessment</div>
        </button>

        {/* Doctor queue */}
        <button
          onClick={() => onNavigate('consultation')}
          className="card p-4 text-left transition-all hover:border-slate-300 hover:shadow cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Doctor Queue</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <Stethoscope className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {inConsultation}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Ready for consultation</div>
        </button>

        {/* Pending labs & prescriptions */}
        <button
          onClick={() => onNavigate('laboratory')}
          className="card p-4 text-left transition-all hover:border-slate-300 hover:shadow cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Pending Labs / Rx</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <FlaskConical className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{pendingLabs}</span>
            <span className="text-[11px] text-slate-500">labs</span>
            <span className="text-slate-300">·</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{pendingRx}</span>
            <span className="text-[11px] text-slate-500">Rx</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Diagnostics and dispensing</div>
        </button>
      </div>

      {/* Queue, schedule and desk activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active patient queue */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Active Patient Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Patients progressing through clinic stages</p>
            </div>
            <button
              onClick={() => onNavigate('appointments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0 cursor-pointer"
            >
              Full queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {queue.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-400">
                No patients currently in the active queue.
              </div>
            ) : (
              queue.slice(0, 6).map((q) => (
                <div key={q.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
                      {q.patientName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => onNavigate('patient_detail', q.patientId)}
                          className="text-sm font-semibold text-slate-900 hover:text-blue-700 cursor-pointer truncate"
                        >
                          {q.patientName}
                        </button>
                        <span className="code-ref text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                          {q.patientNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {q.chiefComplaint || 'Consultation visit'}
                        <span className="text-slate-300"> · </span>
                        <span className="code-ref text-slate-400">{q.visitNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md capitalize">
                      <span className={`w-1.5 h-1.5 rounded-full ${getStageDot(q.stage)}`} />
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
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md transition-colors hover:bg-blue-600 hover:border-blue-600 hover:text-white cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Queue status breakdown */}
          <div className="card overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Queue Status</h2>
              <span className="text-xs text-slate-500 tabular-nums">{queueTotal} in flow</span>
            </div>
            <div className="p-4 space-y-3">
              {stageMeta.map((row) => {
                const value = stageCounts[row.key];
                const pct = queueTotal > 0 ? Math.round((value / queueTotal) * 100) : 0;
                return (
                  <div key={row.key} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[11px] font-medium text-slate-600">{row.label}</span>
                    <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <span className={`block h-full rounded-full ${row.dot}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-6 text-right text-[11px] font-semibold text-slate-700 tabular-nums">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's bookings */}
          <div className="card overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Today's Bookings
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">{appointments.length} scheduled</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {appointments.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No appointments booked today.</div>
              ) : (
                appointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="px-4 py-2.5 text-xs hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">{apt.patientName}</span>
                      <span className="text-slate-600 font-semibold tabular-nums shrink-0">{apt.appointmentTime}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 truncate">{apt.reason}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize shrink-0 ${
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
