import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { FamartLogo } from './components/FamartLogo';

// Views
import { DashboardView } from './views/DashboardView';
import { PatientsView } from './views/PatientsView';
import { PatientProfileView } from './views/PatientProfileView';
import { AppointmentsQueueView } from './views/AppointmentsQueueView';
import { TriageView } from './views/TriageView';
import { ConsultationView } from './views/ConsultationView';
import { LaboratoryView } from './views/LaboratoryView';
import { PharmacyView } from './views/PharmacyView';
import { BillingView } from './views/BillingView';
import { ReceptionBillingView } from './views/ReceptionBillingView';
import { ReportsView } from './views/ReportsView';
import { StaffAdminView } from './views/StaffAdminView';
import { SettingsView } from './views/SettingsView';
import { NursingProceduresView } from './views/NursingProceduresView';
import { AuditLogger } from './components/AuditLogger';
import { StorageService } from './services/storage';
import { Lock, LogIn, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, login, currentUser, allUsers } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openRegisterModal, setOpenRegisterModal] = useState(false);

  // Login form state when unauthenticated
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Keyboard shortcut Cmd+K or Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (view: string, patientId?: string) => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
    setActiveView(view);
    // Timestamped user action & module access logging for accountability
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'ACCESS_MODULE',
      'auth',
      view,
      `User ${currentUser.name} (${currentUser.role}) accessed module workspace: ${view}`
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveView('patient_detail');
  };

  // If user signed out, display professional sign-in screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
          <div className="p-8 bg-slate-950 border-b border-slate-800 text-center">
            <div className="flex justify-center mb-3">
              <FamartLogo size="lg" textColor="text-white" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Secure Electronic Medical Records & Clinic Management
            </p>
            <div className="text-[11px] font-mono text-blue-400 mt-1">
              https://emr.famartclinic.co.ke
            </div>
          </div>

          <div className="p-8 space-y-5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Select Staff Account to Sign In:
              </label>
              <div className="space-y-2 mt-2">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => login(u.email)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-red-600 hover:bg-red-50/40 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-red-700">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.title} ({u.role.replace('_', ' ')})</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              Famart Clinic EMR · Kenya Data Protection Act 2019 Compliant
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onNavigate={(v) => handleNavigate(v)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeView={activeView}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* RBAC Route Guard: If role cannot access this module, show Access Restricted card */}
          {activeView !== 'dashboard' && activeView !== 'patient_detail' && !useAuth().canAccess(activeView) ? (
            <div className="bg-white rounded-xl border border-red-200 p-8 shadow-xs text-center max-w-lg mx-auto my-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Restricted Module Access</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your currently active role (<strong>{currentUser.role.replace('_', ' ')}</strong>) does not have authorization to access this clinical workspace under Famart Clinic's Role-Based Access Control policy.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Return to Authorized Workspace
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  onNavigate={handleNavigate}
                  onOpenRegisterModal={() => {
                    setActiveView('patients');
                    setOpenRegisterModal(true);
                  }}
                />
              )}

              {activeView === 'patients' && (
                <PatientsView
                  onSelectPatient={handleSelectPatient}
                  openRegisterOnInit={openRegisterModal}
                />
              )}

              {activeView === 'patient_detail' && (
                <PatientProfileView
                  patientId={selectedPatientId}
                  onBack={() => setActiveView('patients')}
                  onNavigateToTriage={(pid) => handleNavigate('triage', pid)}
                  onNavigateToConsultation={(pid) => handleNavigate('consultation', pid)}
                  onNavigateToLab={(pid) => handleNavigate('laboratory', pid)}
                  onNavigateToPharmacy={(pid) => handleNavigate('pharmacy', pid)}
                  onNavigateToBilling={(pid) => handleNavigate('billing', pid)}
                />
              )}

              {activeView === 'appointments' && (
                <AppointmentsQueueView
                  onNavigateToStage={(stage, pid) => handleNavigate(stage, pid)}
                  onSelectPatient={handleSelectPatient}
                />
              )}

              {activeView === 'triage' && (
                <TriageView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                  onForwardToDoctor={(pid) => handleNavigate('consultation', pid)}
                />
              )}

              {activeView === 'procedures' && (
                <NursingProceduresView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                />
              )}

              {activeView === 'consultation' && (
                <ConsultationView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                  onNavigateToBilling={(pid) => handleNavigate('billing', pid)}
                />
              )}

              {activeView === 'laboratory' && (
                <LaboratoryView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                />
              )}

              {activeView === 'pharmacy' && (
                <PharmacyView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                />
              )}

              {activeView === 'reception_billing' && (
                <ReceptionBillingView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                />
              )}

              {activeView === 'billing' && (
                <BillingView
                  initialPatientId={selectedPatientId}
                  onSelectPatient={handleSelectPatient}
                />
              )}

              {activeView === 'reports' && <ReportsView />}

              {activeView === 'staff' && <StaffAdminView />}

              {activeView === 'audit_logs' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        System Audit Trail & Accountability Center
                      </h1>
                      <p className="text-xs text-slate-500">
                        Immutable, timestamped audit log capturing user actions, module access, and clinical/billing data modifications across Famart Clinic EMR.
                      </p>
                    </div>
                  </div>
                  <AuditLogger currentModule={activeView} />
                </div>
              )}

              {activeView === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Global Patient Search Modal (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPatient={handleSelectPatient}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
