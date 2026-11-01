import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HomeComponent } from './home';
import { AnalyticsService } from '../../core/services/analytics';
import { ThemeService } from '../../core/services/theme';

const emptyRevenue = { from: '2026-01-01', to: '2026-10-15', totalRevenue: 0, totalExpenses: 0, currency: 'EGP', months: [] };

describe('Home admin overview', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let isDark = signal(false);
  let api: Record<'getHomeUsers' | 'getCostsAnalysis' | 'getRevenueExpenses' | 'getRecentOperations', ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    isDark = signal(false);
    api = {
      getHomeUsers: vi.fn(() => of({ success: true, data: { activeUsers: 0, activeStudents: 0, activeTeachers: 0 } })),
      getCostsAnalysis: vi.fn(() => of({ success: true, data: { totalCosts: { currentValue: 0, currency: 'EGP' } } })),
      getRevenueExpenses: vi.fn(() => of({ success: true, data: emptyRevenue })),
      getRecentOperations: vi.fn(() => of({ success: true, data: [] }))
    };
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: AnalyticsService, useValue: api }, { provide: ThemeService, useValue: { isDark } }]
    }).compileComponents();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('links directly to the remaining administrative workflows', async () => {
    await render();
    const links = Array.from(fixture.nativeElement.querySelectorAll('nav a')) as HTMLAnchorElement[];
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/users/students', '/student-finance', '/teacher-forms']);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('نظرة عامة');
  });

  it('distinguishes pending statistics from a valid zero result', async () => {
    const statistics = new Subject<unknown>();
    api.getHomeUsers.mockReturnValue(statistics);
    await render();
    expect(fixture.nativeElement.querySelector('.academic-metrics').getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.metric-card strong').textContent.trim()).toBe('—');
    statistics.next({ success: true, data: { activeUsers: 0, activeStudents: 0, activeTeachers: 0 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.academic-metrics').getAttribute('aria-busy')).toBe('false');
    expect(fixture.nativeElement.querySelector('.metric-card strong').textContent.trim()).toBe('0');
  });

  it('offers a scoped retry after an HTTP statistics failure', async () => {
    api.getHomeUsers.mockReturnValueOnce(throwError(() => new Error('offline')));
    await render();
    expect(component.usersError).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('إحصاءات المستخدمين');
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(api.getHomeUsers).toHaveBeenCalledTimes(2);
    expect(api.getCostsAnalysis).toHaveBeenCalledTimes(1);
    expect(component.usersError).toBe(false);
  });

  it('shows an operation error for rejected envelopes rather than an empty activity feed', async () => {
    api.getRecentOperations.mockReturnValue(of({ success: false, data: [] }));
    await render();
    const feed = fixture.nativeElement.querySelector('.operations-panel').textContent;
    expect(feed).toContain('تعذّر تحميل أحدث العمليات');
    expect(feed).not.toContain('لا توجد عمليات حديثة');
  });

  it('finishes loading an empty monthly report and gives it a true empty state', async () => {
    await render();
    expect(component.isLoadingChart).toBe(false);
    expect(fixture.nativeElement.querySelector('.chart-container').textContent).toContain('لا توجد بيانات شهرية');
    expect(fixture.nativeElement.querySelector('.finance-metric strong').textContent).toContain('0.00');
  });

  it('preserves the currency of each financial source without combining them into profit', async () => {
    api.getRevenueExpenses.mockReturnValue(of({ success: true, data: { ...emptyRevenue, totalRevenue: 100, currency: 'USD' } }));
    api.getCostsAnalysis.mockReturnValue(of({ success: true, data: { totalCosts: { currentValue: 50, currency: 'EGP' } } }));
    await render();
    const metrics = fixture.nativeElement.querySelectorAll('.finance-metric');
    expect(metrics[0].textContent).toContain('USD');
    expect(metrics[0].textContent).not.toContain('EGP');
    expect(metrics[1].textContent).toContain('EGP');
    expect(fixture.nativeElement.textContent).not.toContain('صافي الربح');
  });

  it('does not label missing user counts as zero', async () => {
    api.getHomeUsers.mockReturnValue(of({ success: true, data: {} }));
    await render();
    const values = Array.from(fixture.nativeElement.querySelectorAll('.metric-card strong')) as HTMLElement[];
    expect(values.every(value => value.textContent?.trim() === 'غير متاح')).toBe(true);
  });

  it('updates chart labels when the administrator changes theme', async () => {
    await render();
    expect(component.barChartOptions.plugins?.legend?.labels?.color).toBe('#767b8d');
    isDark.set(true);
    fixture.detectChanges();
    expect(component.barChartOptions.plugins?.legend?.labels?.color).toBe('#abb3c9');
    expect(component.barChartData.datasets[1].backgroundColor).toBe('#b699ed');
  });

  it('compares the two known role counts without adding the total users as a third category', async () => {
    api.getHomeUsers.mockReturnValue(of({ success: true, data: { activeUsers: 100, activeStudents: 21, activeTeachers: 8 } }));
    await render();
    expect(component.userChartData.datasets[0].data).toEqual([21, 8]);
    expect(component.userChartData.labels).toEqual(['الطلاب النشطون', 'المعلمون النشطون']);
    const values = fixture.nativeElement.querySelector('.user-chart-values').textContent;
    expect(values).toContain('21'); expect(values).toContain('8');
    expect(values).not.toContain('100');
  });

  it('preserves real zero counts and explains partially unavailable role counts', async () => {
    api.getHomeUsers.mockReturnValue(of({ success: true, data: { activeStudents: 0, activeTeachers: -1, activeUsers: null } }));
    await render();
    expect(component.userChartData.datasets[0].data).toEqual([0]);
    expect(fixture.nativeElement.querySelector('.users-chart-panel').textContent).toContain('بعض أعداد الحسابات غير متاحة');
    expect(component.users?.activeTeachers).toBeUndefined();
  });

  it('does not draw incomplete role statistics as zero counts', async () => {
    api.getHomeUsers.mockReturnValue(of({ success: true, data: {} }));
    await render();
    const panel = fixture.nativeElement.querySelector('.users-chart-panel');
    expect(panel.querySelector('canvas')).toBeNull();
    expect(panel.textContent).toContain('غير متاحة حاليًا');
  });

  it('switches monthly chart presentation without a second API request or changing the underlying values', async () => {
    api.getRevenueExpenses.mockReturnValue(of({ success: true, data: { ...emptyRevenue, months: [
      { monthName: 'سبتمبر', currency: 'EGP', revenue: 120, expenses: 80 },
      { monthName: 'أكتوبر', currency: 'EGP', revenue: 180, expenses: 90 }
    ] } }));
    await render();
    const toggle = fixture.nativeElement.querySelector('.chart-type-toggle button:last-child') as HTMLButtonElement;
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(component.monthlyChartType).toBe('line');
    expect(component.lineChartData.datasets.map(item => item.data)).toEqual([[80, 90], [120, 180]]);
    expect(fixture.nativeElement.querySelector('canvas[aria-label^="اتجاه الإيرادات"]')).not.toBeNull();
    expect(api.getRevenueExpenses).toHaveBeenCalledTimes(1);
  });

  it('suppresses a monthly series that would combine different currencies', async () => {
    api.getRevenueExpenses.mockReturnValue(of({ success: true, data: { ...emptyRevenue, months: [
      { monthName: 'أكتوبر', currency: 'USD', revenue: 120, expenses: 80 }
    ] } }));
    await render();
    expect(component.monthlyRows).toEqual([]);
    expect(component.barChartData.labels).toEqual([]);
    expect(fixture.nativeElement.querySelector('.chart-container').textContent).toContain('غير متوافقة');
    expect(fixture.nativeElement.querySelector('.chart-canvas')).toBeNull();
  });

  it('does not plot a missing financial amount as zero', async () => {
    api.getRevenueExpenses.mockReturnValue(of({ success: true, data: { ...emptyRevenue, months: [
      { monthName: 'أكتوبر', currency: 'EGP', revenue: null, expenses: 80 }
    ] } }));
    await render();
    expect(component.monthlyRows).toEqual([]);
    expect(component.monthlyChartMessage).toContain('غير مكتملة');
  });

});
