import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  effect
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription } from 'rxjs';
import {
  Chart,
  ChartConfiguration,
  ChartOptions,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { AnalyticsService } from '../../core/services/analytics';
import { ThemeService } from '../../core/services/theme';

// تسجيل مكونات Chart.js
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

// الواجهات (Interfaces)
export interface MonthFinance {
  year: number;
  month: number;
  monthKey: string;
  monthName: string;
  revenue: number;
  expenses: number;
  currency: string;
}

export interface RevenueExpensesData {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpenses: number;
  currency: string;
  months: MonthFinance[];
}

export interface CostItem {
  currentValue: number;
  previousValue: number;
  growthPercentage: number;
  currency: string;
}

export interface CostsAnalysisData {
  teacherSalaries: CostItem;
  otherExpenses: CostItem;
  totalCosts: CostItem;
}

export interface RecentOperation {
  type: string;
  description: string;
  relatedPersonName: string;
  amount: number | null;
  currency: string | null;
  occurredAt: string;
}

export interface HomeUsersData {
  activeUsers?: number;
  activeStudents?: number;
  activeTeachers?: number;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: any;
  traceId: string | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    BaseChartDirective
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly _analyticsService = inject(AnalyticsService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _theme = inject(ThemeService);
  private subscriptions = new Subscription();

  users: HomeUsersData | null = null;
  isLoadingUsers = false;
  usersError = false;
  recentOperations: RecentOperation[] = [];
  isLoadingOperations = false;
  operationsError = false;
  costsAnalysis: CostsAnalysisData | null = null;
  isLoadingCosts = false;
  costsError = false;
  revenueExpenses: RevenueExpensesData | null = null;
  isLoadingChart = false;
  chartError = false;

  readonly quickActions = [
    { title: 'إدارة الطلاب', detail: 'الملفات والتسجيل', icon: 'school', route: '/users/students' },
    { title: 'مالية الطلاب', detail: 'المدفوعات والأقساط', icon: 'account_balance_wallet', route: '/student-finance' },
    { title: 'طلبات المدرسين', detail: 'مراجعة طلبات التسجيل', icon: 'how_to_reg', route: '/teacher-forms' }
  ];

  get isRefreshing(): boolean {
    return this.isLoadingUsers || this.isLoadingCosts || this.isLoadingChart || this.isLoadingOperations;
  }

  monthlyChartType: 'bar' | 'line' = 'bar';
  monthlyChartMessage = '';
  monthlyRows: MonthFinance[] = [];
  userChartRows: { label: string; count: number }[] = [];
  userChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  userChartOptions: ChartOptions<'bar'> = this.createUserChartOptions(false);
  barChartOptions: ChartOptions<'bar'> = this.createChartOptions(false);
  lineChartOptions: ChartOptions<'line'> = this.createChartOptions(false);
  lineChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  constructor() {
    effect(() => {
      const dark = this._theme.isDark();
      this.barChartOptions = this.createChartOptions(dark);
      this.lineChartOptions = this.createChartOptions(dark);
      this.userChartOptions = this.createUserChartOptions(dark);
      this.barChartData = {
        ...this.barChartData,
        datasets: this.barChartData.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: index === 0 ? '#efb935' : (dark ? '#b699ed' : '#6241a5')
        }))
      };
      this.updateUserChart();
      this.updateLineChart();
    });
  }

  private createChartOptions(dark: boolean): ChartOptions<'bar'> & ChartOptions<'line'> {
    const text = dark ? '#abb3c9' : '#767b8d';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          rtl: true,
          labels: {
            color: text,
            font: { family: 'Tajawal, sans-serif', size: 12 },
            usePointStyle: true,
            boxWidth: 8
          }
        }
      },
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: text, font: { family: 'Tajawal, sans-serif' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: dark ? '#343b50' : '#f0f1f5' },
          ticks: { color: text, font: { family: 'Tajawal, sans-serif', size: 11 } },
          border: { display: false }
        }
      }
    };
  }

  private createUserChartOptions(dark: boolean): ChartOptions<'bar'> {
    const options = this.createChartOptions(dark);
    return { ...options, indexAxis: 'y', plugins: { ...options.plugins, legend: { display: false } }, scales: {
      x: { beginAtZero: true, ticks: { precision: 0, color: dark ? '#abb3c9' : '#767b8d' }, grid: { color: dark ? '#343b50' : '#f0f1f5' } },
      y: { ticks: { color: dark ? '#abb3c9' : '#767b8d', font: { family: 'Tajawal, sans-serif' } }, grid: { display: false } }
    } };
  }

  private count(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }

  private updateUserChart(): void {
    this.userChartRows = [
      { label: 'الطلاب النشطون', count: this.users?.activeStudents },
      { label: 'المعلمون النشطون', count: this.users?.activeTeachers }
    ].filter((item): item is { label: string; count: number } => this.count(item.count) !== undefined);
    this.userChartData = { labels: this.userChartRows.map(item => item.label), datasets: [{ label: 'عدد الحسابات النشطة', data: this.userChartRows.map(item => item.count), backgroundColor: this.userChartRows.map((_,index) => index === 0 ? (this._theme.isDark() ? '#b699ed' : '#6241a5') : '#efb935'), borderRadius: 6, maxBarThickness: 34 }] };
  }

  private updateLineChart(): void {
    this.lineChartData = { labels: this.monthlyRows.map(item => item.monthName), datasets: [
      { label: 'المصروفات', data: this.monthlyRows.map(item => item.expenses), borderColor: '#efb935', backgroundColor: '#efb935', pointRadius: 3, pointHoverRadius: 5, tension: 0.25, fill: false },
      { label: 'الإيرادات', data: this.monthlyRows.map(item => item.revenue), borderColor: this._theme.isDark() ? '#b699ed' : '#6241a5', backgroundColor: this._theme.isDark() ? '#b699ed' : '#6241a5', pointRadius: 3, pointHoverRadius: 5, tension: 0.25, fill: false }
    ] };
  }

  setMonthlyChartType(type: 'bar' | 'line'): void { this.monthlyChartType = type; }

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'المصروفات',
        backgroundColor: '#efb935',
        borderRadius: 6,
        barThickness: 16
      },
      {
        data: [],
        label: 'الإيرادات',
        backgroundColor: '#6241a5',
        borderRadius: 6,
        barThickness: 16
      }
    ]
  };

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.getUsers();
    this.getCostsAnalysis();
    this.getRevenueExpenses();
    this.getRecentOperations();
  }

  getUsers(): void {
    if (this.isLoadingUsers) return;
    this.isLoadingUsers = true;
    this.usersError = false;
    const sub = this._analyticsService.getHomeUsers().subscribe({
      next: (res: ApiResponse<HomeUsersData>) => {
        const data = res.success !== false ? res.data : null;
        this.users = data && typeof data === 'object' && !Array.isArray(data) ? { ...data, activeUsers: this.count(data.activeUsers), activeStudents: this.count(data.activeStudents), activeTeachers: this.count(data.activeTeachers) } : null;
        this.updateUserChart();
        this.usersError = !this.users;
        this.isLoadingUsers = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.users = null;
        this.updateUserChart();
        this.usersError = true;
        this.isLoadingUsers = false;
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  getRecentOperations(): void {
    if (this.isLoadingOperations) return;
    this.isLoadingOperations = true;
    this.operationsError = false;
    const sub = this._analyticsService.getRecentOperations().subscribe({
      next: (res: ApiResponse<RecentOperation[]>) => {
        this.operationsError = res.success === false || !Array.isArray(res.data);
        this.recentOperations = this.operationsError ? [] : res.data;
        this.isLoadingOperations = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.operationsError = true;
        this.isLoadingOperations = false;
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  getCostsAnalysis(): void {
    if (this.isLoadingCosts) return;
    this.isLoadingCosts = true;
    this.costsError = false;
    const sub = this._analyticsService.getCostsAnalysis().subscribe({
      next: (res: ApiResponse<CostsAnalysisData>) => {
        this.costsAnalysis = res.success !== false ? res.data ?? null : null;
        this.costsError = !this.costsAnalysis?.totalCosts;
        this.isLoadingCosts = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.costsError = true;
        this.isLoadingCosts = false;
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  getRevenueExpenses(): void {
    if (this.isLoadingChart) return;
    this.isLoadingChart = true;
    this.chartError = false;
    const sub = this._analyticsService.getRevenueExpenses().subscribe({
      next: (res: ApiResponse<RevenueExpensesData>) => {
        this.isLoadingChart = false;
        this.revenueExpenses = res.success !== false ? res.data ?? null : null;
        this.chartError = !this.revenueExpenses;
        const rawMonths = this.revenueExpenses?.months;
        const currency = this.revenueExpenses?.currency;
        const months = Array.isArray(rawMonths) ? rawMonths : [];
        const valid = Array.isArray(rawMonths) && typeof currency === 'string' && currency.trim().length > 0 && months.every(item => item && typeof item.monthName === 'string' && item.monthName.trim() && item.currency === currency && Number.isFinite(item.expenses) && Number.isFinite(item.revenue));
        this.monthlyRows = valid ? months : [];
        this.monthlyChartMessage = valid ? '' : 'تعذّر عرض الرسم: بيانات الأشهر أو عملاتها غير مكتملة أو غير متوافقة مع عملة التقرير.';
        this.barChartData = {
          labels: this.monthlyRows.map(item => item.monthName),
          datasets: [
            { ...this.barChartData.datasets[0], data: this.monthlyRows.map(item => item.expenses) },
            { ...this.barChartData.datasets[1], data: this.monthlyRows.map(item => item.revenue) }
          ]
        };
        this._cdr.markForCheck();
        this.updateLineChart();
      },
      error: () => {
        this.chartError = true;
        this.isLoadingChart = false;
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  // دوال تنسيق العمليات
  getOperationIcon(type: string): string {
    switch (type) {
      case 'TeacherRegistrationSubmitted':
        return 'how_to_reg';
      case 'TeacherCreated':
        return 'person_add';
      case 'StudentCreated':
        return 'school';
      default:
        return 'notifications_active';
    }
  }

  getOperationTypeLabel(type: string): string {
    switch (type) {
      case 'TeacherRegistrationSubmitted':
        return 'طلب تسجيل';
      case 'TeacherCreated':
        return 'تم التفعيل';
      default:
        return 'عملية جديدة';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
