import type {
  BattleStartedEvent,
  MovePerformedEvent,
  BattleFinishedEvent,
} from '../../generated/types.gen.js';

export type BattleEvent =
  | (BattleStartedEvent & { type: 'BattleStarted' })
  | (MovePerformedEvent & { type: 'MovePerformed' })
  | (BattleFinishedEvent & { type: 'BattleFinished' });
