import { HttpParams } from '@angular/common/http';
import { DirectoryQuery } from '../models/directory-page';

/** PascalCase query names match the existing Basstahali Dashboard contract. */
export function directoryParams(query: DirectoryQuery): HttpParams {
  const page = Number.isSafeInteger(query.PageNumber) && query.PageNumber > 0 ? query.PageNumber : 1;
  const size = Number.isSafeInteger(query.PageSize) && query.PageSize > 0 ? query.PageSize : 20;
  let params = new HttpParams().set('PageNumber',page).set('PageSize',size);
  if (query.Search?.trim()) params = params.set('Search',query.Search.trim());
  return params;
}
