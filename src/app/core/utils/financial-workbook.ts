import type { Cell, SheetData } from 'write-excel-file/browser';

type FinancialRow = Record<string, unknown>;

export interface FinancialWorkbookData {
  transactions: readonly FinancialRow[];
  studentPayments: readonly FinancialRow[];
  studentProfitability: readonly FinancialRow[];
  costs: readonly FinancialRow[];
}

interface FinancialSheet {
  sheet: string;
  data: SheetData;
  rightToLeft: boolean;
  stickyRowsCount: number;
}

interface ReportColumn {
  label: string;
  value: (item: FinancialRow) => unknown;
  numeric?: boolean;
}

function cell(value: unknown, numeric = false): Cell {
  if (value === null || value === undefined) return null;
  if (numeric && typeof value === 'number' && Number.isFinite(value)) {
    return { type: Number, value };
  }
  // Untrusted names, descriptions and dates must stay text, including values starting with '='.
  return { type: String, value: String(value) };
}

function sheet(name: string, rows: readonly FinancialRow[], columns: ReportColumn[]): FinancialSheet {
  return {
    sheet: name,
    rightToLeft: true,
    stickyRowsCount: 1,
    data: [
      columns.map(column => ({ type: String, value: column.label, fontWeight: 'bold' })),
      ...rows.map(item => columns.map(column => cell(column.value(item), column.numeric))),
    ],
  };
}

/** Keep the report's four sheets and column order independent of the XLSX writer. */
export function buildFinancialWorkbook(data: FinancialWorkbookData): FinancialSheet[] {
  return [
    sheet('الحركات المالية', data.transactions, [
      { label: 'نوع الحركة', value: item => item['type'] },
      { label: 'المبلغ', value: item => item['amount'], numeric: true },
      { label: 'الاتجاه', value: item => item['direction'] === 'Credit' ? 'إيداع' : 'سحب' },
      { label: 'الوصف', value: item => item['description'] },
      { label: 'التاريخ والوقت', value: item => item['createdAt'] },
    ]),
    sheet('مدفوعات الطلاب', data.studentPayments, [
      { label: 'اسم الطالب', value: item => item['studentName'] },
      { label: 'المبلغ المدفوع', value: item => item['amount'], numeric: true },
      { label: 'طريقة الدفع', value: item => item['paymentMethod'] },
      { label: 'الحالة', value: item => item['status'] },
      { label: 'مسجل بواسطة', value: item => item['recordedByName'] },
      { label: 'تاريخ الدفع', value: item => item['paidAt'] },
    ]),
    sheet('ربحية الطلاب', data.studentProfitability, [
      { label: 'اسم الطالب', value: item => item['fullName'] || 'غير متوفر' },
      { label: 'رقم الهاتف', value: item => item['phoneNumber'] || 'غير متوفر' },
      { label: 'عدد الجلسات', value: item => item['sessionsReceived'], numeric: true },
      { label: 'إيرادات الطالب', value: item => item['studentRevenue'], numeric: true },
      { label: 'إجمالي المدفوع', value: item => item['totalPaid'], numeric: true },
      { label: 'المبلغ غير المحقق', value: item => item['unrealizedPaidAmount'], numeric: true },
      { label: 'متوسط سعر جلسة الطالب', value: item => item['averageStudentSessionPrice'], numeric: true },
      { label: 'متوسط معدل المعلم', value: item => item['averageTeacherSessionRate'], numeric: true },
      { label: 'إجمالي التكلفة', value: item => item['teacherCost'], numeric: true },
      { label: 'صافي الربح', value: item => item['netProfit'], numeric: true },
      { label: 'هامش الربح (%)', value: item => item['profitMarginPercentage'], numeric: true },
    ]),
    sheet('المصروفات والتكاليف', data.costs, [
      { label: 'بند المصروفات والتكاليف', value: item => item['title'] },
      { label: 'القيمة الحالية', value: item => item['currentValue'], numeric: true },
      { label: 'القيمة السابقة', value: item => item['previousValue'], numeric: true },
      { label: 'نسبة التغير / النمو (%)', value: item => item['growthPercentage'], numeric: true },
    ]),
  ];
}

export function financialWorkbookFileName(date = new Date()): string {
  return `Financial_Analytics_Report_${date.toISOString().slice(0, 10)}.xlsx`;
}
