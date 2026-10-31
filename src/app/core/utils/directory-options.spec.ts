import { of } from 'rxjs';
import { loadDirectoryOptions } from './directory-options';
describe('Complete directory selectors',()=>{
  it('loads the advertised second page so the21st account is selectable',()=>{
    const request=vi.fn(query=>of({data:{items:query.PageNumber===1?Array.from({length:20},(_,id)=>({id})):[{id:20}],pageNumber:query.PageNumber,pageSize:20,totalCount:21,totalPages:2,hasNextPage:query.PageNumber===1}}));
    let rows:unknown[]=[];loadDirectoryOptions(request).subscribe(result=>rows=result);
    expect(rows).toHaveLength(21);expect(request).toHaveBeenCalledTimes(2);expect(request.mock.calls[1][0].PageNumber).toBe(2);
  });
  it('accepts a legacy array once and rejects a server that repeats the wrong page',()=>{
    const request=vi.fn(()=>of([{id:1}]));loadDirectoryOptions(request).subscribe(rows=>expect(rows).toHaveLength(1));expect(request).toHaveBeenCalledOnce();
    const repeats=()=>of({data:{items:[{id:1}],pageNumber:1,pageSize:1,totalCount:2,hasNextPage:true}});
    let error='';loadDirectoryOptions(repeats).subscribe({error:e=>error=e.message});expect(error).toContain('صفحة');
  });
});
