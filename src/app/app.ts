import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./shared/components/header/header";
import { Sidebar } from "./shared/components/sidebar/sidebar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('admin');


  isSidebarOpen = true;

  onToggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    // يمكنك ربط هذه المتغيرات لاحقاً لإخفاء/إظهار السيدبار باستخدام كلاسات Tailwind (مثل ngClass)
  }

}
