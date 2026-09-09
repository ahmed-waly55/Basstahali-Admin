import { Component, EventEmitter, Input, Output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Notifications } from '../../../core/services/notifications';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  @Input() isSidebarOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  userName: string | null = localStorage.getItem('user');

  private notificationsService = inject(Notifications);

  notificationsList = signal<any[]>([]);
  unreadCount = signal<number>(0);

  ngOnInit(): void {
    this.loadNotifications();
  }

  // جلب الإشعارات
  loadNotifications() {
    this.notificationsService.getNotifications().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          // استخراج الـ items والـ unreadCount مباشرة من الـ Response الخاص بك
          const items = response.data.items || [];
          this.notificationsList.set(items);
          this.unreadCount.set(response.data.unreadCount ?? 0);
        }
      },
      error: (err) => {
        console.error('Error loading notifications', err);
      }
    });
  }

  // تحديد إشعار معين كمقروء عند النقر عليه
  onMarkAsRead(id: string) {
    this.notificationsService.markAsRead(id).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => console.error('Error marking notification as read', err)
    });
  }

  // تحديد كل الإشعارات كمقروءة
  onMarkAllAsRead() {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => console.error('Error marking all as read', err)
    });
  }
}
