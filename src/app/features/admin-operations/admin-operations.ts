import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Observable, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AdminRow, adminErrorMessage, AttendanceDecision, isAdminRow } from '../../core/models/admin-operations';
import { AdminOperationsService } from '../../core/services/admin-operations';

type Section = 'users' | 'attendance' | 'contacts';

@Component({
  selector: 'app-admin-operations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: () => {
    const labels = new MatPaginatorIntl();
    labels.itemsPerPageLabel = 'عدد السجلات في الصفحة:';
    labels.nextPageLabel = 'الصفحة التالية';
    labels.previousPageLabel = 'الصفحة السابقة';
    labels.firstPageLabel = 'الصفحة الأولى';
    labels.lastPageLabel = 'الصفحة الأخيرة';
    labels.getRangeLabel = (page, size, length) => length ? `${page * size + 1} – ${Math.min((page + 1) * size, length)} من ${length}` : '0 من 0';
    return labels;
  } }],
  templateUrl: './admin-operations.html',
  styleUrl: './admin-operations.css',
})
export class AdminOperations implements OnInit {
  private readonly api = inject(AdminOperationsService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private listSubscription?: Subscription;
  private dialogRef?: MatDialogRef<unknown>;
  private readonly decisionKeys = new Map<string, string>();

  @ViewChild('staffDialog') private staffDialog!: TemplateRef<unknown>;
  @ViewChild('attendanceDialog') private attendanceDialog!: TemplateRef<unknown>;
  @ViewChild('contactDialog') private contactDialog!: TemplateRef<unknown>;

  readonly section = signal<Section>('users');
  readonly rows = signal<AdminRow[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly dialogError = signal('');
  readonly selectedRow = signal<AdminRow | null>(null);
  readonly search = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly hidePassword = signal(true);
  readonly attendanceNotes = new FormControl('', { nonNullable: true });
  readonly staffForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.pattern(/\S/)]],
    userName: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required],
    email: ['', Validators.email],
    phoneNumber: [''],
    role: ['', [Validators.required, Validators.pattern(/\S/)]],
    contactInformation: [''],
    fixedMonthlySalary: [0, [Validators.required, Validators.min(0)]],
  });

  readonly sections: { key: Section; title: string; icon: string; description: string }[] = [
    { key: 'users', title: 'حسابات المستخدمين', icon: 'manage_accounts', description: 'إدارة صلاحيات الوصول وإضافة فريق العمل' },
    { key: 'attendance', title: 'مراجعة الحضور', icon: 'fact_check', description: 'مراجعة سجلات الحضور وتأكيدها أو رفضها' },
    { key: 'contacts', title: 'رسائل التواصل', icon: 'forum', description: 'متابعة رسائل واستفسارات بسطهالي' },
  ];
  readonly currentSection = computed(() => this.sections.find(item => item.key === this.section())!);
  readonly filteredRows = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('ar');
    return query ? this.rows().filter(row => this.searchText(row).includes(query)) : this.rows();
  });
  readonly visibleRows = computed(() => this.filteredRows().slice(this.pageIndex() * this.pageSize(), (this.pageIndex() + 1) * this.pageSize()));

  ngOnInit(): void { this.load(); }

  selectSection(section: Section): void {
    if (this.saving() || section === this.section()) return;
    this.section.set(section);
    this.search.set('');
    this.notice.set('');
    this.load();
  }

  load(): void {
    this.listSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.rows.set([]);
    this.pageIndex.set(0);
    const request = this.section() === 'users' ? this.api.getUsers()
      : this.section() === 'attendance' ? this.api.getAttendance() : this.api.getContacts();
    this.listSubscription = request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.rows.set(rows); this.loading.set(false); },
      error: error => { this.error.set(adminErrorMessage(error)); this.loading.set(false); },
    });
  }

  updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  changePage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  field(row: AdminRow | null, ...paths: string[]): string {
    if (!row) return '—';
    for (const path of paths) {
      let value: unknown = row;
      for (const key of path.split('.')) value = isAdminRow(value) ? value[key] : undefined;
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
      if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value.join('، ');
    }
    return '—';
  }

  rowId(row: AdminRow | null): string {
    const id = this.field(row, 'id', this.section() === 'users' ? 'userId' : this.section() === 'attendance' ? 'attendanceId' : 'contactUsId');
    return id === '—' ? '' : id;
  }

  activeState(row: AdminRow): boolean | null {
    if (typeof row['isActive'] === 'boolean') return row['isActive'];
    if (typeof row['active'] === 'boolean') return row['active'];
    const status = this.field(row, 'status').toLowerCase();
    return status === 'active' ? true : status === 'inactive' ? false : null;
  }

  userStatus(row: AdminRow): string {
    const active = this.activeState(row);
    return active === null ? this.field(row, 'status') : active ? 'نشط' : 'غير نشط';
  }

  openStaff(): void {
    this.staffForm.reset({ fixedMonthlySalary: 0 });
    this.hidePassword.set(true);
    this.openDialog(this.staffDialog, '760px');
  }

  createStaff(): void {
    if (this.saving()) return;
    if (this.staffForm.invalid) { this.staffForm.markAllAsTouched(); return; }
    const body = this.staffForm.getRawValue();
    body.userName = body.userName.trim();
    body.displayName = body.displayName.trim();
    body.role = body.role.trim();
    this.mutate(this.api.createStaff(body), 'تمت إضافة عضو فريق العمل بنجاح.');
  }

  async setUserActive(row: AdminRow, active: boolean): Promise<void> {
    const id = this.rowId(row);
    if (!id || this.saving()) return;
    const result = await Swal.fire({
      title: active ? 'تفعيل الحساب؟' : 'إيقاف الحساب؟',
      text: `${active ? 'سيتم تفعيل' : 'سيتم إيقاف وصول'} حساب ${this.field(row, 'displayName', 'fullName', 'userName')}.`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: active ? 'تفعيل الحساب' : 'إيقاف الحساب', cancelButtonText: 'إلغاء',
      confirmButtonColor: '#582b91',
    });
    if (result.isConfirmed && !this.saving()) this.mutate(this.api.setUserActive(id, active), active ? 'تم تفعيل الحساب.' : 'تم إيقاف الحساب.');
  }

  openAttendance(row: AdminRow): void {
    this.selectedRow.set(row);
    this.attendanceNotes.reset();
    this.openDialog(this.attendanceDialog, '600px');
  }

  decideAttendance(decision: AttendanceDecision): void {
    const id = this.rowId(this.selectedRow());
    if (!id || this.saving()) return;
    const notes = this.attendanceNotes.value.trim();
    const signature = JSON.stringify([id, decision, notes]);
    let idempotencyKey = this.decisionKeys.get(signature);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      this.decisionKeys.set(signature, idempotencyKey);
    }
    // Keep the same key after a network error so a retry cannot duplicate a decision.
    this.mutate(this.api.decideAttendance(id, decision, { notes, idempotencyKey }),
      decision === 'confirm' ? 'تم تأكيد سجل الحضور.' : 'تم رفض سجل الحضور.', () => this.decisionKeys.delete(signature));
  }

  openContact(row: AdminRow): void {
    this.selectedRow.set(row);
    this.openDialog(this.contactDialog, '640px');
  }

  markContactNew(): void {
    const id = this.rowId(this.selectedRow());
    if (!id || this.saving()) return;
    this.mutate(this.api.setContactStatus(id, 'New'), 'تم تعيين الرسالة كرسالة جديدة.');
  }

  closeDialog(): void { if (!this.saving()) this.dialogRef?.close(); }

  private openDialog(template: TemplateRef<unknown>, width: string): void {
    this.dialogError.set('');
    const ref = this.dialog.open(template, { width, maxWidth: '94vw', maxHeight: '90vh', direction: 'rtl' });
    this.dialogRef = ref;
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.dialogRef === ref) this.dialogRef = undefined;
      this.staffForm.reset({ fixedMonthlySalary: 0 });
      this.selectedRow.set(null);
      this.dialogError.set('');
    });
  }

  private mutate(request: Observable<unknown>, message: string, onSuccess?: () => void): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.notice.set('');
    this.error.set('');
    this.dialogError.set('');
    if (this.dialogRef) this.dialogRef.disableClose = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        onSuccess?.();
        this.dialogRef?.close();
        this.dialogRef = undefined;
        this.notice.set(message);
        this.load();
      },
      error: error => {
        this.saving.set(false);
        if (this.dialogRef) this.dialogRef.disableClose = false;
        const message = adminErrorMessage(error);
        if (this.dialogRef) this.dialogError.set(message); else this.error.set(message);
      },
    });
  }

  private searchText(row: AdminRow): string {
    return Object.values(row).map(value => isAdminRow(value) ? this.searchText(value) : String(value ?? '')).join(' ').toLocaleLowerCase('ar');
  }
}
