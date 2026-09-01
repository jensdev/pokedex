/**
 * The composition root: the one place that says which implementation backs
 * each service.
 *
 * `Pokedex.layer` used to bake `PokemonRepository.layerInMemory` in, and
 * `Routes.ts` provided it. That hid the store: a second consumer that provided
 * its own repository would silently have got a *second* `Ref`, because the
 * `Pokedex` in front of it already had one of its own. Here the repository is
 * chosen once, visibly, and every consumer above it shares that instance —
 * which is also what makes swapping it per environment a one-line change.
 *
 * Exported rather than inlined into `main.ts` so the tests that need the whole
 * stack drive the same wiring the server does, instead of a lookalike that can
 * drift from it.
 */
import { Layer } from 'effect';
import { Health } from '../services/Health.js';
import { Pokedex } from '../services/Pokedex.js';
import { PokemonRepository } from '../services/PokemonRepository.js';
import { AllRoutes } from './Routes.js';

/** Everything the server serves, with every service resolved. */
export const AppLayer = AllRoutes.pipe(
  Layer.provide([Health.layer, Pokedex.layerNoDeps]),
  Layer.provide(PokemonRepository.layerInMemory),
);
