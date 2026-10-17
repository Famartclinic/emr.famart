import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { FamartLogo } from './components/FamartLogo';
import { InstallAppButton } from './components/InstallAppButton';

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
import { isSupabaseConfigured } from './services/supabaseClient';
import { sanitizePinInput } from './services/staffPin';
import { UserRole } from './types/emr';
import { Lock, LogIn, Mail, Users, ShieldAlert, ShieldCheck } from 'lucide-react';

/** Sign-in role choices, mapped to the RBAC roles the app understands. */
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'lab_technician', label: 'Lab' },
  { value: 'pharmacist', label: 'Pharmacy' },
  { value: 'billing_cashier', label: 'Billing' },
  { value: 'receptionist', label: 'Reception' },
];

const MainLayout: React.FC = () => {
  const { isAuthenticated, login, signIn, currentUser, allUsers, canAccess } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openRegisterModal, setOpenRegisterModal] = useState(false);

  // Login form state when unauthenticated
  const [loginEmail, setLoginEmail] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole | ''>('');
  const [loginPin, setLoginPin] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError(true);
      setLoginMessage('Enter the email address linked to your staff account.');
      return;
    }
    if (!loginRole) {
      setLoginError(true);
      setLoginMessage('Select your role to continue.');
      return;
    }
    if (loginPin.length !== 4) {
      setLoginError(true);
      setLoginMessage('Your PIN is 4 digits.');
      return;
    }

    const roleLabel = ROLE_OPTIONS.find((r) => r.value === loginRole)?.label ?? 'staff';
    const staff = allUsers.find(
      (u) => u.email.trim().toLowerCase() === email && u.role === loginRole
    );
    if (!staff) {
      setLoginError(true);
      setLoginMessage(`No ${roleLabel} account found for that email address.`);
      return;
    }
    if (!staff.isActive) {
      setLoginError(true);
      setLoginMessage('That staff account has been disabled. Contact an administrator.');
      return;
    }

    setSigningIn(true);
    setLoginError(false);
    setLoginMessage('');

    if (!isSupabaseConfigured) {
      login(staff.email);
      return;
    }

    const result = await signIn(staff.id, loginPin);
    if (!result.ok) {
      setLoginError(true);
      setLoginMessage(result.error ?? 'Sign-in failed. Try again.');
      setLoginPin('');
      setSigningIn(false);
    }
  };

  // Keyboard shortcuts: Cmd/Ctrl+K opens search; "/" focuses search outside form fields
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          setIsSearchOpen(true);
        }
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
      <div className="min-h-dvh bg-slate-900 flex items-center justify-center safe-shell">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-6 sm:p-8 bg-slate-950 border-b border-slate-800 text-center">
            <div className="flex justify-center mb-3">
              <FamartLogo size="lg" textColor="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Welcome to FAMART EMR</h1>
            <p className="text-xs text-slate-400 mt-1">
              Secure Electronic Medical Records &amp; Clinic Management
            </p>
            <div className="code-ref text-blue-400 mt-2">
              emr.famartclinic.co.ke
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5 text-xs">
            {!isSupabaseConfigured && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  Running in local mode. Configure <code className="code-ref">VITE_SUPABASE_URL</code> and{' '}
                  <code className="code-ref">VITE_SUPABASE_ANON_KEY</code> to use the clinic database.
                </span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label htmlFor="login-email" className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError(false);
                    setLoginMessage('');
                  }}
                  placeholder="name@famartclinic.co.ke"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="login-role" className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                  <Users className="w-3.5 h-3.5" />
                  Role
                </label>
                <select
                  id="login-role"
                  required
                  value={loginRole}
                  onChange={(e) => {
                    setLoginRole(e.target.value as UserRole);
                    setLoginError(false);
                    setLoginMessage('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="">
                    Select your role
                  </option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="login-pin" className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                  <Lock className="w-3.5 h-3.5" />
                  4-digit PIN
                </label>
                <input
                  id="login-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  required
                  value={loginPin}
                  onChange={(e) => {
                    setLoginPin(sanitizePinInput(e.target.value));
                    setLoginError(false);
                    setLoginMessage('');
                  }}
                  placeholder="••••"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none text-center text-lg font-mono tracking-[0.7em] focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {loginError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-red-700">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{loginMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {signingIn ? 'Verifying…' : 'Login'}
              </button>
            </form>

            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 space-y-2">
              <InstallAppButton variant="inline" alwaysVisible />
              <div>Famart Clinic EMR · Kenya Data Protection Act 2019 Compliant</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onNavigate={(v) => handleNavigate(v)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-safe">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeView={activeView}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* RBAC Route Guard: If role cannot access this module, show Access Restricted card */}
          {activeView !== 'dashboard' && activeView !== 'patient_detail' && !canAccess(activeView) ? (
            <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center max-w-lg mx-auto my-12 space-y-3">
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
