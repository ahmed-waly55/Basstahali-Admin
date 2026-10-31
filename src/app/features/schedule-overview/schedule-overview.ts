import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ScheduleOverviewService } from '../../core/services/schedule-overview';
import { cairoTodayKey, ScheduleOverview, ScheduleOverviewItem, scheduleClockLabel, scheduleDateKeys, scheduleDateLabel, scheduleStatusLabel, safeScheduleUrl } from '../../core/models/schedule-overview';

type ScheduleView = 'day' | 'list';

@Component({
  selector: 'app-schedule-overview', standalone: true,
  imports: [CommonModule, A11yModule, FormsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './schedule-overview.html', styleUrl: './schedule-overview.css',
})
export class ScheduleOverviewComponent implements OnInit {
  private service = inject(ScheduleOverviewService);
  private destroyRef = inject(DestroyRef);
  readonly data = signal<ScheduleOverview | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly query = signal('');
  readonly teacher = signal('');
  readonly student = signal('');
  readonly status = signal('');
  readonly view = signal<ScheduleView>('day');
  readonly selectedDate = signal('');
  readonly selectedSession = signal<ScheduleOverviewItem | null>(null);
  readonly dateLabel = scheduleDateLabel;
  readonly clockLabel = scheduleClockLabel;
  readonly statusLabel = scheduleStatusLabel;
  readonly safeUrl = safeScheduleUrl;
  readonly items = computed(() => this.data()?.items ?? []);
  readonly dates = computed(() => [...new Set([
    ...scheduleDateKeys(this.data()?.weekStart ?? '', this.data()?.weekEnd ?? ''),
    ...this.items().map(item => item.dateKey),
  ])].sort());
  readonly teachers = computed(() => [...new Set(this.items().map(item => item.teacherName))].sort((a,b) => a.localeCompare(b,'ar')));
  readonly students = computed(() => [...new Set(this.items().map(item => item.studentName))].sort((a,b) => a.localeCompare(b,'ar')));
  readonly statuses = computed(() => [...new Set(this.items().map(item => item.status))].filter(Boolean));
  readonly filtered = computed(() => {
    const terms = normalize(this.query()).split(/\s+/).filter(Boolean);
    return this.items().filter(item => (!this.teacher() || item.teacherName === this.teacher()) &&
      (!this.student() || item.studentName === this.student()) && (!this.status() || item.status === this.status()) &&
      terms.every(term => normalize(`${item.subject} ${item.studentName} ${item.teacherName}`).includes(term)));
  });
  readonly displayed = computed(() => this.filtered().filter(item => this.view() === 'list' || item.dateKey === this.selectedDate()));
  readonly timeGroups = computed(() => {
    const groups = new Map<number, ScheduleOverviewItem[]>();
    for (const item of this.displayed()) {
      const group = groups.get(item.startMinutes) ?? []; group.push(item); groups.set(item.startMinutes,group);
    }
    return [...groups].sort(([a],[b]) => a-b).map(([minutes,items]) => ({minutes,items}));
  });
  readonly counts = computed(() => ({
    total: this.items().length,
    live: this.items().filter(item => item.isLive).length,
    pending: this.items().filter(item => item.status.toLowerCase() === 'attendancepending').length,
    completed: this.items().filter(item => item.status.toLowerCase() === 'completed').length,
  }));
  readonly hasFilters = computed(() => !!(this.query() || this.teacher() || this.student() || this.status()));

  ngOnInit(): void { this.load(); }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.service.getSchedule().pipe(finalize(() => this.loading.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.data.set(data);
        const dates = this.dates();
        if (!dates.includes(this.selectedDate())) {
          this.selectedDate.set(dates.includes(cairoTodayKey()) ? cairoTodayKey() : data.items[0]?.dateKey ?? dates[0] ?? '');
        }
        if (this.teacher() && !this.teachers().includes(this.teacher())) this.teacher.set('');
        if (this.student() && !this.students().includes(this.student())) this.student.set('');
        if (this.status() && !this.statuses().includes(this.status())) this.status.set('');
      },
      error: error => this.error.set(error instanceof Error ? error.message : 'تعذر تحميل جدول الأكاديمية. حاول مرة أخرى.'),
    });
  }
  clearFilters(): void { this.query.set('');this.teacher.set('');this.student.set('');this.status.set(''); }
  countForDate(date: string): number { return this.filtered().filter(item => item.dateKey === date).length; }
  themeClass(item: ScheduleOverviewItem): string { return ['blue','orange','emerald'].includes(item.colorTheme) ? `theme-${item.colorTheme}` : 'theme-purple'; }
  openDetails(item: ScheduleOverviewItem): void { this.selectedSession.set(item); }
  closeDetails(): void { this.selectedSession.set(null); }
  viewKey(event: KeyboardEvent): void {
    if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); this.view.set(event.key === 'Home' ? 'day' : event.key === 'End' ? 'list' : this.view() === 'day' ? 'list' : 'day');
      requestAnimationFrame(() => document.getElementById(`schedule-view-${this.view()}`)?.focus());
    }
  }
}
function normalize(value: string): string { return value.toLocaleLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').trim(); }
