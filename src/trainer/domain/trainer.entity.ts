export class CapturedPokemon {
  constructor(
    public readonly id: number,
    public readonly pokemonId: number,
    public readonly nickname: string | undefined,
    public readonly level: number,
    public readonly capturedAt: string,
  ) {}
}

export class Trainer {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly caughtPokemon: CapturedPokemon[],
    public readonly createdAt: string,
  ) {}

  catchPokemon(
    captureId: number,
    pokemonId: number,
    level: number,
    nickname?: string,
  ): CapturedPokemon {
    const captured = new CapturedPokemon(
      captureId,
      pokemonId,
      nickname,
      level,
      new Date().toISOString(),
    );
    this.caughtPokemon.push(captured);
    return captured;
  }
}
