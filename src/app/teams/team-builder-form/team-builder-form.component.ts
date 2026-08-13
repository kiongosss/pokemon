import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, take } from 'rxjs/operators';

import { ChipComponent } from '../../common/components/chip/chip.component';
import { Pokemon } from '../../pokedex/models/pokemon.model';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { Team } from '../models/team.model';
import { TeamStore } from '../state/team.store';
import { uniqueTeamNameValidator } from './unique-team-name.validator';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-team-builder-form',
  standalone: true,
  imports: [ReactiveFormsModule, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-builder-form.component.html',
  styleUrl: './team-builder-form.component.scss',
})
export class TeamBuilderFormComponent {
  private readonly teamStore = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);

  /** Identifies the trainer creating the team. */
  readonly trainerId = input<string>('trainer-1');

  readonly form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(30)],
      asyncValidators: [uniqueTeamNameValidator()],
    }),
    pokemonIds: new FormControl<string[]>([], {
      nonNullable: true,
      validators: [Validators.minLength(1), Validators.maxLength(6)],
    }),
  });

  /** Tracks whether the form has been submitted. */
  readonly submitted = signal(false);

  /** Current async creation pending state for the double-submit guard. */
  readonly isCreating = toSignal(this.teamStore.isCreating$, { initialValue: false });

  /** Active toast message to render. */
  readonly toast = signal<Toast | null>(null);

  /** Pokemon search input command stream. */
  readonly pokemonSearch$ = new Subject<string>();

  /** Debounced typeahead suggestions from the cached Pokémon list. */
  readonly pokemonSuggestions = toSignal(
    this.pokemonSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => this.searchPokemon(term)),
    ),
    { initialValue: [] as Pokemon[] },
  );

  readonly showSuggestions = computed(() => this.pokemonSuggestions().length > 0);

  /** Mirror of form values as a signal so the chip list stays reactive under OnPush. */
  readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private readonly pokemonState = toSignal(this.pokemonStore.state$, {
    initialValue: { items: [] as Pokemon[], nextOffset: 0, isLoading: false, error: null },
  });

  readonly selectedPokemonNames = computed(() => {
    const ids = (this.formValue().pokemonIds ?? []) as string[];
    return ids.map(
      (id) => this.pokemonState().items.find((p) => String(p.id) === id)?.name ?? id,
    );
  });

  private readonly lastSuccess = toSignal(this.teamStore.createResult$, {
    initialValue: null as Team | null,
  });

  constructor() {
    this.teamStore.loadTeams();

    this.teamStore.errors$
      .pipe(takeUntilDestroyed())
      .subscribe((message) => this.showToast(message, 'error'));

    effect(() => {
      const team = this.lastSuccess();
      if (team) {
        this.showToast(`Team "${team.name}" created`, 'success');
        this.submitted.set(false);
        this.form.reset({ name: '', pokemonIds: [] });
      }
    });
  }

  private searchPokemon(term: string): Observable<Pokemon[]> {
    const normalized = term.toLowerCase();
    return this.pokemonStore.state$.pipe(
      take(1),
      map((state) => {
        if (!normalized) return state.items.slice(0, 10);
        return state.items
          .filter((p) => p.name.toLowerCase().includes(normalized))
          .slice(0, 10);
      }),
    );
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pokemonSearch$.next(value);
  }

  addPokemon(pokemon: Pokemon): void {
    const current = this.form.controls.pokemonIds.value;
    if (current.length >= 6 || current.includes(String(pokemon.id))) return;

    this.form.controls.pokemonIds.setValue([...current, String(pokemon.id)]);
    this.form.controls.pokemonIds.markAsDirty();
    this.pokemonSearch$.next('');
  }

  removePokemon(index: number): void {
    const current = [...this.form.controls.pokemonIds.value];
    current.splice(index, 1);
    this.form.controls.pokemonIds.setValue(current);
    this.form.controls.pokemonIds.markAsDirty();
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.isCreating()) return;

    const value = this.form.getRawValue();
    this.teamStore.createTeam({
      trainer_id: this.trainerId(),
      name: value.name,
      pokemon_ids: value.pokemonIds,
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    window.setTimeout(() => this.toast.set(null), 3000);
  }
}
