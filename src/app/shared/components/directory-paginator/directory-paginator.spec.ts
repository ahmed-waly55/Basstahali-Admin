import { TestBed } from '@angular/core/testing';
import { DirectoryPaginator } from './directory-paginator';
describe('Shared account pagination controls',()=>{
  it('renders server total21 on page2 and emits only valid navigation',()=>{
    const fixture=TestBed.createComponent(DirectoryPaginator);const component=fixture.componentInstance;
    component.pageNumber=2;component.pageSize=20;component.itemCount=1;component.totalCount=21;component.totalPages=2;component.hasPreviousPage=true;component.hasNextPage=false;fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('21–21 من 21');
    const emit=vi.spyOn(component.pageChange,'emit');component.go(3);expect(emit).not.toHaveBeenCalled();
    component.go(1);expect(emit).toHaveBeenCalledWith({pageNumber:1,pageSize:20});
    component.disabled=true;component.go(1);expect(emit).toHaveBeenCalledTimes(1);
  });
  it('keeps unknown totals honest and resets page1 on a valid size change',()=>{
    const fixture=TestBed.createComponent(DirectoryPaginator);const component=fixture.componentInstance;
    component.pageNumber=3;component.pageSize=20;component.itemCount=20;component.hasNextPage=true;fixture.detectChanges();
    expect(component.rangeLabel).toBe('20 سجل في الصفحة 3');expect(fixture.nativeElement.querySelector('[aria-label="الصفحة الأخيرة"]')).toBeNull();
    const emit=vi.spyOn(component.pageChange,'emit');component.changeSize({target:{value:'50'}} as unknown as Event);expect(emit).toHaveBeenCalledWith({pageNumber:1,pageSize:50});
  });
});
