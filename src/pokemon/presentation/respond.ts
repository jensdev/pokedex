import { Result } from '@praha/byethrow';
import { match } from 'ts-pattern';
import type { PokemonError } from '../domain/pokemon.errors.js';
import { throwHttpException } from './http-error.mapper.js';

/**
 * Unwraps a use-case `Result` at the HTTP boundary: the success value becomes
 * the response body, a failure becomes its mapped HTTP exception. Controllers
 * stay one-liners and cannot forget the failure rail — it is handled here,
 * exhaustively, once.
 */
export function respond<T>(result: Result.Result<T, PokemonError>): T {
  return match(result)
    .with({ type: 'Success' }, ({ value }) => value)
    .with({ type: 'Failure' }, ({ error }) => throwHttpException(error))
    .exhaustive();
}
