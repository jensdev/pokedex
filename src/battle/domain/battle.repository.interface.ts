import { Result } from '@praha/byethrow';
import { Battle } from './battle.entity.js';

export const BATTLE_REPOSITORY_TOKEN = Symbol('IBattleRepository');

export interface IBattleRepository {
  save(battle: Battle): Result.ResultAsync<void, never>;
  getById(id: string): Result.ResultAsync<Battle | null, never>;
  nextId(): string;
}
