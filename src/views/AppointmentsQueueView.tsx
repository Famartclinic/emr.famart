import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { PatientQueueEntry, Appointment, QueueStage, Patient } from '../types/emr';
import { StorageService } from '../services/storage';
import { SearchAsYouGoPatientSelect } from '../components/SearchAsYouGoPatientSelect';
import { useAuth } from '../context/AuthContext';

interface AppointmentsQueueViewProps {
  onNavigateToStage: (stage: string, patientId: string) => void;
  onSelectPatient: (patientId: string) => void;
}

export const AppointmentsQueueView: React.FC<AppointmentsQueueViewProps> = ({
  onNavigateToStage,
  onSelectPatient,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments'>('queue');
  const [queue, setQueue] = useState<PatientQueueEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Book appointment form
  const [bookData, setBookData] = useState({
    patientId: '',
    appointmentDate: new Date().toISOString().substring(0, 10),
    appointmentTime: '10:00',
    clinicianName: 'Dr. Sarah Ochieng',
    department: 'General Outpatient',
    reason: '',
  });

  const loadData = () => {
    setQueue(StorageService.getQueue());
    setAppointments(StorageService.getAppointments());
    setPatients(StorageService.getPatients());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  const handleStageTransition = (entryId: string, newStage: QueueStage) => {
    StorageService.updateQueueStage(entryId, newStage, 'waiting');
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'UPDATE_QUEUE_STAGE',
      'patient',
      entryId,
      `Moved queue entry to stage: ${newStage}`
    );
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === bookData.patientId);
    if (!pat) {
      alert('Please select a valid patient.');
      return;
    }

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      appointmentNumber: `APT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientPhone: pat.phoneNumber,
      clinicianName: bookData.clinicianName,
      department: bookData.department,
      appointmentDate: bookData.appointmentDate,
      appointmentTime: bookData.appointmentTime,
      reason: bookData.reason || 'General Follow-up',
      status: 'scheduled',
      createdAt: new Date().toISOString().substring(0, 10),
    };

    StorageService.saveAppointment(newApt);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'BOOK_APPOINTMENT',
      'patient',
      pat.id,
      `Booked appointment ${newApt.appointmentNumber} for ${newApt.patientName} on ${newApt.appointmentDate}`
    );

    setIsBookModalOpen(false);
  };

  const handleCheckInAppointment = (apt: Appointment) => {
    const visitNumber = `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    StorageService.saveQueueEntry({
      id: `q-${Date.now()}`,
      patientId: apt.patientId,
      patientNumber: apt.appointmentNumber,
      patientName: apt.patientName,
      visitNumber,
      stage: 'triage',
      priority: 'normal',
      chiefComplaint: apt.reason,
      checkedInAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      assignedStaffName: apt.clinicianName,
      status: 'waiting',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    });

    // Update appointment status to checked_in
    apt.status = 'checked_in';
    StorageService.saveAppointment(apt);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'CHECK_IN_APPOINTMENT',
      'patient',
      apt.patientId,
      `Checked in ${apt.patientName} for visit ${visitNumber}`
    );
  };

  const filteredQueue = queue.filter((item) => {
    const matchSearch =
      !search ||
      item.patientName.toLowerCase().includes(search.toLowerCase()) ||
      item.patientNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.visitNumber.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || item.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'reception': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'triage': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'consultation': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'laboratory': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'pharmacy': return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'billing': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-red-600" />
            Appointments & Patient Flow Queue
          </h1>
          <p className="text-xs text-slate-500">
            Monitor real-time patient progression across reception, triage, consultation, laboratory, pharmacy, and billing.
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'queue'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Live Clinic Flow Queue ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'appointments'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          Appointments Schedule ({appointments.length})
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Queue Filter bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter queue by name or visit..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-red-600 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end text-xs">
              <span className="text-slate-400 text-[11px] font-medium mr-1">Stage:</span>
              {[
                { id: 'all', label: 'All Stages' },
                { id: 'triage', label: 'Triage' },
                { id: 'consultation', label: 'Consultation' },
                { id: 'laboratory', label: 'Laboratory' },
                { id: 'pharmacy', label: 'Pharmacy' },
                { id: 'billing', label: 'Billing' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStageFilter(st.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    stageFilter === st.id
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Patient / Visit Ref</th>
                    <th className="py-3 px-4">Chief Complaint / Notes</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Check-in Time</th>
                    <th className="py-3 px-4">Forward Patient To</th>
                    <th className="py-3 px-4 text-right">Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No patients currently in this queue stage.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span
                              onClick={() => onSelectPatient(item.patientId)}
                              className="hover:text-red-700 cursor-pointer"
                            >
                              {item.patientName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.patientNumber} · Ref: {item.visitNumber}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                          {item.chiefComplaint || 'Routine medical review'}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getStageBadge(item.stage)}`}>
                            {item.stage}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {item.checkedInAt}
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={item.stage}
                            onChange={(e) => handleStageTransition(item.id, e.target.value as QueueStage)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none focus:border-red-600"
                          >
                            <option value="reception">Reception</option>
                            <option value="triage">Triage Station</option>
                            <option value="consultation">Doctor Consultation</option>
                            <option value="laboratory">Laboratory</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="billing">Billing / Cashier</option>
                            <option value="completed">Discharged / Completed</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onNavigateToStage(item.stage, item.patientId)}
                            className="px-3 py-1 bg-slate-900 hover:bg-red-700 text-white rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            Open Desk <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref / Patient</th>
                  <th className="py-3 px-4">Clinician & Department</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No appointments scheduled.
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{apt.patientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{apt.patientPhone}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{apt.clinicianName}</div>
                        <div className="text-[11px] text-slate-500">{apt.department}</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-900">{apt.appointmentDate}</div>
                        <div className="text-[11px] text-blue-700">{apt.appointmentTime} EAT</div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">{apt.reason}</td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          apt.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : apt.status === 'checked_in'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {apt.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {apt.status === 'scheduled' || apt.status === 'confirmed' ? (
                          <button
                            onClick={() => handleCheckInAppointment(apt)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Check-In Patient
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectPatient(apt.patientId)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                          >
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {isBookModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-red-400" />
                Book Clinic Appointment
              </h2>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <SearchAsYouGoPatientSelect
                  selectedPatientId={bookData.patientId}
                  onSelectPatient={(pid) => setBookData({ ...bookData, patientId: pid })}
                  label="Select Patient (Search-as-you-go):"
                  placeholder="Type patient name, FAM-#, phone number..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={bookData.appointmentDate}
                    onChange={(e) => setBookData({ ...bookData, appointmentDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Time (EAT) *</label>
                  <input
                    type="time"
                    required
                    value={bookData.appointmentTime}
                    onChange={(e) => setBookData({ ...bookData, appointmentTime: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Clinician</label>
                  <select
                    value={bookData.clinicianName}
                    onChange={(e) => setBookData({ ...bookData, clinicianName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 bg-white"
                  >
                    <option value="Dr. Sarah Ochieng">Dr. Sarah Ochieng</option>
                    <option value="Dr. Patrick Famart">Dr. Patrick Famart</option>
                    <option value="Florence Mwangi, RN">Florence Mwangi, RN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={bookData.department}
                    onChange={(e) => setBookData({ ...bookData, department: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600 bg-white"
                  >
                    <option value="General Outpatient">General Outpatient</option>
                    <option value="Dermatology & Skin Clinic">Dermatology & Skin Clinic</option>
                    <option value="Cardiology & Hypertension">Cardiology & Hypertension</option>
                    <option value="Wellness & Preventive">Wellness & Preventive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Visit</label>
                <input
                  type="text"
                  value={bookData.reason}
                  onChange={(e) => setBookData({ ...bookData, reason: e.target.value })}
                  placeholder="e.g. Skin rash follow-up, routine BP check"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
