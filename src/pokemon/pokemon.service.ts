import { Injectable } from '@nestjs/common';
import type {
  CreatePokemonRequest,
  ListPokemonResponse,
  PokemonVariant,
  UpdatePokemonRequest,
} from '../generated/types.gen.js';

@Injectable()
export class PokemonService {
  private readonly pokemon: PokemonVariant[] = [
    {
      id: 1,
      name: 'bulbasaur',
      primaryType: 'grass',
      secondaryType: 'poison',
      baseStats: {
        hp: 45,
        attack: 49,
        defense: 49,
        specialAttack: 65,
        specialDefense: 65,
        speed: 45,
      },
      heightMetres: 0.7,
      weightKg: 6.9,
      isObtainable: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      classification: 'normal',
      encounterRate: 45,
      evolvesInto: [2],
    } as unknown as PokemonVariant,
    {
      id: 25,
      name: 'pikachu',
      primaryType: 'electric',
      baseStats: {
        hp: 35,
        attack: 55,
        defense: 40,
        specialAttack: 50,
        specialDefense: 50,
        speed: 90,
      },
      heightMetres: 0.4,
      weightKg: 6.0,
      isObtainable: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      classification: 'normal',
      encounterRate: 30,
      evolvesInto: [26],
    } as unknown as PokemonVariant,
    {
      id: 150,
      name: 'mewtwo',
      primaryType: 'psychic',
      baseStats: {
        hp: 106,
        attack: 110,
        defense: 90,
        specialAttack: 154,
        specialDefense: 90,
        speed: 130,
      },
      heightMetres: 2.0,
      weightKg: 122.0,
      isObtainable: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      classification: 'legendary',
      legendaryGroup: 'Mew Duo',
      isBoxLegendary: false,
    },
    {
      id: 151,
      name: 'mew',
      primaryType: 'psychic',
      baseStats: {
        hp: 100,
        attack: 100,
        defense: 100,
        specialAttack: 100,
        specialDefense: 100,
        speed: 100,
      },
      heightMetres: 0.4,
      weightKg: 4.0,
      isObtainable: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      classification: 'mythical',
      distributionMethod: 'Mystery Gift',
      isCurrentlyDistributed: false,
      loreDescription:
        'A Mythical Pokemon said to possess the genetic composition of all Pokemon.',
    },
  ];

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
    let results = [...this.pokemon];

    if (query?.classification) {
      results = results.filter(
        (p) => p.classification === query.classification,
      );
    }

    if (query?.type) {
      results = results.filter(
        (p) => p.primaryType === query.type || p.secondaryType === query.type,
      );
    }

    if (query?.search) {
      const search = query.search.toLowerCase();
      results = results.filter((p) => p.name.toLowerCase().includes(search));
    }

    if (query?.sortBy) {
      const order = query.sortOrder === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        const aVal = a[query.sortBy as keyof typeof a];
        const bVal = b[query.sortBy as keyof typeof b];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * order;
        }
        return ((aVal as number) - (bVal as number)) * order;
      });
    }

    const page = query?.page ?? 0;
    const pageSize = query?.pageSize ?? 20;
    const start = page * pageSize;
    const items = results.slice(start, start + pageSize);

    return Promise.resolve({
      items,
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

    let pokemon: PokemonVariant;

    switch (body.classification) {
      case 'legendary':
        pokemon = {
          ...base,
          classification: 'legendary',
          legendaryGroup: 'Unknown',
          isBoxLegendary: false,
        };
        break;
      case 'mythical':
        pokemon = {
          ...base,
          classification: 'mythical',
          distributionMethod: 'Unknown',
          isCurrentlyDistributed: false,
          loreDescription: 'A newly discovered Mythical Pokemon.',
        };
        break;
      default:
        pokemon = {
          ...base,
          classification: 'normal',
          encounterRate: 50,
        } as unknown as PokemonVariant;
        break;
    }

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

    let pokemon: PokemonVariant;

    switch (body.classification) {
      case 'legendary':
        pokemon = {
          ...base,
          classification: 'legendary',
          legendaryGroup:
            existing.classification === 'legendary'
              ? existing.legendaryGroup
              : 'Unknown',
          isBoxLegendary:
            existing.classification === 'legendary'
              ? existing.isBoxLegendary
              : false,
        };
        break;
      case 'mythical':
        pokemon = {
          ...base,
          classification: 'mythical',
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
        };
        break;
      default:
        pokemon = {
          ...base,
          classification: 'normal',
          encounterRate: 50,
        } as unknown as PokemonVariant;
        break;
    }

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
