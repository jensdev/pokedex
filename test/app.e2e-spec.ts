import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

const validPokemon = {
  name: 'testmon',
  primaryType: 'fire',
  baseStats: {
    hp: 50,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 50,
  },
  heightMetres: 1,
  weightKg: 10,
  isObtainable: true,
  classification: 'normal',
};

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror main.ts so the { schema } option is actually validated.
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /pokemon returns the list', () => {
    return request(app.getHttpServer()).get('/pokemon').expect(200);
  });

  // Regression: path params arrive as strings; the generated Zod now coerces
  // them, so a valid numeric id must resolve instead of failing validation.
  it('GET /pokemon/:id coerces the numeric path param and returns 200', () => {
    return request(app.getHttpServer()).get('/pokemon/25').expect(200);
  });

  it('GET /pokemon/:id still enforces the lower bound (400 for 0)', () => {
    return request(app.getHttpServer()).get('/pokemon/0').expect(400);
  });

  it('GET /pokemon coerces pagination query params', () => {
    return request(app.getHttpServer())
      .get('/pokemon?page=1&pageSize=5')
      .expect(200);
  });

  it('POST /pokemon with an invalid body is rejected by Standard Schema validation', () => {
    return request(app.getHttpServer()).post('/pokemon').send({}).expect(400);
  });

  it('POST /pokemon with a valid body returns 201', () => {
    return request(app.getHttpServer())
      .post('/pokemon')
      .send(validPokemon)
      .expect(201);
  });

  // Schema-valid but domain-invalid: negative stats pass Zod (int32 has no
  // minimum) but the Stats value object rejects them -> typed 400, not a 500.
  it('POST /pokemon with negative stats returns a typed 400', () => {
    return request(app.getHttpServer())
      .post('/pokemon')
      .send({ ...validPokemon, baseStats: { ...validPokemon.baseStats, hp: -1 } })
      .expect(400);
  });

  it('PUT /pokemon/:id replaces an existing Pokemon (200)', () => {
    return request(app.getHttpServer())
      .put('/pokemon/25')
      .send(validPokemon)
      .expect(200);
  });

  it('PUT /pokemon/:id returns 404 for an unknown id', () => {
    return request(app.getHttpServer())
      .put('/pokemon/999')
      .send(validPokemon)
      .expect(404);
  });

  it('DELETE /pokemon/:id returns 404 for an unknown id', () => {
    return request(app.getHttpServer()).delete('/pokemon/999').expect(404);
  });
});
