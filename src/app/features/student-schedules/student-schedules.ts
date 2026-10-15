import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { Account } from '../../core/services/account';
import { CoursesService } from '../../core/services/courses';
import { CurriculumService } from '../../core/services/curriculum-service';
import { User } from '../../core/services/user';
import { StudentSchedulesService } from '../../core/services/student-schedules';
import { CreateStudentSchedule, localScheduleDate, ScheduleOption, scheduleData, scheduleList, scheduleOptions, scheduleRecord, StudentSchedule, UpdateStudentSchedule } from '../../core/models/student-schedules';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-student-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTooltipModule],
  templateUrl: './student-schedules.html',
  styleUrl: './student-schedules.css',
})
export class StudentSchedules implements OnInit {
  private readonly service = inject(StudentSchedulesService);
  private readonly user = inject(User);
  private readonly account = inject(Account);
  private readonly curriculum = inject(CurriculumService);
  private readonly courseService = inject(CoursesService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private requestVersion = 0;
  private optionVersion = 0;

  readonly students = signal<ScheduleOption[]>([]);
  readonly allTeachers = signal<ScheduleOption[]>([]);
  readonly allSubjects = signal<ScheduleOption[]>([]);
  readonly allCourses = signal<ScheduleOption[]>([]);
  readonly studentTeachers = signal<ScheduleOption[] | null>(null);
  readonly studentSubjects = signal<ScheduleOption[] | null>(null);
  readonly studentCourses = signal<ScheduleOption[] | null>(null);
  readonly teachers = computed(() => this.studentTeachers() ?? this.allTeachers());
  readonly subjects = computed(() => this.studentSubjects() ?? this.allSubjects());
  readonly courses = computed(() => this.studentCourses() ?? this.allCourses());
  readonly rows = signal<StudentSchedule[]>([]);
  readonly loading = signal(false);
  readonly optionsLoading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal<string | null>(null);
  readonly deleteCandidate = signal<StudentSchedule | null>(null);
  readonly error = signal('');
  readonly lookupError = signal('');
  readonly success = signal('');
  readonly optionsNote = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<StudentSchedule | null>(null);
  readonly queue = signal<CreateStudentSchedule[]>([]);
  readonly searchText = signal('');
  selectedStudentId = '';
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  readonly filteredRows = computed(() => {
    const text = this.searchText().trim().toLocaleLowerCase();
    return this.rows().filter(row => [row.studentName, row.teacherName, row.subjectName, row.courseName, row.scheduledAt].join(' ').toLocaleLowerCase().includes(text));
  });

  readonly form = this.fb.nonNullable.group({
    teacherId: ['', Validators.required],
    subjectId: ['', Validators.required],
    scheduledAt: ['', Validators.required],
    durationMinutes: [60, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    classLink: ['', Validators.pattern(/^https?:\/\/\S+$/i)],
    studentCreditCost: [1, [Validators.required, Validators.min(0)]],
    courseId: [''],
  });

  ngOnInit(): void {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupError.set('');
    const fail = (err: unknown) => this.lookupError.set(this.message(err, 'تعذر تحميل بعض قوائم الطلاب أو المعلمين أو المواد. أعد المحاولة.'));
    const requests = [
      { source: this.user.getStudents(), target: this.students },
      { source: this.account.getTeachers(), target: this.allTeachers },
      { source: this.curriculum.getSubjects(), target: this.allSubjects },
      { source: this.courseService.getCourses(), target: this.allCourses },
    ];
    for (const request of requests) {
      request.source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (value: unknown) => {
          try { request.target.set(scheduleOptions(value)); }
          catch (err) { fail(err); }
        },
        error: fail,
      });
    }
  }

  studentChanged(): void {
    if (this.saving() || this.deleting()) return;
    this.cancelForm();
    this.success.set('');
    this.rows.set([]);
    this.studentTeachers.set(null);
    this.studentSubjects.set(null);
    this.studentCourses.set(null);
    this.optionsNote.set('');
    this.optionVersion++;
    this.requestVersion++;
    this.optionsLoading.set(false);
    this.loading.set(false);
    if (!this.selectedStudentId) return;
    this.loadStudentOptions();
    this.loadSchedules();
  }

  private loadStudentOptions(): void {
    const version = ++this.optionVersion;
    this.optionsLoading.set(true);
    this.service.options(this.selectedStudentId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { if (version === this.optionVersion) this.optionsLoading.set(false); }),
    ).subscribe({
      next: value => {
        if (version !== this.optionVersion) return;
        const data = scheduleRecord(scheduleData(value));
        for (const [key, target] of [['teachers', this.studentTeachers], ['subjects', this.studentSubjects], ['courses', this.studentCourses]] as const) {
          if (Array.isArray(data[key])) target.set(scheduleOptions(data[key]));
        }
        if (!Array.isArray(data['teachers']) && !Array.isArray(data['subjects'])) {
          this.optionsNote.set('تُعرض قوائم المعلمين والمواد العامة؛ يتحقق الخادم من صلاحية الاختيار للطالب عند الحفظ.');
        }
      },
      error: () => {
        if (version === this.optionVersion) this.optionsNote.set('تعذر تحميل خيارات الطالب. تُعرض القوائم العامة، ويتحقق الخادم من صلاحية الاختيارات عند الحفظ.');
      },
    });
  }

  loadSchedules(all = false): void {
    if (!all && !this.selectedStudentId) return;
    const version = ++this.requestVersion;
    this.loading.set(true);
    this.error.set('');
    this.deleteCandidate.set(null);
    const studentId = all ? '' : this.selectedStudentId;
    const request = all ? this.service.search() : this.service.forStudent(studentId);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      if (version === this.requestVersion) this.loading.set(false);
    })).subscribe({
      next: value => {
        if (version !== this.requestVersion) return;
        try { this.rows.set(scheduleList(value).map(item => this.readSchedule(item, studentId))); }
        catch (err) { this.rows.set([]); this.error.set(this.message(err, 'تعذر قراءة المواعيد.')); }
      },
      error: err => {
        if (version !== this.requestVersion) return;
        this.rows.set([]);
        this.error.set(this.message(err, 'تعذر تحميل المواعيد.'));
      },
    });
  }

  showAll(): void {
    this.selectedStudentId = '';
    this.optionVersion++;
    this.optionsLoading.set(false);
    this.studentTeachers.set(null);
    this.studentSubjects.set(null);
    this.studentCourses.set(null);
    this.cancelForm();
    this.success.set('');
    this.loadSchedules(true);
  }

  openForm(): void {
    if (!this.selectedStudentId) return;
    this.cancelForm();
    this.formOpen.set(true);
    this.success.set('');
  }

  cancelForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.editing.set(null);
    this.queue.set([]);
    this.form.reset({ durationMinutes: 60, studentCreditCost: 1 });
  }

  canEdit(row: StudentSchedule): boolean {
    return !!(row.studentId && row.teacherId && row.subjectId && row.recurrenceType && localScheduleDate(row.scheduledAt))
      && Number.isFinite(row.durationMinutes) && row.durationMinutes > 0 && Number.isFinite(row.studentCreditCost);
  }

  edit(row: StudentSchedule): void {
    if (!this.canEdit(row) || this.saving()) return;
    this.cancelForm();
    this.selectedStudentId = row.studentId;
    this.studentTeachers.set(null);
    this.studentSubjects.set(null);
    this.studentCourses.set(null);
    this.optionsNote.set('');
    this.loadStudentOptions();
    this.editing.set(row);
    this.form.setValue({ teacherId: row.teacherId, subjectId: row.subjectId, scheduledAt: localScheduleDate(row.scheduledAt), durationMinutes: row.durationMinutes, classLink: row.classLink, studentCreditCost: row.studentCreditCost, courseId: row.courseId ?? '' });
    this.formOpen.set(true);
    this.success.set('');
  }

  selectedOption(list: ScheduleOption[], id: string, fallback = ''): string {
    return list.find(item => item.id === id)?.name || fallback || id || '—';
  }

  /** Preserve selected IDs even when the API's current option lists no longer include them. */
  hasOption(list: ScheduleOption[], id: string): boolean {
    return list.some(item => item.id === id);
  }

  private createPayload(): CreateStudentSchedule | null {
    if (!this.selectedStudentId || this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    const value = this.form.getRawValue();
    const date = new Date(value.scheduledAt);
    if (Number.isNaN(date.getTime())) { this.form.controls.scheduledAt.setErrors({ date: true }); return null; }
    return {
      studentId: this.selectedStudentId,
      teacherId: value.teacherId,
      subjectId: value.subjectId,
      scheduledAt: date.toISOString(),
      durationMinutes: value.durationMinutes,
      classLink: value.classLink.trim(),
      studentCreditCost: value.studentCreditCost,
      recurrenceType: 'Once',
      sessionCount: 1,
      dayOfWeek: WEEKDAYS[date.getDay()],
      startTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`,
      ...(value.courseId ? { courseId: value.courseId } : {}),
    };
  }

  addToQueue(): void {
    const payload = this.createPayload();
    if (!payload || this.editing() || this.saving()) return;
    this.queue.update(items => [...items, payload]);
    this.form.controls.scheduledAt.reset('');
    this.error.set('');
  }

  removeQueued(index: number): void {
    if (!this.saving()) this.queue.update(items => items.filter((_, i) => i !== index));
  }

  save(batch = false): void {
    if (this.saving() || this.deleting() || this.optionsLoading()) return;
    const current = this.editing();
    const payload = batch ? null : this.createPayload();
    if (batch ? !this.queue().length : !payload) return;
    let request;
    if (batch) {
      request = this.service.createBatch({ studentId: this.selectedStudentId, items: this.queue().map(({ studentId, recurrenceEndDate, ...item }) => item) });
    } else if (current && payload) {
      const body: UpdateStudentSchedule = {
        studentId: current.studentId,
        teacherId: payload.teacherId,
        subjectId: payload.subjectId,
        scheduledAt: payload.scheduledAt,
        durationMinutes: payload.durationMinutes,
        classLink: payload.classLink,
        studentCreditCost: payload.studentCreditCost,
        recurrenceType: current.recurrenceType,
        ...(payload.courseId ? { courseId: payload.courseId } : {}),
        ...(current.recurrenceEndDate ? { recurrenceEndDate: current.recurrenceEndDate } : {}),
      };
      request = this.service.update(current.id, body);
    } else {
      request = this.service.create(payload!);
    }
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.form.disable();
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving.set(false); this.form.enable(); })).subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelForm();
        this.success.set(batch ? 'تم حفظ مجموعة المواعيد بنجاح.' : current ? 'تم تحديث الموعد بنجاح.' : 'تمت إضافة الموعد بنجاح.');
        this.loadSchedules();
      },
      error: err => this.error.set(this.message(err, 'تعذر حفظ الموعد. راجع البيانات وحاول مرة أخرى.')),
    });
  }

  confirmDelete(): void {
    const row = this.deleteCandidate();
    if (!row || this.saving() || this.deleting()) return;
    this.deleting.set(row.id);
    this.error.set('');
    this.success.set('');
    this.service.delete(row.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deleting.set(null))).subscribe({
      next: () => {
        this.deleteCandidate.set(null);
        this.success.set('تم حذف الموعد بنجاح.');
        this.loadSchedules(!this.selectedStudentId);
      },
      error: err => this.error.set(this.message(err, 'تعذر حذف الموعد.')),
    });
  }

  private readSchedule(value: unknown, fallbackStudentId: string): StudentSchedule {
    const row = scheduleRecord(value);
    const text = (key: string) => typeof row[key] === 'string' ? row[key] as string : '';
    if (!text('id') || !text('scheduledAt')) throw new Error('استجابة المواعيد لا تتضمن المعرّف أو تاريخ الحصة. يلزم التحقق من صيغة استجابة الخادم.');
    const studentId = text('studentId') || fallbackStudentId;
    const teacherId = text('teacherId');
    const subjectId = text('subjectId');
    return {
      id: text('id'), studentId, teacherId, subjectId, scheduledAt: text('scheduledAt'),
      durationMinutes: typeof row['durationMinutes'] === 'number' ? row['durationMinutes'] : NaN,
      studentCreditCost: typeof row['studentCreditCost'] === 'number' ? row['studentCreditCost'] : NaN,
      classLink: text('classLink'), recurrenceType: text('recurrenceType'),
      ...(text('recurrenceEndDate') ? { recurrenceEndDate: text('recurrenceEndDate') } : {}),
      ...(text('courseId') ? { courseId: text('courseId') } : {}),
      studentName: text('studentName') || this.selectedOption(this.students(), studentId),
      teacherName: text('teacherName') || this.selectedOption(this.allTeachers(), teacherId),
      subjectName: text('subjectName') || this.selectedOption(this.allSubjects(), subjectId),
      courseName: text('courseName'),
    };
  }

  private message(error: unknown, fallback: string): string {
    const record = scheduleRecord(error);
    const body = scheduleRecord(record['error']);
    return [body['message'], body['title'], record['message']].find(value => typeof value === 'string') as string || fallback;
  }
}
