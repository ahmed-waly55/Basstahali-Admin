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
  { label: 'التقارير والإحصائيات', route: '/analytics', icon: 'analytics',  },
  { label: 'الإحصائيات بالتفصيل', route: '/detailed-analytics', icon: 'bar_chart',  },
  { label: 'الكورسات', route: '/courses', icon: 'school' },
  { label: 'المناهج', route: '/curriculum', icon: 'menu_book' },
  { label: 'رواتب المعلمين', route: '/teacher-salaries', icon: 'payments' },
  { label: 'المصروفات', route: '/expenses', icon: 'receipt_long'  },
  { label: 'الإعدادات العامة', route: '/settings', icon: 'settings'  },
  { label: 'سجل المستخدمين', route: '/audit-logs', icon: 'security' }
];

  logout(){
    localStorage.clear();
    window.location.href = '/login';
  }
}
