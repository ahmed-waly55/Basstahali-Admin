import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Students } from './students';
import { User } from '../../../../core/services/user';
import { Account } from '../../../../core/services/account';
import { CurriculumService } from '../../../../core/services/curriculum-service';

const uuid = '11111111-1111-1111-1111-111111111111';
const student = { id: uuid, fullName: 'طالب', userName: 'student', phoneNumber: '0100', parentName: 'ولي', parentPhoneNumber: '0110', gradeLevelId: uuid, curriculumId: uuid, educationStageId: uuid, status: 'Active', subjectIds: [uuid], expirationDate: '2027-01-01T12:15:23.456Z', teacherAssignments: [{ subjectId: uuid, teacherId: uuid, sessionPrice: 50, currency: 'EGP' }] };

describe('Student admin workflow', () => {
  let fixture: ComponentFixture<Students>;
  let component: Students;
  let user: any;
  beforeEach(async () => {
    user = {
      getStudents: vi.fn(() => of({ success: true, data: { items: [student] } })),
      getStudentById: vi.fn(() => of({ success: true, data: student })),
      getArchivedStudents: vi.fn(() => of({ success: true, data: [] })),
      addStudents: vi.fn(() => of({ success: true })), updateStudent: vi.fn(() => of({ success: true })),
      adjustStudentCredits: vi.fn(() => of({ success: true }))
    };
    const lookup = () => of({ success: true, data: [{ id: uuid, nameAr: 'اختيار' }] });
    await TestBed.configureTestingModule({ imports: [Students], providers: [provideRouter([]), { provide: User, useValue: user }, { provide: Account, useValue: { getTeachers: lookup } }, { provide: CurriculumService, useValue: { getCurriculums: lookup, getGradeLevels: lookup, getSubjects: lookup } }] }).compileComponents();
    fixture = TestBed.createComponent(Students); component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps existing rows and shows a retryable error when loading fails', () => {
    user.getStudents.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.getStudents();
    expect(component.dataSource.data[0].id).toBe(uuid);
    expect(component.errorMessage()).toContain('offline');
    expect(component.loading()).toBe(false);
  });

  it('sends create credentials only for creation and keeps the editor open on a rejected envelope', () => {
    component.openModal();
    component.studentForm.patchValue({ ...student, password: 'secret-pass' });
    user.addStudents.mockReturnValueOnce(of({ success: false, message: 'اسم مستخدم مكرر' }));
    component.saveStudent();
    expect(user.addStudents).toHaveBeenCalledTimes(1);
    const body = user.addStudents.mock.calls[0][0];
    expect(body.userName).toBe('student'); expect(body.password).toBe('secret-pass');
    expect(body.status).toBeUndefined(); expect(body.expirationDate).toBeUndefined();
    expect(component.isModalOpen).toBe(true); expect(component.editorError()).toContain('مكرر');
    expect(component.saving()).toBe(false);
  });

  it('loads full details before editing, preserves assignment fields and timestamp precision, and omits credentials', () => {
    component.openEdit(student as any);
    component.studentForm.controls.fullName.setValue('اسم جديد');
    component.saveStudent();
    expect(user.getStudentById).toHaveBeenCalledWith(uuid);
    expect(user.updateStudent).toHaveBeenCalledTimes(1);
    const [id, body] = user.updateStudent.mock.calls[0];
    expect(id).toBe(uuid); expect(body.teacherAssignments).toEqual(student.teacherAssignments);
    expect(body.subjectIds).toEqual([uuid]); expect(body.expirationDate).toBe(student.expirationDate);
    expect(body.userName).toBeUndefined(); expect(body.password).toBeUndefined();
    expect(component.isModalOpen).toBe(false);
  });

  it('requires review before replacing a subject list not returned by the API', () => {
    const { subjectIds, ...withoutSubjects } = student;
    user.getStudentById.mockReturnValueOnce(of({ success: true, data: withoutSubjects }));
    component.openEdit(student as any); component.saveStudent();
    expect(component.subjectsNeedReview()).toBe(true);
    expect(user.updateStudent).not.toHaveBeenCalled();
    component.studentForm.controls.subjectsReviewed.setValue(true); component.saveStudent();
    expect(user.updateStudent).toHaveBeenCalledTimes(1);
  });

  it('does not open an edit form that could erase missing teacher assignments', () => {
    const { teacherAssignments, ...partial } = student;
    user.getStudentById.mockReturnValueOnce(of({ success: true, data: partial }));
    component.openEdit(student as any);
    expect(component.isModalOpen).toBe(false); expect(component.errorMessage()).toContain('إسنادات');
  });

  it('prevents duplicate credit submissions and retains the same key after failure', () => {
    const pending = new Subject<any>();
    user.adjustStudentCredits.mockReturnValueOnce(pending);
    component.openCreditModal(student as any); component.creditForm.setValue({ quantity: 2, description: 'تعويض' });
    component.saveCredits(); component.saveCredits();
    expect(user.adjustStudentCredits).toHaveBeenCalledTimes(1);
    const key = user.adjustStudentCredits.mock.calls[0][1].idempotencyKey;
    expect(key).toBeTruthy(); pending.error(new Error('offline'));
    component.saveCredits();
    expect(user.adjustStudentCredits.mock.calls[1][1].idempotencyKey).toBe(key);
    expect(component.creditTarget()).toBeNull();
  });
  it('binds a credit key to its payload and retains it when reopening a failed operation', () => {
    user.adjustStudentCredits.mockImplementation(() => throwError(() => new Error('offline')));
    component.openCreditModal(student as any); component.creditForm.setValue({ quantity: 2, description: 'تعويض' });
    component.saveCredits(); const firstKey = user.adjustStudentCredits.mock.calls[0][1].idempotencyKey;
    component.closeCreditModal(); component.openCreditModal(student as any);
    component.creditForm.setValue({ quantity: 2, description: 'تعويض' }); component.saveCredits();
    expect(user.adjustStudentCredits.mock.calls[1][1].idempotencyKey).toBe(firstKey);
    component.creditForm.controls.quantity.setValue(3); component.saveCredits();
    expect(user.adjustStudentCredits.mock.calls[2][1].idempotencyKey).not.toBe(firstKey);
  });

  it('does not turn malformed subjectIds into character identifiers', () => {
    user.getStudentById.mockReturnValueOnce(of({ success: true, data: { ...student, subjectIds: 'malformed' } }));
    component.openEdit(student as any);
    expect(component.subjectsNeedReview()).toBe(true);
    expect(component.studentForm.controls.subjectIds.value).toEqual([uuid]);
    component.saveStudent(); expect(user.updateStudent).not.toHaveBeenCalled();
  });

  it('filters by actual returned statuses without relabeling unknown values as inactive', async () => {
    component.dataSource.data = [student, { ...student, id: 'other', fullName: 'طالب مؤجل', status: 'PendingReview' }] as any;
    component.statusFilter = 'PendingReview'; component.applyFilter();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(component.statusOptions).toEqual(['Active', 'PendingReview']);
    expect(component.dataSource.filteredData.map(item => item.id)).toEqual(['other']);
    expect(fixture.nativeElement.querySelector('.student-status').textContent).toContain('PendingReview');
    expect(fixture.nativeElement.textContent).toContain('سجل محمّل');
  });

  it('paginates a legacy loaded array without issuing extra network requests', async () => {
    const rows=Array.from({length:23},(_,index)=>({...student,id:String(index),fullName:`طالب ${String(index+1).padStart(2,'0')}`,phoneNumber:index===22?'012345':'0100'}));
    user.getStudents.mockReturnValueOnce(of({data:rows}));component.getStudents();fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(20);
    const before=user.getStudents.mock.calls.length;component.changePage({pageNumber:2,pageSize:20});fixture.detectChanges();
    expect(component.pageNumber).toBe(2);expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(3);expect(user.getStudents.mock.calls.length).toBe(before);
    component.searchQuery='012345';component.searchStudents();fixture.detectChanges();
    expect(component.pageNumber).toBe(1);expect(component.visibleStudents()).toHaveLength(1);expect(component.visibleStudents()[0].id).toBe('22');
    component.clearFilters();fixture.detectChanges();expect(component.visibleStudents()).toHaveLength(20);
  });

  it('requests page2 for the21st server record and keeps the returned row visible', () => {
    const first=Array.from({length:20},(_,index)=>({...student,id:String(index)}));
    user.getStudents.mockReturnValueOnce(of({data:{items:first,pageNumber:1,pageSize:20,totalCount:21,totalPages:2,hasNextPage:true,hasPreviousPage:false}}));component.getStudents();fixture.detectChanges();
    expect(component.totalCount).toBe(21);expect(component.visibleStudents()).toHaveLength(20);
    user.getStudents.mockReturnValueOnce(of({data:{items:[{...student,id:'21'}],pageNumber:2,pageSize:20,totalCount:21,totalPages:2,hasNextPage:false,hasPreviousPage:true}}));
    component.changePage({pageNumber:2,pageSize:20});fixture.detectChanges();
    expect(user.getStudents).toHaveBeenLastCalledWith({PageNumber:2,PageSize:20});expect(component.visibleStudents().map(item=>item.id)).toEqual(['21']);expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(1);
  });

  it('debounces server search and resets paging to1 before sending Search', async () => {
    user.getStudents.mockReturnValue(of({data:{items:[student],pageNumber:1,pageSize:20,totalCount:21,totalPages:2,hasNextPage:true}}));component.getStudents();
    component.pageNumber=2;component.searchQuery='  بحث أول  ';component.searchStudents();component.searchQuery='  بحث نهائي  ';component.searchStudents();
    await vi.waitFor(()=>expect(user.getStudents).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20,Search:'بحث نهائي'}));
    expect(component.pageNumber).toBe(1);
  });

  it('ignores stale pages and retries a failed target page without claiming old rows belong to it', () => {
    const old=new Subject<any>();user.getStudents.mockReturnValueOnce(old);component.getStudents();
    user.getStudents.mockReturnValueOnce(of({data:{items:[{...student,id:'new'}],pageNumber:1,pageSize:20,totalCount:21,totalPages:2,hasNextPage:true}}));component.getStudents();
    old.next({data:{items:[{...student,id:'stale'}],pageNumber:1,pageSize:20,totalCount:99}});old.complete();expect(component.visibleStudents()[0].id).toBe('new');
    user.getStudents.mockReturnValueOnce(throwError(()=>new Error('offline')));component.changePage({pageNumber:2,pageSize:20});expect(component.pageNumber).toBe(1);expect(component.errorMessage()).toContain('offline');
    user.getStudents.mockReturnValueOnce(of({data:{items:[{...student,id:'21'}],pageNumber:2,pageSize:20,totalCount:21,totalPages:2,hasNextPage:false}}));component.retryStudents();expect(user.getStudents).toHaveBeenLastCalledWith({PageNumber:2,PageSize:20});expect(component.visibleStudents()[0].id).toBe('21');
  });

  it('does not show old rows or page totals after a different server search fails', async () => {
    user.getStudents.mockReturnValueOnce(of({data:{items:[student],pageNumber:1,pageSize:20,totalCount:21,totalPages:2,hasNextPage:true}}));component.getStudents();
    user.getStudents.mockReturnValueOnce(throwError(()=>new Error('offline')));component.searchQuery='بحث جديد';component.searchStudents();
    await vi.waitFor(()=>expect(component.errorMessage()).toContain('offline'));
    expect(component.visibleStudents()).toEqual([]);expect(component.totalCount).toBeNull();expect(component.hasNextPage).toBe(false);
    user.getStudents.mockReturnValueOnce(of({data:{items:[{...student,id:'new'}],pageNumber:1,pageSize:20,totalCount:1,totalPages:1,hasNextPage:false}}));component.retryStudents();expect(user.getStudents).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20,Search:'بحث جديد'});
  });

  it('cancels a queued search when filters are cleared before the debounce fires', async () => {
    user.getStudents.mockReturnValue(of({data:{items:[student],pageNumber:1,pageSize:20,totalCount:1,totalPages:1,hasNextPage:false}}));component.getStudents();
    component.searchQuery='قديم';component.searchStudents();component.clearFilters();
    await new Promise(resolve=>setTimeout(resolve,350));expect(user.getStudents).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20});expect(component.loading()).toBe(false);
  });

  it('recovers from an emptied last server page after a mutation', () => {
    component.pageNumber=2;user.getStudents.mockReturnValueOnce(of({data:{items:[],pageNumber:2,pageSize:20,totalCount:20,totalPages:1,hasNextPage:false}})).mockReturnValueOnce(of({data:{items:[student],pageNumber:1,pageSize:20,totalCount:20,totalPages:1,hasNextPage:false}}));
    component.getStudents();expect(component.pageNumber).toBe(1);expect(user.getStudents).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20});expect(component.visibleStudents()).toHaveLength(1);
  });

  it('preserves the nullable stage and expiry returned by the API on a profile-only edit',()=>{
    user.getStudentById.mockReturnValueOnce(of({data:{...student,educationStageId:null,expirationDate:null}}));component.openEdit(student as any);component.studentForm.controls.fullName.setValue('تعديل الاسم');component.saveStudent();
    const body=user.updateStudent.mock.calls[0][1];expect(body.expirationDate).toBeNull();expect(body.educationStageId).toBeNull();
  });

  it('distinguishes an empty loaded list from unmatched filters and clears filters for the archive', () => {
    component.searchQuery = 'missing'; component.applyFilter(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('لا توجد نتائج مطابقة');
    component.statusFilter = 'Active'; component.toggleArchive(); fixture.detectChanges();
    expect(component.searchQuery).toBe(''); expect(component.statusFilter).toBe('');
    expect(user.getArchivedStudents).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('الأرشيف فارغ');
    expect(fixture.nativeElement.textContent).not.toContain('لا توجد نتائج مطابقة');
  });

  it('shows local required-field feedback without submitting an incomplete student', () => {
    component.openModal(); component.saveStudent(); fixture.detectChanges();
    expect(user.addStudents).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[formControlName="fullName"]').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('أدخل الاسم الكامل.');
  });

});
