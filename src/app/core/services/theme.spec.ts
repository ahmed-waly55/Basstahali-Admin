import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';

describe('Admin theme preferences', () => {
  let service: ThemeService;
  let systemDark = false;
  let changed: () => void;
  let media: MediaQueryList;
  beforeEach(() => {
    localStorage.clear(); systemDark = false;
    media = { get matches() { return systemDark; }, addEventListener: vi.fn((_,listener) => changed = listener as () => void), removeEventListener: vi.fn() } as unknown as MediaQueryList;
    vi.stubGlobal('matchMedia',vi.fn(() => media));
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); document.documentElement.dataset['theme'] = 'light'; document.documentElement.style.colorScheme = 'light'; });
  it('uses the system preference until an explicit choice is saved', () => {
    systemDark = true; service.initialize();
    expect(service.preference()).toBe('system'); expect(service.isDark()).toBe(true);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    service.toggle(); expect(service.isDark()).toBe(false);
    expect(localStorage.getItem('basstahali:theme')).toBe('light');
    systemDark = true; changed(); expect(service.isDark()).toBe(false);
  });
  it('restores dark mode and supports returning to device settings', () => {
    localStorage.setItem('basstahali:theme','dark');service.initialize();
    expect(service.isDark()).toBe(true);expect(document.documentElement.style.colorScheme).toBe('dark');
    service.setPreference('system');expect(service.isDark()).toBe(false);
    systemDark = true; changed(); expect(service.isDark()).toBe(true);
  });
  it('ignores invalid saved values and initializes only once', () => {
    localStorage.setItem('basstahali:theme','invalid');service.initialize(); service.initialize();
    expect(service.preference()).toBe('system');expect(media.addEventListener).toHaveBeenCalledTimes(1);
  });
  it('can still change the current theme when storage is blocked', () => {
    service.initialize();vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => {throw new Error('blocked');});
    expect(() => service.toggle()).not.toThrow();expect(service.isDark()).toBe(true);
  });
});
