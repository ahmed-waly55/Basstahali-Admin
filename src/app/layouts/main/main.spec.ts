import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Notifications } from '../../core/services/notifications';
import { Main } from './main';

describe('Admin workspace navigation', () => {
  let fixture: ComponentFixture<Main> | undefined;
  let originalOverflow: string;

  beforeEach(async () => {
    originalOverflow = document.body.style.overflow;
    localStorage.clear();
    vi.stubGlobal('innerWidth', 390);
    await TestBed.configureTestingModule({
      imports: [Main],
      providers: [
        provideRouter([]),
        { provide: Notifications, useValue: { getNotifications: () => of({ success: true, data: { items: [], unreadCount: 0 } }) } }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
    document.body.style.overflow = originalOverflow;
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createWorkspace(): ComponentFixture<Main> {
    fixture = TestBed.createComponent(Main);
    fixture.detectChanges();
    return fixture;
  }

  function menuButton(workspace: ComponentFixture<Main>): HTMLButtonElement {
    return workspace.nativeElement.querySelector('button[aria-controls="admin-sidebar"]');
  }

  it('returns keyboard focus to the menu opener and restores scrolling after Escape on mobile', async () => {
    document.body.style.overflow = 'clip';
    const workspace = createWorkspace();
    const opener = menuButton(workspace);
    const sidebar = workspace.nativeElement.querySelector('#admin-sidebar') as HTMLElement;
    expect(sidebar.hasAttribute('inert')).toBe(true);

    opener.focus();
    opener.click();
    workspace.detectChanges();
    await workspace.whenStable();
    expect(opener.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    const close = sidebar.querySelector('button[aria-label="إغلاق القائمة"]') as HTMLButtonElement;
    close.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    workspace.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    expect(sidebar.hasAttribute('inert')).toBe(true);
    expect(opener.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('clip');
    expect(document.activeElement).toBe(opener);
  });

  it('keeps a mobile menu open during a resize within the mobile breakpoint and unlocks scrolling on desktop', () => {
    document.body.style.overflow = 'auto';
    const workspace = createWorkspace();
    menuButton(workspace).click();
    workspace.detectChanges();

    vi.stubGlobal('innerWidth', 420);
    vi.stubGlobal('innerHeight', 500);
    window.dispatchEvent(new Event('resize'));
    workspace.detectChanges();
    expect(menuButton(workspace).getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    vi.stubGlobal('innerWidth', 1280);
    window.dispatchEvent(new Event('resize'));
    workspace.detectChanges();
    expect(workspace.nativeElement.querySelector('.sidebar-backdrop')).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores the saved desktop choice after visiting the mobile layout', () => {
    vi.stubGlobal('innerWidth', 1280);
    localStorage.setItem('basstahali:sidebar-open', 'false');
    const workspace = createWorkspace();
    expect(menuButton(workspace).getAttribute('aria-expanded')).toBe('false');

    menuButton(workspace).click();
    workspace.detectChanges();
    expect(localStorage.getItem('basstahali:sidebar-open')).toBe('true');

    vi.stubGlobal('innerWidth', 390);
    window.dispatchEvent(new Event('resize'));
    workspace.detectChanges();
    expect(menuButton(workspace).getAttribute('aria-expanded')).toBe('false');

    vi.stubGlobal('innerWidth', 1280);
    window.dispatchEvent(new Event('resize'));
    workspace.detectChanges();
    expect(menuButton(workspace).getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe(originalOverflow);
  });

  it('restores the previous scroll style when the workspace is destroyed with its mobile menu open', () => {
    document.body.style.overflow = 'scroll';
    const workspace = createWorkspace();
    menuButton(workspace).click();
    workspace.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');
    workspace.destroy();
    fixture = undefined;
    expect(document.body.style.overflow).toBe('scroll');
  });
});
