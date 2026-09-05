import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // إذا أردت إضافة أيقونات
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

  isLoading: boolean = false;
  hideCurrent: boolean = true; // للتحكم بإظهار/إخفاء كلمة المرور الحالية
  hideNew: boolean = true;     // للتحكم بإظهار/إخفاء كلمة المرور الجديدة

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
        Swal.fire({
          icon: 'success',
          title: 'تم بنجاح!',
          text: 'تم تغيير كلمة المرور بنجاح',
          confirmButtonColor: '#2563eb'
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'عذراً!',
          text: err.error?.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }
}
