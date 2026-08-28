import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter } from 'rxjs';


@Component({
  selector: 'app-users-component',
  imports: [CommonModule, RouterOutlet, RouterLink, MatIconModule, MatRippleModule],
  templateUrl: './users-component.html',
  styleUrl: './users-component.css',
})
export class UsersComponent {
private router = inject(Router);
  isMainUsersPage: boolean = true;

  constructor() {
    // مراقبة التنقل لمعرفة هل نحن في صفحة الـ users الرئيسية أم في صفحة ابن
    this.checkRoute(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).forEach((event: any) => {
      this.checkRoute(event.url);
    });
  }

  private checkRoute(url: string) {
    // لو الرابط بيحتوي على مسار فرعي بعد users (مثل /users/students)، اخفي الكروت
    // نفترض أن مسار الـ users عندك بيبدأ بـ /users
    const segments = url.split('?')[0].split('/').filter(Boolean);
    // لو عدد الـ segments أكبر من 1 (يعني مثلاً ['users', 'students']) يبقى دي صفحة الابن
    const lastSegment = segments[segments.length - 1];
    this.isMainUsersPage = (lastSegment === 'users' || !lastSegment);
  }

  sections = [
    { title: 'إدارة الطلاب', description: 'عرض ومتابعة حسابات الطلاب وصلاحياتهم', icon: 'school', route: 'students', color: 'bg-slate-50 text-blue-600 border-slate-200 hover:bg-blue-50/50', badge: 'جديد' },
    { title: 'إدارة المعلمون', description: 'التحكم في حسابات المعلمين والمواد الدراسية', icon: 'badge', route: 'teachers', color: 'bg-slate-50 text-emerald-600 border-slate-200 hover:bg-emerald-50/50', badge: null },
    { title: 'إدارة المشرفين', description: 'تحديد صلاحيات المشرفين وإدارة الأدوار', icon: 'admin_panel_settings', route: 'admins', color: 'bg-slate-50 text-purple-600 border-slate-200 hover:bg-purple-50/50', badge: 'حساس' },
    { title: 'التقارير والإحصائيات', description: 'تقارير أداء المستخدمين والنشاط اليومي', icon: 'analytics', route: 'reports', color: 'bg-slate-50 text-amber-600 border-slate-200 hover:bg-amber-50/50', badge: null }
  ];

}
