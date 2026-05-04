import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import * as z from 'zod';
import { zPokemonVariant } from '../../generated/zod.gen.js';
import type {
  ListPokemonData,
  ListPokemonResponse,
} from '../../generated/types.gen.js';
import { PokemonDataParseError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

@Injectable()
export class ListPokemonsQuery {
  constructor(private readonly repository: PokemonRepository) {}

  async get(
    query?: ListPokemonData['query'],
  ): Result.ResultAsync<ListPokemonResponse, PokemonDataParseError> {
    const raw = await this.repository.fetchRaw();
    const parsed = z.array(zPokemonVariant).safeParse(raw);

    if (!parsed.success) {
      return R.fail(new PokemonDataParseError());
    }

    const {
      page = 0,
      pageSize = 20,
      classification,
      type,
      search,
      sortBy,
      sortOrder,
    } = query ?? {};

    return R.pipe(
      R.succeed(parsed.data),
      R.map((items) =>
        classification
          ? items.filter((item) => item.classification === classification)
          : items,
      ),
      R.map((items) =>
        type
          ? items.filter(
              (item) =>
                item.primaryType === type || item.secondaryType === type,
            )
          : items,
      ),
      R.map((items) => {
        if (!search) {
          return items;
        }

        const searchLower = search.toLowerCase();
        return items.filter(({ name }) =>
          name.toLowerCase().includes(searchLower),
        );
      }),
      R.map((items) => {
        if (!sortBy) {
          return items;
        }

        const order = sortOrder === 'desc' ? -1 : 1;
        return items.toSorted((a, b) => {
          const aVal = a[sortBy as keyof typeof a];
          const bVal = b[sortBy as keyof typeof b];
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal) * order;
          }

          return ((aVal as number) - (bVal as number)) * order;
        });
      }),
      R.map((items) => ({
        items: items.slice(page * pageSize, (page + 1) * pageSize),
        total: items.length,
        page,
        pageSize,
      })),
    );
  }
}
