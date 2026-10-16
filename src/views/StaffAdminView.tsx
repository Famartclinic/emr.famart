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
  X
} from 'lucide-react';
import { UserProfile, UserRole, AuditLogEntry } from '../types/emr';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

export const StaffAdminView: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'audit'>('staff');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [searchAudit, setSearchAudit] = useState('');

  // Add User Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'doctor' as UserRole,
    title: '',
    department: '',
    phone: '',
    licenseNumber: '',
  });

  const loadData = () => {
    setUsers(StorageService.getUsers());
    setAuditLogs(StorageService.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  const handleToggleActive = (user: UserProfile) => {
    user.isActive = !user.isActive;
    StorageService.saveUser(user);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'auth',
      user.id,
      `${user.isActive ? 'Activated' : 'Deactivated'} staff account for ${user.name}`
    );
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      title: formData.title || 'Staff Officer',
      department: formData.department || 'Outpatient Clinic',
      phone: formData.phone,
      licenseNumber: formData.licenseNumber,
      isActive: true,
      lastLogin: 'Never',
    };

    StorageService.saveUser(newUser);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'CREATE_STAFF_ACCOUNT',
      'auth',
      newUser.id,
      `Created staff account for ${newUser.name} as ${newUser.role}`
    );

    setIsAddUserOpen(false);
    setFormData({
      name: '',
      email: '',
      role: 'doctor',
      title: '',
      department: '',
      phone: '',
      licenseNumber: '',
    });
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
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Account
          </button>
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

      {/* Tab 1: Staff Directory */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                            u.isActive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
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
            <table className="w-full text-left text-xs">
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

      {/* Add Staff User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-400" />
                Create New Staff Account
              </h2>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Kevin Mwangi"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kmwangi@famartclinic.co.ke"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="doctor">Clinical Officer / Doctor</option>
                    <option value="nurse">Nurse / Triage Officer</option>
                    <option value="receptionist">Receptionist / Registrar</option>
                    <option value="lab_technician">Medical Laboratory Scientist</option>
                    <option value="pharmacist">Pharmacist / Dispenser</option>
                    <option value="billing_cashier">Cashier / Billing Officer</option>
                    <option value="admin">Clinic Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Professional Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Consultant Dermatologist"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Dermatology Clinic"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">License / Board Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g. KMPDC-9182"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 7..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
