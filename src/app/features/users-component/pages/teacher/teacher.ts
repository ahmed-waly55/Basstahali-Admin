import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Account } from '../../../../core/services/account';
import { CurriculumService } from '../../../../core/services/curriculum-service';

@Component({
  selector: 'app-teacher',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './teacher.html',
  styleUrl: './teacher.css',
})
export class Teacher implements AfterViewInit, OnInit {
  private teacherService = inject(Account);
  private curriculumService = inject(CurriculumService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isModalOpen = false;
  isEditing = false;
  currentTeacherId: string | null = null;

  subjectsList: any[] = [];
  curriculaList: any[] = [];
  gradeLevelsList: any[] = [];

  displayedColumns: string[] = ['fullName', 'phoneNumber', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  teacherForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    whatsApp: [''],
    userName: [''],
    password: [''],
    status: ['Active'],
    defaultPerSessionRate: [0],
    defaultCurrency: ['EGP'],
    preferredPayoutMethod: [''],
    eWalletNumber: [''],
    instaPayIdentifier: [''],
    subjectIds: [[]],
    curriculumIds: [[]],
    stageRates: this.fb.array([])
  });

  ngAfterViewInit() {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    this.loadTeachers();
  }

  ngOnInit() {
    this.loadDropdownData();
  }

  loadDropdownData() {
    this.curriculumService.getCurriculums().subscribe({
      next: (res: any) => {
        this.curriculaList = Array.isArray(res) ? res : (res.data?.items || res.data || []);
      },
      error: (err) => {
        console.error('Error loading curricula', err);
      }
    });

    this.curriculumService.getSubjects().subscribe({
      next: (res: any) => {
        this.subjectsList = Array.isArray(res) ? res : (res.data?.items || res.data || []);
      },
      error: (err) => {
        console.error('Error loading subjects', err);
      }
    });

    this.curriculumService.getGradeLevels().subscribe({
      next: (res: any) => {
        this.gradeLevelsList = Array.isArray(res) ? res : (res.data?.items || res.data || []);
      },
      error: (err) => {
        console.error('Error loading grade levels', err);
      }
    });
  }

  loadTeachers(): void {
    this.isLoading = true;
    this.teacherService.getTeachers().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data?.items || res.data || []);
        this.dataSource.data = data;

        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
            this.paginator.length = data.length;
          }
          this.cdr.detectChanges();
        });

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        const errorMsg = err?.error?.message || err?.message || 'فشل في جلب بيانات المدرسين';
        Swal.fire({
          icon: 'error',
          title: 'خطأ في التحميل',
          text: errorMsg,
          confirmButtonColor: '#4f46e5'
        });
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentTeacherId = null;
    this.teacherForm.reset({
      defaultCurrency: 'EGP',
      defaultPerSessionRate: 0,
      status: 'Active',
      subjectIds: [],
      curriculumIds: []
    });
    this.stageRatesControls.clear();
    this.isModalOpen = true;
  }

  editTeacher(row: any): void {
    this.isEditing = true;
    this.currentTeacherId = row.id;

    const existingSubjectIds = row.subjects?.map((s: any) => s.id) || [];
    const existingCurriculumIds = row.curricula?.map((c: any) => c.id) || [];

    this.teacherForm.patchValue({
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      whatsApp: row.whatsApp,
      userName: row.userName,
      status: row.status || 'Active',
      defaultPerSessionRate: row.defaultPerSessionRate ?? 0,
      defaultCurrency: row.defaultCurrency ?? 'EGP',
      preferredPayoutMethod: row.preferredPayoutMethod || '',
      eWalletNumber: row.eWalletNumber || '',
      instaPayIdentifier: row.instaPayIdentifier || '',
      subjectIds: existingSubjectIds,
      curriculumIds: existingCurriculumIds
    });

    this.stageRatesControls.clear();
    if (row.stageRates && row.stageRates.length > 0) {
      row.stageRates.forEach((sr: any) => {
        this.addStageRate(sr);
      });
    }

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  selectAll(controlName: string, list: any[]) {
    this.teacherForm.get(controlName)?.setValue(list.map(i => i.id));
  }

  deselectAll(controlName: string) {
    this.teacherForm.get(controlName)?.setValue([]);
  }

  get stageRatesControls() {
    return this.teacherForm.get('stageRates') as FormArray;
  }

  addStageRate(rateData?: any) {
    this.stageRatesControls.push(this.fb.group({
      gradeLevelId: [rateData?.gradeLevelId || '', Validators.required],
      rate: [rateData?.rate || 0, Validators.required],
      currency: [rateData?.currency || 'EGP', Validators.required]
    }));
  }

  removeStageRate(index: number) {
    this.stageRatesControls.removeAt(index);
  }

  // حفظ أو تعديل مع إظهار رسائل SweetAlert2 الواضحة للنجاح أو الخطأ
  submitTeacher(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'يرجى إدخال الحقول المطلوبة بشكل صحيح',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const payload = { ...this.teacherForm.value };
    this.isLoading = true;

    if (this.isEditing && this.currentTeacherId) {
      delete payload.userName;
      delete payload.password;

      this.teacherService.updateTeacher(this.currentTeacherId, payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'تم التعديل بنجاح!',
            text: res?.message || 'تم تحديث بيانات المدرس بنجاح',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadTeachers();
        },
        error: (err) => {
          this.isLoading = false;
          const errorMsg = err?.error?.message || err?.error?.errors?.[0]?.message || 'حدث خطأ أثناء تعديل بيانات المدرس';
          Swal.fire({
            icon: 'error',
            title: 'فشل التعديل',
            text: errorMsg,
            confirmButtonColor: '#4f46e5'
          });
        }
      });
    } else {
      delete payload.status;

      this.teacherService.createTeacher(payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'تمت الإضافة بنجاح!',
            text: res?.message || 'تم إضافة المدرس الجديد بنجاح',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadTeachers();
        },
        error: (err) => {
          this.isLoading = false;
          const errorMsg = err?.error?.message || err?.error?.errors?.[0]?.message || 'حدث خطأ أثناء إضافة المدرس';
          Swal.fire({
            icon: 'error',
            title: 'فشل الإضافة',
            text: errorMsg,
            confirmButtonColor: '#4f46e5'
          });
        }
      });
    }
  }

  deleteTeacher(id: string): void {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'لن يمكنك استرجاع بيانات هذا المدرس بعد الآن!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.teacherService.deleteTeacher(id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'تم الحذف!',
              text: res?.message || 'تم حذف المدرس بنجاح.',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadTeachers();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'فشل في حذف المدرس';
            Swal.fire({
              icon: 'error',
              title: 'خطأ في الحذف',
              text: errorMsg,
              confirmButtonColor: '#4f46e5'
            });
          }
        });
      }
    });
  }

  viewDetails(row: any): void {
    const subjectsHtml = row.subjects && row.subjects.length > 0
      ? row.subjects.map((s: any) => `<span class="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold">${s.nameAr || s.nameEn}</span>`).join(' ')
      : '<span class="text-slate-400">لا توجد مواد</span>';

    const curriculaHtml = row.curricula && row.curricula.length > 0
      ? row.curricula.map((c: any) => `<span class="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold">${c.nameAr || c.nameEn}</span>`).join(' ')
      : '<span class="text-slate-400">لا توجد مناهج</span>';

    const stageRatesHtml = row.stageRates && row.stageRates.length > 0
      ? row.stageRates.map((sr: any) => `
          <div class="text-xs bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center mb-2 shadow-2xs">
            <span class="font-medium text-slate-800">${sr.gradeLevelName}</span>
            <span class="font-bold text-indigo-600" dir="ltr">${sr.rate} ${sr.currency}</span>
          </div>
        `).join('')
      : '<span class="text-slate-400 text-xs">غير متوفر</span>';

    Swal.fire({
      title: '',
      html: `
        <div class="text-right space-y-4 px-1 text-sm max-h-[75vh] overflow-y-auto" dir="rtl">
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <i class="fa-solid fa-chalkboard-user text-lg"></i>
              </div>
              <div>
                <h3 class="font-black text-slate-900 text-base">تفاصيل المدرس</h3>
                <span class="text-indigo-600 font-bold text-xs" dir="ltr">${row.fullName || ''}</span>
              </div>
            </div>
            <span class="px-3.5 py-1 rounded-full text-xs font-bold ${row.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
              ${row.status === 'Active' ? 'نشط' : row.status}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div><span class="text-slate-400 text-xs block mb-1">اسم المستخدم</span><span class="font-bold text-slate-800" dir="ltr">${row.userName || 'غير متوفر'}</span></div>
            <div><span class="text-slate-400 text-xs block mb-1">حساب الدفع</span><span class="font-bold text-slate-800" dir="ltr">${row.maskedPayoutDestination || 'غير متوفر'}</span></div>
            <div><span class="text-slate-400 text-xs block mb-1">رقم التليفون</span><span class="font-bold text-slate-800" dir="ltr">${row.phoneNumber || 'غير متوفر'}</span></div>
            <div><span class="text-slate-400 text-xs block mb-1">رقم الواتساب</span><span class="font-bold text-slate-800" dir="ltr">${row.whatsApp || 'غير متوفر'}</span></div>
          </div>

          <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
            <span class="text-slate-500 text-xs font-medium">سعر الجلسة الافتراضي:</span>
            <span class="font-bold text-indigo-600 text-sm" dir="ltr">${row.defaultPerSessionRate ?? 0} ${row.defaultCurrency || 'EGP'}</span>
          </div>

          <div class="grid grid-cols-2 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div>
              <span class="text-slate-400 text-xs block mb-2">المواد الدراسية:</span>
              <div class="flex flex-wrap gap-1.5">${subjectsHtml}</div>
            </div>
            <div>
              <span class="text-slate-400 text-xs block mb-2">المناهج الدراسية:</span>
              <div class="flex flex-wrap gap-1.5">${curriculaHtml}</div>
            </div>
          </div>

          <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <span class="text-slate-400 text-xs block mb-2">أسعار المراحل الدراسية:</span>
            <div>${stageRatesHtml}</div>
          </div>
        </div>
      `,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#4f46e5',
      width: '750px',
      customClass: { popup: 'rounded-3xl p-6 !max-h-[90vh]' }
    });
  }
}
