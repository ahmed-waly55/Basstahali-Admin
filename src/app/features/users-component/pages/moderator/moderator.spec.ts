import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Moderator } from './moderator';

describe('Moderator', () => {
  let component: Moderator;
  let fixture: ComponentFixture<Moderator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Moderator],
    }).compileComponents();

    fixture = TestBed.createComponent(Moderator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
