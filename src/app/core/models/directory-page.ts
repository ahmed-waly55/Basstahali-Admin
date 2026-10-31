export interface DirectoryQuery { PageNumber: number; PageSize: number; Search?: string; }
export interface DirectoryPageChange { pageNumber: number; pageSize: number; }
export interface DirectoryPage<T> extends DirectoryPageChange {
  items: T[];
  totalCount: number | null;
  totalPages: number | null;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  serverPaged: boolean;
}
function record(value: unknown): Record<string,unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
}
function count(value: unknown): number | null { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null; }
export function parseDirectoryPage<T>(response: unknown, requestedPage = 1, requestedSize = 20): DirectoryPage<T> {
  const outer = record(response);
  if (outer?.['success'] === false || outer?.['isSuccess'] === false) throw new Error(typeof outer['message'] === 'string' ? outer['message'] : 'تعذر تحميل قائمة الحسابات.');
  const data = outer?.['data'] ?? response;
  const object = record(data);
  const items = Array.isArray(data) ? data : object?.['items'];
  if (!Array.isArray(items) || items.some(item => record(item) === null)) throw new Error('استجابة قائمة الحسابات غير صالحة.');
  const metadata = { ...outer, ...object, ...record(object?.['pagination']) };
  const serverPaged = ['pageNumber','pageSize','totalCount','totalPages','hasPreviousPage','hasNextPage'].some(key => Object.prototype.hasOwnProperty.call(metadata,key));
  const pageNumber = count(metadata['pageNumber']) || Math.max(1,requestedPage);
  const pageSize = count(metadata['pageSize']) || Math.max(1,requestedSize);
  const suppliedCount = count(metadata['totalCount']);
  const totalCount = suppliedCount !== null && suppliedCount >= items.length ? suppliedCount : null;
  const totalPages = totalCount !== null ? Math.ceil(totalCount / pageSize) : count(metadata['totalPages']);
  return {
    items: items as T[], pageNumber, pageSize, totalCount, totalPages, serverPaged,
    hasPreviousPage: typeof metadata['hasPreviousPage'] === 'boolean' ? metadata['hasPreviousPage'] : pageNumber > 1,
    hasNextPage: typeof metadata['hasNextPage'] === 'boolean' ? metadata['hasNextPage'] : totalPages !== null && pageNumber < totalPages,
  };
}
