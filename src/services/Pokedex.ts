/**
 * The Pokédex application service.
 *
 * Owns everything the storage port deliberately does not: filtering, the name
 * search, sorting, and pagination on the read side; id allocation, timestamps,
 * and the not-found checks on the write side. The steps and their order come
 * from `docs/migration/01-current-behavior-spec.md` and are applied here in
 * exactly that order.
 *
 * The variant construction rules themselves live in `domain/Pokemon.ts`: this
 * module supplies the id and the timestamps and calls `makeVariant` /
 * `replaceVariant`, so the defaulting rules exist in exactly one place.
 */
import { Context, DateTime, Effect, Layer, Option } from 'effect';
import { PokemonNotFound } from '../domain/Errors.js';
import type { PokemonDataParse } from '../domain/Errors.js';
import { makeVariant, replaceVariant } from '../domain/Pokemon.js';
import type {
  CreatePokemonRequest,
  ListPokemon200,
  ListPokemonQuery,
  PokemonVariant,
  UpdatePokemonRequest,
} from '../generated/Api.js';
import { PokemonRepository } from './PokemonRepository.js';

/** Effective `page` when the query omits it (behavior spec §listPokemon step 6). */
export const DEFAULT_PAGE = 0;
/** Effective `pageSize` when the query omits it. */
export const DEFAULT_PAGE_SIZE = 20;

type SortBy = NonNullable<ListPokemonQuery['sortBy']>;
type SortOrder = NonNullable<ListPokemonQuery['sortOrder']>;

/**
 * The value each `sortBy` compares on. A record rather than a `switch` so that
 * a field added to the contract fails to compile until it has an entry.
 */
const sortValue: Record<SortBy, (pokemon: PokemonVariant) => string | number> =
  {
    id: (pokemon) => pokemon.id,
    name: (pokemon) => pokemon.name,
    createdAt: (pokemon) => pokemon.createdAt,
  };

/**
 * Drops the keys whose value is `undefined`, so an absent filter is left off the
 * span instead of recorded as nothing. A trace query on
 * `pokedex.filter.type` then matches only the calls that really filtered by
 * type.
 */
const definedAttributes = (
  attributes: Readonly<Record<string, unknown>>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  );

/**
 * Strings compare with `localeCompare`, numbers numerically. `createdAt` is an
 * ISO 8601 instant, so comparing it as a string is chronological order.
 */
const compare = (a: string | number, b: string | number): number =>
  typeof a === 'string' && typeof b === 'string'
    ? a.localeCompare(b)
    : Number(a) - Number(b);

/** Steps 2–4: classification, then type, then the name search — in that order. */
const filterAll = (
  all: ReadonlyArray<PokemonVariant>,
  query: ListPokemonQuery,
): ReadonlyArray<PokemonVariant> => {
  const { classification, type, search } = query;

  const byClassification =
    classification === undefined
      ? all
      : all.filter((pokemon) => pokemon.classification === classification);

  // A type matches on either slot, so a poison-typed Bulbasaur is found by
  // both `?type=grass` and `?type=poison`.
  const byType =
    type === undefined
      ? byClassification
      : byClassification.filter(
          (pokemon) =>
            pokemon.primaryType === type || pokemon.secondaryType === type,
        );

  if (search === undefined) return byType;
  const needle = search.toLowerCase();
  return byType.filter((pokemon) =>
    pokemon.name.toLowerCase().includes(needle),
  );
};

/** Step 5. Only reached when the query carries a `sortBy`. */
const sortAll = (
  items: ReadonlyArray<PokemonVariant>,
  sortBy: SortBy,
  sortOrder: SortOrder,
): ReadonlyArray<PokemonVariant> => {
  const value = sortValue[sortBy];
  const direction = sortOrder === 'desc' ? -1 : 1;
  // `toSorted`, not `sort`: `items` may still be the repository's own array.
  return items.toSorted((a, b) => direction * compare(value(a), value(b)));
};

export class Pokedex extends Context.Service<
  Pokedex,
  {
    /**
     * Filtered, sorted, and paginated page of the data set. Fails with
     * {@link PokemonDataParse} when the upstream data set does not parse.
     */
    readonly list: (
      query: ListPokemonQuery,
    ) => Effect.Effect<ListPokemon200, PokemonDataParse>;
    /** Fails with {@link PokemonNotFound} when no entry has this id. */
    readonly getById: (
      id: number,
    ) => Effect.Effect<PokemonVariant, PokemonNotFound>;
    /**
     * Stores a new entry and returns it. Total: the payload has already been
     * validated against the contract before it reaches the service, and the
     * id and timestamps are generated here, so there is nothing left to reject.
     */
    readonly create: (
      input: CreatePokemonRequest,
    ) => Effect.Effect<PokemonVariant>;
    /**
     * Fully replaces the entry with this id, returning the stored result.
     * Fails with {@link PokemonNotFound} when no entry has this id.
     */
    readonly replace: (
      id: number,
      input: UpdatePokemonRequest,
    ) => Effect.Effect<PokemonVariant, PokemonNotFound>;
    /** Fails with {@link PokemonNotFound} when no entry has this id. */
    readonly remove: (id: number) => Effect.Effect<void, PokemonNotFound>;
  }
>()('pokedex/Pokedex') {
  /**
   * Leaves {@link PokemonRepository} to the caller — the application wiring in
   * `src/http/AppLayer.ts` uses this one, so the store is chosen at a single
   * visible level and a test can drive the service with a fixture instead.
   */
  static readonly layerNoDeps = Layer.effect(
    Pokedex,
    Effect.gen(function* () {
      const repository = yield* PokemonRepository;

      const list = Effect.fn('Pokedex.list')(function* (
        query: ListPokemonQuery,
      ) {
        const page = query.page ?? DEFAULT_PAGE;
        const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

        // The *effective* query, defaults resolved — what the span should show
        // is what the call actually did, not what the caller happened to send.
        yield* Effect.annotateCurrentSpan(
          definedAttributes({
            'pokedex.filter.classification': query.classification,
            'pokedex.filter.type': query.type,
            'pokedex.filter.search': query.search,
            'pokedex.sortBy': query.sortBy,
            // Only meaningful when something is being sorted.
            'pokedex.sortOrder':
              query.sortBy === undefined
                ? undefined
                : (query.sortOrder ?? 'asc'),
            'pokedex.page': page,
            'pokedex.pageSize': pageSize,
          }),
        );

        const all = yield* repository.fetchAll;

        const filtered = filterAll(all, query);
        const ordered =
          query.sortBy === undefined
            ? filtered
            : sortAll(filtered, query.sortBy, query.sortOrder ?? 'asc');

        return {
          items: ordered.slice(page * pageSize, (page + 1) * pageSize),
          // Counted before pagination, so callers can compute a page count.
          total: filtered.length,
          page,
          pageSize,
        };
      });

      const getById = Effect.fn('Pokedex.getById')(function* (id: number) {
        yield* Effect.annotateCurrentSpan('pokedex.id', id);
        const found = yield* repository.findById(id);
        if (Option.isNone(found)) return yield* new PokemonNotFound({ id });
        return found.value;
      });

      /**
       * The wall clock as an ISO 8601 string. `DateTime.now` reads the `Clock`
       * service rather than `Date.now`, which is what makes the timestamps
       * observable under `TestClock`.
       */
      const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

      const create = Effect.fn('Pokedex.create')(function* (
        input: CreatePokemonRequest,
      ) {
        const id = yield* repository.nextId;
        // Annotated after allocation: the id is what the call produced, not
        // something the caller supplied.
        yield* Effect.annotateCurrentSpan('pokedex.id', id);
        // One read of the clock: `createdAt` and `updatedAt` must be equal on
        // a create (behavior spec §createPokemon).
        const now = yield* nowIso;

        const pokemon = makeVariant(input, {
          id,
          createdAt: now,
          updatedAt: now,
        });
        yield* repository.save(pokemon);
        return pokemon;
      });

      const replace = Effect.fn('Pokedex.replace')(function* (
        id: number,
        input: UpdatePokemonRequest,
      ) {
        yield* Effect.annotateCurrentSpan('pokedex.id', id);
        const existing = yield* repository.findById(id);
        if (Option.isNone(existing)) return yield* new PokemonNotFound({ id });

        // `replaceVariant` keeps the existing id and `createdAt`, so only the
        // new `updatedAt` is supplied here.
        const pokemon = replaceVariant(existing.value, input, yield* nowIso);
        yield* repository.save(pokemon);
        return pokemon;
      });

      const remove = Effect.fn('Pokedex.remove')(function* (id: number) {
        yield* Effect.annotateCurrentSpan('pokedex.id', id);
        // `repository.remove` already reports whether the id was there, so the
        // find-then-delete pair collapses into one call with the same result.
        const removed = yield* repository.remove(id);
        if (!removed) yield* new PokemonNotFound({ id });
      });

      return { list, getById, create, replace, remove };
    }),
  );

  /**
   * Convenience wiring over the in-memory store, for a test that wants a
   * working `Pokedex` and does not care which repository backs it. The
   * application does **not** use this: baking the repository in here would
   * hand a second consumer its own `Ref` store without saying so.
   */
  static readonly layer = Pokedex.layerNoDeps.pipe(
    Layer.provide(PokemonRepository.layerInMemory),
  );
}
