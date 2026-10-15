import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-users-component',
  imports: [RouterOutlet, RouterLink, MatIconModule],
  templateUrl: './users-component.html',
  styleUrl: './users-component.css',
})
export class UsersComponent {
  private readonly router = inject(Router);
  readonly isMainUsersPage = signal(true);
  readonly sections = [
    { title: 'الطلاب', description: 'عرض ملفات الطلاب وبياناتهم وإدارة حساباتهم.', icon: 'school', route: 'students', action: 'إدارة الطلاب' },
    { title: 'المعلمون', description: 'بيانات المعلمين وحساباتهم وتفاصيل التواصل.', icon: 'badge', route: 'teachers', action: 'إدارة المعلمين' },
    { title: 'المشرفون', description: 'متابعة حسابات المشرفين وتحديث بياناتهم.', icon: 'admin_panel_settings', route: 'admins', action: 'إدارة المشرفين' },
    { title: 'تقارير المستخدمين', description: 'مراجعة إحصاءات المستخدمين ونشاط الحسابات.', icon: 'insights', route: 'reports', action: 'عرض التقارير' }
  ];

  constructor() {
    this.checkRoute(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(event => this.checkRoute(event.urlAfterRedirects));
  }

  private checkRoute(url: string): void {
    const segments = url.split(/[?#]/)[0].split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    this.isMainUsersPage.set(lastSegment === 'users' || !lastSegment);
  }
}
