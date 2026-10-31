import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { DirectoryQuery, parseDirectoryPage } from '../models/directory-page';

/** Read every advertised page for selectors; never mistake the first directory page for all options. */
export function loadDirectoryOptions<T>(request: (query: DirectoryQuery) => Observable<unknown>): Observable<T[]> {
  return defer(() => {
    const all: T[] = [];
    const load = (pageNumber: number): Observable<T[]> => request({PageNumber:pageNumber,PageSize:100}).pipe(switchMap(response => {
      const page = parseDirectoryPage<T>(response,pageNumber,100);
      if (page.serverPaged && page.pageNumber !== pageNumber) return throwError(() => new Error('لم يُرجع الخادم صفحة القوائم المطلوبة.'));
      all.push(...page.items);
      if (!page.serverPaged || !page.hasNextPage) return of(all);
      if (pageNumber >= 100) return throwError(() => new Error('عدد صفحات القوائم كبير جدًا؛ أعد المحاولة أو ضيّق نطاق البيانات.'));
      return load(pageNumber+1);
    }));
    return load(1);
  });
}
