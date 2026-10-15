import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { finalize } from 'rxjs';

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
export class Login {
  readonly theme = inject(ThemeService);
  loginForm: FormGroup;
  hidePassword = true;
  readonly isSubmitting = signal(false);
  readonly loginError = signal('');

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

  onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loginError.set('');
    this.isSubmitting.set(true);
    this._Auth.login(this.loginForm.value).pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: (response) => {
        const accessToken = response?.data?.accessToken || response?.data?.token || response?.token;
        const refreshToken = response?.data?.refreshToken || response?.refreshToken;
        const user = response?.data?.user?.fullName || response?.data?.userName || 'المشرف';

        if (!accessToken) {
          this.loginError.set('تعذر إتمام تسجيل الدخول. يرجى المحاولة مرة أخرى.');
          return;
        }

        try {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('token', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', user);
        } catch {
          this.loginError.set('تعذر حفظ الجلسة. يرجى السماح بالتخزين في المتصفح والمحاولة مجددًا.');
          return;
        }

        this.router.navigate(['/home']);
      },
      error: (err) => {
        const serverMessage = err?.error?.message;
        this.loginError.set(
          typeof serverMessage === 'string' && serverMessage.trim()
            ? serverMessage
            : err?.status === 0
              ? 'تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.'
              : 'تعذر تسجيل الدخول. تأكد من البريد الإلكتروني أو رقم الهاتف وكلمة المرور.'
        );
      }
    });
  }
}
