import { R } from '@praha/byethrow';
import { describe, expect, it } from 'vitest';
import { PokemonDataParseError } from '../../domain/pokemon.errors.js';
import { PokemonRepository } from './pokemon.repository.js';

/**
 * Simulates an untrusted source returning a payload that does not match the
 * contract — the adapter must surface this as a typed failure, not throw or
 * leak raw data.
 */
class BrokenSourceRepository extends PokemonRepository {
  protected override fetchRaw(): Promise<unknown> {
    return Promise.resolve([{ id: 'oops', name: null }]);
  }
}

describe('PokemonRepository', () => {
  it('findAll returns domain entities for valid source data', async () => {
    const repository = new PokemonRepository();

    const result = await repository.findAll();

    const pokemon = R.unwrap(result);
    expect(pokemon.length).toBeGreaterThan(0);
    expect(pokemon[0]?.id.value).toBeGreaterThanOrEqual(1);
  });

  it('findAll fails with PokemonDataParseError when the source is malformed', async () => {
    const repository = new BrokenSourceRepository();

    const result = await repository.findAll();

    expect(R.isFailure(result)).toBe(true);
    expect(R.unwrapError(result)).toBeInstanceOf(PokemonDataParseError);
  });

  it('nextId continues after the highest seeded id', async () => {
    const repository = new PokemonRepository();
    const seeded = R.unwrap(await repository.findAll());
    const maxSeededId = Math.max(...seeded.map((p) => p.id.value));

    const next = await repository.nextId();

    expect(next.value).toBe(maxSeededId + 1);
  });
});
