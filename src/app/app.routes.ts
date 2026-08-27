import { Routes } from '@angular/router';

export const routes: Routes = [
  {path:"", redirectTo:"home", pathMatch:"full"},
  {path:"", loadComponent:()=> import("./layouts/main/main").then( m => m.Main), title:"بسطهالي | لوحة الادمن ",
    children:[
      {path:"home",loadComponent:()=> import("./features/home/home").then(m => m.HomeComponent), title:"لوحة التحكم"},
      {path:"users", loadComponent:()=> import("./features/users-component/users-component").then( m => m.UsersComponent), title: "لوحة التحكم | ادارة المستخدمين"}
    ]
},
  {path:"login", loadComponent:()=> import("./core/components/login/login").then(m => m.Login), title:"تسجيل الدخول"}
];
