import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { RequestActivity } from './request-activity';
import { authLoadingInterceptor } from '../Interceptors/auth-loading.interceptor';

describe('Non-blocking admin request activity', () => {
  let http: HttpClient; let controller: HttpTestingController;let activity:RequestActivity;
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([authLoadingInterceptor])),provideHttpClientTesting(),provideRouter([])]});
    http=TestBed.inject(HttpClient);controller=TestBed.inject(HttpTestingController);activity=TestBed.inject(RequestActivity);
    vi.spyOn(Swal,'fire');localStorage.setItem('token','Bearer test-token');
  });
  afterEach(() => {controller.verify({ignoreCancelled:true});vi.restoreAllMocks();localStorage.clear();});
  it('tracks concurrent requests without opening a loading modal', () => {
    http.get('/first').subscribe();http.get('/second').subscribe();
    expect(activity.pending()).toBe(2);expect(activity.busy()).toBe(true);expect(Swal.fire).not.toHaveBeenCalled();
    const first=controller.expectOne('/first');expect(first.request.headers.get('Authorization')).toBe('Bearer test-token');first.flush({});
    expect(activity.pending()).toBe(1);controller.expectOne('/second').flush({});expect(activity.busy()).toBe(false);
  });
  it('cleans up activity on failure and cancellation', () => {
    http.get('/failed').subscribe({error:()=>{}});const subscription=http.get('/cancelled').subscribe();
    controller.expectOne('/failed').flush({}, {status:500,statusText:'failed'});expect(activity.pending()).toBe(1);
    subscription.unsubscribe();expect(activity.pending()).toBe(0);activity.end();expect(activity.pending()).toBe(0);
  });
  it('keeps the theme preference when an expired session clears credentials', async () => {
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    localStorage.setItem('basstahali:theme','dark');
    vi.mocked(Swal.fire).mockResolvedValue({isConfirmed:true,isDenied:false,isDismissed:false});
    http.get('/protected').subscribe({error:()=>{}});controller.expectOne('/protected').flush({}, {status:401,statusText:'unauthorized'});
    expect(localStorage.getItem('token')).toBeNull();expect(localStorage.getItem('basstahali:theme')).toBe('dark');
    await Promise.resolve();
  });
});
