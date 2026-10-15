import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { Settings } from './settings';
import { Auth } from '../../core/services/auth';
import { ThemeService } from '../../core/services/theme';

describe('Admin account settings', () => {
  const auth={changePassword:vi.fn()};
  const preference=signal<'system'|'light'|'dark'>('system');
  const theme={preference,setPreference:vi.fn(value=>preference.set(value))};
  beforeEach(() => {
    vi.clearAllMocks();preference.set('system');localStorage.clear();
    TestBed.configureTestingModule({imports:[Settings],providers:[provideRouter([]),{provide:Auth,useValue:auth},{provide:ThemeService,useValue:theme}]});
    vi.spyOn(Swal,'fire').mockResolvedValue({isConfirmed:true,isDenied:false,isDismissed:false});
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  });
  afterEach(()=>{vi.restoreAllMocks();localStorage.clear();});
  it('exposes all three appearance choices and selects the chosen preference', () => {
    const fixture=TestBed.createComponent(Settings);fixture.detectChanges();
    const buttons=fixture.nativeElement.querySelectorAll('.appearance-options button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(3);buttons[1].click();fixture.detectChanges();expect(theme.setPreference).toHaveBeenCalledWith('dark');expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });
  it('guards duplicate password submissions while a request is pending', () => {
    const pending=new Subject<any>();auth.changePassword.mockReturnValue(pending);
    const component=TestBed.createComponent(Settings).componentInstance;
    component.changePasswordForm.setValue({currentPassword:'current-pass',newPassword:'next-password'});component.onSubmit();component.onSubmit();
    expect(auth.changePassword).toHaveBeenCalledTimes(1);pending.complete();
  });
  it('preserves theme after a successful password change clears the session', () => {
    auth.changePassword.mockReturnValue(of({success:true}));localStorage.setItem('token','test');localStorage.setItem('basstahali:theme','dark');
    const component=TestBed.createComponent(Settings).componentInstance;component.changePasswordForm.setValue({currentPassword:'current-pass',newPassword:'next-password'});component.onSubmit();
    expect(localStorage.getItem('token')).toBeNull();expect(localStorage.getItem('basstahali:theme')).toBe('dark');
  });
  it('keeps the session and input when the server rejects a password change', () => {
    auth.changePassword.mockReturnValue(of({success:false,message:'رفض'}));localStorage.setItem('token','test');
    const component=TestBed.createComponent(Settings).componentInstance;component.changePasswordForm.setValue({currentPassword:'current-pass',newPassword:'next-password'});component.onSubmit();
    expect(localStorage.getItem('token')).toBe('test');expect(component.changePasswordForm.value.newPassword).toBe('next-password');
  });
});
