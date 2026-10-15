import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Expenses } from './expenses';
import { ExpensesService } from '../../core/services/expenses-service';
import { of } from 'rxjs';
import { afterEach, vi } from 'vitest';
import Swal from 'sweetalert2';

describe('Expenses', () => {
  let component: Expenses;
  let fixture: ComponentFixture<Expenses>;
  let api: { getOperatingExpenses: ReturnType<typeof vi.fn>; createOperatingExpense: ReturnType<typeof vi.fn>; deleteOperatingExpense: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      getOperatingExpenses: vi.fn(() => of({ success: true, data: [] })),
      createOperatingExpense: vi.fn(() => of({ success: true })),
      deleteOperatingExpense: vi.fn(() => of({ success: true }))
    };
    await TestBed.configureTestingModule({
      imports: [Expenses],
      providers: [{ provide: ExpensesService, useValue: api }]
    }).compileComponents();

    fixture = TestBed.createComponent(Expenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not delete a report row without its resource ID', async () => {
    const confirm = vi.spyOn(Swal, 'fire');
    await component.deleteExpense({ category: 'تشغيل', amount: 50 });
    expect(confirm).not.toHaveBeenCalled();
    expect(api.deleteOperatingExpense).not.toHaveBeenCalled();
  });

  it('keeps the edited data when the server rejects a save in its response envelope', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
    api.createOperatingExpense.mockReturnValue(of({ success: false, message: 'لا يمكن حفظ المصروف' }));
    const input = { category: 'تشغيل', reference: 'ref', description: 'وصف', amount: 50, expenseDate: '2026-10-15' };
    component.expenseForm.setValue(input);
    await component.onSubmitExpense();
    expect(component.error()).toBe('لا يمكن حفظ المصروف');
    expect(component.expenseForm.getRawValue()).toEqual(input);
    expect(component.pending()).toBe(false);
  });

  it('does not mutate a financial record when confirmation is cancelled', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false, isDenied: false, isDismissed: true });
    await component.deleteExpense({ id: 'expense-1' });
    expect(api.deleteOperatingExpense).not.toHaveBeenCalled();
  });
});
