import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  ListPokemonData,
  ListPokemonResponse,
  PokemonVariant,
} from '../../../generated/types.gen.js';
import { PokemonDataParseError } from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';

type SortableField = NonNullable<NonNullable<ListPokemonData['query']>['sortBy']>;

const comparators: Record<
  SortableField,
  (a: PokemonVariant, b: PokemonVariant) => number
> = {
  id: (a, b) => a.id - b.id,
  name: (a, b) => a.name.localeCompare(b.name),
  // ISO 8601 timestamps sort correctly as strings.
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
};

@Injectable()
export class ListPokemonsQuery {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
  ) {}

  get(
    query?: ListPokemonData['query'],
  ): Result.ResultAsync<ListPokemonResponse, PokemonDataParseError> {
    // The only fallible step is loading from the repository; filtering,
    // sorting and paginating are pure transforms on the success rail.
    return R.pipe(
      this.repository.findAll(),
      R.map((pokemon) => toPage(pokemon.map((p) => p.toDto()), query)),
    );
  }
}

function toPage(
  items: PokemonVariant[],
  query?: ListPokemonData['query'],
): ListPokemonResponse {
  const {
    page = 0,
    pageSize = 20,
    classification,
    type,
    search,
    sortBy,
    sortOrder,
  } = query ?? {};
  const searchLower = search?.toLowerCase();

  const filtered = items
    .filter((item) => !classification || item.classification === classification)
    .filter(
      (item) =>
        !type || item.primaryType === type || item.secondaryType === type,
    )
    .filter(
      (item) => !searchLower || item.name.toLowerCase().includes(searchLower),
    );

  const order = sortOrder === 'desc' ? -1 : 1;
  const sorted = sortBy
    ? filtered.toSorted((a, b) => comparators[sortBy](a, b) * order)
    : filtered;

  return {
    items: sorted.slice(page * pageSize, (page + 1) * pageSize),
    total: sorted.length,
    page,
    pageSize,
  };
}
