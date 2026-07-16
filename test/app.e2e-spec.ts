import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

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

  it('POST /pokemon with an invalid body is rejected by Standard Schema validation', () => {
    return request(app.getHttpServer()).post('/pokemon').send({}).expect(400);
  });
});
