import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, User, Phone, Check, X, Users, AlertCircle } from 'lucide-react';
import { Patient } from '../types/emr';
import { StorageService } from '../services/storage';

interface SearchAsYouGoPatientSelectProps {
  selectedPatientId?: string;
  onSelectPatient: (patientId: string) => void;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const SearchAsYouGoPatientSelect: React.FC<SearchAsYouGoPatientSelectProps> = ({
  selectedPatientId,
  onSelectPatient,
  label = 'Search Patient (Search-as-you-go):',
  placeholder = 'Type name, FAM-#, phone, or National ID...',
  allowEmpty = false,
  className = '',
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setPatients(StorageService.getPatients());
    };
    window.addEventListener('famart_storage_updated', handleUpdate);
    return () => window.removeEventListener('famart_storage_updated', handleUpdate);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Live filter "as-you-go"
  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.slice(0, 8); // Top results when opening

    return patients.filter(p => {
      const fullName = `${p.firstName} ${p.middleName || ''} ${p.lastName}`.toLowerCase();
      const patientNum = p.patientNumber.toLowerCase();
      const phone = p.phoneNumber.toLowerCase();
      const natId = p.nationalId ? p.nationalId.toLowerCase() : '';
      return fullName.includes(q) || patientNum.includes(q) || phone.includes(q) || natId.includes(q);
    });
  }, [patients, query]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] font-normal text-slate-400 font-mono">
            {patients.length} registered
          </span>
        </label>
      )}

      {/* Selected Patient Banner or Search Input */}
      <div className="relative">
        <div className="flex items-center">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-3.5 h-3.5" />
          </div>

          <input
            type="text"
            value={query}
            autoFocus={autoFocus}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientNumber})` : placeholder}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 placeholder:text-slate-400 text-slate-900 transition-all shadow-2xs"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : selectedPatient ? (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
              Selected
            </span>
          ) : null}
        </div>
      </div>

      {/* Active Selected Card if no search typing */}
      {selectedPatient && !query && (
        <div className="mt-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              {selectedPatient.firstName[0]}
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900">{selectedPatient.firstName} {selectedPatient.lastName}</span>
              <span className="text-[11px] text-slate-500 font-mono ml-1.5">({selectedPatient.patientNumber})</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-[11px] text-red-700 hover:text-red-800 font-semibold cursor-pointer shrink-0"
          >
            {isOpen ? 'Close' : 'Switch Patient'}
          </button>
        </div>
      )}

      {/* Dropdown Floating Results */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
          <div className="p-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {query ? `Matches for "${query}" (${filteredPatients.length})` : `Recent Patients (${filteredPatients.length})`}
            </span>
            <span className="text-[10px] text-slate-400">Search-as-you-go</span>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No registered patients found matching "{query}".
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatientId;
              const birthYear = new Date(p.dateOfBirth).getFullYear();
              const age = new Date().getFullYear() - birthYear;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPatient(p.id);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`p-2.5 hover:bg-red-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                    isSelected ? 'bg-red-50/40 font-semibold text-red-900' : 'text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {p.firstName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-slate-900 truncate">
                          {p.firstName} {p.middleName || ''} {p.lastName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-1 py-0.2 rounded shrink-0">
                          {p.patientNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                        <span>{p.gender} · {age} yrs</span>
                        <span>·</span>
                        <span className="font-mono flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          {p.phoneNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
