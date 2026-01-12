
export enum ExpenseCategory {
  NON_RECURRING = 'Non-Recurring',
  RECURRING = 'Recurring',
  INELIGIBLE = 'Ineligible',
  INTEREST = 'Interest/Refund',
  GRANT_RECEIPT = 'Grant Receipt'
}

export enum TrancheType {
  TRANCHE_1 = 'Tranche 1',
  TRANCHE_2 = 'Tranche 2',
  TRANCHE_3 = 'Tranche 3',
  NONE = 'None'
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type VerificationStatus = 'Verified' | 'Missing' | 'Doubtful';

export interface AuditObservation {
  id: string;
  type: 'Compliance' | 'Documentation' | 'Financial';
  severity: RiskLevel;
  observation: string;
  recommendation: string;
}

export interface Transaction {
  id: string;
  date: string;
  narration: string;
  amount: number;
  type: 'Debit' | 'Credit';
  category: ExpenseCategory;
  tranche: TrancheType;
  financialYear: string;
  isFlagged: boolean;
  flagReason?: string;
  riskScore: RiskLevel;
  verificationStatus: VerificationStatus;
  voucherNo?: string;
  gstNo?: string;
}

export interface ComplianceCheck {
  label: string;
  status: 'Compliant' | 'Warning' | 'Non-Compliant';
  comment: string;
}

export interface ATLSummary {
  totalSanctioned: number;
  totalUtilized: number;
  nonRecurringUtilized: number;
  recurringUtilized: number;
  balance: number;
  interestEarned: number;
  riskScore: RiskLevel;
  trancheBreakdown: {
    [key in TrancheType]: {
      received: number;
      spent: number;
    }
  };
}
