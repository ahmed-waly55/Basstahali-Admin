export interface AdminDestination {
  label: string;
  route: string;
  icon: string;
  keywords?: string;
}
export interface AdminSection {
  label: string;
  items: AdminDestination[];
}
export const ADMIN_SECTIONS: AdminSection[] = [
  { label: 'نظرة عامة', items: [
    { label: 'لوحة المتابعة', route: '/home', icon: 'space_dashboard', keywords: 'الرئيسية داشبورد احصائيات' },
    { label: 'التقارير العامة', route: '/analytics', icon: 'insights', keywords: 'تحليل ايرادات مصروفات' },
    { label: 'التقارير التفصيلية', route: '/detailed-analytics', icon: 'query_stats', keywords: 'ارباح مالية' },
  ] },
  { label: 'التعليم والطلاب', items: [
    { label: 'الطلاب', route: '/users/students', icon: 'school', keywords: 'طالب تسجيل اضافة ارشيف استعادة' },
    { label: 'المعلمون', route: '/users/teachers', icon: 'co_present', keywords: 'المدرسين مدرس معلم' },
    { label: 'جدول الحصص', route: '/student-schedules', icon: 'calendar_month', keywords: 'جداول مواعيد حصة' },
    { label: 'الكورسات', route: '/courses', icon: 'play_lesson', keywords: 'دورات اشتراكات دورة' },
    { label: 'المناهج والمراحل', route: '/curriculum', icon: 'auto_stories', keywords: 'مواد صفوف منهج مادة تعليمية' },
    { label: 'طلبات المعلمين', route: '/teacher-forms', icon: 'assignment_ind', keywords: 'مدرسين موافقة رفض طلبات' },
  ] },
  { label: 'الإدارة المالية', items: [
    { label: 'مالية الطلاب', route: '/student-finance', icon: 'account_balance_wallet', keywords: 'مدفوعات اقساط رصيد تحصيل خطة دفع' },
    { label: 'مستحقات المعلمين', route: '/teacher-salaries', icon: 'payments', keywords: 'رواتب صرف مستحق راتب' },
    { label: 'المصروفات', route: '/expenses', icon: 'receipt_long', keywords: 'تشغيل مصروف تكلفة' },
    { label: 'الفترات والرواتب', route: '/finance-management', icon: 'account_balance', keywords: 'شركاء نسب اغلاق فترة شريك' },
  ] },
  { label: 'إدارة النظام', items: [
    { label: 'المشرفون', route: '/users/admins', icon: 'manage_accounts', keywords: 'ادمن صلاحيات مشرف مدير' },
    { label: 'الحسابات والحضور', route: '/admin-operations', icon: 'fact_check', keywords: 'موظف حساب موظفين حضور رسائل التواصل تفعيل' },
    { label: 'سجل النشاط', route: '/audit-logs', icon: 'history', keywords: 'مراجعة عمليات مستخدمين تدقيق' },
    { label: 'إعدادات الحساب', route: '/settings', icon: 'settings', keywords: 'كلمة مرور حساب اعدادات' },
  ] },
];
export const ADMIN_DESTINATIONS = ADMIN_SECTIONS.flatMap(section => section.items.map(item => ({ ...item, section: section.label })));
const extras = [
  { label: 'إدارة المستخدمين', route: '/users', icon: 'group', section: 'إدارة النظام' },
  { label: 'تقارير المستخدمين', route: '/users/reports', icon: 'bar_chart', section: 'إدارة النظام' },
];
export function adminPage(url: string) {
  const path = url.split(/[?#]/)[0];
  return [...ADMIN_DESTINATIONS, ...extras].find(item => item.route === path) ?? { label: 'لوحة الإدارة', route: path, icon: 'dashboard', section: 'بسطهالي' };
}
export function normalizeAdminSearch(value: string): string {
  return value.toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
}
