import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
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
  curriculumId: string;
  sessionCreditBalance: number;
  expirationDate: string;
  status: string;
  teacherAssignments: TeacherAssignment[];
  userName: string;
  userId: string;
  sessions: SessionsInfo;
  requiresPasswordSetup: boolean;
  initialPasswordSetupToken: string | null;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatTableModule
  ],
  templateUrl: './students.html',
  styleUrl: './students.css',
})
export class Students implements OnInit {
  private user = inject(User);
  private router = inject(Router);

  isModalOpen = false;
  isDetailsModalOpen = false;
  searchQuery = '';

  selectedStudent: Student | null = null;
  displayedColumns: string[] = ['fullName', 'phoneNumber', 'expirationDate', 'status', 'actions'];
  dataSource = new MatTableDataSource<Student>([]);

  ngOnInit(): void {
    this.getStudents();
  }

  getStudents() {
    this.user.getStudents().subscribe({
      next: (res) => {
        this.dataSource.data = res.data.items || [];
      },
      error: (err) => { console.error('خطأ في جلب الطلاب:', err); }
    });
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  applyFilter() {
    this.dataSource.filter = this.searchQuery.trim().toLowerCase();
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openDetailsModal(student: Student) {
    this.selectedStudent = student;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedStudent = null;
  }

  deleteStudent(id: string) {
    this.dataSource.data = this.dataSource.data.filter(s => s.id !== id);
  }

  /**
   * تصدير بيانات الطلاب الحالية إلى ملف Excel/CSV متوافق مع اللغة العربية
   */
  exportToExcel() {
    const list = this.dataSource.filteredData.length > 0
      ? this.dataSource.filteredData
      : this.dataSource.data;

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
      `"${s.status === 'Active' ? 'نشط' : 'غير نشط'}"`,
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
  }
}
