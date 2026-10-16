import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  TestTube,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Search,
  Filter,
  User,
  Clock,
  FileCheck,
  Calendar
} from 'lucide-react';
import { LabOrder, LabOrderItem, Patient } from '../types/emr';
import { StorageService } from '../services/storage';
import { BillingService } from '../services/billingService';
import { PDFService } from '../services/pdfGenerator';
import { useAuth } from '../context/AuthContext';

interface LaboratoryViewProps {
  initialPatientId?: string;
  onSelectPatient: (patientId: string) => void;
}

export const LaboratoryView: React.FC<LaboratoryViewProps> = ({
  initialPatientId,
  onSelectPatient,
}) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Result entry state for active order
  const [editedItems, setEditedItems] = useState<LabOrderItem[]>([]);

  const loadData = () => {
    const o = StorageService.getLabOrders();
    const p = StorageService.getPatients();
    setOrders(o);
    setPatients(p);

    if (!selectedOrderId && o.length > 0) {
      if (initialPatientId) {
        const match = o.find(item => item.patientId === initialPatientId);
        if (match) setSelectedOrderId(match.id);
        else setSelectedOrderId(o[0].id);
      } else {
        setSelectedOrderId(o[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('famart_storage_updated', loadData);
    return () => window.removeEventListener('famart_storage_updated', loadData);
  }, [initialPatientId]);

  const activeOrder = orders.find(o => o.id === selectedOrderId);
  const activePatient = activeOrder ? patients.find(p => p.id === activeOrder.patientId) : undefined;
  const settings = StorageService.getSettings();

  useEffect(() => {
    if (activeOrder) {
      setEditedItems(JSON.parse(JSON.stringify(activeOrder.items)));
    }
  }, [selectedOrderId, orders]);

  // Handle Mark Specimen Collected
  const handleCollectSpecimen = () => {
    if (!activeOrder) return;
    activeOrder.status = 'sample_collected';
    activeOrder.specimenCollectedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    activeOrder.specimenCollectedBy = currentUser.name;
    StorageService.saveLabOrder(activeOrder);

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'COLLECT_LAB_SPECIMEN',
      'lab_order',
      activeOrder.id,
      `Collected specimens for order ${activeOrder.orderNumber} (${activeOrder.patientName})`
    );

    setSuccessMsg(`Specimens collected successfully for ${activeOrder.orderNumber}`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Update Item Result in form
  const handleItemChange = (index: number, field: keyof LabOrderItem, value: any) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditedItems(updated);
  };

  // Save Entered Results
  const handleSaveResults = (isVerified: boolean) => {
    if (!activeOrder) return;
    activeOrder.items = editedItems;
    activeOrder.status = isVerified ? 'verified' : 'results_entered';
    activeOrder.resultsEnteredAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    activeOrder.resultsEnteredBy = currentUser.name;

    if (isVerified) {
      activeOrder.verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      activeOrder.verifiedBy = `${currentUser.name} (MLS / Pathologist)`;
    }

    StorageService.saveLabOrder(activeOrder);

    // AUTOMATIC BILLING: Whenever a laboratory test result is marked as verified by the Lab Technologist,
    // trigger automatic invoice generation in the centralized Billing module!
    let generatedInvoice = null;
    if (isVerified) {
      generatedInvoice = BillingService.triggerLabVerificationBilling(
        activeOrder,
        currentUser.name,
        currentUser.id
      );

      // Real-time Doctor Alert
      StorageService.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: 'Laboratory Result Verified & Published',
        message: `${activeOrder.items.map(i => i.testName).join(', ')} verified for ${activeOrder.patientName} by ${currentUser.name}. Ready for doctor review.`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'lab_verified',
        patientId: activeOrder.patientId,
        patientName: activeOrder.patientName,
        testName: activeOrder.items.map(i => i.testName).join(', '),
        read: false,
        targetRole: 'doctor',
        linkView: 'consultation',
      });
    }

    StorageService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      isVerified ? 'VERIFY_LAB_RESULTS' : 'ENTER_LAB_RESULTS',
      'lab_order',
      activeOrder.id,
      `${isVerified ? 'Verified' : 'Entered'} results for order ${activeOrder.orderNumber}.${isVerified ? ` Automatic invoice ${generatedInvoice?.invoiceNumber || ''} generated/updated.` : ''}`
    );

    setSuccessMsg(
      isVerified
        ? `Order ${activeOrder.orderNumber} results verified & published! Automatic invoice (${generatedInvoice?.invoiceNumber || 'Updated'}) generated in Billing.`
        : `Results saved as draft for order ${activeOrder.orderNumber}`
    );
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handlePrintPDF = () => {
    if (!activeOrder || !activePatient) return;
    PDFService.generateLabReportPDF(activeOrder, activePatient, settings);
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.patientName.toLowerCase().includes(search.toLowerCase()) ||
      o.visitNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'sample_collected': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'results_entered': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'verified': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            Clinical Pathology & Diagnostic Laboratory
          </h1>
          <p className="text-xs text-slate-500">
            Process specimen collection, record quantitative / qualitative test results, verify diagnostics, and issue reports.
          </p>
        </div>

        {activePatient && (
          <button
            onClick={() => onSelectPatient(activePatient.id)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            Open Patient Chart →
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Main Grid: Orders list on left (1 col) | Result Entry & Verification on right (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lab Orders Queue */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 space-y-2 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search order # or patient..."
                  className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-md outline-none bg-white"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                {['all', 'ordered', 'sample_collected', 'results_entered', 'verified'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No laboratory orders matching criteria.
                </div>
              ) : (
                filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`p-3 text-xs cursor-pointer transition-colors ${
                      selectedOrderId === ord.id
                        ? 'bg-purple-50/70 border-l-4 border-l-purple-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ord.patientName}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getStatusBadge(ord.status)}`}>
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {ord.orderNumber} · {ord.items.length} investigation{ord.items.length !== 1 ? 's' : ''}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>Ordered by {ord.orderedBy}</span>
                      <span className="font-mono">{ord.orderedAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Order Details & Results Entry */}
        <div className="lg:col-span-2">
          {activeOrder ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
              {/* Order Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{activeOrder.orderNumber}</h2>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(activeOrder.status)}`}>
                      {activeOrder.status.replace('_', ' ')}
                    </span>
                    {activeOrder.priority === 'stat' && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        STAT (URGENT)
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Patient: <strong className="text-slate-800">{activeOrder.patientName}</strong> · Ref: {activeOrder.visitNumber} · Ordered by {activeOrder.orderedBy}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintPDF}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Lab Report (PDF)
                  </button>
                </div>
              </div>

              {/* Specimen Collection status bar */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-purple-600" />
                  <div>
                    <span className="font-bold text-slate-800">Specimen Status: </span>
                    <span className="text-slate-600">
                      {activeOrder.specimenCollectedAt
                        ? `Collected on ${activeOrder.specimenCollectedAt} by ${activeOrder.specimenCollectedBy}`
                        : 'Specimen Pending Collection'}
                    </span>
                  </div>
                </div>

                {!activeOrder.specimenCollectedAt && (
                  <button
                    onClick={handleCollectSpecimen}
                    className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Confirm Specimen Collected
                  </button>
                )}
              </div>

              {/* Tests Table for Results Entry */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Test Investigations & Measurement Results</h3>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Test & Specimen</th>
                        <th className="py-2.5 px-3">Result Value *</th>
                        <th className="py-2.5 px-3">Reference Interval</th>
                        <th className="py-2.5 px-3">Abnormal?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editedItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{item.testName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.testCode} · {item.specimenType}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.resultValue || ''}
                              onChange={(e) => handleItemChange(index, 'resultValue', e.target.value)}
                              placeholder="Enter quantitative or qualitative result..."
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs outline-none focus:border-purple-600 bg-white"
                            />
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                              placeholder="Technician observation / microscopy notes..."
                              className="w-full px-2 py-1 mt-1 text-[11px] border border-slate-200 rounded outline-none text-slate-600 bg-slate-50"
                            />
                          </td>

                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {item.referenceRange || 'Standard reference'}
                          </td>

                          <td className="py-3 px-3">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.isAbnormal}
                                onChange={(e) => handleItemChange(index, 'isAbnormal', e.target.checked)}
                                className="w-4 h-4 accent-red-600"
                              />
                              <span className={`text-[11px] font-bold ${item.isAbnormal ? 'text-red-600' : 'text-slate-400'}`}>
                                {item.isAbnormal ? 'FLAG ABNORMAL' : 'Normal'}
                              </span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verification & Quality Assurance */}
              <div className="p-3 bg-purple-50/40 rounded-lg border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-purple-700" />
                    Laboratory Quality Sign-off
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {activeOrder.verifiedAt
                      ? `Verified by ${activeOrder.verifiedBy} on ${activeOrder.verifiedAt}`
                      : 'Pending final review and verification by Medical Laboratory Scientist.'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentUser.role === 'lab_technician' || currentUser.role === 'admin' ? (
                    <>
                      <button
                        onClick={() => handleSaveResults(false)}
                        className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer"
                      >
                        Save Draft Results
                      </button>
                      <button
                        onClick={() => handleSaveResults(true)}
                        className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify & Publish Results
                      </button>
                    </>
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      Verification restricted to Medical Laboratory Scientist (KMLTTB)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              Select a laboratory order to view investigations and enter results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
