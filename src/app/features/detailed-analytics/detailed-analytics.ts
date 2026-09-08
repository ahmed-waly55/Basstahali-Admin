import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType, registerables, Chart } from 'chart.js';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics';

// تسجيل مكونات Chart.js الإجبارية للإصدارات الحديثة
Chart.register(...registerables);

type ReportType = 'teachers' | 'students' | 'subjects' | 'courses' | 'curricula' | 'periods';

@Component({
  selector: 'app-detailed-analytics',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    BaseChartDirective
  ],
  templateUrl: './detailed-analytics.html',
  styleUrl: './detailed-analytics.css'
})
export class DetailedAnalytics implements OnInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private querySubscription?: Subscription;

  activeTab = signal<ReportType>('teachers');
  reportData = signal<any>(null);
  isLoading = signal<boolean>(false);

  // إعدادات الشارت المتجاوبة
  public barChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  ngOnInit(): void {
    this.fetchData('teachers');
  }

  ngOnDestroy(): void {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
  }

  onTabChange(index: number) {
    const tabs: ReportType[] = ['teachers', 'students', 'subjects', 'courses', 'curricula', 'periods'];
    const selected = tabs[index];
    this.activeTab.set(selected);
    this.fetchData(selected);
  }

  fetchData(type: ReportType) {
    this.isLoading.set(true);

    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }

    let request$;

    switch (type) {
      case 'teachers':
        request$ = this.analyticsService.getTeachersProfitReports();
        break;
      case 'students':
        request$ = this.analyticsService.getStudentsProfitReports();
        break;
      case 'subjects':
        request$ = this.analyticsService.getSubjectsProfitReports();
        break;
      case 'courses':
        request$ = this.analyticsService.getCoursesProfitReports();
        break;
      case 'curricula':
        request$ = this.analyticsService.getcurriculaProfitReports();
        break;
      case 'periods':
        request$ = this.analyticsService.getPeriodsProfitReports();
        break;
    }

    if (request$) {
      this.querySubscription = request$.subscribe({
        next: (res) => {
          const actualData = res?.data || res;
          this.reportData.set(actualData);
          this.updateChart(actualData, type);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error fetching report', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  updateChart(data: any, type: string) {
    if (!data || !data.items || !Array.isArray(data.items)) {
      this.barChartData = { labels: [], datasets: [] };
      return;
    }

    const labels = data.items.map((item: any) => item.name || item.period || item.title || 'عنصر');

    if (type === 'periods') {
      this.barChartData = {
        labels: labels,
        datasets: [
          { data: data.items.map((i: any) => i.realizedRevenue || 0), label: 'الإيرادات المحققة', backgroundColor: '#4f46e5' },
          { data: data.items.map((i: any) => i.netProfit || i.grossProfit || 0), label: 'صافي الربح', backgroundColor: '#10b981' }
        ]
      };
    } else {
      this.barChartData = {
        labels: labels,
        datasets: [
          { data: data.items.map((i: any) => i.realizedRevenue || i.revenue || 0), label: 'الإيرادات', backgroundColor: '#6366f1' },
          { data: data.items.map((i: any) => i.grossProfit || i.netProfit || 0), label: 'إجمالي الربح', backgroundColor: '#34d399' }
        ]
      };
    }
  }
}
