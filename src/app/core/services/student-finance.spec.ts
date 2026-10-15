import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { financeData, financeList, FinanceOperationKey, StudentFinanceService } from './student-finance';

describe('StudentFinanceService admin contracts', () => {
  let service: StudentFinanceService;
  let http: HttpTestingController;
  const base = `${environment.baseUrl}/api/v1`;
  const studentId = '11d61a69-92dc-40c5-9d37-fbf23ec3691e';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentFinanceService);
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'test-admin-token');
  });
  afterEach(() => { http.verify(); localStorage.removeItem('token'); });

  it('loads global or per-student payments using the documented admin paths', () => {
    service.getPayments().subscribe(value => expect(value).toEqual([{ id: 'payment' }]));
    const all = http.expectOne(`${base}/student-payments`);
    expect(all.request.headers.get('Authorization')).toBe('Bearer test-admin-token');
    expect(all.request.method).toBe('GET');
    all.flush({ success: true, data: { items: [{ id: 'payment' }] } });
    service.getPayments(studentId).subscribe(value => expect(value).toEqual([]));
    http.expectOne(`${base}/students/${studentId}/payments`).flush({ data: [] });
  });

  it('posts the exact student payment contract without inventing optional references', () => {
    const body = { amount: 200, currency: 'EGP', paymentMethod: 'Cash', paymentReference: 'receipt',
      paidAt: '2026-10-15T12:00:00.000Z', notes: '', idempotencyKey: 'operation-key', purchasedCredits: 3, purpose: 'actual-server-value' };
    service.recordPayment(studentId, body).subscribe();
    const request = http.expectOne(`${base}/students/${studentId}/payments`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.body).not.toHaveProperty('subjectId');
    expect(request.request.body).not.toHaveProperty('sessionId');
    request.flush({ success: true, data: {} });
  });

  it('uses the documented credit-batch GET and POST contracts', () => {
    service.getCreditBatches(studentId).subscribe();
    const get = http.expectOne(`${base}/students/${studentId}/credit-batches`);
    expect(get.request.method).toBe('GET'); get.flush([]);
    const body = { credits: 5, description: 'رصيد إضافي', validityDays: 30 };
    service.createCreditBatch(studentId, body).subscribe();
    const post = http.expectOne(`${base}/students/${studentId}/credit-batches`);
    expect(post.request.method).toBe('POST'); expect(post.request.body).toEqual(body); post.flush({ success: true });
  });

  it('preserves date-only installment dates and posts installment payments separately', () => {
    const body = { studentId, scope: 'Term' as const, totalAmount: 1200, currency: 'EGP', downPaymentAmount: 200,
      installmentCount: 4, startDate: '2026-10-15', firstDueDate: '2026-10-30', paymentMethod: 'Cash',
      paymentReference: '', idempotencyKey: 'new-plan' };
    service.createInstallmentPlan(body).subscribe();
    const post = http.expectOne(`${base}/installment-plans`);
    expect(post.request.body).toEqual(body); post.flush({ success: true });
    service.getInstallmentPlans().subscribe();
    const get = http.expectOne(`${base}/installment-plans`);
    expect(get.request.method).toBe('GET'); get.flush({ data: { items: [] } });
    const payment = { amount: 250, currency: 'EGP', paymentMethod: 'Cash', paymentReference: '',
      paidAt: '2026-10-15T12:00:00.000Z', idempotencyKey: 'installment-key', notes: '' };
    service.recordInstallmentPayment('installment-id', payment).subscribe();
    const installment = http.expectOne(`${base}/installment-plans/installments/installment-id/payments`);
    expect(installment.request.method).toBe('POST'); expect(installment.request.body).toEqual(payment);
    installment.flush({ success: true });
  });

  it('loads summary and provider admin list/detail without checkout or webhook calls', () => {
    service.getSummary().subscribe(); http.expectOne(`${base}/student-finance/summary`).flush({ data: {} });
    service.getProviderPayments().subscribe(); http.expectOne(`${base}/payments/fawaterak`).flush([]);
    service.getProviderPayment('intent-id').subscribe(value => expect(value).toEqual({ id: 'intent-id' }));
    const detail = http.expectOne(`${base}/payments/fawaterak/intent-id`);
    expect(detail.request.method).toBe('GET'); detail.flush({ success: true, data: { id: 'intent-id' } });
  });

  it('rejects a business failure returned with HTTP 200', () => {
    let failure: Error | undefined;
    service.createCreditBatch(studentId, { credits: 1, description: 'رصيد', validityDays: 30 }).subscribe({
      next: () => { throw new Error('Should not report success'); }, error: error => { failure = error; },
    });
    http.expectOne(`${base}/students/${studentId}/credit-batches`).flush({ success: false, message: 'الرصيد غير مسموح' });
    expect(failure?.message).toBe('الرصيد غير مسموح');
  });
});

describe('finance response normalization and operation keys', () => {
  it('supports direct arrays and data/items envelopes and rejects malformed lists', () => {
    const rows = [{ id: 'record' }];
    expect(financeList(rows)).toEqual(rows);
    expect(financeList({ data: { items: rows } })).toEqual(rows);
    expect(financeList({ success: true, data: rows })).toEqual(rows);
    expect(() => financeList({ data: { wrong: [] } })).toThrow();
    expect(() => financeData({ success: false, message: 'رفض' })).toThrow('رفض');
  });

  it('retains the same key across retries and creates fresh keys after changes or success', () => {
    const operation = new FinanceOperationKey();
    const first = operation.forPayload({ amount: 100 });
    expect(operation.forPayload({ amount: 100 })).toBe(first);
    const changed = operation.forPayload({ amount: 200 });
    expect(changed).not.toBe(first);
    operation.reset();
    expect(operation.forPayload({ amount: 200 })).not.toBe(changed);
  });
});
