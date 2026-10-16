import { LabOrder, Prescription, PrescriptionItem, InvoiceItem, Invoice } from '../types/emr';
import { StorageService } from './storage';

export const BillingService = {
  /**
   * Automatic invoice generation/itemization whenever a lab order is marked verified by the Lab Technologist.
   */
  triggerLabVerificationBilling: (
    labOrder: LabOrder,
    verifiedBy: string,
    userId?: string
  ): Invoice => {
    let targetInvoice: Invoice | null = null;
    const patient = StorageService.getPatientById(labOrder.patientId);
    const patientName = labOrder.patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Outpatient');

    for (let idx = 0; idx < labOrder.items.length; idx++) {
      const item = labOrder.items[idx];
      const invoiceItem: InvoiceItem = {
        id: `ii-lab-ver-${labOrder.id}-${item.id || idx}-${Date.now()}`,
        serviceCode: item.testCode || `LAB-${item.testId}`,
        description: `Laboratory: ${item.testName} (${item.specimenType || 'Specimen'})`,
        category: 'Laboratory',
        unitPriceKes: item.priceKes || 500,
        quantity: 1,
        totalPriceKes: item.priceKes || 500,
      };

      targetInvoice = StorageService.addOrAppendInvoiceItem(
        labOrder.patientId,
        patientName,
        labOrder.visitNumber,
        invoiceItem,
        verifiedBy || 'Laboratory MLS'
      );
    }

    const invoiceId = targetInvoice ? (targetInvoice as Invoice).id : labOrder.id;

    // Capture in system audit trail
    StorageService.logAction(
      userId || 'usr-lab',
      verifiedBy || 'Medical Laboratory Scientist',
      'lab_technician',
      'AUTO_BILL_LAB_VERIFIED',
      'invoice',
      invoiceId,
      `Automatic invoice generation triggered for verified Lab Order ${labOrder.orderNumber} (${labOrder.items.length} investigation items)`
    );

    return targetInvoice!;
  },

  /**
   * Automatic invoice generation/itemization whenever a prescription is marked dispensed by the Pharmacist.
   */
  triggerPharmacyDispensedBilling: (
    prescription: Prescription,
    dispensedItems: Array<{ item: PrescriptionItem; quantityDispensed: number }>,
    dispensedBy: string,
    userId?: string
  ): Invoice => {
    let targetInvoice: Invoice | null = null;
    const medications = StorageService.getMedications();
    const patient = StorageService.getPatientById(prescription.patientId);
    const patientName = prescription.patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Outpatient');

    for (let idx = 0; idx < dispensedItems.length; idx++) {
      const { item, quantityDispensed } = dispensedItems[idx];
      const medCatalogItem = medications.find(m => m.id === item.medicationId);
      const unitPrice = medCatalogItem?.unitPriceKes || 50;
      const qty = quantityDispensed > 0 ? quantityDispensed : item.quantityPrescribed;
      const totalPrice = unitPrice * qty;

      const invoiceItem: InvoiceItem = {
        id: `ii-pharm-disp-${prescription.id}-${item.id}-${Date.now()}`,
        serviceCode: `MED-${item.medicationId}`,
        description: `Pharmacy: ${item.medicationName} ${item.strength} (${item.dose}, Qty: ${qty})`,
        category: 'Pharmacy',
        unitPriceKes: unitPrice,
        quantity: qty,
        totalPriceKes: totalPrice,
      };

      targetInvoice = StorageService.addOrAppendInvoiceItem(
        prescription.patientId,
        patientName,
        prescription.visitNumber,
        invoiceItem,
        dispensedBy || 'Superintendent Pharmacist'
      );
    }

    const invoiceId = targetInvoice ? (targetInvoice as Invoice).id : prescription.id;

    // Capture in system audit trail
    StorageService.logAction(
      userId || 'usr-pharm',
      dispensedBy || 'Superintendent Pharmacist',
      'pharmacist',
      'AUTO_BILL_PHARMACY_DISPENSED',
      'invoice',
      invoiceId,
      `Automatic invoice generation triggered for dispensed Prescription ${prescription.prescriptionNumber} (${dispensedItems.length} medications)`
    );

    return targetInvoice!;
  },

  /**
   * Captures ALL unbilled and pending unpaid charges for a patient across all clinic modules:
   * 1. Consultation fees (from encounters or queue entries)
   * 2. Laboratory investigations
   * 3. Pharmacy prescriptions (prescribed/dispensed)
   * 4. Nursing procedures (dressings, injections, etc.)
   * 5. Existing unpaid invoice line items
   */
  capturePatientUnpaidBills: (patientId: string): InvoiceItem[] => {
    const unbilledItems: InvoiceItem[] = [];
    const existingInvoices = StorageService.getInvoicesByPatientId(patientId);
    const unpaidInvoices = existingInvoices.filter(i => i.status !== 'paid');

    // Gather existing billed items to prevent duplication
    const billedSignatures = new Set<string>();
    existingInvoices.forEach(inv => {
      inv.items.forEach(it => {
        billedSignatures.add(`${it.category}:${it.description.toLowerCase().trim()}`);
        billedSignatures.add(`${it.category}:${it.serviceCode.toLowerCase().trim()}`);
      });
    });

    // 1. Check Consultation Encounters
    const encounters = StorageService.getEncountersByPatientId(patientId);
    const queue = StorageService.getQueue();
    const patientQueue = queue.find(q => q.patientId === patientId);

    const hasConsultationBilled = Array.from(billedSignatures).some(sig => sig.startsWith('consultation:'));
    if (!hasConsultationBilled && (encounters.length > 0 || patientQueue)) {
      unbilledItems.push({
        id: `ii-unpaid-cons-${Date.now()}`,
        serviceCode: 'SRV-CONS-GEN',
        description: 'General Outpatient Consultation & Physician Review',
        category: 'Consultation',
        unitPriceKes: 1500,
        quantity: 1,
        totalPriceKes: 1500,
      });
      billedSignatures.add('consultation:general outpatient consultation & physician review');
      billedSignatures.add('consultation:srv-cons-gen');
    }

    // 2. Check Nursing Procedures
    const procedures = StorageService.getProceduresByPatientId(patientId);
    procedures.forEach(proc => {
      const sigName = `procedure:${proc.procedureName.toLowerCase().trim()}`;
      const sigCode = `procedure:${proc.serviceCode.toLowerCase().trim()}`;
      if (!billedSignatures.has(sigName) && !billedSignatures.has(sigCode)) {
        unbilledItems.push({
          id: `ii-unpaid-proc-${proc.id}-${Date.now()}`,
          serviceCode: proc.serviceCode,
          description: `Nursing: ${proc.procedureName} (${proc.category})`,
          category: 'Procedure',
          unitPriceKes: proc.chargeKes,
          quantity: 1,
          totalPriceKes: proc.chargeKes,
        });
        billedSignatures.add(sigName);
        billedSignatures.add(sigCode);
      }
    });

    // 3. Check Laboratory Orders
    const labOrders = StorageService.getLabOrdersByPatientId(patientId);
    labOrders.forEach(ord => {
      ord.items.forEach(item => {
        const sigName = `laboratory:${item.testName.toLowerCase().trim()}`;
        const sigCode = `laboratory:${item.testCode.toLowerCase().trim()}`;
        if (!billedSignatures.has(sigName) && !billedSignatures.has(sigCode)) {
          unbilledItems.push({
            id: `ii-unpaid-lab-${item.id}-${Date.now()}`,
            serviceCode: item.testCode,
            description: `Laboratory: ${item.testName}`,
            category: 'Laboratory',
            unitPriceKes: item.priceKes,
            quantity: 1,
            totalPriceKes: item.priceKes,
          });
          billedSignatures.add(sigName);
          billedSignatures.add(sigCode);
        }
      });
    });

    // 4. Check Prescriptions
    const prescriptions = StorageService.getPrescriptionsByPatientId(patientId);
    const medications = StorageService.getMedications();
    prescriptions.forEach(rx => {
      rx.items.forEach(item => {
        const sig = `pharmacy:${item.medicationName.toLowerCase().trim()}`;
        if (!billedSignatures.has(sig)) {
          const med = medications.find(m => m.id === item.medicationId);
          const unitPrice = med?.unitPriceKes || 50;
          const qty = item.quantityDispensed || item.quantityPrescribed || 1;
          unbilledItems.push({
            id: `ii-unpaid-rx-${item.id}-${Date.now()}`,
            serviceCode: `RX-${item.medicationId}`,
            description: `Pharmacy: ${item.medicationName} (${item.strength}) x ${qty}`,
            category: 'Pharmacy',
            unitPriceKes: unitPrice,
            quantity: qty,
            totalPriceKes: unitPrice * qty,
          });
          billedSignatures.add(sig);
        }
      });
    });

    // 5. If there are existing unpaid invoices for this patient, include their items if not already collected
    unpaidInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const itemSig = `${item.category}:${item.description.toLowerCase().trim()}`;
        const alreadyInList = unbilledItems.some(
          it => it.category === item.category && it.description.toLowerCase().trim() === item.description.toLowerCase().trim()
        );
        if (!alreadyInList) {
          unbilledItems.push({ ...item });
        }
      });
    });

    return unbilledItems;
  },
};
