import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/emr';
import { StorageService, hydrateStorageFromSupabase } from '../services/storage';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { clearSupabaseSync } from '../services/supabaseSync';
import { isValidPin, pinToPassword } from '../services/staffPin';

interface AuthContextType {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  login: (email: string) => boolean;
  signIn: (staffId: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  canAccess: (module: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => StorageService.getUsers());
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('famart_active_user_id') || users[0].id;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !isSupabaseConfigured);

  /**
   * Makes an account the active one. Re-reads the staff list from storage so it
   * stays correct after hydration swaps the local rows for the authoritative ones.
   */
  const activateByEmail = (email: string): boolean => {
    const normalized = email.trim().toLowerCase();
    const staff = StorageService.getUsers();
    const target = staff.find(u => u.email.toLowerCase() === normalized);
    if (!target) return false;

    setUsers(staff);
    setCurrentUserId(target.id);
    localStorage.setItem('famart_active_user_id', target.id);
    setIsAuthenticated(true);
    StorageService.logAction(
      target.id,
      target.name,
      target.role,
      'USER_LOGIN',
      'auth',
      target.id,
      `Signed in as ${target.name} (${target.title})`
    );
    return true;
  };

  // Restore a persisted Supabase session on reload.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email;
      if (!email) return;
      await hydrateStorageFromSupabase();
      activateByEmail(email);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setUsers(StorageService.getUsers());
    };
    window.addEventListener('famart_storage_updated', handleStorage);
    return () => window.removeEventListener('famart_storage_updated', handleStorage);
  }, []);

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  /**
   * Local-only account switching, kept as a convenience when Supabase is not
   * configured. Once real auth is in play, changing accounts requires a PIN
   * sign-in, so this intentionally does nothing.
   */
  const switchUser = (userId: string) => {
    if (isSupabaseConfigured) return;
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUserId(target.id);
      localStorage.setItem('famart_active_user_id', target.id);
      setIsAuthenticated(true);
      StorageService.logAction(
        target.id,
        target.name,
        target.role,
        'USER_LOGIN',
        'auth',
        target.id,
        `Logged in as ${target.name} (${target.title})`
      );
    }
  };

  const switchRole = (role: UserRole) => {
    const target = users.find(u => u.role === role);
    if (target) {
      switchUser(target.id);
    }
  };

  const login = (email: string): boolean => {
    const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      switchUser(target.id);
      return true;
    }
    return false;
  };

  /**
   * Signs in with a staff account and its 4-digit PIN, then pulls the
   * authoritative rows down. The database's RLS policies require a real
   * Supabase session, so this is the gate for everything stored remotely.
   */
  const signIn = async (staffId: string, pin: string) => {
    const target = users.find(u => u.id === staffId);
    if (!target) {
      return { ok: false, error: 'Select a staff account first.' };
    }
    if (!isValidPin(pin)) {
      return { ok: false, error: 'Your PIN must be exactly 4 digits.' };
    }

    if (isSupabaseConfigured && supabase) {
      if (!target.email) {
        return { ok: false, error: 'That staff account has no email address on file.' };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: target.email,
        password: pinToPassword(pin),
      });
      if (error) {
        return { ok: false, error: 'Incorrect PIN for this account.' };
      }
      // Hydration replaces the local staff list with the authoritative rows,
      // so the account is re-resolved by email afterwards.
      await hydrateStorageFromSupabase();
    }

    if (!activateByEmail(target.email)) {
      return { ok: false, error: 'Signed in, but no staff profile was found for this account.' };
    }
    return { ok: true };
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      void supabase.auth.signOut();
    }
    clearSupabaseSync();
    setIsAuthenticated(false);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    if (Array.isArray(roles)) {
      return roles.includes(currentUser.role);
    }
    return currentUser.role === roles;
  };

  const canAccess = (module: string): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;

    if (role === 'admin') return true;

    switch (role) {
      case 'nurse':
        // Nurse: Triage, Nursing Procedures, Queue view.
        // CANNOT register patient, CANNOT consult, CANNOT access lab, CANNOT dispense drugs, CANNOT access billing.
        return ['dashboard', 'triage', 'procedures', 'appointments'].includes(module);

      case 'doctor':
        // Doctor: Consultation desk, Patient records review, Queue.
        // CANNOT access lab / verify results, CANNOT access pharmacy / dispense, CANNOT access finance/billing, CANNOT access reports.
        return ['dashboard', 'consultation', 'patients', 'appointments'].includes(module);

      case 'receptionist':
        // Receptionist: Patient Registration, Patient Directory, Appointments, Consultation Fee Billing.
        // CANNOT access consultation, CANNOT view lab results, CANNOT dispense drugs, CANNOT access general financial ledger.
        return ['dashboard', 'patients', 'registration', 'appointments', 'reception_billing'].includes(module);

      case 'lab_technician':
        // Lab Technologist: Strictly Laboratory module and Overview only.
        return ['dashboard', 'laboratory'].includes(module);

      case 'pharmacist':
        // Pharmacist: Strictly Pharmacy & Dispensary and Overview only.
        return ['dashboard', 'pharmacy'].includes(module);

      case 'billing_cashier':
        // Cashier: Billing & Invoicing, Financial Reports and Overview only.
        return ['dashboard', 'billing', 'reports'].includes(module);

      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers: users,
        switchUser,
        switchRole,
        login,
        signIn,
        logout,
        isAuthenticated,
        canAccess,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
