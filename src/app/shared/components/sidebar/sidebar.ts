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
  // مصفوفة الأقسام والروابط
  navSections: NavSection[] = [
    {
      title: 'القائمة الرئيسية',
      items: [
        { label: 'الرئيسية', route: '/home', icon: 'dashboard' },
        { label: 'المستخدمين والصلاحيات', route: '/users', icon: 'group' },
        { label: 'التقارير والإحصائيات', route: '/analytics', icon: 'analytics' }
      ]
    },
    {
      title: 'النظام',
      items: [
        { label: 'الإعدادات العامة', route: '/settings', icon: 'settings' },
        { label: 'الأمان والحماية', route: '/security', icon: 'security' }
      ]
    }
  ];



  logout(){
    localStorage.clear();
    window.location.href = '/login';
  }
}
