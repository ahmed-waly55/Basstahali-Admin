import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherForms } from './teacher-forms';

describe('TeacherForms', () => {
  let component: TeacherForms;
  let fixture: ComponentFixture<TeacherForms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherForms],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherForms);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
