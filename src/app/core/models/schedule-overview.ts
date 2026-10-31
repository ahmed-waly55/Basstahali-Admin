/** The dashboard API publishes Cairo wall-clock times; its scheduledAt offset is not a clock source. */
export interface ScheduleOverviewItem {
  id: string;
  subject: string;
  teacher: string;
  name: string;
  teacherName: string;
  studentName: string;
  day: string;
  timeSlot: string;
  timeRange: string;
  period: string;
  colorTheme: string;
  zoomUrl: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  isLive: boolean;
  courseId: string | null;
  paymentStatus: string | null;
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
}

export interface ScheduleOverview {
  weekStart: string;
  weekEnd: string;
  items: ScheduleOverviewItem[];
}

const DAY_MS = 86_400_000;
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function normalizeDay(value: string): string { return value.replace(/[أإآ]/g, 'ا').replace(/\s+/g, ''); }
function latinDigits(value: string): string {
  return value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0));
}
export function validScheduleDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function scheduleDateKeys(start: string, end: string): string[] {
  if (!validScheduleDateKey(start) || !validScheduleDateKey(end)) return [];
  const first = Date.parse(`${start}T12:00:00Z`);
  const last = Date.parse(`${end}T12:00:00Z`);
  const length = Math.round((last - first) / DAY_MS) + 1;
  if (length <= 0 || length > 366) return [];
  return Array.from({ length }, (_, index) => new Date(first + index * DAY_MS).toISOString().slice(0, 10));
}
export function scheduleDateLabel(dateKey: string, long = false): string {
  if (!validScheduleDateKey(dateKey)) return dateKey;
  return new Intl.DateTimeFormat('ar-EG', { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC', calendar: 'gregory' }).format(new Date(`${dateKey}T12:00:00Z`));
}
export function cairoTodayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Cairo', calendar: 'gregory' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function parseScheduleClock(value: string): number | null {
  const match = latinDigits(value.trim()).match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(ص|م|AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || hour > 23 || (meridiem && (hour < 1 || hour > 12))) return null;
  if (meridiem) hour = hour % 12 + (meridiem === 'م' || meridiem === 'pm' ? 12 : 0);
  return hour * 60 + minute;
}
export function scheduleClockLabel(minutes: number): string {
  const normalized = (minutes % 1440 + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')} ${hour >= 12 ? 'م' : 'ص'}`;
}
export function safeScheduleUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function scheduleStatusLabel(item: Pick<ScheduleOverviewItem, 'status' | 'isLive'>): string {
  const status = item.status.toLowerCase();
  if (status === 'completed') return 'مكتملة';
  if (status === 'cancelled' || status === 'canceled') return 'ملغاة';
  if (item.isLive) return 'مباشرة الآن';
  if (status === 'attendancepending') return 'بانتظار الحضور';
  if (status === 'scheduled') return 'مجدولة';
  if (status === 'inprogress' || status === 'in_progress') return 'قيد التنفيذ';
  return item.status || 'غير محددة';
}
function sessionDate(row: Record<string, unknown>, start: string, end: string): string | null {
  const expectedDay = normalizeDay(text(row['day']));
  const date = text(row['scheduledAt']).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const matchesDay = (key: string) => !expectedDay || normalizeDay(DAYS[new Date(`${key}T12:00:00Z`).getUTCDay()]) === expectedDay;
  // The API's date offset is unreliable; accept its calendar date only inside the declared period.
  // Otherwise resolve the supplied weekday within that period, as the dashboard does.
  if (date && validScheduleDateKey(date) && date >= start && date <= end && matchesDay(date)) return date;
  return scheduleDateKeys(start, end).find(matchesDay) ?? null;
}
export function parseScheduleOverview(response: unknown): ScheduleOverview {
  const envelope = record(response);
  if (!envelope || envelope['success'] === false || envelope['isSuccess'] === false) {
    throw new Error(text(envelope?.['message']) || 'تعذر تحميل جدول الأكاديمية.');
  }
  const data = record(envelope['data']);
  const weekStart = text(data?.['weekStart']);
  const weekEnd = text(data?.['weekEnd']);
  if (!data || !Array.isArray(data['items']) || !scheduleDateKeys(weekStart, weekEnd).length) {
    throw new Error('صيغة جدول الأكاديمية أو الفترة المعروضة غير صالحة.');
  }
  const items = data['items'].map((value): ScheduleOverviewItem => {
    const row = record(value);
    if (!row || !text(row['id'])) throw new Error('ورد سجل حصة غير مكتمل في الجدول.');
    const dateKey = sessionDate(row, weekStart, weekEnd);
    const range = text(row['timeRange']);
    const rangeParts = range.split(/\s*[-–—]\s*/);
    const startMinutes = parseScheduleClock(text(row['timeSlot'])) ?? parseScheduleClock(rangeParts[0] || '');
    const rawDuration = row['durationMinutes'];
    const end = parseScheduleClock(rangeParts[1] || '');
    const durationMinutes = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 1440
      ? Math.round(rawDuration) : startMinutes !== null && end !== null ? (end - startMinutes + 1440) % 1440 : 0;
    if (!dateKey || startMinutes === null || !durationMinutes) throw new Error('ورد تاريخ أو وقت حصة غير صالح؛ أعد تحميل الجدول.');
    const teacher = text(row['teacher']);
    const name = text(row['name']);
    const endMinutes = startMinutes + durationMinutes;
    return {
      id: text(row['id']), subject: text(row['subject']) || 'مادة غير محددة', teacher, name,
      teacherName: text(row['teacherName']) || teacher || 'معلم غير محدد',
      studentName: text(row['studentName']) || name || 'طالب غير محدد',
      day: text(row['day']) || DAYS[new Date(`${dateKey}T12:00:00Z`).getUTCDay()],
      timeSlot: text(row['timeSlot']) || `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`,
      timeRange: range || `${scheduleClockLabel(startMinutes)} - ${scheduleClockLabel(endMinutes)}`,
      period: text(row['period']), colorTheme: text(row['colorTheme']), zoomUrl: text(row['zoomUrl']) || null,
      scheduledAt: text(row['scheduledAt']), durationMinutes, status: text(row['status']), isLive: row['isLive'] === true,
      courseId: text(row['courseId']) || null, paymentStatus: text(row['paymentStatus']) || null,
      dateKey, startMinutes, endMinutes,
    };
  }).sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.startMinutes - right.startMinutes || left.id.localeCompare(right.id));
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('وردت معرفات حصص مكررة في الجدول.');
  return { weekStart, weekEnd, items };
}
