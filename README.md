# Mini Pokédex

A small Angular 21 + RxJS + Signals app that lists Pokémon, lets you inspect their stats, and build custom teams.

## Setup

```bash
npm install
```

## Running the app

Start the mock GraphQL server for team mutations:

```bash
npx json-graphql-server db.js --port 4000
```

Then serve the Angular app:

```bash
ng serve
```

Open [http://localhost:4200/](http://localhost:4200/).

## Tests

```bash
ng test
```

To run once and exit:

```bash
ng test --watch=false
```

## Architecture note

The stores (`PokemonStore`, `TeamStore`) are driven by RxJS `BehaviorSubject`s and command streams. Components read store output through `toSignal` so the UI is expressed with Angular signals, while the underlying mutation logic stays in `Observable` chains for sequencing and cancellation. The team store uses a command stream because `createTeam` and `deleteTeam` are side effects: each request emits an optimistic state update, then either commits the real server id or rolls back on failure and publishes the error to `errors$`. Retry and transport-level error handling live in `GraphqlClientService`, while domain-level errors and loading state are owned by the stores. Selectors like `filteredSortedPaged$` are pure functions over `Observable` inputs, which keeps them trivial to unit test with the RxJS `TestScheduler`.

## What I'd improve with more time

- Add virtual scrolling to the pokedex table and move filtering/sorting into a worker to stay smooth with larger lists.
- Introduce a real GraphQL cache/dataloader layer instead of hand-rolled `Map`s in the stores.
- Add per-column loading skeletons instead of the single `AsyncState` wrapper over the entire table.
- Add end-to-end coverage for the create-team happy path and rollback behavior.
- Make `FilterCriteria` stricter (unit-driven `PokemonStat` types, better pagination boundaries) and add property-based tests for the selectors.
