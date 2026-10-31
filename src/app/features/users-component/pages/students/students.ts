import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, DestroyRef, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, finalize, map, Observable, Subject } from 'rxjs';
import { loadDirectoryOptions } from '../../../../core/utils/directory-options';
import { DirectoryPage, DirectoryPageChange, parseDirectoryPage } from '../../../../core/models/directory-page';
import { DirectoryPaginator } from '../../../../shared/components/directory-paginator/directory-paginator';
import Swal from 'sweetalert2';
import { CurriculumService } from '../../../../core/services/curriculum-service';
import { Account } from '../../../../core/services/account';
import { CreateStudentPayload, UpdateStudentPayload } from '../../../../core/models/student';
import { User } from '../../../../core/services/user';

interface TeacherAssignment {
  subjectId: string;
  teacherId: string;
  teacherName: string;
  sessionPrice: number;
  currency: string;
}

interface SessionsInfo {
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
}

export interface Student {
  id: string;
  fullName: string;
  phoneNumber: string;
  parentName: string;
  parentPhoneNumber: string;
  gradeLevelId: string;
  educationStageId?: string | null;
  subjectIds?: string[];
  subjects?: { id: string }[];
  curriculumId: string;
  sessionCreditBalance: number;
  expirationDate: string | null;
  status: string;
  teacherAssignments: TeacherAssignment[];
  userName: string;
  userId: string;
  sessions?: SessionsInfo;
  requiresPasswordSetup: boolean;
  initialPasswordSetupToken: string | null;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    A11yModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    DirectoryPaginator,
    MatSortModule,
    MatTooltipModule,
    MatTableModule
  ],
  templateUrl: './students.html',
  styleUrl: './students.css',
})
export class Students implements OnInit {
  private user = inject(User);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private listVersion = 0;
  private detailVersion = 0;
  private curriculumService = inject(CurriculumService);
  private account = inject(Account);
  private destroyRef = inject(DestroyRef);

  private readonly searchChanges = new Subject<string>();
  private failedPage: DirectoryPageChange | null = null;
  private appliedSearch = '';
  private displayedSearch = '';
  readonly directory = signal<DirectoryPage<Student> | null>(null);
  readonly visibleStudents = signal<Student[]>([]);
  pageNumber = 1;
  pageSize = 20;
  get serverPaging(): boolean { return this.directory()?.serverPaged ?? true; }
  get totalCount(): number | null { return this.serverPaging ? this.directory()?.totalCount ?? null : this.dataSource.filteredData.length; }
  get totalPages(): number | null { return this.serverPaging ? this.directory()?.totalPages ?? null : Math.ceil(this.dataSource.filteredData.length / this.pageSize); }
  get hasPreviousPage(): boolean { return this.serverPaging ? this.directory()?.hasPreviousPage ?? false : this.pageNumber > 1; }
  get hasNextPage(): boolean { return this.serverPaging ? this.directory()?.hasNextPage ?? false : this.pageNumber < (this.totalPages ?? 0); }
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly detailsLoading = signal(false);
  readonly errorMessage = signal('');
  readonly editorError = signal('');
  readonly showArchived = signal(false);
  readonly curriculums = signal<any[]>([]);
  readonly gradeLevels = signal<any[]>([]);
  readonly subjects = signal<any[]>([]);
  readonly teachers = signal<any[]>([]);
  readonly creditTarget = signal<Student | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly subjectsNeedReview = signal(false);
  private creditKeys = new Map<string, string>();
  private originalExpiration: string | null = null;
  private originalExpirationInput = '';
  readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private uuidValidators = [Validators.required, Validators.pattern(this.uuidPattern)];

  readonly studentForm = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    parentName: [''],
    parentPhoneNumber: [''],
    curriculumId: ['', this.uuidValidators],
    gradeLevelId: ['', this.uuidValidators],
    educationStageId: ['', this.uuidValidators],
    subjectIds: this.fb.nonNullable.control<string[]>([]),
    expirationDate: [''],
    subjectsReviewed: [false],
    status: ['Active', Validators.required],
    teacherAssignments: this.fb.array([] as ReturnType<Students['assignmentGroup']>[])
  });
  readonly creditForm = this.fb.nonNullable.group({
    quantity: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    description: ['', Validators.required]
  });

  get assignments(): FormArray { return this.studentForm.controls.teacherAssignments; }

  private assignmentGroup(value?: Partial<TeacherAssignment>) {
    return this.fb.nonNullable.group({
      subjectId: [value?.subjectId ?? '', this.uuidValidators],
      teacherId: [value?.teacherId ?? '', this.uuidValidators],
      sessionPrice: [value?.sessionPrice ?? 0, [Validators.required, Validators.min(0)]],
      currency: [value?.currency ?? 'EGP', Validators.required]
    });
  }

  addAssignment(): void { this.assignments.push(this.assignmentGroup()); }
  removeAssignment(index: number): void { this.assignments.removeAt(index); }

  private unwrap(response: any): any {
    if (response?.success === false || response?.isSuccess === false) {
      throw new Error(response.message || 'رفض الخادم تنفيذ الطلب.');
    }
    return response?.data ?? response;
  }

  private list(response: any): any[] {
    const data = this.unwrap(response);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    throw new Error('تعذر قراءة قائمة البيانات من الخادم.');
  }

  private errorText(error: any): string {
    return error?.error?.message || error?.message || 'تعذر إتمام العملية. حاول مرة أخرى.';
  }

  private loadLookups(): void {
    const lookups: [Observable<any>, typeof this.subjects][] = [
      [this.curriculumService.getCurriculums(), this.curriculums],
      [this.curriculumService.getGradeLevels(), this.gradeLevels],
      [this.curriculumService.getSubjects(), this.subjects],
      [loadDirectoryOptions<any>(query => this.account.getTeachers(query)), this.teachers]
    ];
    for (const [request, target] of lookups) {
      request.pipe(map(res => this.list(res)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: data => target.set(data),
        error: () => this.editorError.set('تعذر تحميل بعض القوائم. أعد فتح النموذج للمحاولة مجددًا، ويمكن إدخال المعرّفات عند غياب القائمة.')
      });
    }
  }

  isModalOpen = false;
  isDetailsModalOpen = false;
  searchQuery = '';
  statusFilter = '';

  selectedStudent: Student | null = null;
  displayedColumns: string[] = ['fullName', 'phoneNumber', 'expirationDate', 'status', 'actions'];
  dataSource = new MatTableDataSource<Student>([]);

  @ViewChild(MatSort) set sort(value: MatSort) { this.dataSource.sort = value; this.refreshRows(); }

  get statusOptions(): string[] {
    return [...new Set([...this.dataSource.data.map(student => student.status), this.statusFilter].filter(Boolean))].sort();
  }

  statusLabel(status: string): string {
    return ({ Active: 'نشط', Inactive: 'غير نشط', Suspended: 'موقوف', Expired: 'منتهي' } as Record<string, string>)[status] || status || 'غير محدد';
  }

  fieldError(name: string): boolean {
    const control = this.studentForm.get(name);
    return !!control?.invalid && !!control?.touched;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (student, raw) => {
      const filter = JSON.parse(raw);
      const text = [student.fullName, student.userName, student.phoneNumber, student.parentName, student.parentPhoneNumber].join(' ').toLowerCase();
      return (!filter.status || student.status === filter.status) && (!filter.query || text.includes(filter.query));
    };
    this.dataSource.sortingDataAccessor = (student, field) => field === 'expirationDate' ? (Date.parse(student.expirationDate ?? '') || 0) : String(student[field as keyof Student] ?? '').toLowerCase();
    this.searchChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(query => {
      if (query !== this.searchQuery.trim()) return;
      this.appliedSearch = query; this.pageNumber = 1; this.getStudents();
    });
    this.getStudents();
  }

  getStudents(): void {
    const version = ++this.listVersion;
    const requestedPage = this.pageNumber;
    const requestedSize = this.pageSize;
    const previous = this.directory();
    this.failedPage = null;
    const query = { PageNumber: requestedPage, PageSize: this.pageSize, ...(this.appliedSearch ? { Search: this.appliedSearch } : {}) };
    this.loading.set(true); this.errorMessage.set('');
    const request = this.showArchived() ? this.user.getArchivedStudents(query) : this.user.getStudents(query);
    request.pipe(map(response => parseDirectoryPage<Student>(response, requestedPage, this.pageSize)), finalize(() => { if (version === this.listVersion) this.loading.set(false); }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => {
        if (version !== this.listVersion) return;
        if (page.serverPaged && page.totalPages !== null && requestedPage > Math.max(1,page.totalPages)) {
          this.pageNumber = Math.max(1,page.totalPages); this.getStudents(); return;
        }
        this.displayedSearch = this.appliedSearch;
        this.directory.set(page); this.pageNumber = page.pageNumber; this.pageSize = page.pageSize;
        this.dataSource.data = page.items; this.refreshRows();
      },
      error: error => {
        if (version !== this.listVersion) return;
        this.failedPage = {pageNumber:requestedPage,pageSize:requestedSize};
        if (this.appliedSearch !== this.displayedSearch) {
          this.directory.set(null); this.dataSource.data = []; this.visibleStudents.set([]); this.pageNumber = 1;
        } else if (previous) { this.pageNumber = previous.pageNumber; this.pageSize = previous.pageSize; }
        this.errorMessage.set(this.errorText(error));
      }
    });
  }

  retryStudents(): void {
    if (this.failedPage) { this.pageNumber = this.failedPage.pageNumber; this.pageSize = this.failedPage.pageSize; }
    this.getStudents();
  }

  changePage(change: DirectoryPageChange): void {
    if (this.loading() || this.saving()) return;
    this.pageNumber = change.pageSize !== this.pageSize ? 1 : change.pageNumber;
    this.pageSize = change.pageSize;
    if (this.serverPaging) this.getStudents(); else this.refreshRows();
  }

  searchStudents(): void {
    this.pageNumber = 1;
    if (this.serverPaging) {
      ++this.listVersion; this.loading.set(true); this.searchChanges.next(this.searchQuery.trim());
    } else this.refreshRows();
  }

  refreshRows(): void {
    this.dataSource.filter = JSON.stringify({ query: this.serverPaging ? '' : this.searchQuery.trim().toLowerCase(), status: this.statusFilter });
    const filtered = this.dataSource.filteredData;
    const rows = this.dataSource.sort?.active ? this.dataSource.sortData([...filtered], this.dataSource.sort) : [...filtered];
    if (!this.serverPaging) this.pageNumber = Math.min(this.pageNumber, Math.max(1,Math.ceil(rows.length/this.pageSize)));
    const offset = (this.pageNumber-1)*this.pageSize;
    this.visibleStudents.set(this.serverPaging ? rows : rows.slice(offset,offset+this.pageSize));
  }

  toggleArchive(): void {
    this.showArchived.update(value => !value); this.pageNumber = 1;
    this.searchQuery = ''; this.appliedSearch = ''; this.statusFilter = '';
    this.directory.set(null); this.dataSource.data = []; this.visibleStudents.set([]);
    this.getStudents();
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  applyFilter(): void { if (!this.serverPaging) this.pageNumber = 1; this.refreshRows(); }

  clearFilters(): void {
    const hadSearch = !!this.searchQuery || !!this.appliedSearch;
    this.searchQuery = ''; this.statusFilter = ''; this.pageNumber = 1;
    if (this.serverPaging && hadSearch) { this.appliedSearch = ''; this.getStudents(); }
    else this.refreshRows();
  }

  openModal(): void {
    this.editingId.set(null);
    this.originalExpiration = null;
    this.originalExpirationInput = '';
    this.subjectsNeedReview.set(false);
    this.editorError.set('');
    this.assignments.clear();
    this.studentForm.controls.expirationDate.clearValidators();
    this.studentForm.controls.educationStageId.setValidators(this.uuidValidators);
    this.studentForm.controls.educationStageId.updateValueAndValidity();
    this.studentForm.controls.subjectsReviewed.clearValidators();
    this.studentForm.reset({ status: 'Active', subjectIds: [] });
    this.studentForm.controls.userName.setValidators(Validators.required);
    this.studentForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.studentForm.controls.userName.updateValueAndValidity();
    this.studentForm.controls.password.updateValueAndValidity();
    this.isModalOpen = true;
    this.loadLookups();
  }

  closeModal(): void {
    if (this.saving()) return;
    this.isModalOpen = false;
    this.editingId.set(null);
    this.editorError.set('');
    this.studentForm.controls.password.reset();
  }

  openEdit(student: Student): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.user.getStudentById(student.id).pipe(map(res => this.unwrap(res)), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        if (!data?.id) { this.errorMessage.set('بيانات الطالب غير مكتملة؛ لم يُفتح التعديل.'); return; }
        if (!Array.isArray(data.teacherAssignments)) { this.errorMessage.set('لم يُرجع الخادم إسنادات الطالب. تعذر فتح التعديل لحماية بياناته الحالية.'); return; }
        this.openModal();
        this.editingId.set(data.id);
        const hasSubjectList = Array.isArray(data.subjectIds) || Array.isArray(data.subjects);
        this.subjectsNeedReview.set(!hasSubjectList);
        if (!hasSubjectList) this.studentForm.controls.subjectsReviewed.setValidators(Validators.requiredTrue);
        this.studentForm.controls.subjectsReviewed.updateValueAndValidity();
        this.studentForm.controls.expirationDate.clearValidators();
        this.studentForm.controls.educationStageId.setValidators(Validators.pattern(this.uuidPattern));
        this.studentForm.controls.educationStageId.updateValueAndValidity();
        this.studentForm.controls.expirationDate.updateValueAndValidity();
        this.studentForm.controls.userName.clearValidators();
        this.studentForm.controls.password.clearValidators();
        this.studentForm.controls.userName.updateValueAndValidity();
        this.studentForm.controls.password.updateValueAndValidity();
        this.originalExpiration = data.expirationDate ?? null;
        this.originalExpirationInput = data.expirationDate ? this.toLocalDateTime(data.expirationDate) : '';
        const assignments = data.teacherAssignments;
        const subjectIds: unknown[] = Array.isArray(data.subjectIds) ? data.subjectIds : Array.isArray(data.subjects) ? data.subjects.map((item: any) => item?.id) : assignments.map((item: any) => item.subjectId);
        if (subjectIds.some(item => typeof item !== 'string' || !this.uuidPattern.test(item))) { this.isModalOpen = false; this.errorMessage.set('قائمة مواد الطالب غير صحيحة. تعذر فتح التعديل لحماية البيانات.'); return; }
        this.studentForm.patchValue({
          userName: data.userName ?? '', password: '', fullName: data.fullName ?? '',
          phoneNumber: data.phoneNumber ?? '', parentName: data.parentName ?? '',
          parentPhoneNumber: data.parentPhoneNumber ?? '', curriculumId: data.curriculumId ?? '',
          gradeLevelId: data.gradeLevelId ?? '', educationStageId: data.educationStageId ?? '',
          status: data.status ?? '', subjectIds: [...new Set(subjectIds as string[])],
          expirationDate: this.originalExpirationInput
        });
        for (const assignment of assignments) this.assignments.push(this.assignmentGroup(assignment));
      },
      error: error => this.errorMessage.set(this.errorText(error))
    });
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  saveStudent(): void {
    if (this.saving()) return;
    this.studentForm.markAllAsTouched();
    if (this.studentForm.invalid) { this.editorError.set('راجع الحقول المطلوبة وصحة المعرّفات وأسعار الحصص.'); return; }
    const value = this.studentForm.getRawValue();
    if (!value.fullName.trim() || !value.phoneNumber.trim()) { this.editorError.set('الاسم ورقم الهاتف مطلوبان.'); return; }
    const subjectIds = [...new Set([...value.subjectIds, ...value.teacherAssignments.map(item => item.subjectId)])];
    if (new Set(value.teacherAssignments.map(item => item.subjectId)).size !== value.teacherAssignments.length) {
      this.editorError.set('اختر إسنادًا واحدًا لكل مادة.'); return;
    }
    const profile = {
      fullName: value.fullName.trim(), phoneNumber: value.phoneNumber.trim(),
      parentName: value.parentName.trim(), parentPhoneNumber: value.parentPhoneNumber.trim(),
      curriculumId: value.curriculumId, gradeLevelId: value.gradeLevelId,
      educationStageId: value.educationStageId || null, subjectIds, teacherAssignments: value.teacherAssignments
    };
    const id = this.editingId();
    const payload = id ? { ...profile, status: value.status, expirationDate: value.expirationDate === this.originalExpirationInput ? this.originalExpiration : value.expirationDate ? new Date(value.expirationDate).toISOString() : null } satisfies UpdateStudentPayload
      : { ...profile, userName: value.userName.trim(), password: value.password } satisfies CreateStudentPayload;
    const request = id ? this.user.updateStudent(id, payload as UpdateStudentPayload) : this.user.addStudents(payload as CreateStudentPayload);
    this.saving.set(true); this.editorError.set('');
    request.pipe(map(res => this.unwrap(res)), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.isModalOpen = false; this.studentForm.controls.password.reset(); this.getStudents(); },
      error: error => this.editorError.set(this.errorText(error))
    });
  }

  openDetailsModal(student: Student): void {
    const version = ++this.detailVersion;
    this.detailsLoading.set(true);
    this.user.getStudentById(student.id).pipe(map(res => this.unwrap(res)), finalize(() => { if (version === this.detailVersion) this.detailsLoading.set(false); }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { if (version !== this.detailVersion) return; this.selectedStudent = data; this.isDetailsModalOpen = true; this.cdr.markForCheck(); },
      error: error => this.errorMessage.set(this.errorText(error))
    });
  }

  closeDetailsModal() {
    this.detailVersion++;
    this.detailsLoading.set(false);
    this.isDetailsModalOpen = false;
    this.selectedStudent = null;
  }

  async deleteStudent(id: string): Promise<void> {
    if (this.saving()) return;
    const confirmation = await Swal.fire({ title: 'أرشفة الطالب؟', text: 'سيُنقل الطالب إلى الأرشيف، ويمكن استعادته لاحقًا.', icon: 'warning', showCancelButton: true, confirmButtonText: 'أرشفة الطالب', cancelButtonText: 'إلغاء', confirmButtonColor: '#6241a5' });
    if (!confirmation.isConfirmed) return;
    this.runAction(this.user.deleteStudent(id));
  }

  async restoreStudent(student: Student): Promise<void> {
    if (this.saving()) return;
    const confirmation = await Swal.fire({ title: 'استعادة الطالب؟', text: student.fullName, icon: 'question', showCancelButton: true, confirmButtonText: 'استعادة', cancelButtonText: 'إلغاء', confirmButtonColor: '#582b91' });
    if (confirmation.isConfirmed) this.runAction(this.user.restoreStudent(student.id));
  }

  async setSessionMode(student: Student): Promise<void> {
    if (this.saving()) return;
    const confirmation = await Swal.fire({ title: 'التحويل إلى نظام الحصص؟', text: student.fullName, icon: 'question', showCancelButton: true, confirmButtonText: 'تأكيد', cancelButtonText: 'إلغاء', confirmButtonColor: '#582b91' });
    if (confirmation.isConfirmed) this.runAction(this.user.useSessionSubscription(student.id));
  }

  private runAction(request: Observable<any>): void {
    this.saving.set(true); this.errorMessage.set('');
    request.pipe(map(res => this.unwrap(res)), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.getStudents(),
      error: error => this.errorMessage.set(this.errorText(error))
    });
  }

  openCreditModal(student: Student): void {
    this.creditTarget.set(student);
    this.creditForm.reset({ quantity: 1, description: '' }); this.editorError.set('');
  }

  closeCreditModal(): void { if (!this.saving()) this.creditTarget.set(null); }

  saveCredits(): void {
    const student = this.creditTarget();
    if (!student || this.saving()) return;
    this.creditForm.markAllAsTouched();
    if (this.creditForm.invalid) return;
    const value = this.creditForm.getRawValue();
    if (!value.description.trim()) { this.editorError.set('سبب الإضافة مطلوب.'); return; }
    const body = { ...value, description: value.description.trim() };
    const signature = JSON.stringify({ studentId: student.id, ...body });
    let key = this.creditKeys.get(signature);
    if (!key) { key = crypto.randomUUID(); this.creditKeys.set(signature, key); }
    this.saving.set(true); this.editorError.set('');
    this.user.adjustStudentCredits(student.id, { ...body, idempotencyKey: key }).pipe(
      map(res => this.unwrap(res)), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)
    ).subscribe({ next: () => { this.creditKeys.delete(signature); this.creditTarget.set(null); this.getStudents(); }, error: error => this.editorError.set(this.errorText(error)) });
  }

  /**
   * تصدير بيانات الطلاب الحالية إلى ملف Excel/CSV متوافق مع اللغة العربية
   */
  exportToExcel() {
    const list = this.visibleStudents();

    if (!list || list.length === 0) {
      alert('لا توجد بيانات طلاب للتصدير.');
      return;
    }

    const headers = [
      'اسم الطالب',
      'اسم المستخدم',
      'رقم الهاتف',
      'ولي الأمر',
      'هاتف ولي الأمر',
      'تاريخ الانتهاء',
      'الحالة',
      'إجمالي الحصص',
      'الحصص المستهلكة',
      'الحصص المتبقية'
    ];

    const rows = list.map(s => [
      `"${s.fullName || ''}"`,
      `"${s.userName || ''}"`,
      `"${s.phoneNumber || ''}"`,
      `"${s.parentName || ''}"`,
      `"${s.parentPhoneNumber || ''}"`,
      `"${s.expirationDate ? s.expirationDate.split('T')[0] : 'غير محدد'}"`,
      `"${this.statusLabel(s.status)}"`,
      s.sessions?.totalSessions ?? 0,
      s.sessions?.usedSessions ?? 0,
      s.sessions?.remainingSessions ?? 0
    ]);

    // إضافة علامة \uFEFF لضمان قراءة الحروف العربية بشكل صحيح داخل Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `طلاب_بسطهالي_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
