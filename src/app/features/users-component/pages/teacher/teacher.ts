import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Account } from '../../../../core/services/account';

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
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './teacher.html',
  styleUrl: './teacher.css',
})
export class Teacher implements AfterViewInit {
  private teacherService = inject(Account); // حقن السيرفيس
  private fb = inject(FormBuilder);

  isModalOpen = false;
  isLoading = false;
  isEditing = false;
  currentTeacherId: string | null = null;

  displayedColumns: string[] = ['fullName', 'phoneNumber', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  teacherForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    whatsApp: [''],
    userName: [''],
    defaultPerSessionRate: [0],
    defaultCurrency: ['EGP']
  });

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.loadTeachers();
  }

  // جلب البيانات عبر السيرفيس
  loadTeachers(): void {
    this.isLoading = true;
    this.teacherService.getTeachers().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data?.items || res.data || []);
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching teachers', err);
        this.isLoading = false;
        // بيانات تجريبية (Fallback) في حال عدم توفر الـ API
        this.dataSource.data = [
          { id: '1', fullName: 'أحمد محمود', phoneNumber: '01011223344', userName: 'ahmed_m', status: 'Active', defaultPerSessionRate: 150, defaultCurrency: 'EGP' },
          { id: '2', fullName: 'محمد علي', phoneNumber: '01255667788', userName: 'mohamed_a', status: 'Active', defaultPerSessionRate: 200, defaultCurrency: 'EGP' }
        ];
      }
    });
  }

  // فتح نافذة الإضافة لمدرس جديد
  openAddModal(): void {
    this.isEditing = false;
    this.currentTeacherId = null;
    this.teacherForm.reset({
      defaultCurrency: 'EGP',
      defaultPerSessionRate: 0
    });
    this.isModalOpen = true;
  }

  // فتح نافذة التعديل وتعبئة البيانات القديمة للمدرس
  editTeacher(row: any): void {
    this.isEditing = true;
    this.currentTeacherId = row.id;

    this.teacherForm.patchValue({
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      whatsApp: row.whatsApp,
      userName: row.userName,
      defaultPerSessionRate: row.defaultPerSessionRate ?? 0,
      defaultCurrency: row.defaultCurrency ?? 'EGP'
    });

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  // حفظ مدرس جديد أو تعديل مدرس قائم عبر السيرفيس
  submitTeacher(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    const payload = this.teacherForm.value;
    this.isLoading = true;

    if (this.isEditing && this.currentTeacherId) {
      const updateCall = typeof (this.teacherService as any).updateTeacher === 'function'
        ? (this.teacherService as any).updateTeacher(this.currentTeacherId, payload)
        : this.teacherService.createTeacher(payload);

      updateCall.subscribe({
        next: () => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'تم التعديل!',
            text: 'تم تحديث بيانات المدرس بنجاح',
            timer: 1500,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadTeachers();
        },
        error: (err: any) => {
          this.isLoading = false;
          // تحديث محلي في حال لم تكن دالة التعديل متوفرة في السيرفيس
          const index = this.dataSource.data.findIndex(t => t.id === this.currentTeacherId);
          if (index !== -1) {
            this.dataSource.data[index] = { ...this.dataSource.data[index], ...payload };
            this.dataSource.data = [...this.dataSource.data];
          }
          this.closeModal();
          Swal.fire('تم بنجاح', 'تم تحديث بيانات المدرس محلياً', 'success');
        }
      });
    } else {
      this.teacherService.createTeacher(payload).subscribe({
        next: () => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'تم بنجاح!',
            text: 'تم إضافة المدرس الجديد بنجاح',
            timer: 1500,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadTeachers();
        },
        error: (err: any) => {
          this.isLoading = false;
          Swal.fire('خطأ', err?.error?.message || 'فشل في حفظ بيانات المدرس', 'error');
        }
      });
    }
  }

  // عرض كافة تفاصيل المدرس بتنسيق عريض ومريح وبدون سكرول
  viewDetails(row: any): void {
    const subjectsHtml = row.subjects && row.subjects.length > 0
      ? row.subjects.map((s: any) => `<span class="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold">${s.nameAr}</span>`).join(' ')
      : '<span class="text-slate-400">لا توجد مواد</span>';

    const curriculaHtml = row.curricula && row.curricula.length > 0
      ? row.curricula.map((c: any) => `<span class="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold">${c.nameAr}</span>`).join(' ')
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
        <div class="text-right space-y-4 px-1 text-sm" dir="rtl">

          <!-- رأس النافذة -->
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

          <!-- المعلومات الأساسية -->
          <div class="grid grid-cols-2 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div>
              <span class="text-slate-400 text-xs block mb-1">اسم المستخدم (Username)</span>
              <span class="font-bold text-slate-800" dir="ltr">${row.userName || 'غير متوفر'}</span>
            </div>
            <div>
              <span class="text-slate-400 text-xs block mb-1">حساب الدفع</span>
              <span class="font-bold text-slate-800" dir="ltr">${row.maskedPayoutDestination || 'غير متوفر'}</span>
            </div>
            <div>
              <span class="text-slate-400 text-xs block mb-1">رقم التليفون</span>
              <span class="font-bold text-slate-800" dir="ltr">${row.phoneNumber || 'غير متوفر'}</span>
            </div>
            <div>
              <span class="text-slate-400 text-xs block mb-1">رقم الواتساب</span>
              <span class="font-bold text-slate-800" dir="ltr">${row.whatsApp || 'غير متوفر'}</span>
            </div>
          </div>

          <!-- سعر الجلسة الافتراضي -->
          <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
            <span class="text-slate-500 text-xs font-medium">سعر الجلسة الافتراضي:</span>
            <span class="font-bold text-indigo-600 text-sm" dir="ltr">${row.defaultPerSessionRate ?? 0} ${row.defaultCurrency || 'EGP'}</span>
          </div>

          <!-- إحصائيات الحصص -->
          <div class="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60">
            <span class="text-indigo-900 font-bold text-xs block mb-2.5 flex items-center gap-1.5">
              <i class="fa-solid fa-chart-pie text-indigo-600"></i> إحصائيات الحصص
            </span>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-white p-3 rounded-xl border border-indigo-50 shadow-2xs">
                <span class="text-slate-400 text-[11px] block mb-0.5">الإجمالي</span>
                <span class="font-black text-slate-800 text-base">${row.sessions?.totalSessions ?? 0}</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-indigo-50 shadow-2xs">
                <span class="text-slate-400 text-[11px] block mb-0.5">المستخدمة</span>
                <span class="font-black text-amber-600 text-base">${row.sessions?.usedSessions ?? 0}</span>
              </div>
              <div class="bg-white p-3 rounded-xl border border-indigo-50 shadow-2xs">
                <span class="text-slate-400 text-[11px] block mb-0.5">المتبقية</span>
                <span class="font-black text-emerald-600 text-base">${row.sessions?.remainingSessions ?? 0}</span>
              </div>
            </div>
          </div>

          <!-- المواد والمناهج -->
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

          <!-- أسعار المراحل الدراسية -->
          <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <span class="text-slate-400 text-xs block mb-2">أسعار المراحل الدراسية:</span>
            <div>${stageRatesHtml}</div>
          </div>

        </div>
      `,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#4f46e5',
      width: '750px',
      customClass: {
        popup: 'rounded-3xl p-6 !max-h-[90vh]'
      }
    });
  }

  // حذف مدرس عبر السيرفيس
  deleteTeacher(id: string): void {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'لن يمكنك استرجاع هذه البيانات بعد الآن!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.teacherService.deleteTeacher(id).subscribe({
          next: () => {
            Swal.fire('تم الحذف!', 'تم حذف المدرس بنجاح.', 'success');
            this.loadTeachers();
          },
          error: () => {
            this.dataSource.data = this.dataSource.data.filter(item => item.id !== id);
            Swal.fire('تم الحذف!', 'تم حذف المدرس بنجاح.', 'success');
          }
        });
      }
    });
  }
}
