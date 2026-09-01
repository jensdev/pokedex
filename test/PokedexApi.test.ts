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
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../src/generated/Api.js';
import { PokedexHandlers } from '../src/http/PokedexHandlers.js';
import { AppLayer } from '../src/http/AppLayer.js';
import { SchemaErrorHandlerLayer, ServerApi } from '../src/http/ServerApi.js';
import { Pokedex } from '../src/services/Pokedex.js';

// `ServerApi`, not the generated `PokedexApi`: the handlers are built against
// the api that carries the schema-error middleware, and the typed client has to
// describe the same endpoints.
const makeClient = HttpApiTest.groups(ServerApi, ['Pokedex']);

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
    PokedexHandlers.pipe(
      Layer.provideMerge(SchemaErrorHandlerLayer),
      Layer.provide(Pokedex.layer),
      Layer.provide(config),
    ),
    HttpServer.layerServices,
  );

const TestLayer = handlersWith(DeterministicConfig);

const idsOf = (items: ReadonlyArray<PokemonVariant>) =>
  items.map((pokemon) => pokemon.id);

/**
 * The contract's 404 body (decision D1). The `code` literal is not decoration:
 * it is what selects the 404 member of the endpoint's error union over the
 * structurally identical 400 and 500 members.
 */
const notFoundBody = (id: number) => ({
  code: 'POKEMON_NOT_FOUND',
  message: `No Pokemon with id ${id}`,
});

/** A create/replace payload: base fields plus a classification, nothing else. */
const payload = (
  classification: CreatePokemonRequest['classification'],
  overrides: Partial<CreatePokemonRequest> = {},
): CreatePokemonRequest => ({
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
  classification,
  ...overrides,
});

/**
 * Builds the whole handler stack for one test and throws it away afterwards.
 *
 * `layer()` builds its layer once per suite, so every test inside a suite
 * shares one `Ref` store — fine for the read tests above, order-dependent as
 * soon as anything writes. `local: true` bypasses layer memoization, so each
 * write test starts from the untouched seed.
 */
const isolated = <A, E, R>(program: Effect.Effect<A, E, R>) =>
  program.pipe(Effect.provide(TestLayer, { local: true }), Effect.scoped);

/** `TestClock` starts at epoch millis 0, so this is "now" in every test. */
const EPOCH = '1970-01-01T00:00:00.000Z';
/** Every seed entry carries this timestamp (parity decision P5). */
const SEEDED_AT = '2024-01-01T00:00:00.000Z';

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

      assert.deepStrictEqual(error, notFoundBody(999));
    }),
  );
});

/**
 * The write endpoints, driven through the typed client. Each test builds its
 * own handler stack (see {@link isolated}), so the seed is pristine at the top
 * of every one of them and the order they run in does not matter.
 */
layer(HttpServer.layerServices)('Pokedex API — writes', (it) => {
  it.effect('createPokemon returns the defaulted variant', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        const created = yield* client.Pokedex.createPokemon({
          payload: payload('legendary', { name: 'missingno' }),
        });

        assert.strictEqual(created.id, 1026);
        assert.strictEqual(created.createdAt, EPOCH);
        assert.strictEqual(created.updatedAt, EPOCH);
        assert.strictEqual(created.classification, 'legendary');
        if (created.classification !== 'legendary') return;
        assert.strictEqual(created.legendaryGroup, 'Unknown');
        assert.isFalse(created.isBoxLegendary);
      }),
    ),
  );

  it.effect('createPokemon stores the entry, so a list finds it', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        yield* client.Pokedex.createPokemon({ payload: payload('normal') });
        const found = yield* client.Pokedex.listPokemon({
          query: { search: 'missingno' },
        });
        const all = yield* client.Pokedex.listPokemon({ query: {} });

        assert.deepStrictEqual(idsOf(found.items), [1026]);
        // Also proves the previous test's writes did not leak into this store.
        assert.deepStrictEqual(idsOf(all.items), [1, 25, 150, 151, 1026]);
        assert.strictEqual(all.total, 5);
      }),
    ),
  );

  it.effect('replacePokemon preserves createdAt and returns the result', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        const replaced = yield* client.Pokedex.replacePokemon({
          params: { id: 1 },
          payload: payload('normal', { name: 'not-bulbasaur' }),
        });
        const fetched = yield* client.Pokedex.getPokemonById({
          params: { id: 1 },
        });

        assert.strictEqual(replaced.name, 'not-bulbasaur');
        assert.strictEqual(replaced.createdAt, SEEDED_AT);
        assert.strictEqual(replaced.updatedAt, EPOCH);
        assert.deepStrictEqual(fetched, replaced);
      }),
    ),
  );

  it.effect('replacePokemon 404s on an unknown id', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        const error = yield* Effect.flip(
          client.Pokedex.replacePokemon({
            params: { id: 999 },
            payload: payload('normal'),
          }),
        );

        assert.deepStrictEqual(error, notFoundBody(999));
      }),
    ),
  );

  it.effect('deletePokemon removes the entry', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        yield* client.Pokedex.deletePokemon({ params: { id: 25 } });
        const error = yield* Effect.flip(
          client.Pokedex.getPokemonById({ params: { id: 25 } }),
        );
        const all = yield* client.Pokedex.listPokemon({ query: {} });

        assert.deepStrictEqual(error, notFoundBody(25));
        assert.deepStrictEqual(idsOf(all.items), [1, 150, 151]);
      }),
    ),
  );

  it.effect('deletePokemon 404s on an unknown id', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        const error = yield* Effect.flip(
          client.Pokedex.deletePokemon({ params: { id: 999 } }),
        );

        assert.deepStrictEqual(error, notFoundBody(999));
      }),
    ),
  );

  it.effect('the seed is untouched by the tests above', () =>
    isolated(
      Effect.gen(function* () {
        const client = yield* makeClient;

        const all = yield* client.Pokedex.listPokemon({ query: {} });

        assert.deepStrictEqual(idsOf(all.items), [1, 25, 150, 151]);
      }),
    ),
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
  AppLayer.pipe(
    Layer.provide(config),
    Layer.provideMerge(HttpServer.layerServices),
  );

/**
 * Builds the router once and hands back a `send` function over it, so the
 * several requests of a write round trip share one store. Each call to
 * `sessionVia` builds the layer afresh, so the seed is pristine per test.
 *
 * A rejected request fails the router effect rather than returning a response,
 * so failures are rendered here the same way the server does it:
 * `HttpEffect.toHandled` passes the cause through
 * `HttpServerError.causeResponse`, which lets a `Respondable` failure such as
 * `HttpApiSchemaError` pick its own status (400).
 */
const sessionVia = (routes: ReturnType<typeof routesWith>) =>
  Effect.gen(function* () {
    const handler = yield* HttpRouter.toHttpEffect(routes);

    return (request: HttpClientRequest.HttpClientRequest) =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(
          handler.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromClientRequest(request),
            ),
          ),
        );
        if (Exit.isSuccess(exit)) return exit.value;
        const [response] = yield* HttpServerError.causeResponse(exit.cause);
        return response;
      });
  });

/** One-shot GET, for the tests that need a single request. */
const getVia = (routes: ReturnType<typeof routesWith>) => (path: string) =>
  Effect.flatMap(sessionVia(routes), (send) =>
    send(HttpClientRequest.get(path)),
  );

const bodyOf = (response: HttpServerResponse.HttpServerResponse) =>
  HttpServerResponse.toClientResponse(response).text;

/** `JSON.parse` is typed `any`; bind it to `unknown` so assertions stay honest. */
const parseJson: (text: string) => unknown = JSON.parse;

/** The JSON body of a request, without a `CreatePokemonRequest` type on it. */
const jsonPost = (path: string, body: unknown) =>
  HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe(body));

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

  it.effect('GET /pokemon/999 responds 404 with the contract ApiError', () =>
    Effect.gen(function* () {
      const response = yield* get('/pokemon/999');

      assert.strictEqual(response.status, 404);
      const body = yield* HttpServerResponse.toClientResponse(response).text;
      assert.deepStrictEqual(parseJson(body), notFoundBody(999));
    }),
  );

  it.effect('GET /pokemon/2000 reaches the handler and 404s', () =>
    Effect.gen(function* () {
      // `PokemonId` dropped the 1025 cap (decision D2), so an id above the
      // National Pokedex range is a lookup, not a validation failure.
      const response = yield* get('/pokemon/2000');

      assert.strictEqual(response.status, 404);
    }),
  );

  it.effect('GET /pokemon/0 is rejected as 400 before the handler', () =>
    Effect.gen(function* () {
      // `PokemonId` still starts at 1.
      const response = yield* get('/pokemon/0');

      assert.strictEqual(response.status, 400);
    }),
  );

  it.effect('GET /pokemon with an invalid query is rejected as 400', () =>
    Effect.gen(function* () {
      const response = yield* get('/pokemon?pageSize=0');

      assert.strictEqual(response.status, 400);
    }),
  );

  const routes = routesWith(DeterministicConfig);

  it.effect('POST /pokemon responds 201 with the created variant', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const response = yield* send(jsonPost('/pokemon', payload('normal')));

      // 201 comes from the contract (`CreatePokemon201.pipe(status(201))`),
      // not from the handler — it returns the variant and nothing else.
      assert.strictEqual(response.status, 201);
      assert.deepStrictEqual(parseJson(yield* bodyOf(response)), {
        ...payload('normal'),
        id: 1026,
        createdAt: EPOCH,
        updatedAt: EPOCH,
        encounterRate: 50,
      });
    }),
  );

  it.effect('a created entry is listable and addressable by id', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      yield* send(jsonPost('/pokemon', payload('normal')));
      const listed = yield* send(HttpClientRequest.get('/pokemon?search=miss'));
      const fetched = yield* send(HttpClientRequest.get('/pokemon/1026'));

      assert.strictEqual(listed.status, 200);
      assert.include(yield* bodyOf(listed), '"id":1026');
      // Decision D2: dropping `@maxValue(1025)` from the path parameter is what
      // makes a created entry (ids from 1026) reachable at all. Before the
      // hardening pass this answered 400.
      assert.strictEqual(fetched.status, 200);
      assert.include(yield* bodyOf(fetched), '"id":1026');
    }),
  );

  it.effect('PUT /pokemon/1 responds 200 with the preserved createdAt', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const response = yield* send(
        HttpClientRequest.put('/pokemon/1').pipe(
          HttpClientRequest.bodyJsonUnsafe(payload('normal')),
        ),
      );

      assert.strictEqual(response.status, 200);
      // Bulbasaur's own `encounterRate: 45` and `evolvesInto: [2]` are gone:
      // quirk P2 and the dropped collection extras, both parity.
      assert.deepStrictEqual(parseJson(yield* bodyOf(response)), {
        ...payload('normal'),
        id: 1,
        createdAt: SEEDED_AT,
        updatedAt: EPOCH,
        encounterRate: 50,
      });
    }),
  );

  it.effect('PUT /pokemon/999 responds 404 with the contract ApiError', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const response = yield* send(
        HttpClientRequest.put('/pokemon/999').pipe(
          HttpClientRequest.bodyJsonUnsafe(payload('normal')),
        ),
      );

      assert.strictEqual(response.status, 404);
      assert.deepStrictEqual(
        parseJson(yield* bodyOf(response)),
        notFoundBody(999),
      );
    }),
  );

  it.effect('DELETE /pokemon/25 responds 204, and the entry is gone', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const deleted = yield* send(HttpClientRequest.delete('/pokemon/25'));
      const afterwards = yield* send(HttpClientRequest.get('/pokemon/25'));

      assert.strictEqual(deleted.status, 204);
      assert.strictEqual(yield* bodyOf(deleted), '');
      assert.strictEqual(afterwards.status, 404);
    }),
  );

  it.effect('DELETE /pokemon/999 responds 404', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const response = yield* send(HttpClientRequest.delete('/pokemon/999'));

      assert.strictEqual(response.status, 404);
      assert.deepStrictEqual(
        parseJson(yield* bodyOf(response)),
        notFoundBody(999),
      );
    }),
  );

  /**
   * Finding 3: `@minValue(1)` used to sit on `getById` alone, so `PUT` and
   * `DELETE /pokemon/0` reached the handler and answered 404. All three share
   * the `PokemonId` scalar now, so all three reject it.
   */
  it.effect('PUT and DELETE /pokemon/0 are rejected as 400', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const replaced = yield* send(
        HttpClientRequest.put('/pokemon/0').pipe(
          HttpClientRequest.bodyJsonUnsafe(payload('normal')),
        ),
      );
      const deleted = yield* send(HttpClientRequest.delete('/pokemon/0'));

      assert.strictEqual(replaced.status, 400);
      assert.strictEqual(deleted.status, 400);
    }),
  );

  it.effect(
    'POST /pokemon with a negative height never reaches the handler',
    () =>
      Effect.gen(function* () {
        const send = yield* sessionVia(routes);

        const rejected = yield* send(
          jsonPost('/pokemon', { ...payload('normal'), heightMetres: -1 }),
        );
        const all = yield* send(HttpClientRequest.get('/pokemon'));

        assert.strictEqual(rejected.status, 400);
        // Nothing was stored, which is what "before the handler" means here.
        assert.include(yield* bodyOf(all), '"total":4');
      }),
  );

  it.effect('POST /pokemon accepts a negative base stat — a contract gap', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      // `PokemonBaseStats` carries no `@minValue`, so `hp: -1` is a valid
      // request as far as the contract is concerned. The behavior spec assumed
      // otherwise (§createPokemon, "Zod/contract validation (min 0) rejects
      // first"); this pins what the contract actually does until the stat
      // bounds are added in Phase 7.
      const response = yield* send(
        jsonPost('/pokemon', {
          ...payload('normal'),
          baseStats: { ...payload('normal').baseStats, hp: -1 },
        }),
      );

      assert.strictEqual(response.status, 201);
    }),
  );

  it.effect('POST /pokemon with an over-long name is rejected as 400', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      // The contract caps `name` at 100 characters.
      const response = yield* send(
        jsonPost('/pokemon', { ...payload('normal'), name: 'a'.repeat(101) }),
      );

      assert.strictEqual(response.status, 400);
    }),
  );

  it.effect('the seed is untouched by the write tests above', () =>
    Effect.gen(function* () {
      const send = yield* sessionVia(routes);

      const response = yield* send(HttpClientRequest.get('/pokemon'));

      // Each `sessionVia` builds its own store; nothing above leaks in here.
      const body = yield* bodyOf(response);
      assert.include(body, '"total":4');
      assert.include(body, '"name":"pikachu"');
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
