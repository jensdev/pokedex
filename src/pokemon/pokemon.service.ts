/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { match } from 'ts-pattern';
import * as z from 'zod';
import { zPokemonVariant } from '../generated/zod.gen.js';
import type {
  CreatePokemonRequest,
  ListPokemonResponse,
  PokemonVariant,
  UpdatePokemonRequest,
} from '../generated/types.gen.js';
import { rawPokemon } from './pokemon.constants';
import { PokemonDataParseError, PokemonNotFoundError } from './pokemon.errors';

@Injectable()
export class PokemonService {
  private pokemon: PokemonVariant[] = z
    .array(zPokemonVariant)
    .parse(rawPokemon);

  private nextId = 1026;

  private fetch(): Promise<unknown> {
    if (Math.random() < 0.1) {
      return Promise.resolve([{ id: 'oops', name: null }]);
    }
    return Promise.resolve(this.pokemon);
  }

  async list(query?: {
    page?: number;
    pageSize?: number;
    classification?: string;
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Result.ResultAsync<ListPokemonResponse, PokemonDataParseError> {
    const raw = await this.fetch();
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
          ? items.filter((p) => p.classification === classification)
          : items,
      ),
      R.map((items) =>
        type
          ? items.filter(
              (p) => p.primaryType === type || p.secondaryType === type,
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

  getById(
    id: number,
  ): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const pokemon = this.pokemon.find((p) => p.id === id);
    return Promise.resolve(
      pokemon ? R.succeed(pokemon) : R.fail(new PokemonNotFoundError()),
    );
  }

  create(body: CreatePokemonRequest): Promise<PokemonVariant> {
    const now = new Date().toISOString();

    const base = {
      id: this.nextId++,
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: body.baseStats,
      heightMetres: body.heightMetres,
      weightKg: body.weightKg,
      isObtainable: body.isObtainable,
      createdAt: now,
      updatedAt: now,
    };

    const pokemon: PokemonVariant = match(body.classification)
      .with('legendary', (classification) => ({
        ...base,
        classification,
        legendaryGroup: 'Unknown',
        isBoxLegendary: false,
      }))
      .with('mythical', (classification) => ({
        ...base,
        classification,
        distributionMethod: 'Unknown',
        isCurrentlyDistributed: false,
        loreDescription: 'A newly discovered Mythical Pokemon.',
      }))
      .with('normal', (classification) => ({
        ...base,
        classification,
        encounterRate: 50,
      }))
      .exhaustive();

    this.pokemon.push(pokemon);
    return Promise.resolve(pokemon);
  }

  replace(
    id: number,
    body: UpdatePokemonRequest,
  ): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const index = this.pokemon.findIndex((p) => p.id === id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    const now = new Date().toISOString();
    const existing = this.pokemon[index];

    const base = {
      id: existing.id,
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: body.baseStats,
      heightMetres: body.heightMetres,
      weightKg: body.weightKg,
      isObtainable: body.isObtainable,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    const pokemon: PokemonVariant = match(body.classification)
      .with('legendary', (classification) => ({
        ...base,
        classification,
        legendaryGroup:
          existing.classification === 'legendary'
            ? existing.legendaryGroup
            : 'Unknown',
        isBoxLegendary:
          existing.classification === 'legendary'
            ? existing.isBoxLegendary
            : false,
      }))
      .with('mythical', (classification) => ({
        ...base,
        classification,
        distributionMethod:
          existing.classification === 'mythical'
            ? existing.distributionMethod
            : 'Unknown',
        isCurrentlyDistributed:
          existing.classification === 'mythical'
            ? existing.isCurrentlyDistributed
            : false,
        loreDescription:
          existing.classification === 'mythical'
            ? existing.loreDescription
            : 'A newly discovered Mythical Pokemon.',
      }))
      .with('normal', (classification) => ({
        ...base,
        classification,
        encounterRate: 50,
      }))
      .exhaustive();

    this.pokemon[index] = pokemon;
    return Promise.resolve(R.succeed(pokemon));
  }

  remove(id: number): Result.ResultAsync<void, PokemonNotFoundError> {
    const index = this.pokemon.findIndex((p) => p.id === id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    this.pokemon.splice(index, 1);
    return Promise.resolve(R.succeed(undefined));
  }
}
