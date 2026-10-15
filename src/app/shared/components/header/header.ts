import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, EventEmitter, HostListener, inject, Input, OnInit, Output, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { ADMIN_DESTINATIONS, adminPage, normalizeAdminSearch } from '../../../core/navigation/admin-navigation';
import { Notifications } from '../../../core/services/notifications';
import { RequestActivity } from '../../../core/services/request-activity';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector:'app-header', standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,MatButtonModule,MatIconModule,MatMenuModule,MatTooltipModule,MatDialogModule],
  templateUrl:'./header.html', styleUrl:'./header.css'
})
export class Header implements OnInit {
  @Input() isSidebarOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() navigationOpened = new EventEmitter<void>();
  @ViewChild('navigationDialog') navigationDialog!: TemplateRef<unknown>;
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);
  private notificationsService = inject(Notifications);
  private navigationRef: MatDialogRef<unknown> | null = null;
  readonly activity = inject(RequestActivity);
  readonly theme = inject(ThemeService);
  readonly currentPage = signal(adminPage(this.router.url));
  readonly userName = localStorage.getItem('user') || 'حساب الإدارة';
  readonly initials = this.userName.trim().slice(0,1) || 'إ';
  readonly notificationsList = signal<any[]>([]);
  readonly unreadCount = signal(0);
  readonly notificationsLoading = signal(false);
  readonly notificationsError = signal('');
  readonly notificationSaving = signal(false);
  readonly query = signal('');
  readonly activeResult = signal(0);
  readonly results = computed(() => {
    const terms = normalizeAdminSearch(this.query()).split(/\s+/).filter(Boolean);
    return ADMIN_DESTINATIONS.filter(item => {
      const text = normalizeAdminSearch(`${item.label} ${item.section} ${item.keywords ?? ''}`);
      return terms.every(term => text.includes(term));
    });
  });
  readonly displayDate = new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'long',timeZone:'Africa/Cairo'}).format(new Date());

  ngOnInit(): void {
    this.loadNotifications();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd),takeUntilDestroyed(this.destroyRef)).subscribe(() => this.currentPage.set(adminPage(this.router.url)));
  }
  @HostListener('document:keydown',['$event']) handleShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); this.openNavigation(); }
  }
  openNavigation(): void {
    if (this.navigationRef) return;
    this.query.set(''); this.activeResult.set(0);
    this.navigationOpened.emit();
    this.navigationRef = this.dialog.open(this.navigationDialog,{width:'580px',maxWidth:'calc(100vw - 28px)',direction:'rtl',autoFocus:'input',ariaLabel:'البحث في صفحات الإدارة',panelClass:'admin-navigation-dialog'});
    this.navigationRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.navigationRef = null);
  }
  search(value: string): void { this.query.set(value); this.activeResult.set(0); }
  navigate(route: string): void { this.navigationRef?.close(); void this.router.navigateByUrl(route); }
  searchKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeResult.set(count ? (this.activeResult() + (event.key === 'ArrowDown' ? 1 : -1) + count) % count : 0);
      requestAnimationFrame(() => document.getElementById(`admin-search-result-${this.activeResult()}`)?.scrollIntoView({block:'nearest'}));
    } else if (event.key === 'Enter' && count) { event.preventDefault(); this.navigate(this.results()[this.activeResult()].route); }
  }
  logout(): void { localStorage.removeItem('token'); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); void this.router.navigate(['/login']); }

  loadNotifications(): void {
    if (this.notificationsLoading()) return;
    this.notificationsLoading.set(true); this.notificationsError.set('');
    this.notificationsService.getNotifications().pipe(finalize(() => this.notificationsLoading.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (response?.success === false || !Array.isArray(response?.data?.items)) { this.notificationsError.set(response?.message || 'تعذر قراءة الإشعارات.'); return; }
        this.notificationsList.set(response.data.items); this.unreadCount.set(response.data.unreadCount ?? 0);
      },
      error: () => this.notificationsError.set('تعذر تحميل الإشعارات. حاول مجددًا.')
    });
  }
  onMarkAsRead(id: string): void {
    if (this.notificationSaving()) return;
    this.markNotification(this.notificationsService.markAsRead(id));
  }
  onMarkAllAsRead(): void {
    if (this.notificationSaving() || !this.unreadCount()) return;
    this.markNotification(this.notificationsService.markAllAsRead());
  }
  private markNotification(request: ReturnType<Notifications['markAsRead']>): void {
    this.notificationSaving.set(true);this.notificationsError.set('');
    request.pipe(finalize(() => this.notificationSaving.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => { if (response?.success === false) this.notificationsError.set(response.message || 'تعذر تحديث الإشعارات.'); else this.loadNotifications(); },
      error: () => this.notificationsError.set('تعذر تحديث الإشعارات. حاول مجددًا.')
    });
  }
}
