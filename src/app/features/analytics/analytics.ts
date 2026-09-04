import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';

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
export class Analytics implements OnInit {
  private analytics = inject(AnalyticsService);

  // Metrics data variables
  revenue: any = null;
  costs: any = null;
  netProfit: any = null;

  // Tables data variables
  transactions: any[] = [];
  studentPayments: any[] = [];
  studentProfitability: any[] = [];

  // Table columns definition
  displayedColumnsTransactions: string[] = ['type', 'amount', 'direction', 'description', 'createdAt'];
  displayedColumnsPayments: string[] = ['studentName', 'amount', 'paymentMethod', 'status', 'recordedByName', 'paidAt'];
  displayedColumnsProfitability: string[] = ['studentName', 'totalPaid', 'totalCost', 'netProfit', 'profitMargin'];

  ngOnInit(): void {
    this.loadAllAnalyticsData();
  }

  loadAllAnalyticsData(): void {
    // 1. Revenue Analysis
    this.analytics.getRevenueAnalysis().subscribe((res: any) => {
      this.revenue = res?.data || res;
    });

    // 2. Costs Analysis
    this.analytics.getCostsAnalysis().subscribe((res: any) => {
      this.costs = res?.data || res;
    });

    // 3. Net Profit Analysis
    this.analytics.getNetProfitAnalysis().subscribe((res: any) => {
      this.netProfit = res?.data || res;
    });

    // 4. Financial Transactions
    this.analytics.getFinancialTransactions().subscribe((res: any) => {
      this.transactions = res?.data || res;
    });

    // 5. Student Payments
    this.analytics.getStudentPayments().subscribe((res: any) => {
      const responseData = res?.data || res;
      // Handle paginated or direct array responses
      this.studentPayments = responseData?.items ? responseData.items : responseData;
    });

    // 6. Student Profitability Analysis
    this.analytics.getStudentProfitabilityAnalysis().subscribe((res: any) => {
      const responseData = res?.data || res;
      this.studentProfitability = responseData?.items ? responseData.items : responseData;
    });
  }
}
