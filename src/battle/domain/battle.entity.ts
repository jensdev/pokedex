import { match } from 'ts-pattern';
import type {
  BattleStatus,
  BattlePokemon,
  BattleParticipant,
} from '../../generated/types.gen.js';
import type { BattleEvent } from './battle.events.js';

export class Battle {
  private _state: BattleStatus;
  private _uncommittedEvents: BattleEvent[] = [];

  private constructor(state: BattleStatus) {
    this._state = state;
  }

  static start(
    id: string,
    trainer1: BattleParticipant,
    trainer2: BattleParticipant,
  ): Battle {
    const startedEvent: BattleEvent = {
      type: 'BattleStarted',
      battleId: id,
      trainer1,
      trainer2,
      timestamp: new Date().toISOString(),
    };

    const initialStatus: BattleStatus = {
      id,
      status: 'ongoing',
      turn: 1,
      activeTrainerId: trainer1.trainerId,
      pokemon: [trainer1.pokemon, trainer2.pokemon],
      history: [startedEvent],
    };

    const battle = new Battle(initialStatus);
    battle._uncommittedEvents.push(startedEvent);
    return battle;
  }

  static rehydrate(id: string, events: BattleEvent[]): Battle {
    let state: Partial<BattleStatus> = { id, history: [] };

    for (const event of events) {
      state = Battle.applyEvent(state, event);
    }

    return new Battle(state as BattleStatus);
  }

  private static applyEvent(
    state: Partial<BattleStatus>,
    event: BattleEvent,
  ): Partial<BattleStatus> {
    state.history = [...(state.history || []), event];

    return match(event)
      .with({ type: 'BattleStarted' }, (e) => ({
        ...state,
        status: 'ongoing' as const,
        turn: 1,
        activeTrainerId: e.trainer1.trainerId,
        pokemon: [e.trainer1.pokemon, e.trainer2.pokemon],
      }))
      .with({ type: 'MovePerformed' }, (e) => {
        const newPokemon = (state.pokemon || []).map((p) => {
          if (p.trainerId === e.targetId) {
            return {
              ...p,
              currentHp: Math.max(0, p.currentHp - e.damageDealt),
            };
          }
          return p;
        });

        return {
          ...state,
          turn: (state.turn || 1) + 1,
          activeTrainerId:
            state.activeTrainerId === state.pokemon![0].trainerId
              ? state.pokemon![1].trainerId
              : state.pokemon![0].trainerId,
          pokemon: newPokemon,
        };
      })
      .with({ type: 'BattleFinished' }, (e) => ({
        ...state,
        status: 'finished' as const,
        winnerId: e.winnerId,
      }))
      .exhaustive();
  }

  performMove(trainerId: string, moveName: string): void {
    if (this._state.status === 'finished') {
      throw new Error('Battle is already finished.');
    }

    if (this._state.activeTrainerId !== trainerId) {
      throw new Error(`It is not trainer ${trainerId}'s turn.`);
    }

    const attacker = this._state.pokemon.find(
      (p) => p.trainerId === trainerId,
    )!;
    const defender = this._state.pokemon.find(
      (p) => p.trainerId !== trainerId,
    )!;

    // Simple damage calculation for demo
    const damageDealt = Math.floor(Math.random() * 20) + 10;
    const isCritical = Math.random() > 0.8;
    const finalDamage = isCritical ? damageDealt * 2 : damageDealt;

    const moveEvent: BattleEvent = {
      type: 'MovePerformed',
      trainerId,
      moveName,
      damageDealt: finalDamage,
      targetId: defender.trainerId,
      isCritical,
      timestamp: new Date().toISOString(),
    };

    this.apply(moveEvent);

    const updatedDefender = this._state.pokemon.find(
      (p) => p.trainerId === defender.trainerId,
    )!;
    if (updatedDefender.currentHp <= 0) {
      const finishedEvent: BattleEvent = {
        type: 'BattleFinished',
        winnerId: trainerId,
        timestamp: new Date().toISOString(),
      };
      this.apply(finishedEvent);
    }
  }

  private apply(event: BattleEvent): void {
    this._state = Battle.applyEvent(this._state, event) as BattleStatus;
    this._uncommittedEvents.push(event);
  }

  get id(): string {
    return this._state.id;
  }

  get state(): BattleStatus {
    return this._state;
  }

  get uncommittedEvents(): BattleEvent[] {
    return this._uncommittedEvents;
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }
}
