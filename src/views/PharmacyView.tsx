import React, { useState, useEffect } from 'react';
import {
  Pill,
  PackageCheck,
  AlertTriangle,
  Printer,
  Search,
  Plus,
  CheckCircle2,
  PackagePlus,
  Clock,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { Prescription, MedicationItem, Patient } from '../types/emr';
import { StorageService } from '../services/storage';
import { BillingService } from '../services/billingService';
import { PDFService } from '../services/pdfGenerator';
import { useAuth } from '../context/AuthContext';

interface PharmacyViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
}

export const PharmacyView: React.FC<PharmacyViewProps> = ({
  initialPatientId,
  onSelectPatient,
}) => {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'inventory'>('prescriptions');
  const [selectedRxId, setSelectedRxId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Dispensing state for active prescription
  const [dispenseQuantities, setDispenseQuantities] = useState<Record<string, number>>({});

  // Restock / Add Medication Modal
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockData, setRestockData] = useState({
    genericName: '',
    brandName: '',
    dosageForm: 'Tablet' as const,
    strength: '',
    unitPriceKes: 50,
    availableStock: 100,
    reorderLevel: 20,
    batchNumber: 'BAT-2026-01',
    expiryDate: '2027-12-31',
  });

  const loadData = () => {
    const rx = StorageService.getPrescriptions();
    const meds = StorageService.getMedications();
    const p = StorageService.getPatients();
    setPrescriptions(rx);
    setMedications(meds);
    setPatients(p);

    if (!selectedRxId && rx.length > 0) {
      if (initialPatientId) {
        const match = rx.find(item => item.patientId === initialPatientId);
        if (match) setSelectedRxId(match.id);
        else setSelectedRxId(rx[0].id);
      } else {
        setSelectedRxId(rx[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, [initialPatientId]);

  const activeRx = prescriptions.find(r => r.id === selectedRxId);
  const activePatient = activeRx ? patients.find(p => p.id === activeRx.patientId) : undefined;
  const settings = StorageService.getSettings();

  useEffect(() => {
    if (activeRx) {
      const initialQtys: Record<string, number> = {};
      activeRx.items.forEach(it => {
        initialQtys[it.id] = it.quantityPrescribed;
      });
      setDispenseQuantities(initialQtys);
    }
  }, [selectedRxId, activeRx]);

  // Dispense medications
  const handleConfirmDispensing = () => {
    if (!activeRx) return;

    let allSucceeded = true;
    const dispensedPayload: Array<{ item: typeof activeRx.items[0]; quantityDispensed: number }> = [];

    activeRx.items.forEach(item => {
      const qtyToDispense = dispenseQuantities[item.id] || item.quantityPrescribed;
      item.quantityDispensed = qtyToDispense;
      item.dispensedStatus = 'dispensed';
      dispensedPayload.push({ item, quantityDispensed: qtyToDispense });

      // Atomic inventory deduction
      const success = StorageService.decrementStock(item.medicationId, qtyToDispense);
      if (!success) {
        allSucceeded = false;
      }
    });

    activeRx.status = 'dispensed';
    activeRx.dispensedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    activeRx.dispensedBy = currentUser.name;

    StorageService.savePrescription(activeRx);

    // AUTOMATIC BILLING: Whenever in the pharmacy module a drug is marked as dispensed,
    // trigger automatic invoice generation/update in the centralized Billing module!
    const generatedInvoice = BillingService.triggerPharmacyDispensedBilling(
      activeRx,
      dispensedPayload,
      currentUser.name,
      currentUser.id
    );

    // Update patient queue to billing
    const queue = StorageService.getQueue();
    const qItem = queue.find(q => q.patientId === activeRx.patientId);
    if (qItem) {
      StorageService.updateQueueStage(qItem.id, 'billing', 'waiting');
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'DISPENSE_PRESCRIPTION',
      'prescription',
      activeRx.id,
      `Pharmacist ${currentUser.name} dispensed ${activeRx.prescriptionNumber} for ${activeRx.patientName}. Inventory updated. Automatic invoice ${generatedInvoice?.invoiceNumber || ''} created/updated.`
    );

    setSuccessBanner(`Prescription ${activeRx.prescriptionNumber} dispensed! Automatic invoice (${generatedInvoice?.invoiceNumber || 'Updated'}) generated in Billing.`);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  const handlePrintRx = () => {
    if (!activeRx || !activePatient) return;
    PDFService.generatePrescriptionPDF(activeRx, activePatient, settings);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockData.genericName || !restockData.strength) return;

    const newMed: MedicationItem = {
      id: `med-${Date.now()}`,
      genericName: restockData.genericName,
      brandName: restockData.brandName || undefined,
      dosageForm: restockData.dosageForm,
      strength: restockData.strength,
      unitPriceKes: Number(restockData.unitPriceKes),
      availableStock: Number(restockData.availableStock),
      reorderLevel: Number(restockData.reorderLevel),
      batchNumber: restockData.batchNumber,
      expiryDate: restockData.expiryDate,
    };

    StorageService.saveMedication(newMed);
    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'RECEIVE_PHARMACY_STOCK',
      'inventory',
      newMed.id,
      `Received ${newMed.availableStock} units of ${newMed.genericName} (${newMed.strength}) - Batch: ${newMed.batchNumber}`
    );

    setIsRestockOpen(false);
    setSuccessBanner(`New medication ${newMed.genericName} added to inventory.`);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const lowStockCount = medications.filter(m => m.availableStock <= m.reorderLevel).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            Pharmacy & Inventory Dispensary
          </h1>
          <p className="text-xs text-slate-500">
            Fulfill prescriptions, verify dispensing quantities, deduct inventory balances, and manage pharmaceutical stocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRestockOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            Receive Stock
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successBanner}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'prescriptions'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Prescription Queue ({prescriptions.filter(p => p.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'inventory'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Medicine Stock Catalogue ({medications.length})
          {lowStockCount > 0 && (
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {lowStockCount} Low
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Prescriptions Queue */}
      {activeTab === 'prescriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Rx List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50/50">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by patient or Rx#..."
                  className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none bg-white"
                />
              </div>

              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto text-xs">
                {prescriptions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No prescriptions found.</div>
                ) : (
                  prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      onClick={() => setSelectedRxId(rx.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedRxId === rx.id ? 'bg-teal-50/70 border-l-4 border-l-teal-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rx.patientName}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                          rx.status === 'dispensed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {rx.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {rx.prescriptionNumber} · {rx.items.length} item{rx.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Prescribed by {rx.prescribedBy} on {rx.prescribedAt}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Active Rx Details & Dispensing Form */}
          <div className="lg:col-span-2">
            {activeRx ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
                {/* Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">{activeRx.prescriptionNumber}</h2>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        activeRx.status === 'dispensed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {activeRx.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Patient: <strong className="text-slate-800">{activeRx.patientName}</strong> · Prescribed by {activeRx.prescribedBy}
                    </div>
                  </div>

                  <button
                    onClick={handlePrintRx}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Prescription Slip (PDF)
                  </button>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Prescribed Medications & Dispensing Quantities</h3>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Medication & Form</th>
                          <th className="py-2.5 px-3">Dosage & Frequency</th>
                          <th className="py-2.5 px-3">Prescribed</th>
                          <th className="py-2.5 px-3">Dispense Qty</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeRx.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{item.medicationName}</div>
                              <div className="text-[10px] text-slate-500">{item.dosageForm} · {item.strength}</div>
                              <div className="text-[10px] text-teal-800 italic mt-0.5">Sig: {item.instructions}</div>
                            </td>

                            <td className="py-3 px-3 text-slate-700">
                              <div>{item.dose} · {item.route}</div>
                              <div className="text-[11px] text-slate-500">{item.frequency} x {item.durationDays}d</div>
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              {item.quantityPrescribed}
                            </td>

                            <td className="py-3 px-3">
                              <input
                                type="number"
                                min="1"
                                max={item.quantityPrescribed * 2}
                                disabled={activeRx.status === 'dispensed'}
                                value={dispenseQuantities[item.id] || item.quantityPrescribed}
                                onChange={(e) => setDispenseQuantities({ ...dispenseQuantities, [item.id]: Number(e.target.value) })}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-center bg-white"
                              />
                            </td>

                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                item.dispensedStatus === 'dispensed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {item.dispensedStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dispensing Action Footer */}
                <div className="p-3 bg-teal-50/40 rounded-lg border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-teal-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      Dispensing Verification & Stock Deduction
                    </div>
                    <div className="text-slate-600 text-[11px] mt-0.5">
                      {activeRx.dispensedAt
                        ? `Dispensed on ${activeRx.dispensedAt} by ${activeRx.dispensedBy}`
                        : 'Confirming dispensing automatically decrements pharmacy inventory balances.'}
                    </div>
                  </div>

                  {currentUser.role === 'pharmacist' || currentUser.role === 'admin' ? (
                    activeRx.status !== 'dispensed' ? (
                      <button
                        onClick={handleConfirmDispensing}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <PackageCheck className="w-4 h-4" />
                        Confirm & Dispense Medication
                      </button>
                    ) : (
                      <div className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Dispensed & Completed
                      </div>
                    )
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      Dispensing restricted to Licensed Pharmacist (PPB)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                Select a prescription from the queue to review and dispense.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Medicine Inventory */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pharmacy Inventory & Stock Levels</h2>
              <p className="text-xs text-slate-500">Track batch numbers, shelf life expiry, unit pricing, and reorder levels.</p>
            </div>
            <button
              onClick={() => setIsRestockOpen(true)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              + Add / Restock Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Medicine Name & Formulation</th>
                  <th className="py-2.5 px-4">Strength</th>
                  <th className="py-2.5 px-4">Available Stock</th>
                  <th className="py-2.5 px-4">Reorder Level</th>
                  <th className="py-2.5 px-4">Unit Price (KES)</th>
                  <th className="py-2.5 px-4">Batch / Expiry</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {medications.map((m) => {
                  const isLow = m.availableStock <= m.reorderLevel;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{m.genericName}</div>
                        <div className="text-[11px] text-slate-500">
                          {m.brandName ? `Brand: ${m.brandName} · ` : ''}{m.dosageForm}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium">{m.strength}</td>

                      <td className="py-3 px-4">
                        <span className={`font-mono font-bold text-sm ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                          {m.availableStock}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500">{m.reorderLevel}</td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {m.unitPriceKes.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        <div>{m.batchNumber || 'BAT-GEN'}</div>
                        <div className="text-slate-400">Exp: {m.expiryDate || '2027'}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            OPTIMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-teal-400" />
                Receive Stock / Add Medicine
              </h2>
              <button onClick={() => setIsRestockOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Generic Name *</label>
                  <input
                    type="text"
                    required
                    value={restockData.genericName}
                    onChange={(e) => setRestockData({ ...restockData, genericName: e.target.value })}
                    placeholder="e.g. Ciprofloxacin"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={restockData.brandName}
                    onChange={(e) => setRestockData({ ...restockData, brandName: e.target.value })}
                    placeholder="e.g. Ciproxin"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dosage Form</label>
                  <select
                    value={restockData.dosageForm}
                    onChange={(e) => setRestockData({ ...restockData, dosageForm: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream / Ointment">Cream / Ointment</option>
                    <option value="Eye Drops">Eye Drops</option>
                    <option value="Inhaler">Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={restockData.strength}
                    onChange={(e) => setRestockData({ ...restockData, strength: e.target.value })}
                    placeholder="e.g. 500 mg"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={restockData.availableStock}
                    onChange={(e) => setRestockData({ ...restockData, availableStock: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Price (KES) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={restockData.unitPriceKes}
                    onChange={(e) => setRestockData({ ...restockData, unitPriceKes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={restockData.reorderLevel}
                    onChange={(e) => setRestockData({ ...restockData, reorderLevel: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={restockData.batchNumber}
                    onChange={(e) => setRestockData({ ...restockData, batchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={restockData.expiryDate}
                    onChange={(e) => setRestockData({ ...restockData, expiryDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Stock to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
