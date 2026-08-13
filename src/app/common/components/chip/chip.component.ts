import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip__label">{{ label() }}</span>
    <button class="chip__remove" type="button" (click)="remove.emit()" aria-label="Remove">×</button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        background: #e2e8f0;
        font-size: 0.875rem;
      }
      .chip__remove {
        border: none;
        background: transparent;
        cursor: pointer;
        font-weight: bold;
      }
    `,
  ],
})
export class ChipComponent {
  readonly label = input.required<string>();
  readonly remove = output<void>();
}
