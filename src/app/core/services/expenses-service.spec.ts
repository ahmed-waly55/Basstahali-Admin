import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExpensesService } from './expenses-service';
import { environment } from '../../../environments/environment.development';

describe('ExpensesService resource management', () => {
  let service: ExpensesService;
  let http: HttpTestingController;
  const base = `${environment.baseUrl}/api/v1`;
  const body = { category: 'تشغيل', description: 'مصروف تشغيلي', amount: 50, expenseDate: '2026-10-15', reference: 'ref-1' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ExpensesService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lists actual expense resources and gets details before editing', () => {
    service.getOperatingExpenses().subscribe();
    const list = http.expectOne(`${base}/operating-expenses`);
    expect(list.request.method).toBe('GET'); list.flush({ data: [] });
    service.getOperatingExpense('expense-1').subscribe();
    const item = http.expectOne(`${base}/operating-expenses/expense-1`);
    expect(item.request.method).toBe('GET'); item.flush({ data: body });
  });
  it('preserves the existing create alias and uses documented PUT/DELETE resources', () => {
    service.createOperatingExpense(body).subscribe();
    const create = http.expectOne(`${base}/finance/operating-expenses`);
    expect(create.request.method).toBe('POST'); expect(create.request.body).toEqual(body); create.flush({ success: true });
    service.updateOperatingExpense('expense-1', body).subscribe();
    const update = http.expectOne(`${base}/operating-expenses/expense-1`);
    expect(update.request.method).toBe('PUT'); expect(update.request.body).toEqual(body); update.flush({ success: true });
    service.deleteOperatingExpense('expense-1').subscribe();
    const remove = http.expectOne(`${base}/operating-expenses/expense-1`);
    expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
});
