import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { StudentFinanceService } from '../../core/services/student-finance';
import { User } from '../../core/services/user';
import { StudentFinance } from './student-finance';

describe('StudentFinance financial operation validation', () => {
  let component: StudentFinance;
  const service = { recordPayment: vi.fn(), createCreditBatch: vi.fn(), createInstallmentPlan: vi.fn(),
    recordInstallmentPayment: vi.fn(), getPayments: vi.fn(() => of([])), getSummary: vi.fn(() => of({})),
    getInstallmentPlans: vi.fn(() => of([])), getCreditBatches: vi.fn(() => of([])) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      { provide: StudentFinanceService, useValue: service }, { provide: User, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new StudentFinance());
    component.selectedStudentId = '11d61a69-92dc-40c5-9d37-fbf23ec3691e';
  });

  function validPayment(): void {
    component.showForm('payment');
    component.paymentForm.setValue({ amount: 150, currency: 'EGP', paymentMethod: 'Cash', paymentReference: '',
      paidAt: '2026-10-15T14:30', notes: '', purchasedCredits: 2, subjectId: '', sessionId: '', purpose: 'ServerValue' });
  }

  it('blocks non-positive payments and invalid optional UUID references', () => {
    validPayment(); component.paymentForm.patchValue({ amount: 0 }); component.submitPayment();
    expect(service.recordPayment).not.toHaveBeenCalled();
    component.paymentForm.patchValue({ amount: 150, subjectId: 'invalid-id' }); component.submitPayment();
    expect(service.recordPayment).not.toHaveBeenCalled(); expect(component.errors()['form']).toBeTruthy();
  });

  it('keeps a failed payment open and reuses the key while converting local time to ISO', () => {
    validPayment();
    service.recordPayment.mockReturnValue(throwError(() => new Error('تعذر الحفظ')));
    component.submitPayment(); component.submitPayment();
    expect(component.openForm()).toBe('payment'); expect(component.errors()['form']).toBe('تعذر الحفظ');
    const first = service.recordPayment.mock.calls[0][1];
    expect(first.idempotencyKey).toBe(service.recordPayment.mock.calls[1][1].idempotencyKey);
    expect(first.paidAt).toBe(new Date('2026-10-15T14:30').toISOString());
    expect(first).not.toHaveProperty('subjectId'); expect(first.purpose).toBe('ServerValue');
    component.closeForm(); component.showForm('payment'); component.submitPayment();
    expect(service.recordPayment.mock.calls[2][1].idempotencyKey).toBe(first.idempotencyKey);
    component.paymentForm.patchValue({ amount: 175 }); component.submitPayment();
    expect(service.recordPayment.mock.calls[3][1].idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('clears the operation after success so a new payment receives a new key', () => {
    validPayment(); service.recordPayment.mockReturnValue(of({})); component.submitPayment();
    const firstKey = service.recordPayment.mock.calls[0][1].idempotencyKey;
    expect(component.openForm()).toBeNull(); expect(component.notice()).toContain('بنجاح');
    validPayment(); component.submitPayment();
    expect(service.recordPayment.mock.calls[1][1].idempotencyKey).not.toBe(firstKey);
  });

  it('validates installment plan amounts and retains date-only values', () => {
    component.planForm.setValue({ scope: 'Term', totalAmount: 500, currency: 'EGP', downPaymentAmount: 600,
      installmentCount: 2, startDate: '2026-10-15', firstDueDate: '2026-10-30', paymentMethod: 'Cash', paymentReference: '' });
    component.submitPlan(); expect(service.createInstallmentPlan).not.toHaveBeenCalled();
    component.planForm.patchValue({ downPaymentAmount: 100 }); service.createInstallmentPlan.mockReturnValue(of({}));
    component.submitPlan();
    const body = service.createInstallmentPlan.mock.calls[0][0];
    expect(body.startDate).toBe('2026-10-15'); expect(body.firstDueDate).toBe('2026-10-30'); expect(body.scope).toBe('Term');
  });

  it('uses the parent plan currency and preserves a failed installment key after reopening', () => {
    const installment = { id: 'installment-id' };
    component.payInstallment(installment, 'USD');
    expect(component.installmentForm.controls.currency.value).toBe('USD');
    component.installmentForm.patchValue({ amount: 50, paymentMethod: 'Cash' });
    service.recordInstallmentPayment.mockReturnValue(throwError(() => new Error('timeout')));
    component.submitInstallment();
    const key = service.recordInstallmentPayment.mock.calls[0][1].idempotencyKey;
    component.closeForm(); component.payInstallment(installment, 'USD'); component.submitInstallment();
    expect(service.recordInstallmentPayment.mock.calls[1][1].idempotencyKey).toBe(key);
    expect(service.recordInstallmentPayment.mock.calls[1][1].currency).toBe('USD');
  });

  it('does not let an old student request error overwrite the currently loading student', () => {
    const first = new Subject<never[]>(); const second = new Subject<never[]>();
    service.getPayments.mockReturnValueOnce(first).mockReturnValueOnce(second);
    component.refreshPayments(); component.selectedStudentId = 'second-student'; component.refreshPayments();
    first.error(new Error('old error'));
    expect(component.errors()['payments']).toBe(''); expect(component.loading()['payments']).toBe(true);
    second.next([]); expect(component.loading()['payments']).toBe(false);
  });

  it('requires credit-batch reconciliation after an ambiguous network failure', () => {
    component.showForm('credit'); component.creditForm.setValue({ credits: 2, description: 'رصيد', validityDays: 30 });
    service.createCreditBatch.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.submitCredit(); expect(component.creditNeedsReview()).toBe(true);
    expect(service.getCreditBatches).toHaveBeenCalled();
    component.submitCredit(); expect(service.createCreditBatch).toHaveBeenCalledTimes(1);
  });

  it('rejects whitespace-only required payment strings', () => {
    validPayment(); component.paymentForm.patchValue({ purpose: '   ' }); component.submitPayment();
    expect(service.recordPayment).not.toHaveBeenCalled(); expect(component.errors()['form']).toBeTruthy();
  });
});
