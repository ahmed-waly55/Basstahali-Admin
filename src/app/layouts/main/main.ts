import { Component, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { Header } from '../../shared/components/header/header';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements OnInit, OnDestroy {
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  isSidebarOpen = false;

  ngOnInit(): void {
    this.checkScreenSize();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.isMobile()) {
          this.isSidebarOpen = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // فحص مقاس الشاشة عند تغيير حجم المتصفح
  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  private checkScreenSize(): void {
    if (typeof window !== 'undefined') {
      // شاشة أقل من 768px (موبايل) = مقفول، شاشة أكبر = مفتوح
      this.isSidebarOpen = window.innerWidth >= 768;
    }
  }

  onToggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }
}
