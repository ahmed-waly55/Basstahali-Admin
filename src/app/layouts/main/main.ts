import { DOCUMENT } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, HostListener, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { Header } from '../../shared/components/header/header';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({ selector:'app-main', standalone:true, imports:[RouterOutlet, Header, Sidebar, A11yModule], templateUrl:'./main.html', styleUrl:'./main.css' })
export class Main implements OnInit, OnDestroy {
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private wasDesktop: boolean | undefined;
  private originalOverflow: string | null = null;
  private focusBeforeMenu: HTMLElement | null = null;
  isSidebarOpen = false;
  isMobileViewport = true;

  ngOnInit(): void {
    this.checkScreenSize();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd),takeUntil(this.destroy$)).subscribe(() => {
      if (this.isMobileViewport) this.closeSidebar(false);
      requestAnimationFrame(() => this.document.getElementById('admin-main')?.focus({preventScroll:true}));
    });
  }
  ngOnDestroy(): void { this.unlockBody(); this.destroy$.next(); this.destroy$.complete(); }
  @HostListener('window:resize') onResize(): void { this.checkScreenSize(); }
  @HostListener('document:keydown.escape') onEscape(): void { if (this.isMobileViewport && this.isSidebarOpen) this.closeSidebar(); }
  private checkScreenSize(): void {
    const isDesktop = (this.document.defaultView?.innerWidth ?? 0) >= 1024;
    this.isMobileViewport = !isDesktop;
    if (isDesktop !== this.wasDesktop) {
      this.isSidebarOpen = isDesktop && this.desktopPreference();
      this.wasDesktop = isDesktop;
      this.syncScroll();
      this.cdr.markForCheck();
    }
  }
  private desktopPreference(): boolean {
    try { return localStorage.getItem('basstahali:sidebar-open') !== 'false'; } catch { return true; }
  }
  onToggleSidebar(): void {
    if (this.isMobileViewport && this.isSidebarOpen) { this.closeSidebar(); return; }
    if (this.isMobileViewport) this.focusBeforeMenu = this.document.activeElement as HTMLElement;
    this.isSidebarOpen = !this.isSidebarOpen;
    if (!this.isMobileViewport) { try { localStorage.setItem('basstahali:sidebar-open',String(this.isSidebarOpen)); } catch {} }
    this.syncScroll();
  }
  closeSidebar(restoreFocus = true): void {
    const opener = restoreFocus && this.isMobileViewport && this.isSidebarOpen ? this.focusBeforeMenu : null;
    this.isSidebarOpen = false; this.focusBeforeMenu = null; this.syncScroll(); this.cdr.markForCheck();
    if (opener?.isConnected) requestAnimationFrame(() => opener.focus({preventScroll:true}));
  }
  onNavigationOpened(): void { if (this.isMobileViewport) this.closeSidebar(false); }
  private syncScroll(): void {
    if (this.isMobileViewport && this.isSidebarOpen) {
      if (this.originalOverflow === null) this.originalOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    } else this.unlockBody();
  }
  private unlockBody(): void {
    if (this.originalOverflow !== null) { this.document.body.style.overflow = this.originalOverflow; this.originalOverflow = null; }
  }
}
