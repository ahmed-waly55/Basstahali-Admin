import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { Account } from '../../../../core/services/account';

describe('Moderator HTTP contract', () => {
  let account: Account;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    account = TestBed.inject(Account);
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'moderator-test-token');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('token');
  });

  it('uses authenticated PUT /api/v1/moderators/{id} with the documented update body', () => {
    const payload = {
      fullName: 'أحمد علي', phoneNumber: '01012345678', status: 'Active',
      fixedMonthlySalary: 3500, salaryCurrency: 'EGP',
    };
    account.updateModerator('moderator-1', payload).subscribe();
    const request = http.expectOne(`${environment.baseUrl}/api/v1/moderators/moderator-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe('Bearer moderator-test-token');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body).not.toHaveProperty('password');
    expect(request.request.body).not.toHaveProperty('userName');
    request.flush({ success: true });
  });

  it('keeps POST and DELETE at the documented moderator resource', () => {
    const payload = {
      userName: 'moderator', password: 'password123', fullName: 'أحمد علي',
      phoneNumber: '01012345678', fixedMonthlySalary: 0, salaryCurrency: 'EGP',
    };
    account.createModerator(payload).subscribe();
    const create = http.expectOne(`${environment.baseUrl}/api/v1/moderators`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ success: true });
    account.deleteModerator('moderator-1').subscribe();
    const remove = http.expectOne(`${environment.baseUrl}/api/v1/moderators/moderator-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ success: true });
  });
});
