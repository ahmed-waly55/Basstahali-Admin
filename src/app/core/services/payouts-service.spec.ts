import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PayoutsService } from './payouts-service';
import { environment } from '../../../environments/environment.development';

describe('PayoutsService missing admin contracts', () => {
  let service: PayoutsService;
  let http: HttpTestingController;
  const base = `${environment.baseUrl}/api/v1`;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PayoutsService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('submits a decision against the adjustment ID, with the exact documented body', () => {
    const decision = { status: 'server-status', approvedAmount: 50, adminResponse: 'تمت المراجعة' };
    service.decidePayoutAdjustment('adjustment-1', decision).subscribe();
    const request = http.expectOne(`${base}/payout-adjustments/adjustment-1/decision`);
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(decision); request.flush({ success: true });
  });
  it('loads the report separately from payout workflow data', () => {
    service.getTeacherPayoutReports().subscribe();
    const request = http.expectOne(`${base}/reports/teacher-payouts`);
    expect(request.request.method).toBe('GET'); request.flush({ data: [] });
  });
});
