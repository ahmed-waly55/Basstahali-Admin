/** Request contracts supplied by the financial Swagger documentation. */
export interface RecordStudentPayment {
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  paidAt: string;
  notes: string;
  idempotencyKey: string;
  purchasedCredits: number;
  subjectId?: string;
  sessionId?: string;
  purpose: string;
}

export interface CreateCreditBatch {
  credits: number;
  description: string;
  validityDays: number;
}

export interface CreateInstallmentPlan {
  studentId: string;
  scope: 'Term';
  totalAmount: number;
  currency: string;
  downPaymentAmount: number;
  installmentCount: number;
  startDate: string;
  firstDueDate: string;
  paymentMethod: string;
  paymentReference: string;
  idempotencyKey: string;
}

export interface RecordInstallmentPayment {
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  paidAt: string;
  idempotencyKey: string;
  notes: string;
}

// Response schemas were not included in the supplied Swagger extract. Keep optional
// server fields instead of pretending a fixed response shape is documented.
export type FinanceRecord = Record<string, unknown>;

export interface StudentOption {
  id: string;
  fullName: string;
}
