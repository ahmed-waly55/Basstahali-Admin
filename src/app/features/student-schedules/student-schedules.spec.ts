import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Account } from '../../core/services/account';
import { CoursesService } from '../../core/services/courses';
import { CurriculumService } from '../../core/services/curriculum-service';
import { StudentSchedulesService } from '../../core/services/student-schedules';
import { User } from '../../core/services/user';
import { StudentSchedules } from './student-schedules';

const page=(items:unknown[],pageNumber:number,totalCount:number,hasNextPage:boolean)=>({success:true,data:{items,pageNumber,pageSize:20,totalCount,totalPages:Math.ceil(totalCount/20),hasPreviousPage:pageNumber>1,hasNextPage}});
const roster=(prefix:string)=>Array.from({length:21},(_,i)=>({id:`${prefix}-${i+1}`,fullName:`${prefix} ${i+1}`}));
const row={id:'schedule-1',studentId:'student-21',teacherId:'teacher-21',subjectId:'subject-1',scheduledAt:'2026-11-01T10:00:00Z',durationMinutes:60,studentCreditCost:1,classLink:'https://example.test/class',recurrenceType:'Once',studentName:'طالب تجريبي',teacherName:'معلم تجريبي',subjectName:'مادة تجريبية',courseName:''};

describe('Admin schedule management directory and read modes',()=>{
  let fixture:ComponentFixture<StudentSchedules>;let component:StudentSchedules;
  const students=roster('student'),teachers=roster('teacher');
  const users={getStudents:vi.fn()};const account={getTeachers:vi.fn()};
  const service={all:vi.fn(),search:vi.fn(),forStudent:vi.fn(),options:vi.fn(),delete:vi.fn()};
  beforeEach(async()=>{
    vi.clearAllMocks();
    users.getStudents.mockImplementation(query=>of(page(query.PageNumber===1?students.slice(0,20):students.slice(20),query.PageNumber,21,query.PageNumber===1)));
    account.getTeachers.mockImplementation(query=>of(page(query.PageNumber===1?teachers.slice(0,20):teachers.slice(20),query.PageNumber,21,query.PageNumber===1)));
    service.all.mockReturnValue(of([]));service.search.mockReturnValue(of([]));service.forStudent.mockReturnValue(of([]));service.options.mockReturnValue(of({}));service.delete.mockReturnValue(of({success:true}));
    await TestBed.configureTestingModule({imports:[StudentSchedules],providers:[{provide:User,useValue:users},{provide:Account,useValue:account},{provide:StudentSchedulesService,useValue:service},{provide:CurriculumService,useValue:{getSubjects:()=>of([])}},{provide:CoursesService,useValue:{getCourses:()=>of([])}}]}).compileComponents();
    fixture=TestBed.createComponent(StudentSchedules);component=fixture.componentInstance;fixture.detectChanges();
  });
  it('loads the advertised second directory page so the 21st student and teacher are selectable',()=>{
    expect(users.getStudents).toHaveBeenCalledWith({PageNumber:1,PageSize:100});expect(users.getStudents).toHaveBeenCalledWith({PageNumber:2,PageSize:100});
    expect(account.getTeachers).toHaveBeenCalledWith({PageNumber:2,PageSize:100});
    expect(component.students()).toHaveLength(21);expect(component.students()[20].id).toBe('student-21');
    expect(component.allTeachers()).toHaveLength(21);expect(component.allTeachers()[20].id).toBe('teacher-21');
  });
  it('uses the actual collection API when displaying all schedules, never a phone-less search',()=>{
    component.showAll();expect(service.all).toHaveBeenCalledTimes(1);expect(service.search).not.toHaveBeenCalled();expect(component.selectedStudentId).toBe('');
  });
  it('uses an explicit phone search and retains that context on refresh until show-all is selected',()=>{
    component.phoneSearch.set('  +201000000000  ');component.searchByPhone();
    expect(service.search).toHaveBeenCalledWith('+201000000000');expect(service.all).not.toHaveBeenCalled();
    component.loadSchedules(true);expect(service.search).toHaveBeenCalledTimes(2);
    component.showAll();expect(service.all).toHaveBeenCalledTimes(1);expect(component.phoneSearch()).toBe('');
  });
  it('does not send an empty phone search and uses the per-student endpoint after student selection',()=>{
    component.searchByPhone();expect(service.search).not.toHaveBeenCalled();expect(component.error()).toContain('رقم هاتف');
    component.selectedStudentId='student-21';component.studentChanged();expect(service.forStudent).toHaveBeenCalledWith('student-21');expect(service.search).not.toHaveBeenCalled();
  });
  it('refreshes the same phone results after a confirmed deletion',()=>{
    component.phoneSearch.set('+201000000000');component.searchByPhone();component.deleteCandidate.set(row);component.confirmDelete();
    expect(service.delete).toHaveBeenCalledWith('schedule-1');expect(service.search).toHaveBeenCalledTimes(2);expect(service.all).not.toHaveBeenCalled();
  });
  it('shows lookup failures instead of pretending an incomplete first page is a complete selector',()=>{
    users.getStudents.mockImplementationOnce(()=>of(page(students.slice(0,20),1,21,true))).mockImplementationOnce(()=>throwError(()=>new Error('انقطع تحميل الصفحة الثانية')));
    component.loadLookups();expect(component.lookupError()).toContain('الصفحة الثانية');
  });
  it('guards a phone search against duplicate pending requests',()=>{
    const pending=new Subject<unknown>();service.search.mockReturnValueOnce(pending);component.phoneSearch.set('+201000000000');component.searchByPhone();component.searchByPhone();
    expect(service.search).toHaveBeenCalledTimes(1);pending.next([]);pending.complete();expect(component.loading()).toBe(false);
  });
});
