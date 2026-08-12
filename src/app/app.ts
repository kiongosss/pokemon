import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';

import { PokedexTableComponent } from './pokedex/pokedex-table/pokedex-table.component';
import { TeamBuilderFormComponent } from './teams/team-builder-form/team-builder-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PokedexTableComponent, TeamBuilderFormComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly _platform = inject(PLATFORM_ID);
  protected readonly title = signal('pokemon');
}
