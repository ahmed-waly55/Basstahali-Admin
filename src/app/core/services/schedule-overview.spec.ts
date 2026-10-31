import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ScheduleOverviewService } from './schedule-overview';
import { environment } from '../../../environments/environment';

describe('Admin schedule overview HTTP contract', () => {
  let service:ScheduleOverviewService;let controller:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});service=TestBed.inject(ScheduleOverviewService);controller=TestBed.inject(HttpTestingController);localStorage.setItem('token','Bearer test-fixture');});
  afterEach(()=>{controller.verify();localStorage.clear();});
  it('uses the shared home schedule API with auth and no invented date query', () => {
    let received:any;service.getSchedule().subscribe(value=>received=value);
    const request=controller.expectOne(`${environment.baseUrl}/api/v1/home/schedule`);
    expect(request.request.method).toBe('GET');expect(request.request.params.keys()).toEqual([]);expect(request.request.headers.get('Authorization')).toBe('Bearer test-fixture');
    request.flush({success:true,data:{weekStart:'2026-10-31',weekEnd:'2026-10-31',items:[]}});
    expect(received.items).toEqual([]);
  });
  it('rejects a logical API failure through the observable error channel', () => {
    let failure:any;service.getSchedule().subscribe({error:error=>failure=error});
    controller.expectOne(`${environment.baseUrl}/api/v1/home/schedule`).flush({success:false,message:'غير مسموح'});
    expect(failure.message).toBe('غير مسموح');
  });
});
