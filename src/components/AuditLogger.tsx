import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Activity,
  FileText,
  CreditCard,
  Pill,
  FlaskConical,
  RotateCcw,
  Shield,
  Layers,
  Database
} from 'lucide-react';
import { AuditLogEntry, UserRole } from '../types/emr';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

export interface AuditLoggerProps {
  currentModule?: string;
  className?: string;
}

export const AuditLogger: React.FC<AuditLoggerProps> = ({ currentModule, className = '' }) => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const loadLogs = () => {
    setLogs(StorageService.getAuditLogs());
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('famart_storage_updated', loadLogs);
    return () => window.removeEventListener('famart_storage_updated', loadLogs);
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        !search ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.userName.toLowerCase().includes(search.toLowerCase()) ||
        l.details.toLowerCase().includes(search.toLowerCase()) ||
        l.entityId.toLowerCase().includes(search.toLowerCase());

      const matchEntity = selectedEntity === 'all' || l.entityType === selectedEntity;
      const matchRole = selectedRole === 'all' || l.userRole === selectedRole;
      const matchAction = selectedAction === 'all' || l.action === selectedAction;

      return matchSearch && matchEntity && matchRole && matchAction;
    });
  }, [logs, search, selectedEntity, selectedRole, selectedAction]);

  // Statistics
  const dataModificationsCount = logs.filter(
    (l) => l.action.startsWith('CREATE') || l.action.startsWith('UPDATE') || l.action.startsWith('SIGN') || l.action.startsWith('DISPENSE') || l.action.startsWith('VERIFY')
  ).length;

  const authActionsCount = logs.filter((l) => l.entityType === 'auth').length;

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `famart_audit_trail_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEntityBadge = (entity: string) => {
    switch (entity) {
      case 'patient':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'encounter':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'vitals':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'procedure':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'lab_order':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'prescription':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'invoice':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'auth':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Banner and KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Total Captured Events</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{logs.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Immutable audit trail</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Data Modifications</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-700">{dataModificationsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Clinical, lab & billing updates</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Access & Auth Events</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-700">{authActionsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Role switches & logins</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Active Compliance</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-800">100% Tracked</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Kenya DPA 2019 standard</div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by user, action, details, or entity ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-red-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
            >
              <option value="all">All Entities</option>
              <option value="patient">Patients</option>
              <option value="encounter">Clinical Notes</option>
              <option value="vitals">Vitals</option>
              <option value="procedure">Nursing Procedures</option>
              <option value="lab_order">Laboratory</option>
              <option value="prescription">Pharmacy</option>
              <option value="invoice">Invoices & Billing</option>
              <option value="auth">Auth & Accounts</option>
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="doctor">Doctor / CO</option>
              <option value="nurse">Nurse</option>
              <option value="receptionist">Receptionist</option>
              <option value="lab_technician">Lab Technologist</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="billing_cashier">Billing Cashier</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">Timestamp (EAT)</th>
                <th className="py-2.5 px-3">Actor / Staff</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-4">Modification Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No audit records found matching current search criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{log.userName}</span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                        {log.userRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getEntityBadge(log.entityType)}`}>
                        {log.entityType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-600 text-xs">
                      {log.details}
                      {log.entityId && log.entityId !== 'none' && (
                        <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                          [ID: {log.entityId}]
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
