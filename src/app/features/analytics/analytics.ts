import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, take, takeUntil, map, finalize } from 'rxjs';
import { buildFinancialWorkbook, financialWorkbookFileName } from '../../core/utils/financial-workbook';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { ThemeService } from '../../core/services/theme';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

type MetricKey = 'revenue' | 'costs' | 'profit';
interface MetricSummary {
  key: MetricKey;
  title: string;
  icon: string;
  current: number | null;
  previous: number | null;
  currency: string | null;
  loading: boolean;
  error: boolean;
}
const metricDefinitions: { key: MetricKey; title: string; icon: string }[] = [
  { key: 'revenue', title: 'الإيرادات', icon: 'trending_up' },
  { key: 'costs', title: 'التكاليف', icon: 'receipt_long' },
  { key: 'profit', title: 'صافي الربح', icon: 'account_balance_wallet' },
];

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule,
    BaseChartDirective
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit, OnDestroy {
  private analytics = inject(AnalyticsService);
  private cdr = inject(ChangeDetectorRef); // حقن أداة تحديث الواجهة يدوياً
  private theme = inject(ThemeService);

  private destroy$ = new Subject<void>();

  // Metrics data variables
  revenue: any = null;
  costs: any = null;
  netProfit: any = null;

  // Tables data variables
  transactions: any[] = [];
  studentPayments: any[] = [];
  studentProfitability: any[] = [];
  costsTableData: any[] = [];
  readonly exporting = signal(false);
  readonly exportError = signal('');
  readonly chartType = signal<'bar' | 'line'>('bar');
  readonly summaries = signal<MetricSummary[]>(metricDefinitions.map(item => ({ ...item, current: null, previous: null, currency: null, loading: false, error: false })));
  readonly tableErrors = signal<string[]>([]);
  private readonly loadingTables = new Set<string>();
  private readonly failedTables = new Set<string>();
  readonly chartCards = computed(() => {
    const primary = this.theme.isDark() ? '#b699ed' : '#6241a5';
    return this.summaries().map(item => ({
      ...item,
      ready: item.current !== null && item.previous !== null && !!item.currency,
      zero: item.current === 0 && item.previous === 0,
      data: {
        labels: ['الفترة السابقة', 'الفترة الحالية'],
        datasets: [{ label: item.title, data: item.previous !== null && item.current !== null ? [item.previous, item.current] : [], backgroundColor: [primary, '#efb935'], borderColor: primary, borderWidth: 2, pointBackgroundColor: [primary, '#efb935'], pointRadius: 4, tension: 0.25 }]
      } satisfies ChartData<'bar' | 'line', number[]>
    }));
  });
  readonly comparisonOptions = computed<ChartOptions<'bar' | 'line'>>(() => {
    const dark = this.theme.isDark();
    const text = dark ? '#abb3c9' : '#767b8d';
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { rtl: true, titleFont: { family: 'Tajawal, sans-serif' }, bodyFont: { family: 'Tajawal, sans-serif' } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: text, font: { family: 'Tajawal, sans-serif' } } },
        y: { beginAtZero: true, grid: { color: dark ? '#343b50' : '#edf0f6' }, ticks: { color: text }, border: { display: false } }
      }
    };
  });

  // Table columns definition
  displayedColumnsTransactions: string[] = ['type', 'amount', 'direction', 'description', 'createdAt'];
  displayedColumnsPayments: string[] = ['studentName', 'amount', 'paymentMethod', 'status', 'recordedByName', 'paidAt'];

  // تم تحديث أعمدة جدول ربحية الطلاب لتشمل جميع تفاصيل الـ API الجديدة
  displayedColumnsProfitability: string[] = [
    'studentName',
    'phoneNumber',
    'sessionsReceived',
    'studentRevenue',
    'totalPaid',
    'unrealizedPaidAmount',
    'averageStudentSessionPrice',
    'averageTeacherSessionRate',
    'totalCost',
    'netProfit',
    'profitMargin'
  ];

  displayedColumnsCosts: string[] = ['expenseType', 'currentValue', 'previousValue', 'growthPercentage'];

  ngOnInit(): void {
    this.loadAllAnalyticsData();
  }

  loadAllAnalyticsData(): void {
    metricDefinitions.forEach(item => this.loadMetric(item.key));
    this.loadTables();
  }

  loadMetric(key: MetricKey): void {
    if (this.summaries().find(item => item.key === key)?.loading) return;
    this.updateSummary(key, { loading: true, error: false });
    const request = key === 'revenue' ? this.analytics.getRevenueAnalysis() : key === 'costs' ? this.analytics.getCostsAnalysis() : this.analytics.getNetProfitAnalysis();
    request.pipe(
      take(1), map(res => this.record(this.envelope(res))),
      finalize(() => { this.updateSummary(key, { loading: false }); this.cdr.markForCheck(); }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => {
        if (key === 'revenue') this.revenue = data;
        else if (key === 'profit') this.netProfit = data;
        else {
          this.costs = data;
          this.costsTableData = [
            { title: 'مرتبات المعلمين (Teacher Salaries)', ...this.record(data['teacherSalaries']) },
            { title: 'المصروفات الأخرى (Other Expenses)', ...this.record(data['otherExpenses']) },
            { title: 'إجمالي التكاليف (Total Costs)', ...this.record(data['totalCosts']) }
          ];
        }
        const metric = key === 'costs' ? this.record(data['totalCosts']) : data;
        this.updateSummary(key, {
          current: this.number(metric['currentValue']), previous: this.number(metric['previousValue']),
          currency: typeof metric['currency'] === 'string' && metric['currency'].trim() ? metric['currency'].trim() : null,
          error: false
        });
      },
      error: () => {
        if (key === 'revenue') this.revenue = null;
        else if (key === 'profit') this.netProfit = null;
        else { this.costs = null; this.costsTableData = []; }
        this.updateSummary(key, { current: null, previous: null, currency: null, error: true });
      }
    });
  }

  loadTables(): void {
    const definitions = [
      { key: 'transactions', title: 'الحركات المالية', request: () => this.analytics.getFinancialTransactions() },
      { key: 'studentPayments', title: 'مدفوعات الطلاب', request: () => this.analytics.getStudentPayments() },
      { key: 'studentProfitability', title: 'ربحية الطلاب', request: () => this.analytics.getStudentProfitabilityAnalysis() }
    ] as const;
    for (const item of definitions) {
      if (this.loadingTables.has(item.key)) continue;
      this.loadingTables.add(item.key);
      item.request().pipe(take(1), map(res => {
        const data = this.envelope(res);
        const rows = Array.isArray(data) ? data : this.record(data)['items'];
        if (!Array.isArray(rows)) throw new Error('Invalid report list');
        return rows;
      }), finalize(() => this.loadingTables.delete(item.key)), takeUntil(this.destroy$)).subscribe({
        next: rows => {
          this[item.key] = rows;
          this.failedTables.delete(item.title);
          this.tableErrors.set([...this.failedTables]);
          this.cdr.markForCheck();
        },
        error: () => {
          this[item.key] = [];
          this.failedTables.add(item.title);
          this.tableErrors.set([...this.failedTables]);
          this.cdr.markForCheck();
        }
      });
    }
  }

  private envelope(value: unknown): unknown {
    const outer = this.record(value);
    if (outer['success'] === false || outer['isSuccess'] === false) throw new Error('Rejected report');
    return outer['data'] ?? value;
  }

  private record(value: unknown): Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private number(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private updateSummary(key: MetricKey, patch: Partial<MetricSummary>): void {
    this.summaries.update(items => items.map(item => item.key === key ? { ...item, ...patch } : item));
  }

  async exportToExcel(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.exportError.set('');
    try {
      const sheets = buildFinancialWorkbook({
        transactions: this.transactions,
        studentPayments: this.studentPayments,
        studentProfitability: this.studentProfitability,
        costs: this.costsTableData,
      });
      const { default: writeExcelFile } = await import('write-excel-file/browser');
      await writeExcelFile(sheets).toFile(financialWorkbookFileName());
    } catch {
      this.exportError.set('تعذر تصدير التقرير. حاول مرة أخرى.');
    } finally {
      this.exporting.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
