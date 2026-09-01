/**
 * Read side of the Pokédex.
 *
 * Owns everything the storage port deliberately does not: filtering, the name
 * search, sorting, and pagination. The steps and their order come from
 * `docs/migration/01-current-behavior-spec.md` §listPokemon and are applied
 * here in exactly that order.
 *
 * Writes (`create`/`replace`/`remove`) land in Phase 6.
 */
import { Context, Effect, Layer, Option } from 'effect';
import { PokemonNotFound } from '../domain/Errors.js';
import type { PokemonDataParse } from '../domain/Errors.js';
import type {
  ListPokemon200,
  ListPokemonQuery,
  PokemonVariant,
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
  }
>()('pokedex/Pokedex') {
  /**
   * Requires a {@link PokemonRepository}, so tests can drive the service with
   * a fixture store. {@link Pokedex.layer} is the application wiring.
   */
  static readonly layerWithRepository = Layer.effect(
    Pokedex,
    Effect.gen(function* () {
      const repository = yield* PokemonRepository;

      const list = Effect.fn('Pokedex.list')(function* (
        query: ListPokemonQuery,
      ) {
        const all = yield* repository.fetchAll;

        const filtered = filterAll(all, query);
        const ordered =
          query.sortBy === undefined
            ? filtered
            : sortAll(filtered, query.sortBy, query.sortOrder ?? 'asc');

        const page = query.page ?? DEFAULT_PAGE;
        const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

        return {
          items: ordered.slice(page * pageSize, (page + 1) * pageSize),
          // Counted before pagination, so callers can compute a page count.
          total: filtered.length,
          page,
          pageSize,
        };
      });

      const getById = Effect.fn('Pokedex.getById')(function* (id: number) {
        const found = yield* repository.findById(id);
        if (Option.isNone(found)) return yield* new PokemonNotFound({ id });
        return found.value;
      });

      return { list, getById };
    }),
  );

  /** The application wiring: the read side over the in-memory store. */
  static readonly layer = Pokedex.layerWithRepository.pipe(
    Layer.provide(PokemonRepository.layerInMemory),
  );
}
