import { Battle } from './battle.entity';

describe('Battle Aggregate (Event Sourcing)', () => {
  const trainer1 = {
    trainerId: 'trainer-1',
    pokemon: {
      trainerId: 'trainer-1',
      pokemonId: 25,
      name: 'Pikachu',
      maxHp: 100,
      currentHp: 100,
    },
  };

  const trainer2 = {
    trainerId: 'trainer-2',
    pokemon: {
      trainerId: 'trainer-2',
      pokemonId: 133,
      name: 'Eevee',
      maxHp: 100,
      currentHp: 100,
    },
  };

  it('should start a battle and produce BattleStarted event', () => {
    const battle = Battle.start('battle-1', trainer1, trainer2);

    expect(battle.state.status).toBe('ongoing');
    expect(battle.state.turn).toBe(1);
    expect(battle.state.activeTrainerId).toBe('trainer-1');
    expect(battle.uncommittedEvents).toHaveLength(1);
    expect(battle.uncommittedEvents[0].type).toBe('BattleStarted');
  });

  it('should apply MovePerformed event and update state', () => {
    const battle = Battle.start('battle-1', trainer1, trainer2);
    battle.clearUncommittedEvents();

    battle.performMove('trainer-1', 'Thunderbolt');

    expect(battle.state.turn).toBe(2);
    expect(battle.state.activeTrainerId).toBe('trainer-2');
    expect(battle.state.pokemon[1].currentHp).toBeLessThan(100);
    expect(battle.uncommittedEvents).toHaveLength(1);
    expect(battle.uncommittedEvents[0].type).toBe('MovePerformed');
  });

  it('should finish battle when Pokemon HP reaches 0', () => {
    const battle = Battle.start('battle-1', trainer1, trainer2);

    // Force defender HP to be low for testing
    // In a real ES system, we might apply a specific event or mock the random damage
    // For this demo, we'll just loop until it's finished or mock the HP

    while (battle.state.status === 'ongoing') {
      const currentTrainer = battle.state.activeTrainerId;
      battle.performMove(currentTrainer, 'Attack');
    }

    expect(battle.state.status).toBe('finished');
    expect(battle.state.winnerId).toBeDefined();
    expect(battle.state.history.some((e) => e.type === 'BattleFinished')).toBe(
      true,
    );
  });

  it('should rehydrate state from events', () => {
    const battle = Battle.start('battle-1', trainer1, trainer2);
    battle.performMove('trainer-1', 'Thunderbolt');
    const events = [...battle.state.history] as any[];

    const rehydratedBattle = Battle.rehydrate('battle-1', events);

    expect(rehydratedBattle.state).toEqual(battle.state);
    expect(rehydratedBattle.uncommittedEvents).toHaveLength(0);
  });
});
