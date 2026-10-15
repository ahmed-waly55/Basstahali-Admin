import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}


@Component({
  selector: 'app-sidebar',
  imports: [CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

navItems: NavItem[] = [
  { label: 'الرئيسية', route: '/home', icon: 'dashboard' },
  { label: 'المستخدمين والصلاحيات', route: '/users', icon: 'group',  },
  { label: 'طلبات المدرسين', route: '/teacher-forms', icon: 'group',  },
  { label: 'عمليات الإدارة', route: '/admin-operations', icon: 'admin_panel_settings' },
  { label: 'جداول الطلاب', route: '/student-schedules', icon: 'calendar_month' },
  { label: 'التقارير والإحصائيات', route: '/analytics', icon: 'analytics',  },
  { label: 'الإحصائيات بالتفصيل', route: '/detailed-analytics', icon: 'bar_chart',  },
  { label: 'الكورسات', route: '/courses', icon: 'school' },
  { label: 'المناهج', route: '/curriculum', icon: 'menu_book' },
  { label: 'رواتب المعلمين', route: '/teacher-salaries', icon: 'payments' },
  { label: 'المصروفات', route: '/expenses', icon: 'receipt_long'  },
  { label: 'مالية الطلاب والأقساط', route: '/student-finance', icon: 'account_balance_wallet' },
  { label: 'الفترات والرواتب والشركاء', route: '/finance-management', icon: 'account_balance' },
  { label: 'الإعدادات العامة', route: '/settings', icon: 'settings'  },
  { label: 'سجل المستخدمين', route: '/audit-logs', icon: 'security' }
];

  logout(){
    localStorage.clear();
    window.location.href = '/login';
  }
}
