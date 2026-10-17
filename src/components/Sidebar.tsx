import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Activity,
  Bandage,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  Receipt,
  BarChart3,
  UserCog,
  ShieldCheck,
  Settings,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { FamartLogo } from './FamartLogo';
import { InstallAppButton } from './InstallAppButton';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
}) => {
  const { canAccess, currentUser } = useAuth();
  const [counts, setCounts] = useState({
    triageQueue: 0,
    doctorQueue: 0,
    labQueue: 0,
    pharmacyQueue: 0,
    totalPatients: 0,
  });

  const loadCounts = () => {
    const queue = StorageService.getQueue();
    const labOrders = StorageService.getLabOrders();
    const prescriptions = StorageService.getPrescriptions();
    const patients = StorageService.getPatients();

    setCounts({
      triageQueue: queue.filter((q) => q.stage === 'triage' && q.status === 'waiting').length,
      doctorQueue: queue.filter((q) => q.stage === 'consultation' && q.status === 'in_progress').length,
      labQueue: labOrders.filter((o) => o.status !== 'verified' && o.status !== 'cancelled').length,
      pharmacyQueue: prescriptions.filter((p) => p.status === 'pending').length,
      totalPatients: patients.length,
    });
  };

  useEffect(() => {
    loadCounts();
    const handleStorage = () => loadCounts();
    window.addEventListener('famart_storage_updated', handleStorage);
    return () => window.removeEventListener('famart_storage_updated', handleStorage);
  }, []);

  const navItems = [
    {
      group: 'CLINICAL CARE',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, module: 'dashboard' },
        { id: 'patients', label: 'Patients Directory', icon: Users, module: 'patients', count: counts.totalPatients },
        { id: 'appointments', label: 'Appointments & Queue', icon: CalendarClock, module: 'appointments' },
        { id: 'triage', label: 'Triage & Vitals', icon: Activity, module: 'triage', count: counts.triageQueue, urgent: counts.triageQueue > 0 },
        { id: 'procedures', label: 'Nursing Procedures', icon: Bandage, module: 'procedures' },
        { id: 'consultation', label: 'Doctor Consultation', icon: Stethoscope, module: 'consultation', count: counts.doctorQueue },
        { id: 'laboratory', label: 'Laboratory Desk', icon: FlaskConical, module: 'laboratory', count: counts.labQueue, attention: counts.labQueue > 0 },
        { id: 'pharmacy', label: 'Pharmacy & Dispensing', icon: Pill, module: 'pharmacy', count: counts.pharmacyQueue, attention: counts.pharmacyQueue > 0 },
      ],
    },
    {
      group: 'FINANCIAL & BILLING',
      items: [
        { id: 'reception_billing', label: 'Consultation Fee Billing', icon: Receipt, module: 'reception_billing' },
        { id: 'billing', label: 'Billing & Invoices', icon: CreditCard, module: 'billing' },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, module: 'reports' },
      ],
    },
    {
      group: 'ADMINISTRATION',
      items: [
        { id: 'staff', label: 'Staff Management', icon: UserCog, module: 'staff' },
        { id: 'audit_logs', label: 'Audit Trail', icon: ShieldCheck, module: 'audit_logs' },
        { id: 'settings', label: 'Facility Settings', icon: Settings, module: 'settings' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 pt-safe pb-safe bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center border-b border-slate-800/80">
          <FamartLogo size="md" textColor="text-white" />
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navItems.map((section) => {
            const accessibleItems = section.items.filter((item) => canAccess(item.module));
            if (accessibleItems.length === 0) return null;

            return (
              <div key={section.group}>
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {section.group}
                </div>
                <div className="space-y-1">
                  {accessibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id || (activeView === 'patient_detail' && item.id === 'patients');

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          onClose();
                        }}
                        className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold'
                            : 'text-slate-400 font-medium hover:text-slate-100 hover:bg-slate-800/50'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-blue-500" />
                        )}
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.count !== undefined && item.count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold tabular-nums ${
                              item.urgent
                                ? 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/25'
                                : item.attention
                                ? 'bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/25'
                                : 'bg-slate-700/70 text-slate-300'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: install prompt, facility status & compliance */}
        <div className="p-4 border-t border-slate-800/80 space-y-2.5">
          <InstallAppButton variant="sidebar" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-200 truncate">Famart Clinic Nairobi</span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">emr.famartclinic.co.ke</span>
          </div>
          <div className="text-[9px] text-slate-600">
            Data Protection Act 2019 · Confidential
          </div>
        </div>
      </aside>
    </>
  );
};
