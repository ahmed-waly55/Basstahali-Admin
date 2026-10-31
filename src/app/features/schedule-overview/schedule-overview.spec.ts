import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { parseScheduleOverview } from '../../core/models/schedule-overview';
import { ScheduleOverviewService } from '../../core/services/schedule-overview';
import { ScheduleOverviewComponent } from './schedule-overview';

const fixtureData=()=>parseScheduleOverview({success:true,data:{weekStart:'2026-10-31',weekEnd:'2026-10-31',items:[
  {id:'one',subject:'العربية',teacher:'معلم أول',name:'طالب أول',day:'السبت',timeSlot:'07:55',timeRange:'07:55 ص - 08:55 ص',scheduledAt:'2026-10-31T07:55:00+00:00',durationMinutes:60,status:'AttendancePending',isLive:false,colorTheme:'blue',zoomUrl:'https://example.test/lesson'},
  {id:'two',subject:'الرياضيات',teacherName:'معلم ثان',studentName:'طالب ثان',day:'السبت',timeSlot:'07:55',timeRange:'07:55 ص - 08:55 ص',scheduledAt:'2026-10-31T07:55:00+00:00',durationMinutes:60,status:'Completed',isLive:false,colorTheme:'orange',zoomUrl:'javascript:alert(1)'},
]}});

describe('Admin schedule workspace',()=>{
  let fixture:ComponentFixture<ScheduleOverviewComponent>;let component:ScheduleOverviewComponent;
  const service={getSchedule:vi.fn()};
  beforeEach(async()=>{
    service.getSchedule.mockReturnValue(of(fixtureData()));
    await TestBed.configureTestingModule({imports:[ScheduleOverviewComponent],providers:[provideRouter([]),{provide:ScheduleOverviewService,useValue:service}]}).compileComponents();
    fixture=TestBed.createComponent(ScheduleOverviewComponent);component=fixture.componentInstance;fixture.detectChanges();
  });
  it('renders both concurrent sessions and a single supplied day, including both people for an administrator',()=>{
    expect(fixture.nativeElement.querySelectorAll('.session-card')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.date-strip button')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('طالب أول');expect(fixture.nativeElement.textContent).toContain('معلم أول');
    expect(fixture.nativeElement.textContent).toContain('المواعيد بتوقيت القاهرة');expect(fixture.nativeElement.textContent).toContain('07:55 ص');
    expect(fixture.nativeElement.querySelectorAll('.session-card a[target="_blank"]')).toHaveLength(1);
  });
  it('filters by teacher/student/status/search and clears all filters',()=>{
    component.teacher.set('معلم أول');expect(component.displayed().map(item=>item.id)).toEqual(['one']);
    component.clearFilters();component.student.set('طالب ثان');expect(component.displayed().map(item=>item.id)).toEqual(['two']);
    component.clearFilters();component.status.set('Completed');expect(component.displayed()).toHaveLength(1);
    component.clearFilters();component.query.set('العَربية طالب');expect(component.displayed().map(item=>item.id)).toEqual(['one']);
    component.clearFilters();expect(component.displayed()).toHaveLength(2);
  });
  it('has an accessible list alternative and read-only details with a safe meeting link',()=>{
    component.viewKey(new KeyboardEvent('keydown',{key:'ArrowLeft'}));fixture.detectChanges();
    expect(component.view()).toBe('list');expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
    component.openDetails(component.items()[0]);fixture.detectChanges();
    const dialog=fixture.nativeElement.querySelector('[role="dialog"]');expect(dialog.textContent).toContain('طالب أول');
    const link=dialog.querySelector('a[target="_blank"]');expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    component.closeDetails();fixture.detectChanges();expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
  it('shows a retryable load error and retains the last valid schedule when refresh fails',()=>{
    const pending=new Subject<any>();service.getSchedule.mockReturnValueOnce(pending);
    component.load();component.load();expect(component.loading()).toBe(true);
    pending.error(new Error('اختبار انقطاع الشبكة'));fixture.detectChanges();
    expect(component.loading()).toBe(false);expect(component.items()).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('آخر بيانات');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('انقطاع الشبكة');
  });
  it('distinguishes an empty period from a filtered empty result',()=>{
    component.query.set('غير موجود');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('لا توجد حصص مطابقة');
    component.clearFilters();component.data.set({weekStart:'2026-10-31',weekEnd:'2026-10-31',items:[]});fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('لا توجد حصص معروضة');
  });
});
