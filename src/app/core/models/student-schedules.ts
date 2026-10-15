/** Request fields from the supplied Swagger examples. Only Once is documented. */
export interface ScheduleFields {
  teacherId: string;
  subjectId: string;
  scheduledAt: string;
  durationMinutes: number;
  classLink: string;
  studentCreditCost: number;
  recurrenceType: string;
  courseId?: string;
}

export interface CreateStudentSchedule extends ScheduleFields {
  studentId: string;
  recurrenceType: 'Once';
  recurrenceEndDate?: string;
  sessionCount: number;
  dayOfWeek: string;
  startTime: string;
}

export interface UpdateStudentSchedule extends ScheduleFields {
  studentId: string;
  recurrenceEndDate?: string;
}

export interface BatchStudentSchedules {
  studentId: string;
  items: Omit<CreateStudentSchedule, 'studentId' | 'recurrenceEndDate'>[];
}

export interface StudentSchedule extends UpdateStudentSchedule {
  id: string;
  studentName: string;
  teacherName: string;
  subjectName: string;
  courseName: string;
}

export interface ScheduleOption {
  id: string;
  name: string;
}

export function scheduleRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function scheduleData(value: unknown): unknown {
  const record = scheduleRecord(value);
  if (record['success'] === false) {
    throw new Error(typeof record['message'] === 'string' ? record['message'] : 'رفض الخادم العملية.');
  }
  return record['data'] ?? value;
}

/** The pasted documentation contains no response schemas. Accept known list envelopes only. */
export function scheduleList(value: unknown): unknown[] {
  const data = scheduleData(value);
  if (Array.isArray(data)) return data;
  const record = scheduleRecord(data);
  if (Array.isArray(record['items'])) return record['items'];
  throw new Error('صيغة قائمة المواعيد غير معروفة. يلزم التحقق من استجابة الخادم.');
}

export function scheduleOptions(value: unknown): ScheduleOption[] {
  return scheduleList(value).flatMap(item => {
    const row = scheduleRecord(item);
    const id = row['id'];
    const name = row['fullName'] ?? row['nameAr'] ?? row['name'] ?? row['nameEn'];
    return typeof id === 'string' && typeof name === 'string' ? [{ id, name }] : [];
  });
}

export function localScheduleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
