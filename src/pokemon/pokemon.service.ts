/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';
import type {
  CreatePokemonRequest,
  ListPokemonResponse,
  PokemonVariant,
  UpdatePokemonRequest,
} from '../generated/types.gen.js';
import { POKEMON } from './pokemon.constants';

@Injectable()
export class PokemonService {
  private pokemon = POKEMON;

  private nextId = 1026;

  list(query?: {
    page?: number;
    pageSize?: number;
    classification?: string;
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ListPokemonResponse> {
    const {
      page = 0,
      pageSize = 20,
      classification,
      type,
      search,
      sortBy,
      sortOrder,
    } = query ?? {};

    let results = [...this.pokemon];

    if (classification) {
      results = results.filter((p) => p.classification === classification);
    }

    if (type) {
      results = results.filter(
        (p) => p.primaryType === type || p.secondaryType === type,
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(searchLower),
      );
    }

    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      results = results.toSorted((a, b) => {
        const aVal = a[sortBy as keyof typeof a];
        const bVal = b[sortBy as keyof typeof b];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * order;
        }
        return ((aVal as number) - (bVal as number)) * order;
      });
    }

    const start = page * pageSize;

    return Promise.resolve({
      items: results.slice(start, start + pageSize),
      total: results.length,
      page,
      pageSize,
    });
  }

  getById(id: number): Promise<PokemonVariant | undefined> {
    return Promise.resolve(this.pokemon.find((p) => p.id === id));
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
      .otherwise((classification) => ({
        ...base,
        classification,
        encounterRate: 50,
      }));

    this.pokemon.push(pokemon);
    return Promise.resolve(pokemon);
  }

  replace(
    id: number,
    body: UpdatePokemonRequest,
  ): Promise<PokemonVariant | undefined> {
    const index = this.pokemon.findIndex((p) => p.id === id);

    if (index === -1) {
      return Promise.resolve(undefined);
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
    return Promise.resolve(pokemon);
  }

  remove(id: number): Promise<boolean> {
    const index = this.pokemon.findIndex((p) => p.id === id);

    if (index === -1) {
      return Promise.resolve(false);
    }

    this.pokemon.splice(index, 1);
    return Promise.resolve(true);
  }
}
