/** Requests documented by the administration API. Response fields vary by endpoint. */
export type AdminRow = Record<string, unknown>;

export interface CreateStaffRequest {
  userName: string;
  password: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  role: string;
  contactInformation: string;
  fixedMonthlySalary: number;
}

export interface AttendanceDecisionRequest {
  notes: string;
  idempotencyKey: string;
}

export type AttendanceDecision = 'confirm' | 'reject';
export type ContactStatus = 'New';

export function isAdminRow(value: unknown): value is AdminRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accept the list envelopes already used by the API, without manufacturing rows. */
export function adminRows(response: unknown): AdminRow[] {
  assertAdminSuccess(response);
  let value = response;
  for (let depth = 0; depth < 6; depth++) {
    if (Array.isArray(value)) return value.filter(isAdminRow);
    if (value == null) return [];
    if (!isAdminRow(value)) break;
    assertAdminSuccess(value);
    if (Object.keys(value).length === 0) return [];
    const key = ['items', 'data', 'results', 'result', 'records', 'users', 'attendance', 'messages']
      .find(candidate => Object.hasOwn(value as AdminRow, candidate));
    if (!key) break;
    value = value[key];
  }
  throw new Error('تعذر قراءة القائمة المستلمة من الخادم. يرجى المحاولة مرة أخرى.');
}

export function assertAdminSuccess(response: unknown): void {
  if (isAdminRow(response) && (response['success'] === false || response['isSuccess'] === false)) {
    throw new Error(typeof response['message'] === 'string' ? response['message'] : 'لم تكتمل العملية.');
  }
}

export function adminErrorMessage(error: unknown): string {
  if (isAdminRow(error)) {
    const status = error['status'];
    if (status === 403) return 'ليس لديك صلاحية لتنفيذ هذه العملية.';
    if (status === 0) return 'تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.';
    const body = error['error'];
    if (isAdminRow(body)) {
      if (typeof body['message'] === 'string') return body['message'];
      if (typeof body['detail'] === 'string') return body['detail'];
      const validation = body['errors'];
      if (isAdminRow(validation)) {
        const messages = Object.values(validation).flat().filter((value): value is string => typeof value === 'string');
        if (messages.length) return messages.join(' — ');
      }
    }
  }
  return error instanceof Error ? error.message : 'تعذر إتمام العملية. حاول مرة أخرى.';
}
