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

interface Student {
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

  ngOnInit(): void {
    this.getStudents();
  }

  private user = inject(User);
  private router = inject(Router);

  isModalOpen = false;
  isDetailsModalOpen = false;
  searchQuery = '';

  selectedStudent: Student | null = null;

  // الأعمدة الأساسية والمختصرة فقط
  displayedColumns: string[] = ['fullName', 'phoneNumber', 'expirationDate', 'status', 'actions'];

  dataSource = new MatTableDataSource<Student>([]);

  getStudents() {
    this.user.getStudents().subscribe({
      next: (res) => {
        console.log(res.data.items);
        this.dataSource.data = res.data.items;
      },
      error: (err) => { console.log(err); }
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
}
