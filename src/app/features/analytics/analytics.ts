import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import * as XLSX from 'xlsx';

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

  // Table columns definition
  displayedColumnsTransactions: string[] = ['type', 'amount', 'direction', 'description', 'createdAt'];
  displayedColumnsPayments: string[] = ['studentName', 'amount', 'paymentMethod', 'status', 'recordedByName', 'paidAt'];
  displayedColumnsProfitability: string[] = ['studentName', 'totalPaid', 'sessionsReceived', 'totalCost', 'netProfit', 'profitMargin'];
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

  // دالة تصدير التقرير إلى إكسل (مع فصلها عن الـ Main Thread لمنع الـ Lag)
  exportToExcel(): void {
    setTimeout(() => {
      const transactionsWS = XLSX.utils.json_to_sheet(this.transactions.map(item => ({
        'نوع الحركة': item.type,
        'المبلغ': item.amount,
        'الاتجاه': item.direction === 'Credit' ? 'إيداع' : 'سحب',
        'الوصف': item.description,
        'التاريخ والوقت': item.createdAt
      })));

      const paymentsWS = XLSX.utils.json_to_sheet(this.studentPayments.map(item => ({
        'اسم الطالب': item.studentName,
        'المبلغ المدفوع': item.amount,
        'طريقة الدفع': item.paymentMethod,
        'الحالة': item.status,
        'مسجل بواسطة': item.recordedByName,
        'تاريخ الدفع': item.paidAt
      })));

      const profitabilityWS = XLSX.utils.json_to_sheet(this.studentProfitability.map(item => ({
        'اسم الطالب': item.fullName || 'غير متوفر',
        'إجمالي المدفوع': item.totalPaid,
        'عدد الجلسات': item.sessionsReceived,
        'إجمالي التكلفة': item.teacherCost,
        'صافي الربح': item.netProfit,
        'هامش الربح (%)': item.profitMarginPercentage
      })));

      const costsWS = XLSX.utils.json_to_sheet(this.costsTableData.map(item => ({
        'بند المصروفات والتكاليف': item.title,
        'القيمة الحالية': item.currentValue,
        'القيمة السابقة': item.previousValue,
        'نسبة التغير / النمو (%)': item.growthPercentage
      })));

      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, transactionsWS, 'الحركات المالية');
      XLSX.utils.book_append_sheet(workbook, paymentsWS, 'مدفوعات الطلاب');
      XLSX.utils.book_append_sheet(workbook, profitabilityWS, 'ربحية الطلاب');
      XLSX.utils.book_append_sheet(workbook, costsWS, 'المصروفات والتكاليف');

      const fileName = `Financial_Analytics_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
