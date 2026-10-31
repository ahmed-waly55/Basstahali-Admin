import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HomeComponent } from './home';
import { AnalyticsService } from '../../core/services/analytics';
import { ThemeService } from '../../core/services/theme';
import { ScheduleOverviewService } from '../../core/services/schedule-overview';
import { cairoTodayKey, parseScheduleOverview, type ScheduleOverview } from '../../core/models/schedule-overview';

function scheduleData(date = cairoTodayKey(), count = 0, zoomUrl: string | null = null): ScheduleOverview {
  return parseScheduleOverview({ success: true, data: { weekStart: date, weekEnd: date, items: Array.from({ length: count }, (_, index) => ({
    id: `session-${index}`, subject: 'الرياضيات', teacherName: `معلم الاختبار ${index + 1}`, studentName: `طالب الاختبار ${index + 1}`,
    timeSlot: '07:55', timeRange: '07:55 ص - 08:55 ص', scheduledAt: `${date}T07:55:00+00:00`, durationMinutes: 60,
    status: index === 0 ? 'Completed' : 'AttendancePending', isLive: false, zoomUrl,
  })) } });
}

const emptyRevenue = { from: '2026-01-01', to: '2026-10-15', totalRevenue: 0, totalExpenses: 0, currency: 'EGP', months: [] };

describe('Home admin overview', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let isDark = signal(false);
  let scheduleApi: { getSchedule: ReturnType<typeof vi.fn> };
  let api: Record<'getHomeUsers' | 'getCostsAnalysis' | 'getRevenueExpenses' | 'getRecentOperations', ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    isDark = signal(false);
    scheduleApi = { getSchedule: vi.fn(() => of(scheduleData())) };
    api = {
      getHomeUsers: vi.fn(() => of({ success: true, data: { activeUsers: 0, activeStudents: 0, activeTeachers: 0 } })),
      getCostsAnalysis: vi.fn(() => of({ success: true, data: { totalCosts: { currentValue: 0, currency: 'EGP' } } })),
      getRevenueExpenses: vi.fn(() => of({ success: true, data: emptyRevenue })),
      getRecentOperations: vi.fn(() => of({ success: true, data: [] }))
    };
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: AnalyticsService, useValue: api }, { provide: ThemeService, useValue: { isDark } }, { provide: ScheduleOverviewService, useValue: scheduleApi }]
    }).compileComponents();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('links directly to the four administrative workflows', async () => {
    await render();
    const links = Array.from(fixture.nativeElement.querySelectorAll('nav a')) as HTMLAnchorElement[];
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/users/students', '/schedule', '/student-finance', '/teacher-forms']);
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

  it('shows concurrent classes without merging them and preserves Cairo wall-clock time', async () => {
    scheduleApi.getSchedule.mockReturnValue(of(scheduleData(cairoTodayKey(), 2)));
    await render();
    const widget = fixture.nativeElement.querySelector('.home-schedule') as HTMLElement;
    const rows = widget.querySelectorAll('.schedule-session');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('طالب الاختبار 1');
    expect(rows[0].textContent).toContain('معلم الاختبار 1');
    expect(rows[1].textContent).toContain('طالب الاختبار 2');
    expect(rows[0].textContent).toContain('07:55 ص - 08:55 ص');
    expect(widget.textContent).toContain('توقيت القاهرة');
    expect(widget.textContent).toContain('حصص اليوم');
    expect(widget.querySelector('a[href="/schedule"]')?.textContent).toContain('عرض الجدول الكامل');
  });

  it('limits the preview while showing its real day total and never invents a current-date label', async () => {
    scheduleApi.getSchedule.mockReturnValue(of(scheduleData('2001-01-06', 6)));
    await render();
    const widget = fixture.nativeElement.querySelector('.home-schedule') as HTMLElement;
    expect(widget.querySelectorAll('.schedule-session')).toHaveLength(4);
    expect(widget.textContent).toContain('4 من 6 حصة');
    expect(widget.textContent).toContain('حصص الفترة المعروضة');
    expect(widget.textContent).not.toContain('حصص اليوم');
    expect(component.scheduleDate()).toBe('2001-01-06');
  });

  it('shows a true empty schedule rather than an error', async () => {
    await render();
    const widget = fixture.nativeElement.querySelector('.home-schedule') as HTMLElement;
    expect(widget.textContent).toContain('لا توجد حصص لهذا اليوم');
    expect(widget.querySelector('[role="alert"]')).toBeNull();
    expect(component.scheduleLoading()).toBe(false);
  });

  it('retries schedule failures independently of the financial and user reports', async () => {
    scheduleApi.getSchedule.mockReturnValueOnce(throwError(() => new Error('rejected schedule response')));
    await render();
    const widget = fixture.nativeElement.querySelector('.home-schedule') as HTMLElement;
    expect(widget.querySelector('[role="alert"]')?.textContent).toContain('تعذّر تحميل جدول الحصص');
    (widget.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(scheduleApi.getSchedule).toHaveBeenCalledTimes(2);
    expect(api.getHomeUsers).toHaveBeenCalledTimes(1);
    expect(api.getRevenueExpenses).toHaveBeenCalledTimes(1);
    expect(component.scheduleError()).toBe('');
  });

  it('guards repeated schedule refreshes and cancels a pending request on destruction', async () => {
    const request = new Subject<ScheduleOverview>();
    scheduleApi.getSchedule.mockReturnValue(request);
    await render();
    component.loadSchedule(); component.refresh();
    expect(scheduleApi.getSchedule).toHaveBeenCalledTimes(1);
    expect(component.scheduleLoading()).toBe(true);
    expect(fixture.nativeElement.querySelector('.home-schedule [role="status"]').textContent).toContain('جارٍ تحميل جدول الحصص');
    expect(request.observed).toBe(true);
    fixture.destroy();
    expect(request.observed).toBe(false);
  });

  it('does not expose unsafe class links in the overview preview', async () => {
    scheduleApi.getSchedule.mockReturnValue(of(scheduleData(cairoTodayKey(), 1, 'javascript:alert(1)')));
    await render();
    expect(fixture.nativeElement.querySelector('.schedule-session a')).toBeNull();
  });

});
