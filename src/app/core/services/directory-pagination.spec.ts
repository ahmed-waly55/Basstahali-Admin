import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Account } from './account';
import { User } from './user';
import { environment } from '../../../environments/environment';

describe('Directory server query contract',()=>{
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});localStorage.setItem('token','fixture-token');});
  afterEach(()=>{TestBed.inject(HttpTestingController).verify();localStorage.clear();});
  it('sends PascalCase paging and trimmed encoded search for all three admin account directories',()=>{
    const q={PageNumber:2,PageSize:20,Search:'  أميرة & Ahmed  '};
    TestBed.inject(User).getStudents(q).subscribe();TestBed.inject(Account).getTeachers(q).subscribe();TestBed.inject(Account).getModerators(q).subscribe();
    for(const path of ['students','teachers','moderators']){
      const request=TestBed.inject(HttpTestingController).expectOne(item=>item.url===`${environment.baseUrl}/api/v1/${path}`);
      expect(request.request.params.get('PageNumber')).toBe('2');expect(request.request.params.get('PageSize')).toBe('20');expect(request.request.params.get('Search')).toBe('أميرة & Ahmed');expect(request.request.headers.get('Authorization')).toBe('Bearer fixture-token');request.flush({data:{items:[]}});
    }
  });
  it('preserves no-query dropdown calls and applies paging to the archive only when supplied',()=>{
    TestBed.inject(User).getStudents().subscribe();TestBed.inject(Account).getTeachers().subscribe();TestBed.inject(Account).getModerators().subscribe();
    for(const path of ['students','teachers','moderators']){const request=TestBed.inject(HttpTestingController).expectOne(`${environment.baseUrl}/api/v1/${path}`);expect(request.request.params.keys()).toEqual([]);request.flush({data:[]});}
    TestBed.inject(User).getArchivedStudents({PageNumber:2,PageSize:20}).subscribe();const archive=TestBed.inject(HttpTestingController).expectOne(item=>item.url.endsWith('/archived-records/students'));expect(archive.request.params.get('PageNumber')).toBe('2');archive.flush({data:[]});
  });
});
