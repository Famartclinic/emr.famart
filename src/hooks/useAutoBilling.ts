import { useState, useCallback } from 'react';
import { LabOrder, Prescription, PrescriptionItem, Invoice } from '../types/emr';
import { BillingService } from '../services/billingService';
import { useAuth } from '../context/AuthContext';

export function useAutoBilling() {
  const { currentUser } = useAuth();
  const [lastBilledInvoice, setLastBilledInvoice] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const billVerifiedLab = useCallback((labOrder: LabOrder) => {
    setIsProcessing(true);
    try {
      const inv = BillingService.triggerLabVerificationBilling(
        labOrder,
        currentUser.name,
        currentUser.id
      );
      setLastBilledInvoice(inv);
      return inv;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser]);

  const billDispensedPrescription = useCallback((
    prescription: Prescription,
    dispensedItems: Array<{ item: PrescriptionItem; quantityDispensed: number }>
  ) => {
    setIsProcessing(true);
    try {
      const inv = BillingService.triggerPharmacyDispensedBilling(
        prescription,
        dispensedItems,
        currentUser.name,
        currentUser.id
      );
      setLastBilledInvoice(inv);
      return inv;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser]);

  const getPatientUnpaidCharges = useCallback((patientId: string) => {
    return BillingService.capturePatientUnpaidBills(patientId);
  }, []);

  return {
    billVerifiedLab,
    billDispensedPrescription,
    getPatientUnpaidCharges,
    lastBilledInvoice,
    isProcessing,
  };
}
