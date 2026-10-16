import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  CheckCircle2,
  Printer,
  DollarSign,
  User,
  Clock,
  Wallet,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Patient, Invoice, PaymentMethod, ServiceItem, PatientQueueEntry } from '../types/emr';
import { StorageService } from '../services/storage';
import { PDFService } from '../services/pdfGenerator';
import { SearchAsYouGoPatientSelect } from '../components/SearchAsYouGoPatientSelect';
import { useAuth } from '../context/AuthContext';

interface ReceptionBillingViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
}

export const ReceptionBillingView: React.FC<ReceptionBillingViewProps> = ({
  initialPatientId,
  onSelectPatient,
}) => {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<PatientQueueEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState('');

  // Selected patient for consultation billing
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '');
  const [selectedTariffCode, setSelectedTariffCode] = useState<string>('SRV-CONS-GEN');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('M-Pesa');
  const [payRef, setPayRef] = useState<string>(() => `MP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [cashierNotes, setCashierNotes] = useState<string>('Consultation fee collected at Reception Desk');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadData = () => {
    setPatients(StorageService.getPatients());
    setQueue(StorageService.getQueue());
    setInvoices(StorageService.getInvoices());
    setServices(StorageService.getServices());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  const consultationTariffs = [
    { code: 'SRV-CONS-GEN', name: 'General Outpatient Consultation', priceKes: 1500, desc: 'Routine general medical evaluation & triage' },
    { code: 'SRV-CONS-SPEC', name: 'Specialist Dermatology Consultation', priceKes: 3000, desc: 'Consultant Dermatologist / Skin clinic review' },
    { code: 'SRV-CONS-EMERG', name: 'Emergency / Priority Consultation', priceKes: 2500, desc: 'Urgent acute triage & priority consultation' },
  ];

  const selectedTariff = consultationTariffs.find(t => t.code === selectedTariffCode) || consultationTariffs[0];
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleCollectConsultationFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please select a patient to bill consultation fees.');
      return;
    }

    const patientFullName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
    const queueItem = queue.find(q => q.patientId === selectedPatient.id);
    const visitNumber = queueItem?.visitNumber || `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    // 1. Add consultation fee line item to patient invoice
    const invoice = StorageService.addOrAppendInvoiceItem(
      selectedPatient.id,
      patientFullName,
      visitNumber,
      {
        id: `ii-cons-${Date.now()}`,
        serviceCode: selectedTariff.code,
        description: selectedTariff.name,
        category: 'Consultation',
        unitPriceKes: selectedTariff.priceKes,
        quantity: 1,
        totalPriceKes: selectedTariff.priceKes,
      },
      currentUser.name
    );

    // 2. Record payment immediately for the consultation fee
    const payment = {
      id: `pay-cons-${Date.now()}`,
      amountKes: selectedTariff.priceKes,
      paymentMethod: payMethod,
      referenceNumber: payRef || `MP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      receivedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      receivedBy: currentUser.name,
      notes: cashierNotes,
    };

    invoice.payments.push(payment);
    invoice.amountPaidKes += selectedTariff.priceKes;
    invoice.balanceKes = Math.max(0, invoice.totalKes - invoice.amountPaidKes);
    if (invoice.balanceKes === 0) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partial';
    }

    StorageService.saveInvoice(invoice);

    // 3. Ensure patient is in queue for triage if not yet queued
    if (!queueItem) {
      StorageService.saveQueueEntry({
        id: `q-${Date.now()}`,
        patientId: selectedPatient.id,
        patientNumber: selectedPatient.patientNumber,
        patientName: patientFullName,
        visitNumber,
        stage: 'triage',
        priority: selectedTariffCode === 'SRV-CONS-EMERG' ? 'urgent' : 'normal',
        chiefComplaint: 'Consultation fee cleared at Front Desk',
        checkedInAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'waiting',
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
    }

    // 4. Log audit action
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'COLLECT_CONSULTATION_FEE',
      'invoice',
      invoice.id,
      `Front desk collected KES ${selectedTariff.priceKes} for ${selectedTariff.name} from ${patientFullName} via ${payMethod} (${payment.referenceNumber}). Routed to Triage.`
    );

    // 5. Generate PDF receipt
    const settings = StorageService.getSettings();
    PDFService.generateReceipt(invoice, payment, settings);

    setSuccessBanner(
      `Consultation Fee of KES ${selectedTariff.priceKes.toLocaleString()} successfully received for ${patientFullName} (${payMethod} Ref: ${payment.referenceNumber}). Receipt generated and patient routed to Triage!`
    );
    setPayRef(`MP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setSelectedPatientId('');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Filter today's consultation receipts issued
  const todayReceipts: {
    invoice: Invoice;
    payment: { id: string; amountKes: number; paymentMethod: PaymentMethod; referenceNumber: string; receivedAt: string; receivedBy: string };
  }[] = [];

  invoices.forEach(inv => {
    inv.payments.forEach(pay => {
      // Find consultation payments
      const hasConsultation = inv.items.some(i => i.category === 'Consultation');
      if (hasConsultation) {
        todayReceipts.push({ invoice: inv, payment: pay });
      }
    });
  });

  const totalCollectedToday = todayReceipts.reduce((sum, r) => sum + r.payment.amountKes, 0);

  const filteredPatients = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.phoneNumber.includes(q) ||
      p.patientNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            Front Desk · Consultation Fee Billing Desk
          </h1>
          <p className="text-xs text-slate-500">
            Bill outpatient consultation fees, receive M-Pesa or Cash payments, issue receipts, and queue patients for Triage.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Receptionist Role: Front Desk Collections Only</span>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* KPI summary for Front Desk */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium text-xs">Today's Consultation Fees</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            KES {totalCollectedToday.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total front desk collections</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium text-xs">Receipts Issued</span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {todayReceipts.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Consultation slips printed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium text-xs">Patients in Waiting Queue</span>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1">
            {queue.filter(q => q.status === 'waiting').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting triage & doctor</div>
        </div>
      </div>

      {/* 2-Column Layout: Billing Form & Receipts List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bill Consultation Fee Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-600" />
              Collect Consultation Fee
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">Automatic Queue Routing</span>
          </div>

          <form onSubmit={handleCollectConsultationFee} className="p-5 space-y-4 text-xs">
            {/* Patient Picker (Search-as-you-go) */}
            <div>
              <SearchAsYouGoPatientSelect
                selectedPatientId={selectedPatientId}
                onSelectPatient={setSelectedPatientId}
                label="Select Registered Patient (Search-as-you-go):"
                placeholder="Search patient by name, FAM-#, phone number..."
              />
            </div>

            {/* Consultation Tariff Selector */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Select Consultation Tariff *
              </label>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {consultationTariffs.map((t) => {
                  const isSelected = selectedTariffCode === t.code;
                  return (
                    <div
                      key={t.code}
                      onClick={() => setSelectedTariffCode(t.code)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className={`font-bold ${isSelected ? 'text-red-900' : 'text-slate-900'}`}>
                          {t.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{t.desc}</div>
                      </div>
                      <div className="font-mono font-bold text-base text-red-700 shrink-0">
                        KES {t.priceKes.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                >
                  <option value="M-Pesa">M-Pesa Express / Till</option>
                  <option value="Cash">Cash Currency</option>
                  <option value="Credit/Debit Card">Credit/Debit Card (POS)</option>
                  <option value="Insurance">Insurance Provider</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Transaction Reference (e.g. M-Pesa Code) *
                </label>
                <input
                  type="text"
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value.toUpperCase())}
                  placeholder="e.g. SJK904812K"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold outline-none focus:border-red-600 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Front Desk Notes</label>
              <input
                type="text"
                value={cashierNotes}
                onChange={(e) => setCashierNotes(e.target.value)}
                placeholder="e.g. Paid in full via M-Pesa. Forwarded to Triage."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none text-slate-700"
              />
            </div>

            {/* Amount Summary and Submit Button */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Amount Due & Payable
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  KES {selectedTariff.priceKes.toLocaleString()}
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                Collect & Print Receipt
              </button>
            </div>
          </form>
        </div>

        {/* Right: Today's Consultation Receipts List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-slate-600" />
              Today's Consultation Receipts
            </h2>
            <span className="text-xs font-mono font-bold text-slate-500">
              {todayReceipts.length} Issued
            </span>
          </div>

          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient in directory..."
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[480px]">
            {todayReceipts.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No consultation fee receipts issued today yet.
              </div>
            ) : (
              todayReceipts.map((r, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-50 text-xs transition-colors flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{r.invoice.patientName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-blue-700 font-semibold">{r.payment.referenceNumber}</span>
                      <span>·</span>
                      <span>{r.payment.paymentMethod}</span>
                      <span>·</span>
                      <span className="font-mono">{r.payment.receivedAt.split(' ')[1] || r.payment.receivedAt}</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <div className="font-mono font-bold text-emerald-700">
                      KES {r.payment.amountKes.toLocaleString()}
                    </div>
                    <button
                      onClick={() => {
                        const settings = StorageService.getSettings();
                        PDFService.generateReceipt(r.invoice, r.payment as any, settings);
                      }}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 rounded"
                      title="Reprint receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
