import { Routes } from '@angular/router';
import { guestGuard } from './core/Guard/guest-guard';
import { authGuard } from './core/Guard/auth-guard-guard';

export const routes: Routes = [
  {path:"", redirectTo:"home", pathMatch:"full"},
  {path:"", canActivate:[authGuard] , loadComponent:()=> import("./layouts/main/main").then( m => m.Main), title:"بسطهالي | لوحة الادمن ",
    children:[
      {path:"home",loadComponent:()=> import("./features/home/home").then(m => m.HomeComponent), title:"لوحة التحكم"},
      {path:"users", loadComponent:()=> import("./features/users-component/users-component").then( m => m.UsersComponent), title: "لوحة التحكم | ادارة المستخدمين",
        children:[
         { path: "students", loadComponent: () => import("./features/users-component/pages/students/students").then(m => m.Students) },
        { path: "teachers", loadComponent: () => import("./features/users-component/pages/teacher/teacher").then(m => m.Teacher) },
        { path: "admins", loadComponent: () => import("./features/users-component/pages/moderator/moderator").then(m => m.Moderator) },
        { path: "reports", loadComponent: () => import("./features/users-component/pages/analytics/analytics").then(m => m.Analytics) }

        ]
      },
      {path:"analytics", loadComponent:()=> import("./features/analytics/analytics").then( m => m.Analytics), title: "لوحة التحكم | التقارير والاحصائيات"},
      {path:"expenses", loadComponent:()=> import("./features/expenses/expenses").then( m => m.Expenses), title: "لوحة التحكم | المصروفات"},
      {path:"teacher-salaries", loadComponent:()=> import("./features/payouts-management/payouts-management").then( m => m.PayoutsManagementComponent), title: "لوحة التحكم | رواتب المعلمين"},
      {path:"curriculum", loadComponent:()=> import("./features/curriculum/curriculum").then( m => m.Curriculum), title: "لوحة التحكم | المناهج"},
      {path:"settings", loadComponent:()=> import("./features/settings/settings").then( m => m.Settings), title: "لوحة التحكم | الاعدادات"},
      {path:"courses", loadComponent:()=> import("./features/courses/courses").then( m => m.Courses), title: "لوحة التحكم | الكورسات"},
      {path:"detailed-analytics", loadComponent:()=> import("./features/detailed-analytics/detailed-analytics").then( m => m.DetailedAnalytics), title: "لوحة التحكم | الاحصائيات بالتفصيل"},
      {path:"audit-logs", loadComponent:()=> import ("./features/audit/audit").then( m => m.Audit), title:"سجل المستخدمين"},
      {path:"teacher-forms", loadComponent:()=> import("./features/teacher-forms/teacher-forms").then(m => m.TeacherForms), title:"طلبات المدرسين"}
    ]

},


  {path:"login", canActivate:[guestGuard] , loadComponent:()=> import("./core/components/login/login").then(m => m.Login), title:"تسجيل الدخول"},

];
