import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { Auth } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { Login } from './login';

describe('Admin login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let response: Subject<unknown>;
  const auth = { login: vi.fn() };
  const theme = { isDark: signal(false), toggle: vi.fn(() => theme.isDark.update(value => !value)) };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    theme.isDark.set(false);
    localStorage.clear();
    response = new Subject<unknown>();
    auth.login.mockReturnValue(response.asObservable());
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: Auth, useValue: auth }, { provide: ThemeService, useValue: theme }],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { response.complete(); localStorage.clear(); });

  function validForm(): void {
    component.loginForm.setValue({ userName: 'admin@example.com', password: 'test-password', rememberMe: true });
  }

  it('allows switching the login theme with an accessible label for the next mode', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.login-theme-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('تفعيل الوضع الداكن');
    toggle.click(); fixture.detectChanges();
    expect(theme.toggle).toHaveBeenCalledTimes(1);
    expect(toggle.getAttribute('aria-label')).toBe('تفعيل الوضع الفاتح');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('blocks invalid credentials and exposes field validation', () => {
    component.onSubmit();
    fixture.detectChanges();
    expect(auth.login).not.toHaveBeenCalled();
    expect(component.loginForm.get('userName')?.touched).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('prevents duplicate submissions and disables the button while the request is pending', () => {
    validForm();
    component.onSubmit();
    component.onSubmit();
    fixture.detectChanges();
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(auth.login).toHaveBeenCalledWith({ userName: 'admin@example.com', password: 'test-password', rememberMe: true });
    expect(component.isSubmitting()).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
  });

  it('shows the server error inline and allows retry without clearing the form', () => {
    validForm();
    component.onSubmit();
    response.error({ status: 401, error: { message: 'بيانات الدخول غير صحيحة' } });
    fixture.detectChanges();
    expect(component.isSubmitting()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('بيانات الدخول غير صحيحة');
    expect(component.loginForm.get('userName')?.value).toBe('admin@example.com');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the existing token storage and redirects directly to the dashboard on success', () => {
    validForm();
    component.onSubmit();
    response.next({ data: { accessToken: 'test-access', refreshToken: 'test-refresh', user: { fullName: 'مدير الاختبار' } } });
    response.complete();
    expect(localStorage.getItem('accessToken')).toBe('test-access');
    expect(localStorage.getItem('token')).toBe('test-access');
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh');
    expect(localStorage.getItem('user')).toBe('مدير الاختبار');
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('does not navigate when a response has no session token', () => {
    validForm(); component.onSubmit(); response.next({ data: {} }); response.complete();
    expect(component.loginError()).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });
});
