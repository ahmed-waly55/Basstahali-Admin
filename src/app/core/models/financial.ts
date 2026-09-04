export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: any;
  traceId: string;
}

export interface MetricData {
  currentValue: number;
  previousValue: number;
  growthPercentage: number;
  currency: string;
}

export interface CostMetricData {
  teacherSalaries: MetricData;
  otherExpenses: MetricData;
  totalCosts: MetricData;
}

export interface FinancialTransaction {
  id: string;
  type: string;
  referenceType: string;
  referenceId: string;
  amount: number;
  direction: 'Credit' | 'Debit';
  description: string;
  financialPeriodId: string | null;
  createdAt: string;
}

export interface StudentPayment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  paidAt: string;
  notes: string;
  status: string;
  purchasedCredits: number;
  recordedByName: string;
  accountingAmount: number;
  accountingCurrency: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
