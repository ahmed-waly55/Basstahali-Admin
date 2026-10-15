import writeExcelFile from 'write-excel-file/node';
import { strFromU8, unzipSync } from 'fflate';
import { buildFinancialWorkbook, financialWorkbookFileName, type FinancialWorkbookData } from './financial-workbook';

const emptyData = (): FinancialWorkbookData => ({
  transactions: [], studentPayments: [], studentProfitability: [], costs: [],
});

async function workbookXml(data: FinancialWorkbookData) {
  const archive = unzipSync(new Uint8Array(await writeExcelFile(buildFinancialWorkbook(data)).toBuffer()));
  const parser = new DOMParser();
  const xml = (path: string) => parser.parseFromString(strFromU8(archive[path]), 'application/xml');
  const strings = Array.from(xml('xl/sharedStrings.xml').getElementsByTagName('si')).map(item => item.textContent);
  const sheet = (index: number) => xml(`xl/worksheets/sheet${index}.xml`);
  const value = (index: number, address: string) => {
    const found = Array.from(sheet(index).getElementsByTagName('c')).find(cell => cell.getAttribute('r') === address);
    const content = found?.getElementsByTagName('v')[0]?.textContent;
    return found?.getAttribute('t') === 's' ? strings[Number(content)] : content;
  };
  return { xml, sheet, value };
}

describe('Financial XLSX report', () => {
  it('writes four valid RTL worksheets with the existing Arabic names and complete headers, even with no rows', async () => {
    const file = await workbookXml(emptyData());
    expect(Array.from(file.xml('xl/workbook.xml').getElementsByTagName('sheet')).map(item => item.getAttribute('name'))).toEqual([
      'الحركات المالية', 'مدفوعات الطلاب', 'ربحية الطلاب', 'المصروفات والتكاليف',
    ]);
    const headers = [
      ['نوع الحركة', 'المبلغ', 'الاتجاه', 'الوصف', 'التاريخ والوقت'],
      ['اسم الطالب', 'المبلغ المدفوع', 'طريقة الدفع', 'الحالة', 'مسجل بواسطة', 'تاريخ الدفع'],
      ['اسم الطالب', 'رقم الهاتف', 'عدد الجلسات', 'إيرادات الطالب', 'إجمالي المدفوع', 'المبلغ غير المحقق', 'متوسط سعر جلسة الطالب', 'متوسط معدل المعلم', 'إجمالي التكلفة', 'صافي الربح', 'هامش الربح (%)'],
      ['بند المصروفات والتكاليف', 'القيمة الحالية', 'القيمة السابقة', 'نسبة التغير / النمو (%)'],
    ];
    headers.forEach((labels, index) => {
      labels.forEach((label, column) => expect(file.value(index + 1, `${String.fromCharCode(65 + column)}1`)).toBe(label));
      expect(file.sheet(index + 1).getElementsByTagName('sheetView')[0].getAttribute('rightToLeft')).toBe('1');
      expect(file.sheet(index + 1).getElementsByTagName('pane')[0].getAttribute('ySplit')).toBe('1');
      expect(file.sheet(index + 1).getElementsByTagName('parsererror')).toHaveLength(0);
      expect(file.sheet(index + 1).getElementsByTagName('row')).toHaveLength(1);
    });
  });

  it('preserves amounts, zeros, negative profits, phone numbers and dates as the correct cell types', async () => {
    const data = emptyData();
    data.transactions = [{ type: 'Payment', amount: 125.5, direction: 'Credit', description: 'إيراد', createdAt: '2026-10-15T15:00:00Z' }];
    data.studentPayments = [{ studentName: 'أحمد', amount: 0, paymentMethod: 'Cash', status: 'Paid', recordedByName: 'المشرف', paidAt: '2026-10-15' }];
    data.studentProfitability = [{ fullName: 'أحمد', phoneNumber: '01001234567', sessionsReceived: 2, studentRevenue: 100, totalPaid: 0, unrealizedPaidAmount: 0, averageStudentSessionPrice: 50, averageTeacherSessionRate: 60, teacherCost: 120, netProfit: -20, profitMarginPercentage: -20 }];
    data.costs = [{ title: 'مرتبات المعلمين', currentValue: 120, previousValue: 100, growthPercentage: 20 }];
    const file = await workbookXml(data);
    expect(file.value(1, 'B2')).toBe('125.5');
    expect(file.value(1, 'C2')).toBe('إيداع');
    expect(file.value(1, 'E2')).toBe('2026-10-15T15:00:00Z');
    expect(file.value(2, 'B2')).toBe('0');
    expect(file.value(3, 'B2')).toBe('01001234567');
    expect(file.value(3, 'J2')).toBe('-20');
    expect(file.value(4, 'B2')).toBe('120');
    const amount = Array.from(file.sheet(1).getElementsByTagName('c')).find(cell => cell.getAttribute('r') === 'B2');
    expect(amount?.getAttribute('t')).not.toBe('s');
  });

  it('writes untrusted formula-like text literally and escapes XML characters', async () => {
    const data = emptyData();
    data.transactions = [{ type: '=HYPERLINK("https://example.com")', description: '<script>& بيانات', amount: '=1+1' }];
    const file = await workbookXml(data);
    expect(file.value(1, 'A2')).toBe('=HYPERLINK("https://example.com")');
    expect(file.value(1, 'B2')).toBe('=1+1');
    expect(file.value(1, 'D2')).toBe('<script>& بيانات');
    expect(file.sheet(1).getElementsByTagName('f')).toHaveLength(0);
    expect(file.xml('xl/sharedStrings.xml').getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('keeps the existing dated XLSX filename', () => {
    expect(financialWorkbookFileName(new Date('2026-10-15T23:59:00Z'))).toBe('Financial_Analytics_Report_2026-10-15.xlsx');
  });
});
