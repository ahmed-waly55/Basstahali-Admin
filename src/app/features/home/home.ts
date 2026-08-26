import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartOptions,
  ChartType,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

// 🛑 خطوة إجبارية لتشغيل الـ Charts في الإصدارات الحديثة
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    BaseChartDirective
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {

  transactions = [
    { title: 'تسجيل طالب جديد', subtitle: 'أحمد محمود', amount: '+ SAR 1,200', date: 'اليوم', type: 'income', icon: 'person_add' },
    { title: 'فاتورة صيانة', subtitle: 'شركة التقنية', amount: '- SAR 450', date: 'أمس', type: 'expense', icon: 'receipt_long' },
    { title: 'قسط دراسي', subtitle: 'فاطمة علي', amount: '+ SAR 2,500', date: 'منذ يومين', type: 'income', icon: 'account_balance_wallet' },
    { title: 'شراء مواد تعليمية', subtitle: 'مكتبة المعرفة', amount: '- SAR 850', date: 'منذ 3 أيام', type: 'expense', icon: 'menu_book' },
  ];

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

  public barChartType: ChartType = 'bar';

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['مايو', 'أبريل', 'مارس', 'فبراير', 'يناير'],
    datasets: [
      {
        data: [12000, 15000, 11000, 13000, 10000],
        label: 'المصروفات',
        backgroundColor: '#fed7d7',
        borderRadius: 6,
        barThickness: 24
      },
      {
        data: [35000, 28000, 38000, 32000, 26000],
        label: 'الدخل',
        backgroundColor: '#311060',
        borderRadius: 6,
        barThickness: 24
      }
    ]
  };

}
