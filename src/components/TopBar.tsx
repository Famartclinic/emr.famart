import React, { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  Clock,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Stethoscope,
  Activity,
  FlaskConical,
  Pill,
  CreditCard,
  Building2,
  Bell,
  CheckCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, AppNotification } from '../types/emr';
import { StorageService } from '../services/storage';

interface TopBarProps {
  onToggleSidebar: () => void;
  activeView: string;
  onOpenSearch: () => void;
  onNavigate?: (view: string, patientId?: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  activeView,
  onOpenSearch,
  onNavigate,
}) => {
  const { currentUser, allUsers, switchUser, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>(() => StorageService.getNotifications());

  const loadNotifications = () => {
    setNotifications(StorageService.getNotifications());
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('famart_storage_updated', loadNotifications);
    return () => window.removeEventListener('famart_storage_updated', loadNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      StorageService.markNotificationAsRead(notif.id);
      loadNotifications();
    }
    if (notif.linkView && onNavigate) {
      onNavigate(notif.linkView, notif.patientId);
      setNotifMenuOpen(false);
    }
  };

  useEffect(() => {
    const updateNairobiTime = () => {
      const now = new Date();
      // Africa/Nairobi is UTC+3
      const timeStr = now.toLocaleTimeString('en-GB', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(timeStr);
    };

    updateNairobiTime();
    const interval = setInterval(updateNairobiTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-amber-600" />;
      case 'doctor':
        return <Stethoscope className="w-3.5 h-3.5 text-blue-600" />;
      case 'nurse':
        return <Activity className="w-3.5 h-3.5 text-emerald-600" />;
      case 'lab_technician':
        return <FlaskConical className="w-3.5 h-3.5 text-purple-600" />;
      case 'pharmacist':
        return <Pill className="w-3.5 h-3.5 text-teal-600" />;
      case 'billing_cashier':
        return <CreditCard className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <User className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'doctor':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'nurse':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'lab_technician':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'pharmacist':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'billing_cashier':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatViewTitle = (v: string) => {
    switch (v) {
      case 'dashboard': return 'Clinical Overview';
      case 'patients': return 'Patient Registry & Directory';
      case 'patient_detail': return 'Patient Longitudinal Chart';
      case 'appointments': return 'Appointments & Queue';
      case 'triage': return 'Triage & Nursing Station';
      case 'procedures': return 'Nursing Procedures & Treatments';
      case 'consultation': return 'Doctor Consultation Desk';
      case 'laboratory': return 'Clinical Laboratory';
      case 'pharmacy': return 'Pharmacy & Dispensary';
      case 'reception_billing': return 'Consultation Fee Billing Desk';
      case 'billing': return 'Billing & Revenue';
      case 'reports': return 'Operational Analytics';
      case 'staff': return 'Staff & Access Management';
      case 'audit_logs': return 'Security & Audit Logs';
      case 'settings': return 'Clinic Facility Settings';
      default: return v.charAt(0).toUpperCase() + v.slice(1);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Breadcrumbs & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="font-semibold text-red-700 tracking-tight flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-red-600" />
            Famart Clinic
          </span>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-800">{formatViewTitle(activeView)}</span>
        </div>
      </div>

      {/* Zone 2: Global Search Trigger */}
      <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-xs transition-colors group cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 transition-colors" />
            <span className="truncate">Search patient by name, FAM-2026-..., or phone...</span>
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Live Time & Role Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Nairobi Time Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium">{currentTime}</span>
          <span className="text-[10px] text-slate-400">EAT</span>
        </div>

        {/* AppNotification Bell Icon */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifMenuOpen(!notifMenuOpen);
              if (roleMenuOpen) setRoleMenuOpen(false);
            }}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Real-time clinical alerts and lab results"
            aria-label="Clinical notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold text-white bg-red-600 rounded-full animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-slate-900">Clinical Alerts & Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex items-center px-3 pt-2 gap-2 text-[11px] border-b border-slate-100 pb-1.5">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer ${notifFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('unread')}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer ${notifFilter === 'unread' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications
                  .filter(n => notifFilter === 'all' || !n.read)
                  .length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <Check className="w-8 h-8 mx-auto text-emerald-500 mb-1 opacity-70" />
                    No notifications in this filter.
                  </div>
                ) : (
                  notifications
                    .filter(n => notifFilter === 'all' || !n.read)
                    .map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 flex items-start gap-2.5 ${
                          !notif.read ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-slate-100">
                          {notif.type === 'lab_verified' ? (
                            <FlaskConical className="w-4 h-4 text-purple-600" />
                          ) : notif.type === 'procedure_completed' ? (
                            <Activity className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Bell className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[11px] font-bold text-slate-900 truncate">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {notif.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                            {notif.message}
                          </p>
                          {notif.linkView && (
                            <span className="text-[10px] text-blue-600 font-semibold mt-1 inline-block">
                              View in {notif.linkView} →
                            </span>
                          )}
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1.5"></span>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleMenuOpen(!roleMenuOpen);
              if (notifMenuOpen) setNotifMenuOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            title="Switch staff account or test different roles"
          >
            {getRoleIcon(currentUser.role)}
            <div className="text-left hidden md:block">
              <div className="font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500">{currentUser.title}</div>
            </div>
            <span className={`text-[10px] px-1.5 py-0.2 border rounded font-semibold uppercase tracking-wider ${getRoleBadgeClass(currentUser.role)}`}>
              {currentUser.role.replace('_', ' ')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Role (RBAC Testing)
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Select a staff persona to test module permissions:
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      switchUser(user.id);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                      user.id === currentUser.id ? 'bg-red-50/60 font-semibold text-red-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-100">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{user.name}</div>
                        <div className="text-[10px] text-slate-500">{user.title}</div>
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase font-bold ${getRoleBadgeClass(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>

              <div className="px-2 pt-2 border-t border-slate-100 mt-1">
                <button
                  onClick={() => {
                    setRoleMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of EMR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
