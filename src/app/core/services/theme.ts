import { DOCUMENT } from '@angular/common';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'basstahali:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private document = inject(DOCUMENT);
  private selected = signal<ThemePreference>('system');
  private dark = signal(false);
  private media: MediaQueryList | null = null;
  private initialized = false;
  readonly preference = this.selected.asReadonly();
  readonly isDark = this.dark.asReadonly();
  private onSystemChange = () => { if (this.selected() === 'system') this.apply(); };

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const view = this.document.defaultView;
    this.media = view?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
    let stored: string | null = null;
    try { stored = view?.localStorage.getItem(STORAGE_KEY) ?? null; } catch { /* Theme still works when storage is unavailable. */ }
    this.selected.set(stored === 'light' || stored === 'dark' ? stored : 'system');
    this.media?.addEventListener?.('change',this.onSystemChange);
    this.apply();
  }
  setPreference(preference: ThemePreference): void {
    if (!this.initialized) this.initialize();
    this.selected.set(preference);
    try { this.document.defaultView?.localStorage.setItem(STORAGE_KEY,preference); } catch { /* Keep current-session preference. */ }
    this.apply();
  }
  toggle(): void { this.setPreference(this.dark() ? 'light' : 'dark'); }
  private apply(): void {
    const dark = this.selected() === 'dark' || (this.selected() === 'system' && !!this.media?.matches);
    this.dark.set(dark);
    this.document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
    this.document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
  ngOnDestroy(): void { this.media?.removeEventListener?.('change',this.onSystemChange); }
}
