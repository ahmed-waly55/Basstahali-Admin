import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailedAnalytics } from './detailed-analytics';

describe('DetailedAnalytics', () => {
  let component: DetailedAnalytics;
  let fixture: ComponentFixture<DetailedAnalytics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailedAnalytics],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailedAnalytics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
