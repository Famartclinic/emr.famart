import React, { useState } from 'react';
import {
  Settings,
  Building2,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  Save,
  Globe,
  Mail,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { ClinicSettings, ServiceItem } from '../types/emr';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<ClinicSettings>(() => StorageService.getSettings());
  const [services, setServices] = useState<ServiceItem[]>(() => StorageService.getServices());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'UPDATE_FACILITY_SETTINGS',
      'settings',
      'clinic_settings',
      `Updated facility settings: ${settings.clinicName} (${settings.domain})`
    );
    setSuccessMsg('Facility profile and settings successfully saved!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data back to Famart Clinic factory seed records? All newly added patients, orders, and payments will be refreshed.')) {
      StorageService.resetToSeedData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-red-600" />
          Clinic Facility Configuration & Settings
        </h1>
        <p className="text-xs text-slate-500">
          Manage Famart Clinic operational details, production domain binding, timezone, and clinical fee catalogues.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Facility Profile Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-600" />
            Facility Legal & Operational Identity
          </h2>
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {settings.domain}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Clinic Name *</label>
            <input
              type="text"
              required
              value={settings.clinicName}
              onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Subtitle / Department</label>
            <input
              type="text"
              value={settings.subtitle}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Official Production Domain *</label>
            <input
              type="text"
              required
              value={settings.domain}
              onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono text-blue-700"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Operating Timezone</label>
            <input
              type="text"
              readOnly
              value={settings.timezone}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">KMPDC Registration Number</label>
            <input
              type="text"
              value={settings.registrationNumber}
              onChange={(e) => setSettings({ ...settings, registrationNumber: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">KRA Tax PIN</label>
            <input
              type="text"
              value={settings.taxPin}
              onChange={(e) => setSettings({ ...settings, taxPin: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Contact Telephone</label>
            <input
              type="tel"
              value={settings.phoneNumber}
              onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Contact Email Address</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">Physical Address / Facility Location</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Facility Settings
          </button>
        </div>
      </form>

      {/* Service Fee Catalogue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Clinical Service Tariff & Fee Schedule
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Currency: KES</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Service Code</th>
                <th className="py-2.5 px-3">Service Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Standard Fee (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{s.code}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-900 font-medium">{s.name}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-500">{s.category}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 text-right">
                    KES {s.priceKes.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factory Reset Danger Zone */}
      <div className="bg-red-50/50 rounded-xl border border-red-200 p-5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-red-600" />
            Reset EMR to Initial Famart Clinic Seed Data
          </h3>
          <p className="text-slate-600 text-xs mt-1">
            Restores initial patients, appointments, laboratory test catalog, pharmacy medications, and sample clinical encounters.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-semibold shadow-xs shrink-0 cursor-pointer"
        >
          Reset Seed Data
        </button>
      </div>
    </div>
  );
};
