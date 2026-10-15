import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RequestActivity {
  private count = signal(0);
  readonly pending = this.count.asReadonly();
  readonly busy = computed(() => this.count() > 0);
  begin(): void { this.count.update(value => value + 1); }
  end(): void { this.count.update(value => Math.max(0,value - 1)); }
}
