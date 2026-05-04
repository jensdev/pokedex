import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  StartBattleRequest,
  BattleStatus,
} from '../../../generated/types.gen.js';
import { Battle } from '../../domain/battle.entity.js';
import { BATTLE_REPOSITORY_TOKEN } from '../../domain/battle.repository.interface.js';
import type { IBattleRepository } from '../../domain/battle.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../../pokemon/domain/pokemon.repository.interface.js';
import type { IPokemonRepository } from '../../../pokemon/domain/pokemon.repository.interface.js';
import { PokemonId } from '../../../pokemon/domain/value-objects.js';

@Injectable()
export class StartBattleCommand {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly pokemonRepository: IPokemonRepository,
  ) {}

  async handle(
    body: StartBattleRequest,
  ): Promise<Result.Result<BattleStatus, Error>> {
    const p1 = this.pokemonRepository.findById(
      PokemonId.create(body.trainer1PokemonId),
    );
    const p2 = this.pokemonRepository.findById(
      PokemonId.create(body.trainer2PokemonId),
    );

    if (!p1) {
      return R.fail(new Error(`Pokemon ${body.trainer1PokemonId} not found.`));
    }
    if (!p2) {
      return R.fail(new Error(`Pokemon ${body.trainer2PokemonId} not found.`));
    }

    const pokemon1 = p1.toDto();
    const pokemon2 = p2.toDto();

    const battle = Battle.start(
      this.battleRepository.nextId(),
      {
        trainerId: body.trainer1Id,
        pokemon: {
          trainerId: body.trainer1Id,
          pokemonId: pokemon1.id,
          name: pokemon1.name,
          maxHp: pokemon1.baseStats.hp,
          currentHp: pokemon1.baseStats.hp,
        },
      },
      {
        trainerId: body.trainer2Id,
        pokemon: {
          trainerId: body.trainer2Id,
          pokemonId: pokemon2.id,
          name: pokemon2.name,
          maxHp: pokemon2.baseStats.hp,
          currentHp: pokemon2.baseStats.hp,
        },
      },
    );

    await this.battleRepository.save(battle);

    return R.succeed(battle.state);
  }
}
