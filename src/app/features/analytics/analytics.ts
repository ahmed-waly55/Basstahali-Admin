import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, signal } from '@angular/core';
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
import { Subject, take, takeUntil } from 'rxjs';
import { buildFinancialWorkbook, financialWorkbookFileName } from '../../core/utils/financial-workbook';

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
    MatTabsModule
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit, OnDestroy {
  private analytics = inject(AnalyticsService);
  private cdr = inject(ChangeDetectorRef); // حقن أداة تحديث الواجهة يدوياً

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
    // 1. Revenue Analysis
    this.analytics.getRevenueAnalysis()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.revenue = res?.data || res;
        this.cdr.markForCheck(); // إجبار الواجهة على التحديث فوراً عند استلام الداتا
      });

    // 2. Costs Analysis
    this.analytics.getCostsAnalysis()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const responseData = res?.data || res;
        this.costs = responseData;

        if (responseData) {
          this.costsTableData = [
            {
              title: 'مرتبات المعلمين (Teacher Salaries)',
              ...responseData.teacherSalaries
            },
            {
              title: 'المصروفات الأخرى (Other Expenses)',
              ...responseData.otherExpenses
            },
            {
              title: 'إجمالي التكاليف (Total Costs)',
              ...responseData.totalCosts
            }
          ];
        }
        this.cdr.markForCheck();
      });

    // 3. Net Profit Analysis
    this.analytics.getNetProfitAnalysis()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.netProfit = res?.data || res;
        this.cdr.markForCheck();
      });

    // 4. Financial Transactions
    this.analytics.getFinancialTransactions()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.transactions = res?.data || res;
        this.cdr.markForCheck();
      });

    // 5. Student Payments
    this.analytics.getStudentPayments()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const responseData = res?.data || res;
        this.studentPayments = responseData?.items ? responseData.items : responseData;
        this.cdr.markForCheck();
      });

    // 6. Student Profitability Analysis
    this.analytics.getStudentProfitabilityAnalysis()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const responseData = res?.data || res;
        this.studentProfitability = responseData?.items ? responseData.items : responseData;
        this.cdr.markForCheck();
      });
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
