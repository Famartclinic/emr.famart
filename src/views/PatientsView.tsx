import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle
} from 'lucide-react';
import { Patient, Allergy, ChronicCondition, QueueStage } from '../types/emr';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface PatientsViewProps {
  onSelectPatient: (patientId: string) => void;
  openRegisterOnInit?: boolean;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onSelectPatient,
  openRegisterOnInit = false,
}) => {
  const { currentUser, canAccess } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGender, setSelectedGender] = useState<'all' | 'Male' | 'Female'>('all');
  const [isRegisterOpen, setIsRegisterOpen] = useState(openRegisterOnInit && canAccess('registration'));

  // New Patient Form State
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Female' as 'Male' | 'Female' | 'Other',
    phoneNumber: '',
    email: '',
    address: '',
    county: 'Nairobi',
    nationalId: '',
    bloodGroup: 'O+' as const,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Spouse',
    allergen: '',
    allergyReaction: '',
    allergySeverity: 'moderate' as 'mild' | 'moderate' | 'severe',
    initialComplaint: '',
    queueTo: 'triage' as QueueStage,
  });

  const [allergyList, setAllergyList] = useState<Allergy[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const loadPatients = () => {
    setPatients(StorageService.getPatients());
  };

  useEffect(() => {
    loadPatients();
    window.addEventListener('famart_storage_updated', loadPatients);
    return () => window.removeEventListener('famart_storage_updated', loadPatients);
  }, []);

  // Duplicate detection check
  useEffect(() => {
    if (!formData.phoneNumber && !formData.firstName) {
      setDuplicateWarning(null);
      return;
    }
    const match = patients.find(
      p =>
        (formData.phoneNumber && p.phoneNumber === formData.phoneNumber) ||
        (formData.firstName &&
          formData.lastName &&
          p.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
          p.lastName.toLowerCase() === formData.lastName.toLowerCase())
    );

    if (match) {
      setDuplicateWarning(
        `Potential duplicate detected! Record matches ${match.firstName} ${match.lastName} (${match.patientNumber}, Phone: ${match.phoneNumber})`
      );
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.phoneNumber, formData.firstName, formData.lastName, patients]);

  const handleAddAllergy = () => {
    if (!formData.allergen) return;
    const newAllergy: Allergy = {
      id: `alg-${Date.now()}`,
      allergen: formData.allergen,
      reaction: formData.allergyReaction || 'Hypersensitivity',
      severity: formData.allergySeverity,
      recordedAt: new Date().toISOString().substring(0, 10),
    };
    setAllergyList([...allergyList, newAllergy]);
    setFormData({ ...formData, allergen: '', allergyReaction: '' });
  };

  const handleRemoveAllergy = (id: string) => {
    setAllergyList(allergyList.filter(a => a.id !== id));
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccess('registration')) {
      alert('Patient registration is restricted to Reception Desk and Administrators.');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.phoneNumber) {
      alert('Please fill in required fields: First Name, Last Name, Date of Birth, and Phone Number.');
      return;
    }

    const duplicate = patients.find(p => p.phoneNumber === formData.phoneNumber.trim());
    if (duplicate) {
      alert(`Patient already registered: ${duplicate.firstName} ${duplicate.lastName} (${duplicate.patientNumber}). System prevents duplicate patient entries.`);
      return;
    }

    const patientNumber = StorageService.generatePatientNumber();
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      patientNumber,
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email.trim(),
      address: formData.address.trim() || 'Nairobi',
      county: formData.county,
      nationalId: formData.nationalId.trim(),
      bloodGroup: formData.bloodGroup,
      emergencyContactName: formData.emergencyContactName.trim() || 'Next of Kin',
      emergencyContactPhone: formData.emergencyContactPhone.trim() || formData.phoneNumber,
      emergencyContactRelation: formData.emergencyContactRelation,
      allergies: allergyList,
      chronicConditions: [],
      registrationDate: new Date().toISOString().substring(0, 10),
      activeStatus: true,
      notes: formData.initialComplaint ? `Initial Presentation: ${formData.initialComplaint}` : '',
    };

    StorageService.savePatient(newPatient);

    // If initial complaint or queue selected, create visit queue entry
    if (formData.queueTo) {
      const visitNumber = `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const fullName = `${newPatient.firstName} ${newPatient.lastName}`;
      StorageService.saveQueueEntry({
        id: `q-${Date.now()}`,
        patientId: newPatient.id,
        patientNumber: newPatient.patientNumber,
        patientName: fullName,
        visitNumber,
        stage: formData.queueTo,
        priority: 'normal',
        chiefComplaint: formData.initialComplaint || 'Outpatient registration visit',
        checkedInAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'waiting',
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });

      // AUTOMATIC BILLING: Automatically bill the Consultation Fee at Reception registration!
      StorageService.addOrAppendInvoiceItem(
        newPatient.id,
        fullName,
        visitNumber,
        {
          id: `ii-cons-${Date.now()}`,
          serviceCode: 'SRV-CONS-GEN',
          description: 'General Outpatient Consultation Fee',
          category: 'Consultation',
          unitPriceKes: 1500,
          quantity: 1,
          totalPriceKes: 1500,
        },
        currentUser.name
      );
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'REGISTER_PATIENT',
      'patient',
      newPatient.id,
      `Registered new patient ${newPatient.firstName} ${newPatient.lastName} (${newPatient.patientNumber})`
    );

    setIsRegisterOpen(false);
    onSelectPatient(newPatient.id);
  };

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase().trim();
    const fullName = `${p.firstName} ${p.middleName || ''} ${p.lastName}`.toLowerCase();
    const matchSearch =
      !q ||
      fullName.includes(q) ||
      p.patientNumber.toLowerCase().includes(q) ||
      p.phoneNumber.includes(q) ||
      (p.nationalId && p.nationalId.includes(q));

    const matchGender = selectedGender === 'all' || p.gender === selectedGender;
    return matchSearch && matchGender;
  });

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            Patient Directory & Medical Records
          </h1>
          <p className="text-xs text-slate-500">
            Official longitudinal patient master index for Famart Clinic.
          </p>
        </div>

        {canAccess('registration') && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Register New Patient
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {/* Search-as-you-go and Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search-as-you-go: name, FAM-#, phone, or National ID..."
            className="w-full pl-9 pr-24 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-800"
          />
          <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
            {filtered.length} of {patients.length}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500">Filter Gender:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'Male', 'Female'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(g)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedGender === g
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Patient ID / Name</th>
                <th className="py-3 px-4">Age / Sex</th>
                <th className="py-3 px-4">Contact & Locality</th>
                <th className="py-3 px-4">Allergies</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => {
                  const birthYear = new Date(patient.dateOfBirth).getFullYear();
                  const age = new Date().getFullYear() - birthYear;
                  const hasAllergies = patient.allergies && patient.allergies.length > 0;

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectPatient(patient.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 border border-red-100">
                            {patient.firstName[0]}
                            {patient.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
                              {patient.firstName} {patient.middleName || ''} {patient.lastName}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {patient.patientNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{age} years</div>
                        <div className="text-[11px] text-slate-500">{patient.gender} · {patient.bloodGroup || 'Blood: N/A'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800">{patient.phoneNumber}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{patient.address}</div>
                      </td>

                      <td className="py-3 px-4">
                        {hasAllergies ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" />
                            {patient.allergies[0].allergen}
                            {patient.allergies.length > 1 && ` (+${patient.allergies.length - 1})`}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">None reported</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {patient.registrationDate}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(patient.id);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-red-700 text-slate-700 hover:text-white rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Chart
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filtered.length} of {patients.length} patients</span>
          <span className="text-[11px] text-slate-400">Famart Clinic EMR Master Patient Index</span>
        </div>
      </div>

      {/* Register New Patient Modal */}
      {isRegisterOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-red-400 shrink-0" />
                  Register New Patient
                </h2>
                <p className="text-xs text-slate-400 hidden sm:block">Generates unique FAM-2026-XXXX record and opens initial visit queue.</p>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                aria-label="Close registration form"
                className="text-slate-400 hover:text-white p-1 rounded shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              {duplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate Warning: </span>
                    {duplicateWarning}
                  </div>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Mary"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    placeholder="e.g. Wambui"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name / Surname *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Njoki"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 bg-white"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number (M-Pesa) *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+254 7..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">National ID / Passport</label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="e.g. 30192841"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Physical Address / Locality</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Hurlingham / Kilimani, Nairobi"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Emergency Contact & Relation</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="e.g. John Njoki (Spouse: +254 712...)"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Allergies Section */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="font-semibold text-slate-800 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Documented Allergies & Adverse Reactions
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.allergen}
                    onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
                    placeholder="Allergen (e.g. Penicillin, Aspirin)"
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white flex-1 min-w-[120px]"
                  />
                  <input
                    type="text"
                    value={formData.allergyReaction}
                    onChange={(e) => setFormData({ ...formData, allergyReaction: e.target.value })}
                    placeholder="Reaction (e.g. Rash, Anaphylaxis)"
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white flex-1 min-w-[140px]"
                  />
                  <select
                    value={formData.allergySeverity}
                    onChange={(e) => setFormData({ ...formData, allergySeverity: e.target.value as any })}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold"
                  >
                    Add Allergy
                  </button>
                </div>

                {allergyList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {allergyList.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-medium border border-red-200"
                      >
                        {a.allergen} ({a.reaction} - {a.severity})
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(a.id)}
                          className="text-red-600 hover:text-red-900 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Initial Visit Flow Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Presenting Complaint / Reason</label>
                  <input
                    type="text"
                    value={formData.initialComplaint}
                    onChange={(e) => setFormData({ ...formData, initialComplaint: e.target.value })}
                    placeholder="e.g. Skin rash, routine wellness check, headache"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Immediate Queue Destination</label>
                  <select
                    value={formData.queueTo}
                    onChange={(e) => setFormData({ ...formData, queueTo: e.target.value as QueueStage })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 bg-white"
                  >
                    <option value="triage">Forward to Triage & Vitals Station</option>
                    <option value="consultation">Direct to Doctor Consultation</option>
                    <option value="laboratory">Direct to Laboratory</option>
                    <option value="reception">Hold at Reception Queue</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Complete Registration & Open Chart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
