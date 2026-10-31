import { cairoTodayKey, parseScheduleOverview, parseScheduleClock, safeScheduleUrl, scheduleClockLabel, scheduleDateKeys, scheduleStatusLabel } from './schedule-overview';

const lesson = (id: string, extra = {}) => ({ id, subject: 'اللغة العربية', teacher: 'معلم تجريبي', name: 'طالب تجريبي', day: 'السبت', timeSlot: '07:55', timeRange: '07:55 ص - 08:55 ص', period: 'am', colorTheme: 'blue', zoomUrl: 'https://example.test/class', scheduledAt: '2026-10-31T07:55:00+00:00', durationMinutes: 60, status: 'AttendancePending', isLive: false, courseId: null, paymentStatus: null, ...extra });
const response = (items: unknown[]) => ({ success: true, data: { weekStart: '2026-10-31', weekEnd: '2026-10-31', items } });

describe('Schedule overview API normalization', () => {
  it('preserves Cairo wall-clock time despite the API UTC offset and retains concurrent lessons', () => {
    const result = parseScheduleOverview(response([lesson('two'),lesson('one')]));
    expect(result.items).toHaveLength(2); expect(result.items[0].dateKey).toBe('2026-10-31');
    expect(result.items.map(item=>item.startMinutes)).toEqual([475,475]);
    expect(result.items[0].timeRange).toBe('07:55 ص - 08:55 ص');
    expect(result.items[0].studentName).toBe('طالب تجريبي');expect(result.items[0].teacherName).toBe('معلم تجريبي');
    expect(scheduleDateKeys(result.weekStart,result.weekEnd)).toEqual(['2026-10-31']);
  });
  it('resolves an out-of-period timestamp to its declared weekday inside the returned period', () => {
    const data = parseScheduleOverview({ success: true, data: { weekStart: '2026-11-07', weekEnd: '2026-11-07', items: [lesson('old-date')] } });
    expect(data.items[0].dateKey).toBe('2026-11-07');
    expect(data.items[0].startMinutes).toBe(475);
    expect(data.items[0].timeRange).toBe('07:55 ص - 08:55 ص');
    expect(scheduleDateKeys(data.weekStart,data.weekEnd)).toContain(data.items[0].dateKey);
  });
  it('rejects a lesson whose weekday cannot be resolved inside the declared period', () => {
    expect(() => parseScheduleOverview({ success: true, data: { weekStart: '2026-11-01', weekEnd: '2026-11-01', items: [lesson('wrong-weekday')] } })).toThrow('تاريخ أو وقت');
  });

  it('preserves server live state and status instead of deriving attendance from the browser clock', () => {
    const data=parseScheduleOverview(response([lesson('done',{status:'Completed'}),lesson('live',{isLive:true,status:'Scheduled'})]));
    expect(data.items.find(item=>item.id==='live')?.isLive).toBe(true);
    expect(scheduleStatusLabel(data.items.find(item=>item.id==='done')!)).toBe('مكتملة');
    expect(scheduleStatusLabel(data.items.find(item=>item.id==='live')!)).toBe('مباشرة الآن');
  });
  it('handles empty data without inventing seven days or invalid dates', () => {
    expect(parseScheduleOverview(response([])).items).toEqual([]);
    expect(scheduleDateKeys('2026-02-30','2026-03-01')).toEqual([]);
    expect(scheduleDateKeys('2026-11-01','2026-10-31')).toEqual([]);
    expect(()=>parseScheduleOverview({success:false,message:'مرفوض'})).toThrow('مرفوض');
    expect(()=>parseScheduleOverview({success:true,data:{weekStart:'2026-10-31',weekEnd:'2026-10-31',items:{}}})).toThrow();
  });
  it('rejects malformed lessons and duplicate IDs instead of silently dropping them', () => {
    expect(()=>parseScheduleOverview(response([lesson('bad',{timeSlot:'99:99',timeRange:''})]))).toThrow();
    expect(()=>parseScheduleOverview(response([lesson('same'),lesson('same')]))).toThrow('مكررة');
  });
  it('parses Arabic digits, noon, midnight and overnight ends without a timezone shift', () => {
    expect(parseScheduleClock('٠٧:٥٥')).toBe(475);expect(parseScheduleClock('12:00 ص')).toBe(0);
    expect(parseScheduleClock('12:55 م')).toBe(775);expect(parseScheduleClock('24:00')).toBeNull();
    expect(scheduleClockLabel(1445)).toBe('12:05 ص');
    const overnight=parseScheduleOverview(response([lesson('night',{timeSlot:'23:55',durationMinutes:60,timeRange:''})])).items[0];
    expect(overnight.endMinutes).toBe(1495);expect(overnight.timeRange).toBe('11:55 م - 12:55 ص');
    expect(cairoTodayKey(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
  });
  it('allows only ordinary http/https meeting URLs without embedded credentials', () => {
    expect(safeScheduleUrl('https://example.test/meeting')).toBe('https://example.test/meeting');
    for(const value of ['javascript:alert(1)','data:text/html,test','https://name:password@example.test','not-a-url','']) expect(safeScheduleUrl(value)).toBeNull();
  });
});
