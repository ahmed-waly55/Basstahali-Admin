import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'مشرف عام' | 'مشرف مالي' | 'دعم فني' | 'مدير محتوى';
  status: 'نشط' | 'معطل';
  lastLogin: string;
  avatar: string;
}

@Component({
  selector: 'app-users-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users-component.html',
  styleUrl: './users-component.css',
})
export class UsersComponent {}
