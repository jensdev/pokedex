/**
 * Smoke test for the generated consumer client (`src/generated/Client.ts`,
 * `--format httpclient`).
 *
 * This is the only suite that goes over a real socket: the point is to prove
 * the two generated artifacts agree at the wire, so a fake transport would test
 * nothing. `NodeHttpServer.layerTest` serves `AllRoutes` on an ephemeral port
 * and hands back an `HttpClient` already pointed at it.
 *
 * It stays a *smoke* test on purpose — endpoint semantics are covered by
 * `PokedexApi.test.ts` in-memory. What is checked here is that each operation
 * reaches its route, decodes its success body, and surfaces its declared error.
 */
import { NodeHttpServer } from '@effect/platform-node';
import { assert, layer } from '@effect/vitest';
import { ConfigProvider, Effect, Layer } from 'effect';
import { HttpClient, HttpRouter } from 'effect/unstable/http';
import type { PokedexClient } from '../src/generated/Client.js';
import { make as makePokedexClient } from '../src/generated/Client.js';
import { AllRoutes } from '../src/http/Routes.js';

/** The flaky upstream off, or one list call in ten is a coin flip. */
const DeterministicConfig = ConfigProvider.layer(
  ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: '0' }),
);

/**
 * The real server, on a real port. `disableListenLog`/`disableLogger` only
 * silence the boot and request lines — nothing else about the stack changes.
 */
const ServerLayer = HttpRouter.serve(AllRoutes, {
  disableLogger: true,
  disableListenLog: true,
}).pipe(
  Layer.provide(DeterministicConfig),
  Layer.provideMerge(NodeHttpServer.layerTest),
);

const client: Effect.Effect<PokedexClient, never, HttpClient.HttpClient> =
  Effect.map(HttpClient.HttpClient, (httpClient) =>
    makePokedexClient(httpClient),
  );

layer(ServerLayer)('Generated client', (it) => {
  it.effect('healthCheck decodes the health response', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const body = yield* pokedex.healthCheck(undefined);

      assert.strictEqual(body.status, 'healthy');
      assert.strictEqual(body.version, '1.0.0');
      assert.strictEqual(body.components.database.status, 'healthy');
    }),
  );

  it.effect('healthLiveness decodes the liveness response', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const body = yield* pokedex.healthLiveness(undefined);

      assert.strictEqual(body.status, 'ok');
      assert.isTrue(Number.isFinite(body.uptime));
    }),
  );

  it.effect('listPokemon passes its query and decodes the page', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const body = yield* pokedex.listPokemon({
        params: { classification: 'normal', sortBy: 'name' },
      });

      assert.deepStrictEqual(
        body.items.map((pokemon) => pokemon.name),
        ['bulbasaur', 'pikachu'],
      );
      assert.strictEqual(body.total, 2);
    }),
  );

  it.effect('getPokemonById decodes the right arm of the union', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const mewtwo = yield* pokedex.getPokemonById('150', undefined);

      // The discriminant narrows the union, so `legendaryGroup` is reachable
      // without a cast — which is the whole point of the generated client.
      assert.strictEqual(mewtwo.classification, 'legendary');
      if (mewtwo.classification !== 'legendary') return;
      assert.strictEqual(mewtwo.legendaryGroup, 'Mew Duo');
    }),
  );

  it.effect('getPokemonById surfaces the contract 404 as a typed error', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const error = yield* Effect.flip(
        pokedex.getPokemonById('999', undefined),
      );

      assert.strictEqual(error._tag, '404');
    }),
  );
});

/**
 * The write side, on its own server. `layer()` builds once per suite, so this
 * block gets a second server with a pristine seed and the read suite above is
 * free of any ordering coupling with the mutations here. Inside this suite the
 * store *is* shared: the create test deletes what it made, and the replace test
 * ends by deleting the entry it touched — which doubles as its 404 assertion.
 */
layer(ServerLayer)('Generated client — writes', (it) => {
  it.effect('createPokemon round-trips a payload and is then listable', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const created = yield* pokedex.createPokemon({
        payload: {
          name: 'missingno',
          primaryType: 'normal',
          baseStats: {
            hp: 1,
            attack: 1,
            defense: 1,
            specialAttack: 1,
            specialDefense: 1,
            speed: 1,
          },
          heightMetres: 1,
          weightKg: 1,
          isObtainable: false,
          classification: 'normal',
        },
      });

      assert.strictEqual(created.classification, 'normal');
      assert.isAtLeast(created.id, 1026);

      const found = yield* pokedex.listPokemon({
        params: { search: 'missingno' },
      });
      assert.deepStrictEqual(
        found.items.map((pokemon) => pokemon.id),
        [created.id],
      );

      // Puts the store back: this suite shares one server across its tests,
      // unlike the in-memory suites.
      yield* pokedex.deletePokemon(String(created.id), undefined);
    }),
  );

  it.effect('replacePokemon and deletePokemon reach their routes', () =>
    Effect.gen(function* () {
      const pokedex = yield* client;

      const replaced = yield* pokedex.replacePokemon('1', {
        payload: {
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
          classification: 'legendary',
        },
      });

      // Classification changed, so the legendary extras take the create
      // defaults (behavior spec §replacePokemon).
      assert.strictEqual(replaced.classification, 'legendary');
      if (replaced.classification !== 'legendary') return;
      assert.strictEqual(replaced.legendaryGroup, 'Unknown');

      yield* pokedex.deletePokemon('1', undefined);

      const gone = yield* Effect.flip(pokedex.getPokemonById('1', undefined));
      assert.strictEqual(gone._tag, '404');
    }),
  );
});
