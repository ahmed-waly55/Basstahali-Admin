import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

export function emailOrPhoneValidator(): ValidatorFn {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneRegex = /^(\+?[0-9]{8,15}|01[0125][0-9]{8})$/;

  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value ? control.value.toString().trim() : '';
    if (!val) return null;

    const isEmail = emailRegex.test(val);
    const isPhone = phoneRegex.test(val);

    return isEmail || isPhone ? null : { invalidEmailOrPhone: true };
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private _Auth: Auth
  ) {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required, emailOrPhoneValidator()]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    console.log('Login Component Initialized');
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this._Auth.login(this.loginForm.value).subscribe({
      next: (response) => {
        try {
          const accessToken = response?.data?.accessToken || response?.data?.token || response?.token;
          const refreshToken = response?.data?.refreshToken || response?.refreshToken;
          const user = response?.data?.user?.fullName || response?.data?.userName || 'المشرف';

          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('token', accessToken);
          }
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          localStorage.setItem('user', user);
        } catch (storageError) {
          console.error('خطأ أثناء حفظ الجلسة:', storageError);
        }

        Swal.fire({
          icon: 'success',
          title: 'تم تسجيل الدخول بنجاح',
          text: 'مرحباً بك في لوحة تحكم بسطهالي',
          timer: 1600,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false,
          background: '#ffffff',
          iconColor: '#311060'
        }).then(() => {
          this.router.navigate(['/home']);
        });
      },
      error: (err) => {
        console.error('خطأ تسجيل الدخول:', err);

        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'برجاء التأكد من البريد الإلكتروني أو رقم الهاتف أو كلمة المرور';

        Swal.fire({
          icon: 'error',
          title: 'فشل تسجيل الدخول',
          text: errorMsg,
          confirmButtonColor: '#311060',
          confirmButtonText: 'حسناً',
          background: '#ffffff'
        });
      }
    });
  }
}
