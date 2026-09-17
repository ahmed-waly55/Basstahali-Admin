import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuditLogs } from '../../core/services/audit-logs';

export interface LogItem {
  id: string;
  actorName?: string | null;
  actorUserName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress: string;
  createdAt: string;
}

export interface SystemHealthState {
  isLive: boolean;
  message: string;
  statusCode?: number;
  checkedAt: Date | null;
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
})
export class Audit implements OnInit {
  private _auditLogs = inject(AuditLogs);

  logsData = signal<LogItem[]>([]);
  isLoading = signal<boolean>(false);
  activeTab = signal<'audit' | 'academic' | 'health'>('audit');

  // حالة فحص الخادم (Health / Live)
  systemHealth = signal<SystemHealthState>({
    isLive: false,
    message: 'جاري التحقق من الخادم...',
    checkedAt: null
  });
  isHealthLoading = signal<boolean>(false);

  selectedLog = signal<LogItem | null>(null);
  isModalOpen = signal<boolean>(false);
  searchTerm = signal<string>('');

  filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const logs = this.logsData();
    if (!term) return logs;

    return logs.filter(log =>
      (log.actorName?.toLowerCase().includes(term)) ||
      (log.action?.toLowerCase().includes(term)) ||
      (log.entityType?.toLowerCase().includes(term)) ||
      (log.ipAddress?.includes(term))
    );
  });

  ngOnInit(): void {
    this.loadLogs();
    this.checkHealthLive();
  }

  switchTab(tab: 'audit' | 'academic' | 'health'): void {
    this.activeTab.set(tab);
    if (tab === 'health') {
      this.checkHealthLive();
    } else {
      this.loadLogs();
    }
  }

  loadLogs(): void {
    if (this.activeTab() === 'audit') {
      this.fetchAuditLogs();
    } else if (this.activeTab() === 'academic') {
      this.fetchAcademicOperationsLogs();
    }
  }

  fetchAuditLogs(): void {
    this.isLoading.set(true);
    this._auditLogs.getAuditLogs().subscribe({
      next: (res: any) => {
        const data = res?.data?.items || res?.data || res || [];
        this.logsData.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching audit logs', err);
        this.isLoading.set(false);
      }
    });
  }

  fetchAcademicOperationsLogs(): void {
    this.isLoading.set(true);
    const serviceMethod = (this._auditLogs as any).getAcademicOperationsLogs
      ? (this._auditLogs as any).getAcademicOperationsLogs()
      : this._auditLogs.getAuditLogs();

    serviceMethod.subscribe({
      next: (res: any) => {
        const data = res?.data?.items || res?.data || res || [];
        this.logsData.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching academic operations logs', err);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * دالة فحص الـ Endpoint health/live
   */
  checkHealthLive(): void {
    this.isHealthLoading.set(true);
    this._auditLogs.getHealthLive().subscribe({
      next: (res: any) => {
        let msg = 'الخادم يعمل بصحة جيدة (Live)';
        if (typeof res === 'string') {
          msg = res;
        } else if (res?.status || res?.message) {
          msg = res.status || res.message;
        }

        this.systemHealth.set({
          isLive: true,
          message: msg,
          statusCode: 200,
          checkedAt: new Date(),
        });
        this.isHealthLoading.set(false);
      },
      error: (err: any) => {
        this.systemHealth.set({
          isLive: false,
          message: err.error?.message || err.statusText || 'تعذر الاتصال بالخادم (Unhealthy / Offline)',
          statusCode: err.status || 500,
          checkedAt: new Date(),
        });
        this.isHealthLoading.set(false);
      }
    });
  }

  getActionBadgeClass(action: string): string {
    if (!action) return 'bg-gray-100 text-gray-700 border-gray-200';

    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'SUCCESS':
      case 'LOGIN':
      case 'SESSIONSERIESCREATED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
      case 'MODIFY':
      case 'STUDENTCREDITADJUSTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE':
      case 'REMOVE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  }

  openDetailsModal(log: LogItem): void {
    this.selectedLog.set(log);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedLog.set(null);
  }
}
