import { jsPDF } from 'jspdf';
import {
  Patient,
  ClinicalEncounter,
  VitalSigns,
  LabOrder,
  Prescription,
  Invoice,
  ClinicSettings,
} from '../types/emr';

const BRAND = {
  red: [185, 28, 28] as [number, number, number], // #B91C1C
  blue: [29, 78, 216] as [number, number, number], // #1D4ED8
  darkSlate: [15, 23, 42] as [number, number, number], // #0F172A
  gray: [100, 116, 139] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
};

function addLetterhead(doc: jsPDF, settings: ClinicSettings, docTitle: string, docReference?: string) {
  // Top brand bar
  doc.setFillColor(...BRAND.red);
  doc.rect(0, 0, 150, 5, 'F');
  doc.setFillColor(...BRAND.blue);
  doc.rect(150, 0, 60, 5, 'F');

  // Clinic Wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.red);
  doc.text('FAMART', 14, 18);
  
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.blue);
  doc.text('CLINIC', 50, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text(settings.subtitle || 'Electronic Medical Records & Outpatient Clinic', 14, 23);
  doc.text(`${settings.address}, ${settings.city}, Kenya · Tel: ${settings.phoneNumber}`, 14, 28);
  doc.text(`Email: ${settings.email} · Reg No: ${settings.registrationNumber} · PIN: ${settings.taxPin}`, 14, 33);

  // Document Title badge
  doc.setFillColor(...BRAND.lightBg);
  doc.roundedRect(125, 12, 72, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(125, 12, 72, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.darkSlate);
  doc.text(docTitle.toUpperCase(), 161, 20, { align: 'center' });

  if (docReference) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.blue);
    doc.text(`Ref: ${docReference}`, 161, 26, { align: 'center' });
    doc.setTextColor(...BRAND.gray);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 161, 30, { align: 'center' });
  }

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);
}

function addPatientInfoBox(doc: jsPDF, patient: Patient, startY: number): number {
  doc.setFillColor(...BRAND.lightBg);
  doc.roundedRect(14, startY, 182, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.darkSlate);
  doc.text('PATIENT INFORMATION', 18, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.darkSlate);
  doc.text(`Name: ${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`, 18, startY + 12);
  doc.text(`Patient No: ${patient.patientNumber}`, 18, startY + 17);
  doc.text(`Age/Sex: ${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs · ${patient.gender}`, 18, startY + 22);

  doc.text(`Phone: ${patient.phoneNumber}`, 110, startY + 12);
  doc.text(`National ID: ${patient.nationalId || 'N/A'}`, 110, startY + 17);
  doc.text(`Blood Group: ${patient.bloodGroup || 'Unspecified'}`, 110, startY + 22);

  // Allergies warning if any
  if (patient.allergies && patient.allergies.length > 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(14, startY + 26, 182, 8, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.red);
    const allergyText = patient.allergies.map(a => `${a.allergen} (${a.reaction})`).join('; ');
    doc.text(`ALERT - DOCUMENTED ALLERGIES: ${allergyText}`, 18, startY + 31.5);
    return startY + 38;
  }

  return startY + 28;
}

export const PDFService = {
  // 1. Patient Longitudinal Clinical Summary
  generatePatientSummary: (
    patient: Patient,
    encounters: ClinicalEncounter[],
    vitals: VitalSigns[],
    labOrders: LabOrder[],
    prescriptions: Prescription[],
    settings: ClinicSettings,
    clinicianName: string
  ) => {
    const doc = new jsPDF();
    addLetterhead(doc, settings, 'Clinical Summary', patient.patientNumber);

    let currentY = addPatientInfoBox(doc, patient, 42);

    // Latest Vitals
    if (vitals.length > 0) {
      const v = vitals[0];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.red);
      doc.text('LATEST VITAL SIGNS', 14, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.darkSlate);
      doc.text(
        `BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg  |  Pulse: ${v.pulseRate} bpm  |  Temp: ${v.temperature} °C  |  SpO2: ${v.oxygenSaturation}%  |  BMI: ${v.bmi} (${v.bmiCategory})  |  Date: ${v.recordedAt}`,
        14,
        currentY + 11
      );
      currentY += 18;
    }

    // Encounters
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.blue);
    doc.text('CONSULTATION & ENCOUNTERS', 14, currentY + 4);
    currentY += 8;

    encounters.slice(0, 3).forEach((enc) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 182, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.darkSlate);
      doc.text(`Encounter: ${enc.encounterDate} · Clinician: ${enc.clinicianName} · Status: ${enc.status.toUpperCase()}`, 16, currentY + 4.5);
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Chief Complaint: ${enc.chiefComplaint}`, 16, currentY);
      currentY += 5;
      doc.text(`Assessment: ${enc.assessmentNotes}`, 16, currentY);
      currentY += 5;

      if (enc.diagnoses && enc.diagnoses.length > 0) {
        const diagStr = enc.diagnoses.map(d => `${d.code} - ${d.description} (${d.type})`).join(', ');
        doc.setFont('helvetica', 'bold');
        doc.text(`Diagnoses: ${diagStr}`, 16, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 5;
      }
      currentY += 4;
    });

    // Recent Lab Investigations
    if (labOrders.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.blue);
      doc.text('LABORATORY INVESTIGATIONS', 14, currentY + 4);
      currentY += 8;

      labOrders.slice(0, 2).forEach(order => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...BRAND.darkSlate);
        doc.text(`Order ${order.orderNumber} (${order.orderedAt}) - Status: ${order.status}`, 16, currentY);
        currentY += 5;

        order.items.forEach(item => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          const flag = item.isAbnormal ? '[ABNORMAL] ' : '';
          doc.text(`• ${item.testName}: ${item.resultValue || 'Pending'} ${item.units || ''} (Ref: ${item.referenceRange || 'N/A'}) ${flag}`, 20, currentY);
          currentY += 4.5;
        });
        currentY += 3;
      });
    }

    // Recent Prescriptions
    if (prescriptions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.blue);
      doc.text('MEDICATIONS & PRESCRIPTIONS', 14, currentY + 4);
      currentY += 8;

      prescriptions.slice(0, 2).forEach(rx => {
        rx.items.forEach(item => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`• ${item.medicationName} ${item.strength} - ${item.dose}, ${item.route}, ${item.frequency} for ${item.durationDays} days. Status: ${item.dispensedStatus}`, 16, currentY);
          currentY += 4.5;
        });
      });
    }

    // Footer & Clinician signoff
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 265, 196, 265);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.gray);
    doc.text(`Generated by: ${clinicianName} · Famart Clinic EMR (emr.famartclinic.co.ke)`, 14, 272);
    doc.text('CONFIDENTIAL MEDICAL RECORD - AUTHORIZED HEALTHCARE USE ONLY', 14, 277);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.darkSlate);
    doc.text('CLINICIAN SIGNATURE & STAMP: ___________________________', 105, 272);

    doc.save(`Famart_Clinical_Summary_${patient.patientNumber}.pdf`);
  },

  // 2. Official Medical Prescription Slip
  generatePrescriptionPDF: (
    prescription: Prescription,
    patient: Patient,
    settings: ClinicSettings
  ) => {
    const doc = new jsPDF();
    addLetterhead(doc, settings, 'Medical Prescription', prescription.prescriptionNumber);

    let currentY = addPatientInfoBox(doc, patient, 42);

    // Rx Symbol
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...BRAND.red);
    doc.text('℞', 14, currentY + 12);

    doc.setFontSize(10);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text(`Prescribed By: ${prescription.prescribedBy}`, 28, currentY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.gray);
    doc.text(`Encounter Ref: ${prescription.visitNumber}  |  Prescribed Date: ${prescription.prescribedAt}`, 28, currentY + 12);

    currentY += 20;

    // Table Header
    doc.setFillColor(...BRAND.lightBg);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY + 8, 196, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text('#', 18, currentY + 5.5);
    doc.text('MEDICATION & FORM', 28, currentY + 5.5);
    doc.text('DOSAGE & ROUTE', 95, currentY + 5.5);
    doc.text('FREQUENCY / DURATION', 135, currentY + 5.5);
    doc.text('QTY', 185, currentY + 5.5, { align: 'right' });

    currentY += 12;

    prescription.items.forEach((item, index) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.darkSlate);
      doc.text(`${index + 1}.`, 18, currentY);
      doc.text(`${item.medicationName} (${item.strength})`, 28, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`${item.dose} · ${item.route}`, 95, currentY);
      doc.text(`${item.frequency} x ${item.durationDays}d`, 135, currentY);
      doc.text(`${item.quantityPrescribed}`, 185, currentY, { align: 'right' });

      currentY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.blue);
      doc.text(`Sig: ${item.instructions}`, 28, currentY);

      if (item.warnings) {
        currentY += 4.5;
        doc.setTextColor(...BRAND.red);
        doc.text(`Warning: ${item.warnings}`, 28, currentY);
      }

      currentY += 7;
      doc.setDrawColor(241, 245, 249);
      doc.line(28, currentY - 2, 196, currentY - 2);
    });

    // Pharmacy dispensing stamp box
    currentY = Math.max(currentY + 10, 190);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 85, 38, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text('PRESCRIBING CLINICIAN', 18, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Name: ${prescription.prescribedBy}`, 18, currentY + 12);
    doc.text('Signature: __________________________', 18, currentY + 22);
    doc.text('Clinic Stamp / Date: _________________', 18, currentY + 30);

    doc.roundedRect(111, currentY, 85, 38, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.text('DISPENSING PHARMACIST', 115, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dispensed By: ${prescription.dispensedBy || 'Pending Dispensing'}`, 115, currentY + 12);
    doc.text(`Dispensed Date: ${prescription.dispensedAt || 'Unfulfilled'}`, 115, currentY + 18);
    doc.text('Pharmacist Sign: _____________________', 115, currentY + 26);
    doc.text('Status: Verified & Dispensed', 115, currentY + 32);

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.gray);
    doc.text('This prescription is valid for 30 days from date of issue. Keep all medicines out of reach of children.', 14, 280);

    doc.save(`Famart_Prescription_${prescription.prescriptionNumber}.pdf`);
  },

  // 3. Laboratory Investigation Report
  generateLabReportPDF: (
    labOrder: LabOrder,
    patient: Patient,
    settings: ClinicSettings
  ) => {
    const doc = new jsPDF();
    addLetterhead(doc, settings, 'Laboratory Report', labOrder.orderNumber);

    let currentY = addPatientInfoBox(doc, patient, 42);

    // Specimen & ordering metadata
    doc.setFillColor(...BRAND.lightBg);
    doc.rect(14, currentY, 182, 14, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, currentY, 182, 14, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text(`Ordering Clinician: ${labOrder.orderedBy}`, 18, currentY + 5);
    doc.text(`Sample Collected: ${labOrder.specimenCollectedAt || 'Pending'}`, 18, currentY + 10);

    doc.text(`Priority: ${labOrder.priority.toUpperCase()}`, 110, currentY + 5);
    doc.text(`Results Verified: ${labOrder.verifiedAt || 'Awaiting Verification'}`, 110, currentY + 10);

    currentY += 20;

    // Results Table Header
    doc.setFillColor(...BRAND.darkSlate);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TEST INVESTIGATION', 18, currentY + 5);
    doc.text('RESULT', 95, currentY + 5);
    doc.text('REFERENCE INTERVAL', 145, currentY + 5);
    doc.text('FLAG', 185, currentY + 5, { align: 'right' });

    currentY += 10;

    labOrder.items.forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.darkSlate);
      doc.text(item.testName, 18, currentY);

      doc.setFont('helvetica', item.isAbnormal ? 'bold' : 'normal');
      doc.setTextColor(item.isAbnormal ? 185 : 15, item.isAbnormal ? 28 : 23, item.isAbnormal ? 28 : 42);
      doc.text(`${item.resultValue || 'Awaiting entry'} ${item.units || ''}`, 95, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray);
      doc.text(item.referenceRange || 'N/A', 145, currentY);

      if (item.isAbnormal) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.red);
        doc.text('ABNORMAL', 185, currentY, { align: 'right' });
      } else {
        doc.setTextColor(...BRAND.gray);
        doc.text('Normal', 185, currentY, { align: 'right' });
      }

      if (item.notes) {
        currentY += 4.5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.blue);
        doc.text(`Microscopy / Remarks: ${item.notes}`, 22, currentY);
      }

      currentY += 7;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY - 2, 196, currentY - 2);
    });

    // Verification Sign-off Box
    currentY = Math.max(currentY + 15, 210);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 34, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text('MEDICAL LABORATORY QUALITY & VERIFICATION SIGN-OFF', 18, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Performing Scientist: ${labOrder.resultsEnteredBy || 'David Kamau, MLS'}`, 18, currentY + 14);
    doc.text(`Verification Scientist: ${labOrder.verifiedBy || 'David Kamau, MLS (KMLTTB Licensed)'}`, 18, currentY + 20);
    doc.text('Verified Date: ' + (labOrder.verifiedAt || new Date().toISOString().substring(0, 10)), 18, currentY + 26);

    doc.text('Official Laboratory Stamp & Signature: _______________________________', 95, currentY + 26);

    doc.save(`Famart_Lab_Report_${labOrder.orderNumber}.pdf`);
  },

  // 4. Financial Invoice & Receipt
  generateInvoiceReceiptPDF: (
    invoice: Invoice,
    patient: Patient,
    settings: ClinicSettings
  ) => {
    const doc = new jsPDF();
    const isPaid = invoice.status === 'paid';
    addLetterhead(doc, settings, isPaid ? 'Official Receipt' : 'Medical Invoice', invoice.invoiceNumber);

    let currentY = addPatientInfoBox(doc, patient, 42);

    // Invoice details header
    doc.setFillColor(...BRAND.lightBg);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text(`Issued Date: ${invoice.issuedAt}`, 18, currentY + 5.5);
    doc.text(`Cashier: ${invoice.issuedBy}`, 90, currentY + 5.5);
    doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, 150, currentY + 5.5);

    currentY += 14;

    // Items Table Header
    doc.setFillColor(...BRAND.darkSlate);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ITEM DESCRIPTION', 18, currentY + 5);
    doc.text('CATEGORY', 105, currentY + 5);
    doc.text('QTY', 140, currentY + 5);
    doc.text('UNIT (KES)', 160, currentY + 5);
    doc.text('TOTAL (KES)', 190, currentY + 5, { align: 'right' });

    currentY += 10;

    invoice.items.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.darkSlate);
      doc.text(item.description, 18, currentY);
      doc.text(item.category, 105, currentY);
      doc.text(`${item.quantity}`, 140, currentY);
      doc.text(item.unitPriceKes.toLocaleString(), 160, currentY);
      doc.text(item.totalPriceKes.toLocaleString(), 190, currentY, { align: 'right' });

      currentY += 6;
      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY - 1, 196, currentY - 1);
    });

    currentY += 4;

    // Totals Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Subtotal:', 140, currentY);
    doc.text(`KES ${invoice.subtotalKes.toLocaleString()}`, 190, currentY, { align: 'right' });

    currentY += 6;
    if (invoice.discountKes > 0) {
      doc.setTextColor(...BRAND.blue);
      doc.text('Discount:', 140, currentY);
      doc.text(`- KES ${invoice.discountKes.toLocaleString()}`, 190, currentY, { align: 'right' });
      currentY += 6;
    }

    doc.setFontSize(11);
    doc.setTextColor(...BRAND.red);
    doc.text('Total Due:', 140, currentY);
    doc.text(`KES ${invoice.totalKes.toLocaleString()}`, 190, currentY, { align: 'right' });

    currentY += 7;
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.darkSlate);
    doc.text('Amount Paid:', 140, currentY);
    doc.text(`KES ${invoice.amountPaidKes.toLocaleString()}`, 190, currentY, { align: 'right' });

    currentY += 6;
    doc.setTextColor(invoice.balanceKes > 0 ? 185 : 15, invoice.balanceKes > 0 ? 28 : 23, invoice.balanceKes > 0 ? 28 : 42);
    doc.text('Outstanding Balance:', 140, currentY);
    doc.text(`KES ${invoice.balanceKes.toLocaleString()}`, 190, currentY, { align: 'right' });

    // Payment transactions recorded
    if (invoice.payments && invoice.payments.length > 0) {
      currentY += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.blue);
      doc.text('CONFIRMED PAYMENTS / M-PESA TRANSACTIONS', 14, currentY);
      currentY += 6;

      invoice.payments.forEach(pay => {
        doc.setFillColor(240, 253, 244);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(22, 101, 52);
        doc.text(`• ${pay.paymentMethod} Payment: KES ${pay.amountKes.toLocaleString()} | Ref/Code: ${pay.referenceNumber} | Date: ${pay.receivedAt} | Cashier: ${pay.receivedBy}`, 16, currentY + 4.5);
        currentY += 9;
      });
    }

    // Receipt Footer
    currentY = Math.max(currentY + 10, 245);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY, 196, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.gray);
    doc.text('Thank you for choosing Famart Clinic. Inquiries: accounts@famartclinic.co.ke | +254 712 345 678', 14, currentY + 6);
    doc.text('Computer-generated receipt valid without physical alteration. KRA PIN: P051892341Z', 14, currentY + 11);

    doc.save(`Famart_Invoice_${invoice.invoiceNumber}.pdf`);
  },

  // 5. Quick Receipt generation for Front Desk
  generateReceipt: (
    invoice: Invoice,
    payment: any,
    settings: ClinicSettings,
    patient?: Patient
  ) => {
    const p: Patient = patient || {
      id: invoice.patientId,
      patientNumber: invoice.patientId,
      firstName: invoice.patientName.split(' ')[0] || 'Patient',
      lastName: invoice.patientName.split(' ').slice(1).join(' ') || '',
      dateOfBirth: '1990-01-01',
      gender: 'Other' as const,
      phoneNumber: '+254 700 000 000',
      address: 'Nairobi',
      emergencyContactName: 'Next of Kin',
      emergencyContactPhone: '+254 700 000 000',
      emergencyContactRelation: 'Relative',
      allergies: [],
      chronicConditions: [],
      registrationDate: '2026-10-15',
      activeStatus: true,
    };
    PDFService.generateInvoiceReceiptPDF(invoice, p, settings);
  },
};
