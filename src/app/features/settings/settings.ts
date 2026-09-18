import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private _FormBuilder = inject(FormBuilder);
  private _Auth = inject(Auth);
  private _Router = inject(Router);

  isLoading: boolean = false;
  hideCurrent: boolean = true;
  hideNew: boolean = true;

  changePasswordForm: FormGroup = this._FormBuilder.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this._Auth.changePassword(this.changePasswordForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.changePasswordForm.reset();

        // مسح بيانات التخزين
        localStorage.clear();

        // إظهار التنبيه برسالة السيرفر ثم التوجيه لصفحة تسجيل الدخول
        Swal.fire({
          icon: 'success',
          title: 'تم بنجاح!',
          text: res.message || 'تم تغيير كلمة مرور الأدمن بنجاح. سجل الدخول مرة أخرى باستخدام كلمة المرور الجديدة.',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'تسجيل الدخول الآن',
          allowOutsideClick: false
        }).then((result) => {
          if (result.isConfirmed || result.isDismissed) {
            this._Router.navigate(['/login']); // غيّر المسار إذا كان مختلفاً لديك (مثلاً: /auth/login)
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'عذراً!',
          text: err.error?.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
          confirmButtonColor: '#dc2626',
          confirmButtonText: 'حسناً'
        });
      }
    });
  }
}
