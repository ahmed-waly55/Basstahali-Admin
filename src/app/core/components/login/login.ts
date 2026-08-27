import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  loginForm: FormGroup;
  hidePassword = true;

  constructor(private fb: FormBuilder, private router: Router, private _Auth: Auth) {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this._Auth.login(this.loginForm.value).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'تم تسجيل الدخول بنجاح!',
          text: 'مرحباً بك في لوحة تحكم المشرفين',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/home']);
        });
        localStorage.setItem("token", response.data.accessToken)
        localStorage.setItem("user", response.data.user.fullName)

      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'فشل تسجيل الدخول',
          text: err.error?.message || 'برجاء التأكد من البريد الإلكتروني أو كلمة المرور الإدارية',
        });
      }
    });
  }
}
