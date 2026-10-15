import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics';
import { Analytics } from './analytics';

const { write, save } = vi.hoisted(() => ({ write: vi.fn(), save: vi.fn() }));
vi.mock('write-excel-file/browser', () => ({ default: write }));

describe('Analytics report export', () => {
  let component: Analytics;
  let fixture: ComponentFixture<Analytics>;

  beforeEach(async () => {
    save.mockReset().mockResolvedValue(undefined);
    write.mockReset().mockImplementation(() => ({ toFile: save }));
    await TestBed.configureTestingModule({
      imports: [Analytics],
      providers: [{ provide: AnalyticsService, useValue: {
        getRevenueAnalysis: () => of({}),
        getCostsAnalysis: () => of({}),
        getNetProfitAnalysis: () => of({}),
        getFinancialTransactions: () => of([]),
        getStudentPayments: () => of([]),
        getStudentProfitabilityAnalysis: () => of([]),
      } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Analytics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('exports the current financial data into a dated XLSX workbook', async () => {
    component.transactions = [{ type: 'Payment', amount: 300, direction: 'Credit' }];
    await component.exportToExcel();
    expect(write).toHaveBeenCalledTimes(1);
    const sheets = write.mock.calls[0][0];
    expect(sheets).toHaveLength(4);
    expect(sheets[0].data[1][1]).toEqual({ type: Number, value: 300 });
    expect(save).toHaveBeenCalledWith(expect.stringMatching(/^Financial_Analytics_Report_\d{4}-\d{2}-\d{2}\.xlsx$/));
    expect(component.exporting()).toBe(false);
    expect(component.exportError()).toBe('');
  });

  it('disables duplicate exports until the download finishes', async () => {
    let finish!: () => void;
    save.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const pending = component.exportToExcel();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('جاري تجهيز التقرير');
    await component.exportToExcel();
    expect(save).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('shows a recoverable error and permits a fresh export after failure', async () => {
    save.mockRejectedValueOnce(new Error('download failed'));
    await component.exportToExcel();
    fixture.detectChanges();
    expect(component.exporting()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('تعذر تصدير التقرير');
    await component.exportToExcel();
    fixture.detectChanges();
    expect(save).toHaveBeenCalledTimes(2);
    expect(component.exportError()).toBe('');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
