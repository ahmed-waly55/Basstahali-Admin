import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinanceManagementService } from './finance-management-service';
import { environment } from '../../../environments/environment.development';

describe('FinanceManagementService documented finance contracts', () => {
  let service: FinanceManagementService;
  let http: HttpTestingController;
  const base = `${environment.baseUrl}/api/v1`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FinanceManagementService);
    http = TestBed.inject(HttpTestingController);
    sessionStorage.removeItem('basstahali:close-financial-period:period-retry');
  });
  afterEach(() => { http.verify(); sessionStorage.removeItem('basstahali:close-financial-period:period-retry'); });

  it('retains the financial closing idempotency key after an uncertain network outcome', () => {
    service.closeFinancialPeriod('period-retry').subscribe({ error: () => undefined });
    const first = http.expectOne(`${base}/finance/periods/period-retry/close`);
    const key = first.request.headers.get('Idempotency-Key');
    expect(first.request.method).toBe('POST');
    expect(key).toBeTruthy();
    first.error(new ProgressEvent('network-error'));
    service.closeFinancialPeriod('period-retry').subscribe();
    const retry = http.expectOne(`${base}/finance/periods/period-retry/close`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(sessionStorage.getItem('basstahali:close-financial-period:period-retry')).toBe(key);
    retry.flush({ success: true });
  });

  it('uses financial-period and partner-share contracts without payout aliases', () => {
    service.getFinancialPeriods().subscribe();
    const list = http.expectOne(`${base}/financial-periods`);
    expect(list.request.method).toBe('GET'); list.flush({ data: [] });
    const period = { startDate: '2026-10-01', endDate: '2026-10-31' };
    service.createFinancialPeriod(period).subscribe();
    const create = http.expectOne(`${base}/finance/periods`);
    expect(create.request.body).toEqual(period); create.flush({ success: true });
    const share = { partnerId: 'partner-1', percentage: 10, effectiveFrom: '2026-10-01', effectiveTo: '2026-10-31' };
    service.createPartnerShare(share).subscribe();
    const request = http.expectOne(`${base}/finance/partner-shares`);
    expect(request.request.body).toEqual(share); request.flush({ success: true });
  });

  it('updates teacher payroll and approves it with different exact payloads', () => {
    const payroll = { from: '2026-10-01', to: '2026-10-31', sessionCount: 4, sessionRate: 100,
      bonus: 20, bonusReason: 'إتقان', deduction: 0, deductionReason: '', notes: '' };
    service.updateTeacherPayroll('teacher-1', payroll).subscribe();
    const update = http.expectOne(`${base}/payroll/teachers/teacher-1`);
    expect(update.request.method).toBe('PUT'); expect(update.request.body).toEqual(payroll); update.flush({ success: true });
    const approval = { from: payroll.from, to: payroll.to, finalAmount: 420, notes: 'تمت المراجعة' };
    service.approveTeacherPayroll('teacher-1', approval).subscribe();
    const request = http.expectOne(`${base}/payroll/teachers/teacher-1/approve`);
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(approval); request.flush({ success: true });
  });
});
