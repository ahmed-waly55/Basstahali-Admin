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

});
