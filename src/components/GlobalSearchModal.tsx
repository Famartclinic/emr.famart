import React, { useState, useEffect } from 'react';
import { Search, X, User, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import { Patient } from '../types/emr';
import { StorageService } from '../services/storage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
}) => {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPatients(StorageService.getPatients());
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = patients.filter((p) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${p.firstName} ${p.middleName || ''} ${p.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      p.patientNumber.toLowerCase().includes(q) ||
      p.phoneNumber.includes(q) ||
      (p.nationalId && p.nationalId.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-red-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient by name, patient number (FAM-2026-...), phone, or national ID..."
            className="w-full text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No patient records found matching "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Check the spelling or try searching by phone number.</p>
            </div>
          ) : (
            filtered.map((patient) => {
              const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
              const hasAllergies = patient.allergies && patient.allergies.length > 0;

              return (
                <div
                  key={patient.id}
                  onClick={() => {
                    onSelectPatient(patient.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center font-bold text-sm shrink-0 border border-red-100">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
                          {patient.firstName} {patient.middleName || ''} {patient.lastName}
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {patient.patientNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>{patient.gender} · {age} yrs</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {patient.phoneNumber}
                        </span>
                        {patient.bloodGroup && (
                          <span className="font-medium text-slate-600">Blood: {patient.bloodGroup}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasAllergies && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded">
                        <AlertCircle className="w-3 h-3" />
                        Allergies
                      </span>
                    )}
                    <div className="flex items-center text-xs font-medium text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      <span>View Chart</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} patient record{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-[11px] text-slate-400">Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
