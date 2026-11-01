import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Directive, Input, signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics';
import { Analytics } from './analytics';
import { ThemeService } from '../../core/services/theme';
import { BaseChartDirective } from 'ng2-charts';

@Directive({ selector: 'canvas[baseChart]', standalone: true })
class ChartCanvasStub {
  @Input() data: unknown;
  @Input() type: unknown;
  @Input() options: unknown;
}

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

describe('Financial statistics charts', () => {
  let fixture: ComponentFixture<Analytics>;
  let component: Analytics;
  let isDark = signal(false);
  let api: Record<'getRevenueAnalysis' | 'getCostsAnalysis' | 'getNetProfitAnalysis' | 'getFinancialTransactions' | 'getStudentPayments' | 'getStudentProfitabilityAnalysis', ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    isDark = signal(false);
    api = {
      getRevenueAnalysis: vi.fn(() => of({ success: true, data: { currentValue: 1200, previousValue: 900, currency: 'USD' } })),
      getCostsAnalysis: vi.fn(() => of({ success: true, data: { totalCosts: { currentValue: 400, previousValue: 350, currency: 'AED' } } })),
      getNetProfitAnalysis: vi.fn(() => of({ success: true, data: { currentValue: -100, previousValue: 50, currency: 'EGP' } })),
      getFinancialTransactions: vi.fn(() => of([])),
      getStudentPayments: vi.fn(() => of({ data: { items: [] } })),
      getStudentProfitabilityAnalysis: vi.fn(() => of([])),
    };
    await TestBed.configureTestingModule({
      imports: [Analytics], providers: [{ provide: AnalyticsService, useValue: api }, { provide: ThemeService, useValue: { isDark } }]
    }).overrideComponent(Analytics, { remove: { imports: [BaseChartDirective] }, add: { imports: [ChartCanvasStub] } }).compileComponents();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Analytics);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function card(key: string): HTMLElement { return fixture.nativeElement.querySelector(`[data-metric="${key}"]`); }

  it('compares each report in its own currency and retains negative profit', async () => {
    await render();
    expect(component.chartCards().map(item => item.data.datasets[0].data)).toEqual([[900, 1200], [350, 400], [50, -100]]);
    expect(card('revenue').querySelector('.currency-badge')?.textContent).toBe('USD');
    expect(card('costs').querySelector('.currency-badge')?.textContent).toBe('AED');
    expect(card('profit').querySelector('canvas')?.getAttribute('aria-label')).toContain('الفترة الحالية -100 EGP');
    expect(card('revenue').textContent).not.toContain('AED');
    expect(fixture.nativeElement.querySelectorAll('.comparison-canvas canvas')).toHaveLength(3);
  });

  it('keeps a true zero result separate from unavailable data', async () => {
    api.getRevenueAnalysis.mockReturnValue(of({ data: { currentValue: 0, previousValue: 0, currency: 'EGP' } }));
    api.getCostsAnalysis.mockReturnValue(of({ data: { totalCosts: { currentValue: 0, currency: 'EGP' } } }));
    await render();
    expect(card('revenue').textContent).toContain('القيمتان تساويان صفرًا');
    expect(card('revenue').querySelector('.comparison-values')?.textContent).toContain('0.00');
    expect(card('costs').textContent).toContain('إحدى قيمتي الفترتين غير متاحة');
    expect(card('costs').querySelector('.comparison-values')?.textContent).toContain('غير متاح');
    expect(card('costs').querySelector('canvas')).toBeNull();
  });

  it('does not assign a default currency or plot non-finite values', async () => {
    api.getRevenueAnalysis.mockReturnValue(of({ data: { currentValue: 200, previousValue: 100 } }));
    api.getNetProfitAnalysis.mockReturnValue(of({ data: { currentValue: Number.NaN, previousValue: Number.POSITIVE_INFINITY, currency: 'EGP' } }));
    await render();
    expect(card('revenue').textContent).toContain('العملة غير محددة');
    expect(card('revenue').textContent).not.toContain('EGP');
    expect(card('revenue').querySelector('canvas')).toBeNull();
    expect(card('profit').querySelector('canvas')).toBeNull();
    expect(card('profit').querySelector('.comparison-values')?.textContent).not.toContain('NaN');
  });

  it('retries a rejected report independently and clears its previous values on a failed refresh', async () => {
    await render();
    api.getRevenueAnalysis.mockReturnValueOnce(of({ success: false, data: { currentValue: 9999, previousValue: 8888, currency: 'USD' } }));
    component.loadMetric('revenue'); fixture.detectChanges();
    expect(card('revenue').querySelector('[role="alert"]')?.textContent).toContain('تعذّر تحميل الإيرادات');
    expect(card('revenue').querySelector('canvas')).toBeNull();
    expect(component.chartCards().find(item => item.key === 'revenue')?.current).toBeNull();
    expect(component.revenue).toBeNull();
    (card('revenue').querySelector('button') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(api.getRevenueAnalysis).toHaveBeenCalledTimes(3);
    expect(api.getCostsAnalysis).toHaveBeenCalledTimes(1);
    expect(card('revenue').querySelector('canvas')).not.toBeNull();
  });

  it('updates the display style and theme without changing financial values', async () => {
    await render();
    const line = Array.from(fixture.nativeElement.querySelectorAll('.chart-switch button')).find((button: any) => button.textContent.includes('خطّي')) as HTMLButtonElement;
    line.click(); fixture.detectChanges();
    expect(component.chartType()).toBe('line');
    expect(line.getAttribute('aria-pressed')).toBe('true');
    isDark.set(true); fixture.detectChanges();
    expect(component.comparisonOptions().scales?.['y']?.ticks?.color).toBe('#abb3c9');
    expect(component.chartCards()[0].data.datasets[0].data).toEqual([900, 1200]);
    expect(component.chartCards()[0].data.datasets[0].borderColor).toBe('#b699ed');
  });

  it('guards pending report requests and releases them when destroyed', async () => {
    const pending = new Subject<unknown>();
    api.getRevenueAnalysis.mockReturnValue(pending);
    await render();
    expect(card('revenue').querySelector('[role="status"]')?.textContent).toContain('جارٍ تحميل');
    component.loadMetric('revenue');
    expect(api.getRevenueAnalysis).toHaveBeenCalledTimes(1);
    expect(pending.observed).toBe(true);
    fixture.destroy();
    expect(pending.observed).toBe(false);
  });

  it('reports malformed table envelopes instead of treating them as a valid empty list', async () => {
    api.getStudentPayments.mockReturnValueOnce(of({ success: true, data: { unexpected: [] } }));
    api.getFinancialTransactions.mockReturnValueOnce(throwError(() => new Error('offline')));
    await render();
    expect(component.tableErrors()).toEqual(['الحركات المالية', 'مدفوعات الطلاب']);
    expect(fixture.nativeElement.querySelector('.table-load-error')?.textContent).toContain('مدفوعات الطلاب');
    component.loadTables(); fixture.detectChanges();
    expect(component.tableErrors()).toEqual([]);
    expect(component.studentPayments).toEqual([]);
  });
});
