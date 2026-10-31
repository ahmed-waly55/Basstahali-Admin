import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Teacher } from './teacher';
import { Account } from '../../../../core/services/account';
import { CurriculumService } from '../../../../core/services/curriculum-service';

const rows = Array.from({length:20},(_,index)=>({id:`teacher-${index+1}`,fullName:`معلم ${index+1}`,phoneNumber:'01000000000',status:'Active'}));
const page=(items:any[],pageNumber=1,totalCount:number|null=21)=>({success:true,data:{items,pageNumber,pageSize:20,...(totalCount===null?{hasNextPage:true}:{totalCount,totalPages:Math.ceil(totalCount/20),hasNextPage:pageNumber<Math.ceil(totalCount/20)})}});

describe('Teacher server directory pagination',()=>{
  let account:any;let component:Teacher;
  beforeEach(async()=>{
    account={getTeachers:vi.fn(()=>of(page(rows))),getArchivedTeachers:vi.fn(()=>of(page([],1,0))),deleteTeacher:vi.fn(),restoreTeacher:vi.fn(),createTeacher:vi.fn(),updateTeacher:vi.fn()};
    const lookup=()=>of({data:[]});
    await TestBed.configureTestingModule({imports:[Teacher],providers:[provideRouter([]),{provide:Account,useValue:account},{provide:CurriculumService,useValue:{getCurriculums:lookup,getSubjects:lookup,getGradeLevels:lookup}}]}).compileComponents();
    const fixture=TestBed.createComponent(Teacher);component=fixture.componentInstance;fixture.detectChanges();
  });
  afterEach(()=>vi.useRealTimers());
  it('keeps server total21 and fetches page2 without slicing its single returned row',()=>{
    expect(account.getTeachers).toHaveBeenCalledWith({PageNumber:1,PageSize:20,Search:''});
    expect(component.dataSource.data).toHaveLength(20);expect(component.activePage.totalCount).toBe(21);
    account.getTeachers.mockReturnValueOnce(of(page([{id:'last',fullName:'المعلم الأخير'}],2)));
    component.changePage({pageNumber:2,pageSize:20});
    expect(account.getTeachers).toHaveBeenLastCalledWith({PageNumber:2,PageSize:20,Search:''});
    expect(component.dataSource.data.map(row=>row.id)).toEqual(['last']);expect(component.activePage.hasNextPage).toBe(false);
  });
  it('changes page size on the server and resets the requested page',()=>{
    component.changePage({pageNumber:1,pageSize:50});
    expect(account.getTeachers).toHaveBeenLastCalledWith({PageNumber:1,PageSize:50,Search:''});
  });
  it('debounces server search and resets page1',async()=>{
    component.activePage.pageNumber=2;
    component.applyFilter({target:{value:'  أحمد & Ali '}} as unknown as Event);
    await new Promise(resolve=>setTimeout(resolve,350));
    expect(account.getTeachers).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20,Search:'أحمد & Ali'});
  });
  it('does not replace a newer page with a stale response',()=>{
    const old=new Subject<any>();account.getTeachers.mockReturnValueOnce(old);component.loadTeachers();
    account.getTeachers.mockReturnValueOnce(of(page([{id:'new',fullName:'جديد'}],2)));component.activePage.pageNumber=2;component.loadTeachers();
    old.next(page(rows));expect(component.dataSource.data[0].id).toBe('new');
  });
  it('preserves zero totals and does not invent a total for an unknown server count',()=>{
    account.getTeachers.mockReturnValueOnce(of(page([],1,0)));component.loadTeachers();expect(component.activePage.totalCount).toBe(0);
    account.getTeachers.mockReturnValueOnce(of(page(rows,1,null)));component.loadTeachers();expect(component.activePage.totalCount).toBeNull();expect(component.activePage.hasNextPage).toBe(true);
  });
  it('retries on the last available page after deleting the only record on page2',()=>{
    component.activePage.pageNumber=2;account.getTeachers.mockReturnValueOnce(of(page([],2,20)));account.getTeachers.mockReturnValueOnce(of(page(rows,1,20)));
    component.loadTeachers();expect(account.getTeachers).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20,Search:''});expect(component.dataSource.data).toHaveLength(20);
  });
  it('exposes a retryable load failure without fake data',()=>{
    account.getTeachers.mockReturnValueOnce(throwError(()=>new Error('offline')));component.loadTeachers();expect(component.activeLoadError).toContain('offline');expect(component.isLoading).toBe(false);expect(component.dataSource.data).toEqual([]);
  });
  it('locally pages legacy arrays explicitly without another server request',()=>{
    account.getTeachers.mockReturnValueOnce(of({data:[...rows,{id:'last',fullName:'آخر'}]}));component.loadTeachers();const calls=account.getTeachers.mock.calls.length;
    expect(component.activePage.serverPaged).toBe(false);component.changePage({pageNumber:2,pageSize:20});expect(account.getTeachers).toHaveBeenCalledTimes(calls);expect(component.dataSource.data.map(row=>row.id)).toEqual(['last']);
  });
  it('clears old totals and next-page permission when a new search fails, then retries its first page', async () => {
    expect(component.activePage.totalCount).toBe(21);
    expect(component.activePage.hasNextPage).toBe(true);
    component.activePage.pageNumber=2;
    account.getTeachers.mockReturnValueOnce(throwError(()=>new Error('search offline')));
    component.applyFilter({target:{value:'  معلم جديد  '}} as unknown as Event);
    await new Promise(resolve=>setTimeout(resolve,350));
    expect(component.activePage.pageNumber).toBe(1);
    expect(component.activePage.items).toEqual([]);
    expect(component.dataSource.data).toEqual([]);
    expect(component.activePage.totalCount).toBeNull();expect(component.activePage.totalPages).toBeNull();
    expect(component.activePage.hasNextPage).toBe(false);expect(component.activeLoadError).toContain('offline');
    account.getTeachers.mockReturnValueOnce(of(page([{id:'matching',fullName:'معلم جديد'}],1,1)));
    component.loadTeachers();
    expect(account.getTeachers).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20,Search:'معلم جديد'});
    expect(component.activePage.totalCount).toBe(1);expect(component.dataSource.data[0].id).toBe('matching');
  });

});
