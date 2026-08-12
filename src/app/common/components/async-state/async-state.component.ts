import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { AsyncState } from '../../models/async-state.model';

@Component({
  selector: 'app-async-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <p>Loading…</p>
    } @else if (isEmpty()) {
      <p>No items found.</p>
    } @else if (isError()) {
      <p>{{ errorMessage() }}</p>
      <button type="button" (click)="retry.emit()">Retry</button>
    } @else if (isSuccess()) {
      <ng-content></ng-content>
    }
  `,
})
export class AsyncStateComponent {
  /** The current async view state to render. */
  readonly state = input.required<AsyncState<unknown>>();

  /** Fired when the user presses the Retry button in the error state. */
  readonly retry = output<void>();

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isEmpty = computed(() => this.state().status === 'empty');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly isSuccess = computed(() => this.state().status === 'success');

  protected readonly errorMessage = computed(() => {
    const s = this.state();
    return s.status === 'error' ? s.message : '';
  });
}
