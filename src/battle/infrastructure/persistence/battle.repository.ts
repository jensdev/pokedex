import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { Battle } from '../../domain/battle.entity.js';
import type { BattleEvent } from '../../domain/battle.events.js';
import type { IBattleRepository } from '../../domain/battle.repository.interface.js';

@Injectable()
export class InMemoryBattleRepository implements IBattleRepository {
  private readonly eventStore = new Map<string, BattleEvent[]>();

  save(battle: Battle): Result.ResultAsync<void, never> {
    const events = this.eventStore.get(battle.id) || [];
    const newEvents = [...events, ...battle.uncommittedEvents];

    this.eventStore.set(battle.id, newEvents);
    battle.clearUncommittedEvents();

    return Promise.resolve(R.succeed(undefined));
  }

  getById(id: string): Result.ResultAsync<Battle | null, never> {
    const events = this.eventStore.get(id);

    if (!events) {
      return Promise.resolve(R.succeed(null));
    }

    const battle = Battle.rehydrate(id, events);
    return Promise.resolve(R.succeed(battle));
  }

  nextId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
