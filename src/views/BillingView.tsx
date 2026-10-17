import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Printer,
  DollarSign,
  ArrowRight,
  Trash2,
  Wallet,
  X
} from 'lucide-react';
import { Invoice, InvoiceItem, PaymentMethod, Patient, ServiceItem } from '../types/emr';
import { StorageService } from '../services/storage';
import { BillingService } from '../services/billingService';
import { PDFService } from '../services/pdfGenerator';
import { SearchAsYouGoPatientSelect } from '../components/SearchAsYouGoPatientSelect';
import { useAuth } from '../context/AuthContext';

interface BillingViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  initialPatientId,
  onSelectPatient,
}) => {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Receive Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('M-Pesa');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Create Invoice Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPatientId, setCreatePatientId] = useState(initialPatientId || '');
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceItem[]>([]);
  const [capturedUnpaidNotice, setCapturedUnpaidNotice] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [discountKes, setDiscountKes] = useState(0);

  const handleOpenCreateInvoice = (targetPatientId?: string) => {
    const pid = targetPatientId || createPatientId || initialPatientId || (patients.length > 0 ? patients[0].id : '');
    setCreatePatientId(pid);
    if (pid) {
      const unpaidItems = BillingService.capturePatientUnpaidBills(pid);
      if (unpaidItems.length > 0) {
        setInvoiceLineItems(unpaidItems);
        const sumUnpaid = unpaidItems.reduce((acc, it) => acc + it.totalPriceKes, 0);
        setCapturedUnpaidNotice(`Captured ${unpaidItems.length} unpaid bill(s) totaling KES ${sumUnpaid.toLocaleString()} across Consultation, Laboratory, Pharmacy, and Nursing Procedures.`);
      } else {
        setInvoiceLineItems([
          { id: `item-${Date.now()}`, serviceCode: 'SRV-CONS-GEN', description: 'General Outpatient Consultation', category: 'Consultation', unitPriceKes: 1500, quantity: 1, totalPriceKes: 1500 }
        ]);
        setCapturedUnpaidNotice('No pending unpaid clinical items detected. Standard consultation fee populated.');
      }
    }
    setIsCreateModalOpen(true);
  };

  const handlePatientSelectInModal = (pid: string) => {
    setCreatePatientId(pid);
    if (pid) {
      const unpaidItems = BillingService.capturePatientUnpaidBills(pid);
      if (unpaidItems.length > 0) {
        setInvoiceLineItems(unpaidItems);
        const sumUnpaid = unpaidItems.reduce((acc, it) => acc + it.totalPriceKes, 0);
        setCapturedUnpaidNotice(`Captured ${unpaidItems.length} unpaid bill(s) totaling KES ${sumUnpaid.toLocaleString()} across Consultation, Laboratory, Pharmacy, and Nursing Procedures.`);
      } else {
        setInvoiceLineItems([
          { id: `item-${Date.now()}`, serviceCode: 'SRV-CONS-GEN', description: 'General Outpatient Consultation', category: 'Consultation', unitPriceKes: 1500, quantity: 1, totalPriceKes: 1500 }
        ]);
        setCapturedUnpaidNotice('No pending unpaid clinical items detected. Standard consultation fee populated.');
      }
    }
  };

  const loadData = () => {
    const inv = StorageService.getInvoices();
    const p = StorageService.getPatients();
    const s = StorageService.getServices();
    setInvoices(inv);
    setPatients(p);
    setServices(s);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, []);

  const settings = StorageService.getSettings();

  // Open payment modal
  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.balanceKes);
    setPayRef(`MP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = Number(payAmount);
    if (amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const newPayment = {
      id: `pay-${Date.now()}`,
      amountKes: amount,
      paymentMethod: payMethod,
      referenceNumber: payRef || `REC-${Date.now()}`,
      receivedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      receivedBy: currentUser.name,
      notes: payNotes,
    };

    selectedInvoice.payments.push(newPayment);
    selectedInvoice.amountPaidKes += amount;
    selectedInvoice.balanceKes = Math.max(0, selectedInvoice.totalKes - selectedInvoice.amountPaidKes);

    if (selectedInvoice.balanceKes === 0) {
      selectedInvoice.status = 'paid';
    } else {
      selectedInvoice.status = 'partial';
    }

    StorageService.saveInvoice(selectedInvoice);

    // If fully paid and in queue, advance or complete
    if (selectedInvoice.status === 'paid') {
      const queue = StorageService.getQueue();
      const qItem = queue.find(q => q.patientId === selectedInvoice.patientId);
      if (qItem && qItem.stage === 'billing') {
        StorageService.updateQueueStage(qItem.id, 'completed', 'completed');
      }
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'RECEIVE_PAYMENT',
      'invoice',
      selectedInvoice.id,
      `Received KES ${amount.toLocaleString()} via ${payMethod} (Ref: ${newPayment.referenceNumber}) for invoice ${selectedInvoice.invoiceNumber}`
    );

    setIsPayModalOpen(false);
  };

  // Add line item to new invoice
  const handleAddServiceToInvoice = () => {
    const s = services.find(item => item.id === selectedServiceId);
    if (!s) return;
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      serviceCode: s.code,
      description: s.name,
      category: s.category as any,
      unitPriceKes: s.priceKes,
      quantity: 1,
      totalPriceKes: s.priceKes,
    };
    setInvoiceLineItems([...invoiceLineItems, newItem]);
    setSelectedServiceId('');
  };

  const handleRemoveLineItem = (index: number) => {
    setInvoiceLineItems(invoiceLineItems.filter((_, i) => i !== index));
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === createPatientId);
    if (!pat) {
      alert('Please select a registered patient.');
      return;
    }

    const subtotal = invoiceLineItems.reduce((acc, it) => acc + it.totalPriceKes, 0);
    const total = Math.max(0, subtotal - discountKes);

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      visitNumber: `VST-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      issuedBy: currentUser.name,
      items: invoiceLineItems,
      subtotalKes: subtotal,
      discountKes,
      totalKes: total,
      amountPaidKes: 0,
      balanceKes: total,
      status: 'unpaid',
      payments: [],
    };

    StorageService.saveInvoice(newInvoice);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'CREATE_INVOICE',
      'invoice',
      newInvoice.id,
      `Created invoice ${newInvoice.invoiceNumber} for ${newInvoice.patientName} (KES ${total.toLocaleString()})`
    );

    setIsCreateModalOpen(false);
  };

  const handlePrintPDF = (inv: Invoice) => {
    const pat = patients.find(p => p.id === inv.patientId);
    if (!pat) return;
    PDFService.generateInvoiceReceiptPDF(inv, pat, settings);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.visitNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate totals
  const totalCollections = invoices.reduce((acc, i) => acc + (i.amountPaidKes || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.balanceKes || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Billing & Revenue Operations
          </h1>
          <p className="text-xs text-slate-500">
            Generate itemized patient invoices, process M-Pesa and cash receipts, and manage outstanding balances.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateInvoice()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Patient Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium">Total Revenue Collected (KES)</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            KES {totalCollections.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Confirmed M-Pesa & Cash</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium">Outstanding Balances (KES)</span>
          <div className="text-2xl font-bold text-red-600 font-mono mt-1">
            KES {totalOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Unsettled outpatient bills</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 font-medium">Invoices Issued</span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {invoices.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total active billing accounts</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or patient..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-red-600"
          />
        </div>

        <div className="flex items-center gap-1.5 justify-end w-full sm:w-auto">
          <span className="text-slate-400 mr-1">Status:</span>
          {['all', 'unpaid', 'partial', 'paid'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice # / Date</th>
                <th className="py-3 px-4">Patient & Visit</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No invoices matching current filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{inv.issuedAt}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div
                        onClick={() => onSelectPatient(inv.patientId)}
                        className="font-semibold text-slate-900 hover:text-red-700 cursor-pointer"
                      >
                        {inv.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">Ref: {inv.visitNumber}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      KES {inv.totalKes.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                      KES {inv.amountPaidKes.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={inv.balanceKes > 0 ? 'text-red-600' : 'text-slate-400'}>
                        KES {inv.balanceKes.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : inv.status === 'partial'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            Receive Payment
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintPDF(inv)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPayModalOpen && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Record Payment for {selectedInvoice.invoiceNumber}
              </h2>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500">Patient: <strong className="text-slate-900">{selectedInvoice.patientName}</strong></div>
                <div className="flex justify-between mt-1">
                  <span>Total Billed: <strong className="font-mono text-slate-800">KES {selectedInvoice.totalKes.toLocaleString()}</strong></span>
                  <span>Outstanding: <strong className="font-mono text-red-600">KES {selectedInvoice.balanceKes.toLocaleString()}</strong></span>
                </div>
              </div>

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
                  <option value="Bank Transfer">Bank Transfer (EFT/RTGS)</option>
                  <option value="Insurance">Insurance Provider</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount to Pay (KES) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoice.balanceKes}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-base outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Transaction Reference (e.g. M-Pesa Code) *
                </label>
                <input
                  type="text"
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. SJK904812K"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-emerald-600 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Cashier Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Settled in full via Lipa na M-Pesa"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Confirm Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-400" />
                Generate Patient Invoice
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <SearchAsYouGoPatientSelect
                  selectedPatientId={createPatientId}
                  onSelectPatient={handlePatientSelectInModal}
                  label="Select Patient (Search-as-you-go):"
                  placeholder="Type patient name, FAM-#, or phone number..."
                />
              </div>

              {capturedUnpaidNotice && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Automated Unpaid Charges Capture: </span>
                    {capturedUnpaidNotice}
                  </div>
                </div>
              )}

              {/* Line items list */}
              <div>
                <div className="font-semibold text-slate-800 mb-1">Invoice Line Items:</div>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {invoiceLineItems.map((item, idx) => (
                    <div key={item.id} className="p-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{item.description}</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.quantity} x KES {item.unitPriceKes.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900">
                          KES {item.totalPriceKes.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Service Item Bar */}
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Add catalog service item --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - KES {s.priceKes.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddServiceToInvoice}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Discount & Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Discount (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountKes}
                    onChange={(e) => setDiscountKes(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-right flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 font-medium">Invoice Total</span>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    KES {Math.max(0, invoiceLineItems.reduce((acc, it) => acc + it.totalPriceKes, 0) - discountKes).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
