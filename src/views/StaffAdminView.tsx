import React, { useState, useEffect } from 'react';
import {
  UserCog,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Filter,
  KeyRound,
  Pencil,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { UserProfile, UserRole, AuditLogEntry } from '../types/emr';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { PIN_LENGTH, isValidPin, sanitizePinInput } from '../services/staffPin';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'doctor', label: 'Clinical Officer / Doctor' },
  { value: 'nurse', label: 'Nurse / Triage Officer' },
  { value: 'receptionist', label: 'Receptionist / Registrar' },
  { value: 'lab_technician', label: 'Medical Laboratory Scientist' },
  { value: 'pharmacist', label: 'Pharmacist / Dispenser' },
  { value: 'billing_cashier', label: 'Cashier / Billing Officer' },
  { value: 'admin', label: 'Clinic Administrator' },
];

interface StaffForm {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  phone: string;
  licenseNumber: string;
}

const EMPTY_FORM: StaffForm = {
  name: '',
  email: '',
  role: 'doctor',
  title: '',
  department: '',
  phone: '',
  licenseNumber: '',
};

export const StaffAdminView: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'audit'>('staff');
  const [searchAudit, setSearchAudit] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [formPin, setFormPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pinTarget, setPinTarget] = useState<UserProfile | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const isEditing = Boolean(form.id);

  const loadData = () => {
    setUsers(StorageService.getUsers());
    setAuditLogs(StorageService.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  const logAudit = (action: string, entityId: string, details: string) => {
    StorageService.logAction(currentUser.id, currentUser.name, currentUser.role, action, 'auth', entityId, details);
  };

  const finish = (result: { ok: boolean; error?: string }, successText: string) => {
    if (result.ok) {
      setNotice({ kind: 'ok', text: successText });
      loadData();
    } else {
      setNotice({ kind: 'error', text: result.error ?? 'The action failed.' });
    }
    return result.ok;
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormPin('');
    setNotice(null);
    setFormOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      department: user.department,
      phone: user.phone ?? '',
      licenseNumber: user.licenseNumber ?? '',
    });
    setFormPin('');
    setNotice(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (!isEditing && !isValidPin(formPin)) {
      setNotice({ kind: 'error', text: `Choose a ${PIN_LENGTH}-digit PIN for the new staff member.` });
      return;
    }

    setBusy(true);
    let result: { ok: boolean; error?: string };

    if (isEditing && form.id) {
      result = await StorageService.updateStaff(form.id, {
        fullName: form.name,
        role: form.role,
        title: form.title,
        department: form.department,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
      });
      // An optional PIN reset travels with the same save.
      if (result.ok && isValidPin(formPin)) {
        result = await StorageService.setStaffPin(form.id, formPin);
      }
      if (finish(result, `${form.name} updated.`)) {
        logAudit('UPDATE_STAFF_ACCOUNT', form.id, `Updated staff account for ${form.name} (${form.role})`);
      }
    } else {
      result = await StorageService.createStaff(
        {
          fullName: form.name,
          email: form.email,
          role: form.role,
          title: form.title,
          department: form.department,
          phone: form.phone,
          licenseNumber: form.licenseNumber,
        },
        formPin
      );
      if (finish(result, `${form.name} can now sign in with their PIN.`)) {
        logAudit('CREATE_STAFF_ACCOUNT', form.email, `Created staff account for ${form.name} as ${form.role}`);
      }
    }

    setBusy(false);
    if (result.ok) setFormOpen(false);
  };

  const handleToggleActive = async (user: UserProfile) => {
    setBusy(true);
    const next = !user.isActive;
    const result = await StorageService.setUserActiveStatus(user.id, next);
    if (finish(result, `${user.name} ${next ? 'reactivated' : 'deactivated'}.`)) {
      logAudit(
        next ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        user.id,
        `${next ? 'Activated' : 'Deactivated'} staff account for ${user.name}`
      );
    }
    setBusy(false);
  };

  const handleDelete = async (user: UserProfile) => {
    setBusy(true);
    const result = await StorageService.deleteUser(user.id);
    if (finish(result, `${user.name} deleted.`)) {
      logAudit('DELETE_STAFF_ACCOUNT', user.id, `Deleted staff account for ${user.name}`);
    }
    setBusy(false);
    setConfirmDelete(null);
  };

  const handleSetPin = async () => {
    if (!pinTarget) return;
    if (!isValidPin(pinValue)) {
      setNotice({ kind: 'error', text: `A PIN must be exactly ${PIN_LENGTH} digits.` });
      return;
    }
    setBusy(true);
    const isSelf = pinTarget.id === currentUser.id;
    const result = await StorageService.setStaffPin(isSelf ? undefined : pinTarget.id, pinValue);
    if (finish(result, isSelf ? 'Your PIN has been changed.' : `PIN updated for ${pinTarget.name}.`)) {
      logAudit(
        'CHANGE_USER_PIN',
        pinTarget.id,
        isSelf ? 'Changed their own sign-in PIN' : `Reset the sign-in PIN for ${pinTarget.name}`
      );
    }
    setBusy(false);
    setPinTarget(null);
    setPinValue('');
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-red-600" />
            Staff Accounts & Security Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            RBAC permissions enforcement, clinical staff accounts, and tamper-resistant audit logs under Kenya Data Protection Act 2019.
          </p>
        </div>

        {activeTab === 'staff' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPinTarget(currentUser);
                setPinValue('');
                setNotice(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Change My PIN
            </button>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Add Staff Account
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'staff'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCog className="w-4 h-4" />
          Staff Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'audit'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Security Audit Trail ({auditLogs.length} Events)
        </button>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-snug">{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            className="ml-auto text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tab 1: Staff Directory */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Staff Name & Title</th>
                  <th className="py-3 px-4">Role & Permissions</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Contact & License</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-100 text-slate-800 border-slate-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">{u.department}</td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div>{u.phone || 'N/A'}</div>
                      <div className="text-slate-400 font-sans text-[10px]">{u.licenseNumber || 'Internal'}</div>
                    </td>

                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          <XCircle className="w-3 h-3" />
                          DISABLED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(isAdmin || u.id === currentUser.id) && (
                          <button
                            onClick={() => {
                              setPinTarget(u);
                              setPinValue('');
                              setNotice(null);
                            }}
                            title={u.id === currentUser.id ? 'Change my PIN' : `Reset PIN for ${u.name}`}
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit staff details"
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAdmin && u.id !== currentUser.id && (
                          <>
                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={busy}
                              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                                u.isActive
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDelete(u);
                                setNotice(null);
                              }}
                              title="Delete staff account"
                              className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Search audit trail by user, action, or keyword..."
                className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-md outline-none bg-white"
              />
            </div>
            <span className="text-slate-400 text-xs">Total Recorded: {auditLogs.length} events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp (EAT)</th>
                  <th className="py-2.5 px-4">Staff Identity</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Audit Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 font-sans">{log.userName}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 uppercase">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-blue-700">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-500 uppercase">{log.entityType}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / edit staff modal */}
      {formOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                {isEditing ? <Pencil className="w-4 h-4 text-red-400" /> : <UserPlus className="w-4 h-4 text-red-400" />}
                {isEditing ? `Edit ${form.name}` : 'Create New Staff Account'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Dr. Kevin Mwangi"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={isEditing}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="kmwangi@famartclinic.co.ke"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {isEditing && (
                    <p className="text-[10px] text-slate-400 mt-1">The sign-in email cannot be changed here.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Professional Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Consultant Dermatologist"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Dermatology Clinic"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">License / Board Number</label>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="e.g. KMPDC-9182"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+254 7..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <label className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  {isEditing ? 'New 4-digit PIN (optional)' : '4-digit PIN *'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  required={!isEditing}
                  value={formPin}
                  onChange={(e) => setFormPin(sanitizePinInput(e.target.value))}
                  placeholder="e.g. 4821"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono tracking-[0.4em] text-center"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {isEditing
                    ? 'Leave blank to keep the current PIN.'
                    : 'This is the PIN the staff member uses to sign in.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {busy ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN modal — reset someone else's, or change your own */}
      {pinTarget && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-sm">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-red-400" />
                {pinTarget.id === currentUser.id ? 'Change My PIN' : `Reset PIN — ${pinTarget.name}`}
              </h2>
              <button
                onClick={() => {
                  setPinTarget(null);
                  setPinValue('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label htmlFor="pin-input" className="block text-slate-700 font-semibold mb-1">
                  New 4-digit PIN
                </label>
                <input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  autoFocus
                  value={pinValue}
                  onChange={(e) => setPinValue(sanitizePinInput(e.target.value))}
                  placeholder="••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-center text-lg font-mono tracking-[0.6em]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {pinTarget.id === currentUser.id
                    ? 'You will use this PIN the next time you sign in.'
                    : `${pinTarget.name} will use this PIN the next time they sign in.`}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setPinTarget(null);
                    setPinValue('');
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetPin}
                  disabled={busy || pinValue.length !== PIN_LENGTH}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {busy ? 'Saving…' : 'Save PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-sm">
            <div className="px-5 py-4 bg-red-700 text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <h2 className="text-sm font-bold">Delete staff account</h2>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Permanently delete <strong>{confirmDelete.name}</strong> ({confirmDelete.email})? Their sign-in
                stops working immediately and the account cannot be restored.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={busy}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {busy ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
