import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Chart } from 'chart.js/auto';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Pokemon, PokemonAbility } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';
import { PokemonStore } from '../state/pokemon.store';

@Component({
  selector: 'app-pokemon-detail-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pokemon-detail-panel.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 420px;
        height: 100vh;
        padding: 1rem;
        background: #fff;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        overflow-y: auto;
      }
      .panel.open {
        transform: translateX(0);
      }
      .panel__close {
        margin-bottom: 1rem;
      }
    `,
  ],
})
export class PokemonDetailPanelComponent {
  private readonly store = inject(PokemonStore);
  private readonly api = inject(PokemonApiService);
  private chart: Chart<'radar'> | null = null;

  /** Id of the Pokémon to display; null closes the panel. */
  readonly pokemonId = input<number | null>(null);

  /** Emitted when the user closes the panel. */
  readonly close = output<void>();

  /** Fetches the Pokémon from the store cache. */
  readonly pokemon = toSignal(
    toObservable(this.pokemonId).pipe(
      switchMap((id) => (id === null ? of(undefined) : this.store.getById$(id))),
    ),
    { initialValue: undefined as Pokemon | undefined },
  );

  /** Fetches abilities when a Pokémon is selected. */
  readonly abilities = toSignal(
    toObservable(this.pokemonId).pipe(
      switchMap((id) => (id === null ? of([] as PokemonAbility[]) : this.api.getPokemonAbilities(id))),
    ),
    { initialValue: [] as PokemonAbility[] },
  );

  /** Canvas reference for the radar chart. */
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  constructor() {
    // Chart.js is framework-agnostic and gives direct control over .update(),
    // which is ideal for re-triggering the radar animation on selection changes.
    effect(() => {
      const pokemon = this.pokemon();
      const canvas = this.canvas();
      if (!pokemon || !canvas) return;

      const labels = pokemon.stats.map((s) => s.stat.name);
      const data = pokemon.stats.map((s) => s.baseStat);

      if (!this.chart) {
        this.chart = new Chart(canvas.nativeElement, {
          type: 'radar',
          data: {
            labels,
            datasets: [
              {
                label: pokemon.name,
                data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            animation: { duration: 500 },
            scales: {
              r: { beginAtZero: true, suggestedMax: 150 },
            },
          },
        });
      } else {
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].label = pokemon.name;
        this.chart.data.datasets[0].data = data;
        this.chart.update(); // re-triggers the animation on different selection
      }
    });
  }
}
