import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Header } from './header';
import { Notifications } from '../../../core/services/notifications';
import { ThemeService } from '../../../core/services/theme';
import { RequestActivity } from '../../../core/services/request-activity';

describe('Admin toolbar and navigation search', () => {
  let fixture:ComponentFixture<Header>;let component:Header;
  const notifications={getNotifications:vi.fn(),markAsRead:vi.fn(),markAllAsRead:vi.fn()};
  const theme={isDark:signal(false),toggle:vi.fn(),setPreference:vi.fn()};
  beforeEach(async () => {
    vi.clearAllMocks();theme.isDark.set(false);localStorage.setItem('user','مدير الاختبار');
    notifications.getNotifications.mockReturnValue(of({success:true,data:{items:[],unreadCount:0}}));
    await TestBed.configureTestingModule({imports:[Header],providers:[provideRouter([]),{provide:Notifications,useValue:notifications},{provide:ThemeService,useValue:theme}]}).compileComponents();
    fixture=TestBed.createComponent(Header);component=fixture.componentInstance;fixture.detectChanges();
  });
  afterEach(()=>localStorage.clear());
  it('searches pages using Arabic diacritics without implying a record search', () => {
    component.search('الطُّلّاب');expect(component.results().some(item=>item.route==='/users/students')).toBe(true);
    component.search('لا توجد صفحة');expect(component.results()).toEqual([]);
  });
  it('opens the command dialog with Ctrl K and supports arrow/Enter navigation', async () => {
    const navigate=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
    const shortcut=new KeyboardEvent('keydown',{key:'k',ctrlKey:true,cancelable:true});component.handleShortcut(shortcut);fixture.detectChanges();await fixture.whenStable();
    expect(shortcut.defaultPrevented).toBe(true);expect(document.querySelector('input[aria-label="اسم الصفحة"]')).not.toBeNull();
    component.search('طلاب');component.searchKeydown(new KeyboardEvent('keydown',{key:'ArrowDown'}));
    const route=component.results()[component.activeResult()].route;
    component.searchKeydown(new KeyboardEvent('keydown',{key:'Enter'}));expect(navigate).toHaveBeenCalledWith(route);
  });
  it('shows notification load failures rather than an empty-success message', () => {
    notifications.getNotifications.mockReturnValueOnce(throwError(()=>new Error('offline')));component.loadNotifications();
    expect(component.notificationsError()).toContain('تعذر');expect(component.notificationsLoading()).toBe(false);
  });
  it('exposes a theme toggle and a non-blocking activity indicator', () => {
    const activity=TestBed.inject(RequestActivity);activity.begin();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="جاري تحميل البيانات"]')).not.toBeNull();
    const button=fixture.nativeElement.querySelector('[aria-label="تفعيل الوضع الداكن"]') as HTMLButtonElement;button.click();expect(theme.toggle).toHaveBeenCalled();
    activity.end();
  });
  it('logs out without removing visual preferences', () => {
    localStorage.setItem('token','test');localStorage.setItem('basstahali:theme','dark');vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    component.logout();expect(localStorage.getItem('token')).toBeNull();expect(localStorage.getItem('basstahali:theme')).toBe('dark');
  });
});
