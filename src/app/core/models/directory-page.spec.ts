import { parseDirectoryPage } from './directory-page';

describe('Directory pagination metadata', () => {
  it('keeps total21 for a first page of20 without replacing it with the loaded item count', () => {
    const page=parseDirectoryPage({success:true,data:{items:Array.from({length:20},(_,id)=>({id})),pageNumber:1,pageSize:20,totalCount:21,totalPages:2,hasPreviousPage:false,hasNextPage:true}},1,20);
    expect(page.totalCount).toBe(21);expect(page.totalPages).toBe(2);expect(page.hasNextPage).toBe(true);expect(page.items).toHaveLength(20);expect(page.serverPaged).toBe(true);
  });
  it('keeps the last page as returned instead of slicing its single row again', () => {
    const page=parseDirectoryPage({data:{items:[{id:'21'}],pageNumber:2,pageSize:20,totalCount:21,totalPages:2,hasPreviousPage:true,hasNextPage:false}},2,20);
    expect(page.items).toEqual([{id:'21'}]);expect(page.pageNumber).toBe(2);expect(page.hasPreviousPage).toBe(true);
  });
  it('preserves zero and does not invent unknown totals', () => {
    expect(parseDirectoryPage({data:{items:[],totalCount:0}},1,20).totalCount).toBe(0);
    const unknown=parseDirectoryPage({data:{items:[{id:'1'}],pageNumber:1,pageSize:20,hasNextPage:true}},1,20);
    expect(unknown.totalCount).toBeNull();expect(unknown.totalPages).toBeNull();expect(unknown.hasNextPage).toBe(true);
    expect(parseDirectoryPage([{id:'1'}],1,20).serverPaged).toBe(false);
  });
  it('rejects failed and malformed lists and handles impossible counts safely', () => {
    expect(()=>parseDirectoryPage({success:false,message:'رفض'})).toThrow('رفض');
    expect(()=>parseDirectoryPage({data:{items:'not-list'}})).toThrow();
    expect(parseDirectoryPage({data:{items:[{id:'1'}],totalCount:0}}).totalCount).toBeNull();
  });
});
