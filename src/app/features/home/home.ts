import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
    MatIconModule,
    MatButtonModule,
    BaseChartDirective
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private readonly _analyticsService = inject(AnalyticsService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();

  // 1. المستخدمين
  users: HomeUsersData | null = null;
  isLoadingUsers = false;

  // 2. العمليات الأخيرة
  recentOperations: RecentOperation[] = [];
  isLoadingOperations = false;

  // 3. تحليل التكاليف (من getCostsAnalysis)
  costsAnalysis: CostsAnalysisData | null = null;

  // 4. القيم المالية الموحدة
  totalRevenue: number = 0;
  totalExpenses: number = 0;
  currency: string = 'EGP';
  isLoadingChart = false;

  // صافي الربح ونسب شريط التقدم
  get netProfit(): number {
    return this.totalRevenue - this.totalExpenses;
  }

  get expensesPercentage(): number {
    const total = this.totalRevenue + this.totalExpenses;
    return total > 0 ? Math.min(100, Math.round((this.totalExpenses / total) * 100)) : 0;
  }

  get revenuePercentage(): number {
    const total = this.totalRevenue + this.totalExpenses;
    return total > 0 ? Math.min(100, Math.round((this.totalRevenue / total) * 100)) : (this.totalRevenue > 0 ? 100 : 0);
  }

  // نوع المخطط الثابت
  public readonly barChartType: 'bar' = 'bar';

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        rtl: true,
        labels: {
          font: { family: 'Tajawal, sans-serif', size: 12 },
          usePointStyle: true,
          boxWidth: 8
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Tajawal, sans-serif' } }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    }
  };

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'المصروفات',
        backgroundColor: '#fed7d7',
        borderRadius: 6,
        barThickness: 16
      },
      {
        data: [],
        label: 'الدخل',
        backgroundColor: '#311060',
        borderRadius: 6,
        barThickness: 16
      }
    ]
  };

  ngOnInit(): void {
    this.getUsers();
    this.getCostsAnalysis();     // جلب تفاصيل المصاريف وتحديث كارت النفقات
    this.getRevenueExpenses();   // جلب الرسم البياني والإيرادات
    this.getRecentOperations();  // جلب العمليات الأخيرة
  }

  getUsers(): void {
    this.isLoadingUsers = true;
    const sub = this._analyticsService.getHomeUsers().subscribe({
      next: (res: ApiResponse<HomeUsersData>) => {
        this.users = res.data ?? null;
        this.isLoadingUsers = false;
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.isLoadingUsers = false;
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  getRecentOperations(): void {
    this.isLoadingOperations = true;
    const sub = this._analyticsService.getRecentOperations().subscribe({
      next: (res: ApiResponse<RecentOperation[]>) => {
        this.recentOperations = res.data ?? [];
        this.isLoadingOperations = false;
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching recent operations:', err);
        this.isLoadingOperations = false;
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  // 1. جلب تحليل التكاليف والمصاريف بدقة
  getCostsAnalysis(): void {
    const sub = this._analyticsService.getCostsAnalysis().subscribe({
      next: (res: ApiResponse<CostsAnalysisData>) => {
        if (!res?.data) return;

        this.costsAnalysis = res.data;
        // أخذ إجمالي التكاليف المحدثة
        if (res.data.totalCosts) {
          this.totalExpenses = res.data.totalCosts.currentValue ?? 0;
          this.currency = res.data.totalCosts.currency ?? this.currency;
        }

        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching costs analysis:', err);
        this._cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  // 2. جلب الإيرادات والرسم البياني للشهور
  getRevenueExpenses(): void {
    this.isLoadingChart = true;
    const sub = this._analyticsService.getRevenueExpenses().subscribe({
      next: (res: ApiResponse<RevenueExpensesData>) => {
        this.isLoadingChart = false;
        if (!res?.data) {
          this._cdr.markForCheck();
          return;
        }

        const { totalRevenue, currency, months } = res.data;

        this.totalRevenue = totalRevenue ?? 0;
        this.currency = currency ?? this.currency;

        const labels: string[] = [];
        const expensesData: number[] = [];
        const revenueData: number[] = [];

        (months ?? []).forEach((item) => {
          labels.push(item.monthName);
          expensesData.push(item.expenses);
          revenueData.push(item.revenue);
        });

        this.barChartData = {
          labels: labels,
          datasets: [
            {
              ...this.barChartData.datasets[0],
              data: expensesData
            },
            {
              ...this.barChartData.datasets[1],
              data: revenueData
            }
          ]
        };

        this._cdr.markForCheck();
        this.chart?.update();
      },
      error: (err) => {
        console.error('Error fetching revenue/expenses:', err);
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

  getOperationColorClass(type: string): string {
    switch (type) {
      case 'TeacherRegistrationSubmitted':
        return 'bg-amber-50 text-amber-600';
      case 'TeacherCreated':
        return 'bg-indigo-50 text-indigo-600';
      default:
        return 'bg-slate-100 text-slate-600';
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
