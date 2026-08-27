import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../shared/components/header/header';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {

  isSidebarOpen = true;

  onToggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    // يمكنك ربط هذه المتغيرات لاحقاً لإخفاء/إظهار السيدبار باستخدام كلاسات Tailwind (مثل ngClass)
  }
}
