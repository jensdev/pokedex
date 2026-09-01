import { assert, layer } from '@effect/vitest';
import { ConfigProvider, Effect, Exit, Layer } from 'effect';
import {
  HttpClientRequest,
  HttpRouter,
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http';
import { HttpApiTest } from 'effect/unstable/httpapi';
import type { PokemonVariant } from '../src/generated/Api.js';
import { PokedexApi } from '../src/generated/Api.js';
import { PokedexHandlers } from '../src/http/PokedexHandlers.js';
import { AllRoutes } from '../src/http/Routes.js';
import { Pokedex } from '../src/services/Pokedex.js';

const makeClient = HttpApiTest.groups(PokedexApi, ['Pokedex']);

/**
 * Pins the flaky upstream off. Without it `fetchAll` fails one call in ten and
 * every list assertion below becomes a coin flip.
 */
const DeterministicConfig = ConfigProvider.layer(
  ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: '0' }),
);

/** The opposite pin: every `fetchAll` fails, so the 500 path is reachable. */
const CorruptUpstreamConfig = ConfigProvider.layer(
  ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: '1' }),
);

const handlersWith = (config: Layer.Layer<never>) =>
  Layer.mergeAll(
    PokedexHandlers.pipe(Layer.provide(Pokedex.layer), Layer.provide(config)),
    HttpServer.layerServices,
  );

const TestLayer = handlersWith(DeterministicConfig);

const idsOf = (items: ReadonlyArray<PokemonVariant>) =>
  items.map((pokemon) => pokemon.id);

layer(TestLayer)('Pokedex API', (it) => {
  it.effect('listPokemon returns the seeded page', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const body = yield* client.Pokedex.listPokemon({ query: {} });

      assert.deepStrictEqual(idsOf(body.items), [1, 25, 150, 151]);
      assert.strictEqual(body.total, 4);
      assert.strictEqual(body.page, 0);
      assert.strictEqual(body.pageSize, 20);
    }),
  );

  it.effect('listPokemon filters by classification', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const body = yield* client.Pokedex.listPokemon({
        query: { classification: 'normal' },
      });

      assert.deepStrictEqual(idsOf(body.items), [1, 25]);
      assert.strictEqual(body.total, 2);
    }),
  );

  it.effect('listPokemon filters by type on either slot', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      // Bulbasaur is grass/poison — matched by its secondary type.
      const poison = yield* client.Pokedex.listPokemon({
        query: { type: 'poison' },
      });
      const psychic = yield* client.Pokedex.listPokemon({
        query: { type: 'psychic' },
      });

      assert.deepStrictEqual(idsOf(poison.items), [1]);
      assert.deepStrictEqual(idsOf(psychic.items), [150, 151]);
    }),
  );

  it.effect('listPokemon searches names case-insensitively', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const body = yield* client.Pokedex.listPokemon({
        query: { search: 'MEW' },
      });

      assert.deepStrictEqual(idsOf(body.items), [150, 151]);
    }),
  );

  it.effect('listPokemon combines filters, sorting, and pagination', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const combined = yield* client.Pokedex.listPokemon({
        query: { classification: 'mythical', type: 'psychic', search: 'mew' },
      });
      const paged = yield* client.Pokedex.listPokemon({
        query: { sortBy: 'id', sortOrder: 'desc', page: 0, pageSize: 2 },
      });

      assert.deepStrictEqual(idsOf(combined.items), [151]);
      assert.deepStrictEqual(idsOf(paged.items), [151, 150]);
      // `total` is the filtered count, not the page length.
      assert.strictEqual(paged.total, 4);
      assert.strictEqual(paged.pageSize, 2);
    }),
  );

  it.effect('getPokemonById returns the decoded variant', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const pikachu = yield* client.Pokedex.getPokemonById({
        params: { id: 25 },
      });
      const mewtwo = yield* client.Pokedex.getPokemonById({
        params: { id: 150 },
      });

      assert.strictEqual(pikachu.name, 'pikachu');
      assert.strictEqual(pikachu.classification, 'normal');
      // The union decodes to the right arm, extras included.
      assert.strictEqual(mewtwo.classification, 'legendary');
      if (mewtwo.classification === 'legendary') {
        assert.strictEqual(mewtwo.legendaryGroup, 'Mew Duo');
      }
    }),
  );

  it.effect('getPokemonById 404s on an unknown id', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const error = yield* Effect.flip(
        client.Pokedex.getPokemonById({ params: { id: 999 } }),
      );

      // The Empty(404) member of the error union decodes to void.
      assert.isUndefined(error);
    }),
  );
});

layer(handlersWith(CorruptUpstreamConfig))(
  'Pokedex API — corrupt upstream',
  (it) => {
    it.effect(
      'listPokemon reports PokemonDataParse as a contract ApiError',
      () =>
        Effect.gen(function* () {
          const client = yield* makeClient;

          const error = yield* Effect.flip(
            client.Pokedex.listPokemon({ query: {} }),
          );

          // The 500 member of the union is the `ApiError` struct, not an empty body.
          assert.deepStrictEqual(error, {
            code: 'POKEMON_DATA_PARSE_ERROR',
            message: 'Pokemon data from source failed to parse',
          });
        }),
    );
  },
);

/**
 * The typed client decodes the success channel and so cannot observe wire
 * statuses or bodies. Drive the real router for those — and for requests the
 * client would refuse to encode in the first place, like an out-of-range id.
 */
const routesWith = (config: Layer.Layer<never>) =>
  AllRoutes.pipe(
    Layer.provide(config),
    Layer.provideMerge(HttpServer.layerServices),
  );

/**
 * A rejected request fails the router effect rather than returning a response,
 * so failures are rendered here the same way the server does it:
 * `HttpEffect.toHandled` passes the cause through
 * `HttpServerError.causeResponse`, which lets a `Respondable` failure such as
 * `HttpApiSchemaError` pick its own status (400).
 */
const getVia = (routes: ReturnType<typeof routesWith>) => (path: string) =>
  Effect.gen(function* () {
    const handler = yield* HttpRouter.toHttpEffect(routes);
    const exit = yield* Effect.exit(
      handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(HttpClientRequest.get(path)),
        ),
      ),
    );
    if (Exit.isSuccess(exit)) return exit.value;
    const [response] = yield* HttpServerError.causeResponse(exit.cause);
    return response;
  });

layer(HttpServer.layerServices)('Pokedex routes', (it) => {
  const get = getVia(routesWith(DeterministicConfig));

  it.effect('GET /pokemon responds 200 with JSON', () =>
    Effect.gen(function* () {
      const response = yield* get('/pokemon?classification=legendary');

      assert.strictEqual(response.status, 200);
      assert.include(
        response.headers['content-type'] ?? '',
        'application/json',
      );
    }),
  );

  it.effect('GET /pokemon/25 responds 200', () =>
    Effect.gen(function* () {
      const response = yield* get('/pokemon/25');

      assert.strictEqual(response.status, 200);
    }),
  );

  it.effect('GET /pokemon/999 responds 404 with an empty body', () =>
    Effect.gen(function* () {
      const response = yield* get('/pokemon/999');

      assert.strictEqual(response.status, 404);
      const body = yield* HttpServerResponse.toClientResponse(response).text;
      assert.strictEqual(body, '');
    }),
  );

  it.effect('GET /pokemon/2000 is rejected as 400 before the handler', () =>
    Effect.gen(function* () {
      // The contract caps `id` at 1025, so `getPokemonById` never runs.
      const response = yield* get('/pokemon/2000');

      assert.strictEqual(response.status, 400);
    }),
  );

  it.effect('GET /pokemon with an invalid query is rejected as 400', () =>
    Effect.gen(function* () {
      const response = yield* get('/pokemon?pageSize=0');

      assert.strictEqual(response.status, 400);
    }),
  );
});

layer(HttpServer.layerServices)('Pokedex routes — corrupt upstream', (it) => {
  const get = getVia(routesWith(CorruptUpstreamConfig));

  it.effect('GET /pokemon responds 500', () =>
    Effect.gen(function* () {
      // `ApiError` is the contract's default response, which encodes as 500.
      const response = yield* get('/pokemon');

      assert.strictEqual(response.status, 500);
    }),
  );
});
