import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Validates and transforms any route param carrying a `schema` option
  // (e.g. @Body({ schema: z... })) against its Standard Schema. Replaces the
  // old custom ZodPipe now that Zod schemas are Standard Schema-compatible.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
