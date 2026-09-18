import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private _Auth: Auth
  ) {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // فحص أولي لتأكيد أن مكتبة SweetAlert2 تعمل دون مشاكل
    console.log('Login Component Initialized');
  }

  onSubmit(): void {
    console.log('1. تم الضغط على زر الدخول - حالة الفورم:', {
      valid: this.loginForm.valid,
      values: this.loginForm.value
    });

    if (this.loginForm.invalid) {
      console.warn('2. تم إيقاف الطلب: بيانات الفورم غير صالحة', this.loginForm.errors);
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    console.log('3. جاري إرسال الطلب إلى السيرفر...');

    this._Auth.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('4. استجابة السيرفر (Success):', response);

        try {
          // تخزين التوكن بالاسمين لضمان عدم حدوث خطأ 401 في السيرفيس الأخرى
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

          console.log('5. تم حفظ البيانات في الـ LocalStorage بنجاح، جاري فتح التنبيه...');
        } catch (storageError) {
          console.error('خطأ أثناء قراءة رد السيرفر أو التخزين:', storageError);
        }

        Swal.fire({
          icon: 'success',
          title: 'تم تسجيل الدخول بنجاح!',
          text: 'مرحباً بك في لوحة تحكم المشرفين',
          timer: 1800,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false
        }).then(() => {
          console.log('6. جاري التوجيه إلى /home');
          this.router.navigate(['/home']);
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('4. خطأ من السيرفر (Error Response):', err);

        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'برجاء التأكد من البريد الإلكتروني أو كلمة المرور الإدارية';

        Swal.fire({
          icon: 'error',
          title: 'فشل تسجيل الدخول',
          text: errorMsg,
          confirmButtonColor: '#dc2626',
          confirmButtonText: 'حسناً'
        });
      }
    });
  }
}
