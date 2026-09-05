import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayoutsManagement } from './payouts-management';

describe('PayoutsManagement', () => {
  let component: PayoutsManagement;
  let fixture: ComponentFixture<PayoutsManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutsManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutsManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
