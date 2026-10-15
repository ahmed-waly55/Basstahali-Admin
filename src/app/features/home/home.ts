import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
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
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { AnalyticsService } from '../../core/services/analytics';
import { ThemeService } from '../../core/services/theme';

// تسجيل مكونات Chart.js
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

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
    { title: 'جداول الحصص', detail: 'المواعيد والحضور', icon: 'calendar_month', route: '/student-schedules' },
    { title: 'مالية الطلاب', detail: 'المدفوعات والأقساط', icon: 'account_balance_wallet', route: '/student-finance' },
    { title: 'طلبات المدرسين', detail: 'مراجعة طلبات التسجيل', icon: 'how_to_reg', route: '/teacher-forms' }
  ];

  get isRefreshing(): boolean {
    return this.isLoadingUsers || this.isLoadingCosts || this.isLoadingChart || this.isLoadingOperations;
  }

  // نوع المخطط الثابت
  public readonly barChartType: 'bar' = 'bar';

  public barChartOptions: ChartOptions<'bar'> = this.createChartOptions(false);

  constructor() {
    effect(() => {
      const dark = this._theme.isDark();
      this.barChartOptions = this.createChartOptions(dark);
      this.barChartData = {
        ...this.barChartData,
        datasets: this.barChartData.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: index === 0 ? '#efb935' : (dark ? '#b699ed' : '#6241a5')
        }))
      };
    });
  }

  private createChartOptions(dark: boolean): ChartOptions<'bar'> {
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
        this.users = res.success !== false ? res.data ?? null : null;
        this.usersError = !this.users;
        this.isLoadingUsers = false;
        this._cdr.markForCheck();
      },
      error: () => {
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
        const months = this.revenueExpenses?.months ?? [];
        this.barChartData = {
          labels: months.map(item => item.monthName),
          datasets: [
            { ...this.barChartData.datasets[0], data: months.map(item => item.expenses) },
            { ...this.barChartData.datasets[1], data: months.map(item => item.revenue) }
          ]
        };
        this._cdr.markForCheck();
        this.chart?.update();
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
