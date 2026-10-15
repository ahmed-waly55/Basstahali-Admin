import { describe, expect, it } from 'vitest';
import { localScheduleDate, scheduleData, scheduleList, scheduleOptions } from './student-schedules';

describe('student schedule response handling', () => {
  it('rejects application failures even with HTTP 200', () => {
    expect(() => scheduleData({ success: false, message: 'لا يوجد رصيد' })).toThrow('لا يوجد رصيد');
  });

  it('accepts array and paginated list envelopes without inventing a missing list', () => {
    const items = [{ id: 'schedule-1' }];
    expect(scheduleList(items)).toEqual(items);
    expect(scheduleList({ data: { items } })).toEqual(items);
    expect(() => scheduleList({ data: { unknown: [] } })).toThrow();
  });

  it('keeps actual entity IDs and ignores incomplete options', () => {
    expect(scheduleOptions({ data: { items: [{ id: 'teacher-1', fullName: 'أحمد' }, { fullName: 'بدون معرف' }] } })).toEqual([{ id: 'teacher-1', name: 'أحمد' }]);
  });

  it('round-trips an existing timestamp through a local input without losing seconds', () => {
    const iso = '2026-10-15T08:04:43.000Z';
    expect(new Date(localScheduleDate(iso)).toISOString()).toBe(iso);
    expect(localScheduleDate('bad-date')).toBe('');
  });
});
