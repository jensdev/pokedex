import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import type { SchemaError } from 'effect/Schema';
import * as Schema from 'effect/Schema';
import type * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
// non-recursive definitions
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export const HealthStatus = Schema.Literals([
  'healthy',
  'degraded',
  'unhealthy',
]).annotate({
  description: 'Possible states a health check component can be in.',
  identifier: 'HealthStatus',
});
export type ApiError = {
  readonly code: string;
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const ApiError = Schema.Struct({
  code: Schema.String.annotate({ description: 'Machine-readable error code.' }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description: 'Standard error returned for all 4xx/5xx responses.',
  identifier: 'ApiError',
});
export type LivenessResponse = {
  readonly status: 'ok';
  readonly uptime: number;
};
export const LivenessResponse = Schema.Struct({
  status: Schema.Literal('ok'),
  uptime: Schema.Number.annotate({
    description: 'Process uptime in seconds.',
    format: 'double',
  }).check(Schema.isFinite().annotate({ expected: 'a finite number' })),
}).annotate({
  description: 'Liveness probe response — confirms the process is running.',
  identifier: 'LivenessResponse',
});
export type PokemonClassification = 'normal' | 'legendary' | 'mythical';
export const PokemonClassification = Schema.Literals([
  'normal',
  'legendary',
  'mythical',
]).annotate({
  description:
    'Pokemon classification used when creating or filtering Pokemon.',
  identifier: 'PokemonClassification',
});
export type PokemonType =
  | 'bug'
  | 'dark'
  | 'dragon'
  | 'electric'
  | 'fairy'
  | 'fighting'
  | 'fire'
  | 'flying'
  | 'ghost'
  | 'grass'
  | 'ground'
  | 'ice'
  | 'normal'
  | 'poison'
  | 'psychic'
  | 'rock'
  | 'steel'
  | 'water';
export const PokemonType = Schema.Literals([
  'bug',
  'dark',
  'dragon',
  'electric',
  'fairy',
  'fighting',
  'fire',
  'flying',
  'ghost',
  'grass',
  'ground',
  'ice',
  'normal',
  'poison',
  'psychic',
  'rock',
  'steel',
  'water',
]).annotate({
  description: 'Pokemon elemental type.',
  identifier: 'PokemonType',
});
export type PokemonId = number;
export const PokemonId = Schema.Number.annotate({
  description:
    'Identifies an entry in this Pokédex. Unique; allocated by the server.',
  format: 'int32',
})
  .check(Schema.isInt().annotate({ expected: 'an integer' }))
  .check(
    Schema.isGreaterThanOrEqualTo(1).annotate({
      expected: 'a value greater than or equal to 1',
      identifier: 'PokemonId',
    }),
  );
export type NationalDexNumber = number;
export const NationalDexNumber = Schema.Number.annotate({
  description: 'National Pokédex number — 1 for Bulbasaur, 1025 for Pecharunt.',
  format: 'int32',
})
  .check(Schema.isInt().annotate({ expected: 'an integer' }))
  .check(
    Schema.isGreaterThanOrEqualTo(1).annotate({
      expected: 'a value greater than or equal to 1',
    }),
  )
  .check(
    Schema.isLessThanOrEqualTo(1025).annotate({
      expected: 'a value less than or equal to 1025',
      identifier: 'NationalDexNumber',
    }),
  );
export type PokemonBaseStats = {
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly specialAttack: number;
  readonly specialDefense: number;
  readonly speed: number;
};
export const PokemonBaseStats = Schema.Struct({
  hp: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  attack: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  defense: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  specialAttack: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  specialDefense: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  speed: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
}).annotate({
  description: 'Six base stats shared by every Pokemon.',
  identifier: 'PokemonBaseStats',
});
export type ComponentHealth = {
  readonly status: HealthStatus;
  readonly message?: string;
  readonly latencyMs?: number;
};
export const ComponentHealth = Schema.Struct({
  status: HealthStatus,
  message: Schema.optionalKey(Schema.String),
  latencyMs: Schema.optionalKey(
    Schema.Number.annotate({
      description: 'Round-trip latency in milliseconds, if measurable.',
      format: 'int32',
    }).check(Schema.isInt().annotate({ expected: 'an integer' })),
  ),
}).annotate({
  description: 'Health status of an individual dependency or subsystem.',
  identifier: 'ComponentHealth',
});
export type NormalPokemon = {
  readonly id: PokemonId;
  readonly nationalDexNumber?: NationalDexNumber;
  readonly name: string;
  readonly primaryType: PokemonType;
  readonly secondaryType?: PokemonType;
  readonly baseStats: PokemonBaseStats;
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly classification: 'normal';
  readonly encounterRate: number;
  readonly evolvesInto?: ReadonlyArray<number>;
};
export const NormalPokemon = Schema.Struct({
  id: Schema.suspend((): Schema.Codec<PokemonId> => PokemonId).annotate({
    description:
      'Identifies this entry. Unique; allocated by the server on create.',
  }),
  nationalDexNumber: Schema.optionalKey(
    Schema.suspend(
      (): Schema.Codec<NationalDexNumber> => NationalDexNumber,
    ).annotate({
      description:
        'National Pokedex number, when this entry is a real Pokemon. Absent for\nentries invented through `POST /pokemon`.',
    }),
  ),
  name: Schema.String.annotate({
    description: 'Species name in lowercase (e.g. "bulbasaur").',
  })
    .check(
      Schema.isMinLength(1).annotate({
        expected: 'a value with a length of at least 1',
      }),
    )
    .check(
      Schema.isMaxLength(100).annotate({
        expected: 'a value with a length of at most 100',
      }),
    ),
  primaryType: Schema.suspend(
    (): Schema.Codec<PokemonType> => PokemonType,
  ).annotate({ description: 'Primary elemental type.' }),
  secondaryType: Schema.optionalKey(
    Schema.suspend((): Schema.Codec<PokemonType> => PokemonType).annotate({
      description: 'Secondary elemental type, if any.',
    }),
  ),
  baseStats: Schema.suspend(
    (): Schema.Codec<PokemonBaseStats> => PokemonBaseStats,
  ).annotate({ description: 'Base stat block.' }),
  heightMetres: Schema.Number.annotate({
    description: 'Height in metres.',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  weightKg: Schema.Number.annotate({
    description: 'Weight in kilograms.',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  isObtainable: Schema.Boolean.annotate({
    description:
      'Whether this Pokemon appears in the wild in main series games.',
  }),
  createdAt: Schema.String.annotate({
    description: 'When this entry was added to the Pokedex.',
    format: 'date-time',
  }),
  updatedAt: Schema.String.annotate({
    description: 'When this entry was last updated.',
    format: 'date-time',
  }),
  classification: Schema.Literal('normal').annotate({
    description: "Discriminator — fixes this variant's classification.",
  }),
  encounterRate: Schema.Number.annotate({
    description: 'Encounter rate in the wild (0–100).',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(100).annotate({
        expected: 'a value less than or equal to 100',
      }),
    ),
  evolvesInto: Schema.optionalKey(
    Schema.Array(
      Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
    ).annotate({
      description:
        'National Pokedex IDs of the Pokemon this one can evolve into, if any.',
    }),
  ),
}).annotate({
  description: 'A regular, catchable Pokemon with no special legendary status.',
  identifier: 'NormalPokemon',
});
export type LegendaryPokemon = {
  readonly id: PokemonId;
  readonly nationalDexNumber?: NationalDexNumber;
  readonly name: string;
  readonly primaryType: PokemonType;
  readonly secondaryType?: PokemonType;
  readonly baseStats: PokemonBaseStats;
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly classification: 'legendary';
  readonly legendaryGroup: string;
  readonly isBoxLegendary: boolean;
  readonly mascotForGames?: ReadonlyArray<string>;
};
export const LegendaryPokemon = Schema.Struct({
  id: Schema.suspend((): Schema.Codec<PokemonId> => PokemonId).annotate({
    description:
      'Identifies this entry. Unique; allocated by the server on create.',
  }),
  nationalDexNumber: Schema.optionalKey(
    Schema.suspend(
      (): Schema.Codec<NationalDexNumber> => NationalDexNumber,
    ).annotate({
      description:
        'National Pokedex number, when this entry is a real Pokemon. Absent for\nentries invented through `POST /pokemon`.',
    }),
  ),
  name: Schema.String.annotate({
    description: 'Species name in lowercase (e.g. "bulbasaur").',
  })
    .check(
      Schema.isMinLength(1).annotate({
        expected: 'a value with a length of at least 1',
      }),
    )
    .check(
      Schema.isMaxLength(100).annotate({
        expected: 'a value with a length of at most 100',
      }),
    ),
  primaryType: Schema.suspend(
    (): Schema.Codec<PokemonType> => PokemonType,
  ).annotate({ description: 'Primary elemental type.' }),
  secondaryType: Schema.optionalKey(
    Schema.suspend((): Schema.Codec<PokemonType> => PokemonType).annotate({
      description: 'Secondary elemental type, if any.',
    }),
  ),
  baseStats: Schema.suspend(
    (): Schema.Codec<PokemonBaseStats> => PokemonBaseStats,
  ).annotate({ description: 'Base stat block.' }),
  heightMetres: Schema.Number.annotate({
    description: 'Height in metres.',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  weightKg: Schema.Number.annotate({
    description: 'Weight in kilograms.',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  isObtainable: Schema.Boolean.annotate({
    description:
      'Whether this Pokemon appears in the wild in main series games.',
  }),
  createdAt: Schema.String.annotate({
    description: 'When this entry was added to the Pokedex.',
    format: 'date-time',
  }),
  updatedAt: Schema.String.annotate({
    description: 'When this entry was last updated.',
    format: 'date-time',
  }),
  classification: Schema.Literal('legendary').annotate({
    description: "Discriminator — fixes this variant's classification.",
  }),
  legendaryGroup: Schema.String.annotate({
    description:
      'Name of the legendary group or trio (e.g. "Legendary Birds").',
  }),
  isBoxLegendary: Schema.Boolean.annotate({
    description:
      'Whether this Pokemon is the box mascot of a main series game.',
  }),
  mascotForGames: Schema.optionalKey(
    Schema.Array(Schema.String).annotate({
      description:
        'Game titles for which this Pokemon is the primary mascot, if any.',
    }),
  ),
}).annotate({
  description:
    'A Legendary Pokemon — extremely rare, part of a legendary group,\ncannot be bred.',
  identifier: 'LegendaryPokemon',
});
export type MythicalPokemon = {
  readonly id: PokemonId;
  readonly nationalDexNumber?: NationalDexNumber;
  readonly name: string;
  readonly primaryType: PokemonType;
  readonly secondaryType?: PokemonType;
  readonly baseStats: PokemonBaseStats;
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly classification: 'mythical';
  readonly distributionMethod: string;
  readonly isCurrentlyDistributed: boolean;
  readonly loreDescription: string;
};
export const MythicalPokemon = Schema.Struct({
  id: Schema.suspend((): Schema.Codec<PokemonId> => PokemonId).annotate({
    description:
      'Identifies this entry. Unique; allocated by the server on create.',
  }),
  nationalDexNumber: Schema.optionalKey(
    Schema.suspend(
      (): Schema.Codec<NationalDexNumber> => NationalDexNumber,
    ).annotate({
      description:
        'National Pokedex number, when this entry is a real Pokemon. Absent for\nentries invented through `POST /pokemon`.',
    }),
  ),
  name: Schema.String.annotate({
    description: 'Species name in lowercase (e.g. "bulbasaur").',
  })
    .check(
      Schema.isMinLength(1).annotate({
        expected: 'a value with a length of at least 1',
      }),
    )
    .check(
      Schema.isMaxLength(100).annotate({
        expected: 'a value with a length of at most 100',
      }),
    ),
  primaryType: Schema.suspend(
    (): Schema.Codec<PokemonType> => PokemonType,
  ).annotate({ description: 'Primary elemental type.' }),
  secondaryType: Schema.optionalKey(
    Schema.suspend((): Schema.Codec<PokemonType> => PokemonType).annotate({
      description: 'Secondary elemental type, if any.',
    }),
  ),
  baseStats: Schema.suspend(
    (): Schema.Codec<PokemonBaseStats> => PokemonBaseStats,
  ).annotate({ description: 'Base stat block.' }),
  heightMetres: Schema.Number.annotate({
    description: 'Height in metres.',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  weightKg: Schema.Number.annotate({
    description: 'Weight in kilograms.',
    format: 'float',
  })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  isObtainable: Schema.Boolean.annotate({
    description:
      'Whether this Pokemon appears in the wild in main series games.',
  }),
  createdAt: Schema.String.annotate({
    description: 'When this entry was added to the Pokedex.',
    format: 'date-time',
  }),
  updatedAt: Schema.String.annotate({
    description: 'When this entry was last updated.',
    format: 'date-time',
  }),
  classification: Schema.Literal('mythical').annotate({
    description: "Discriminator — fixes this variant's classification.",
  }),
  distributionMethod: Schema.String.annotate({
    description:
      'How this Pokemon is distributed (e.g. "Mystery Gift", "in-game event").',
  }),
  isCurrentlyDistributed: Schema.Boolean.annotate({
    description: 'Whether an active distribution is currently running.',
  }),
  loreDescription: Schema.String.annotate({
    description: "In-lore description of this Pokemon's mythical origin.",
  }),
}).annotate({
  description:
    'A Mythical Pokemon — event-only distribution, outside the normal story,\ntypically cannot be caught in the wild.',
  identifier: 'MythicalPokemon',
});
export type CreatePokemonRequest = {
  readonly nationalDexNumber?: NationalDexNumber;
  readonly name: string;
  readonly primaryType: PokemonType;
  readonly secondaryType?: PokemonType;
  readonly baseStats: PokemonBaseStats;
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly classification: PokemonClassification;
};
export const CreatePokemonRequest = Schema.Struct({
  nationalDexNumber: Schema.optionalKey(
    Schema.suspend(
      (): Schema.Codec<NationalDexNumber> => NationalDexNumber,
    ).annotate({
      description:
        'National Pokedex number, if this is a real Pokemon. Omit it for an\ninvented one — the server never derives it from `id`.',
    }),
  ),
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: 'a value with a length of at least 1',
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: 'a value with a length of at most 100',
    }),
  ),
  primaryType: PokemonType,
  secondaryType: Schema.optionalKey(PokemonType),
  baseStats: PokemonBaseStats,
  heightMetres: Schema.Number.annotate({ format: 'float' })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  weightKg: Schema.Number.annotate({ format: 'float' })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  isObtainable: Schema.Boolean,
  classification: PokemonClassification,
}).annotate({
  description: 'Payload for creating a new Pokemon entry.',
  identifier: 'CreatePokemonRequest',
});
export type UpdatePokemonRequest = {
  readonly nationalDexNumber?: NationalDexNumber;
  readonly name: string;
  readonly primaryType: PokemonType;
  readonly secondaryType?: PokemonType;
  readonly baseStats: PokemonBaseStats;
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly classification: PokemonClassification;
};
export const UpdatePokemonRequest = Schema.Struct({
  nationalDexNumber: Schema.optionalKey(
    Schema.suspend(
      (): Schema.Codec<NationalDexNumber> => NationalDexNumber,
    ).annotate({
      description:
        'National Pokedex number, if this is a real Pokemon. Omit it for an\ninvented one — the server never derives it from `id`.',
    }),
  ),
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: 'a value with a length of at least 1',
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: 'a value with a length of at most 100',
    }),
  ),
  primaryType: PokemonType,
  secondaryType: Schema.optionalKey(PokemonType),
  baseStats: PokemonBaseStats,
  heightMetres: Schema.Number.annotate({ format: 'float' })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  weightKg: Schema.Number.annotate({ format: 'float' })
    .check(Schema.isFinite().annotate({ expected: 'a finite number' }))
    .check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: 'a value greater than or equal to 0',
      }),
    ),
  isObtainable: Schema.Boolean,
  classification: PokemonClassification,
}).annotate({
  description: 'Payload for fully replacing an existing Pokemon entry.',
  identifier: 'UpdatePokemonRequest',
});
export type HealthResponse = {
  readonly status: HealthStatus;
  readonly checkedAt: string;
  readonly version: string;
  readonly components: {
    readonly database: ComponentHealth;
    readonly cache?: ComponentHealth;
    readonly externalPokeApi?: ComponentHealth;
  };
};
export const HealthResponse = Schema.Struct({
  status: Schema.suspend(
    (): Schema.Codec<HealthStatus> => HealthStatus,
  ).annotate({
    description: 'Aggregate status — the worst status across all components.',
  }),
  checkedAt: Schema.String.annotate({
    description: 'When this check was performed.',
    format: 'date-time',
  }),
  version: Schema.String.annotate({
    description: 'Application version string (e.g. "1.0.0").',
  }),
  components: Schema.Struct({
    database: ComponentHealth,
    cache: Schema.optionalKey(ComponentHealth),
    externalPokeApi: Schema.optionalKey(ComponentHealth),
  }).annotate({ description: 'Per-component health details.' }),
}).annotate({
  description: 'Response body for health check endpoints.',
  identifier: 'HealthResponse',
});
export type PokemonVariant = NormalPokemon | LegendaryPokemon | MythicalPokemon;
export const PokemonVariant = Schema.Union([
  NormalPokemon,
  LegendaryPokemon,
  MythicalPokemon,
]).annotate({
  description:
    'Discriminated union of all concrete Pokemon classifications.\nUsed as the return type for Pokedex operations — emits an `anyOf` of the\nthree self-contained variant schemas, discriminated on `classification`.',
  identifier: 'PokemonVariant',
});
// schemas
export type HealthCheck200 = HealthResponse;
export const HealthCheck200 = HealthResponse;
export type HealthCheck400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const HealthCheck400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type HealthCheckdefault = ApiError;
export const HealthCheckdefault = ApiError;
export type HealthLiveness200 = LivenessResponse;
export const HealthLiveness200 = LivenessResponse;
export type HealthLiveness400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const HealthLiveness400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type HealthLivenessdefault = ApiError;
export const HealthLivenessdefault = ApiError;
export type HealthReadiness200 = HealthResponse;
export const HealthReadiness200 = HealthResponse;
export type HealthReadiness400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const HealthReadiness400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type HealthReadiness503 = HealthResponse;
export const HealthReadiness503 = HealthResponse;
export type HealthReadinessdefault = ApiError;
export const HealthReadinessdefault = ApiError;
export type ListPokemonParams = {
  readonly page?: number;
  readonly pageSize?: number;
  readonly classification?: PokemonClassification;
  readonly type?: PokemonType;
  readonly search?: string;
  readonly sortBy?: 'id' | 'name' | 'createdAt';
  readonly sortOrder?: 'asc' | 'desc';
};
export const ListPokemonParams = Schema.Struct({
  page: Schema.optionalKey(
    Schema.Number.annotate({ default: 0, format: 'int32' })
      .check(Schema.isInt().annotate({ expected: 'an integer' }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: 'a value greater than or equal to 0',
        }),
      ),
  ),
  pageSize: Schema.optionalKey(
    Schema.Number.annotate({ default: 20, format: 'int32' })
      .check(Schema.isInt().annotate({ expected: 'an integer' }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: 'a value greater than or equal to 1',
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: 'a value less than or equal to 100',
        }),
      ),
  ),
  classification: Schema.optionalKey(PokemonClassification),
  type: Schema.optionalKey(PokemonType),
  search: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(100).annotate({
        expected: 'a value with a length of at most 100',
      }),
    ),
  ),
  sortBy: Schema.optionalKey(Schema.Literals(['id', 'name', 'createdAt'])),
  sortOrder: Schema.optionalKey(Schema.Literals(['asc', 'desc'])),
});
export type ListPokemon200 = {
  readonly items: ReadonlyArray<PokemonVariant>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};
export const ListPokemon200 = Schema.Struct({
  items: Schema.Array(PokemonVariant).annotate({
    description: 'The items on the current page.',
  }),
  total: Schema.Number.annotate({
    description: 'Total number of items across all pages.',
    format: 'int32',
  }).check(Schema.isInt().annotate({ expected: 'an integer' })),
  page: Schema.Number.annotate({
    description: 'Zero-based page index.',
    format: 'int32',
  }).check(Schema.isInt().annotate({ expected: 'an integer' })),
  pageSize: Schema.Number.annotate({
    description: 'Number of items per page.',
    format: 'int32',
  }).check(Schema.isInt().annotate({ expected: 'an integer' })),
}).annotate({
  description: 'Paginated list wrapper used for collection endpoints.',
});
export type ListPokemon400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const ListPokemon400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type ListPokemondefault = ApiError;
export const ListPokemondefault = ApiError;
export type CreatePokemonRequestJson = CreatePokemonRequest;
export const CreatePokemonRequestJson = CreatePokemonRequest;
export type CreatePokemon201 = PokemonVariant;
export const CreatePokemon201 = PokemonVariant;
export type CreatePokemon400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const CreatePokemon400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type CreatePokemondefault = ApiError;
export const CreatePokemondefault = ApiError;
export type GetPokemonById200 = PokemonVariant;
export const GetPokemonById200 = PokemonVariant;
export type GetPokemonById400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const GetPokemonById400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type GetPokemonById404 = {
  readonly code: 'POKEMON_NOT_FOUND';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const GetPokemonById404 = Schema.Struct({
  code: Schema.Literal('POKEMON_NOT_FOUND').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type GetPokemonByIddefault = ApiError;
export const GetPokemonByIddefault = ApiError;
export type ReplacePokemonRequestJson = UpdatePokemonRequest;
export const ReplacePokemonRequestJson = UpdatePokemonRequest;
export type ReplacePokemon200 = PokemonVariant;
export const ReplacePokemon200 = PokemonVariant;
export type ReplacePokemon400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const ReplacePokemon400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type ReplacePokemon404 = {
  readonly code: 'POKEMON_NOT_FOUND';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const ReplacePokemon404 = Schema.Struct({
  code: Schema.Literal('POKEMON_NOT_FOUND').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type ReplacePokemondefault = ApiError;
export const ReplacePokemondefault = ApiError;
export type DeletePokemon400 = {
  readonly code: 'BAD_REQUEST';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const DeletePokemon400 = Schema.Struct({
  code: Schema.Literal('BAD_REQUEST').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type DeletePokemon404 = {
  readonly code: 'POKEMON_NOT_FOUND';
  readonly message: string;
  readonly details?: { readonly [x: string]: string };
};
export const DeletePokemon404 = Schema.Struct({
  code: Schema.Literal('POKEMON_NOT_FOUND').annotate({
    description: 'Machine-readable error code.',
  }),
  message: Schema.String.annotate({
    description: 'Human-readable error message.',
  }),
  details: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).annotate({
      description: 'Optional additional context about the error.',
    }),
  ),
}).annotate({
  description:
    'An `ApiError` whose `code` is fixed to the one this status uses.',
});
export type DeletePokemondefault = ApiError;
export const DeletePokemondefault = ApiError;

export interface OperationConfig {
  /**
   * Whether or not the response should be included in the value returned from
   * an operation.
   *
   * If set to `true`, a tuple of `[A, HttpClientResponse]` will be returned,
   * where `A` is the success type of the operation.
   *
   * If set to `false`, only the success type of the operation will be returned.
   */
  readonly includeResponse?: boolean | undefined;
}

/**
 * A utility type which optionally includes the response in the return result
 * of an operation based upon the value of the `includeResponse` configuration
 * option.
 */
export type WithOptionalResponse<
  A,
  Config extends OperationConfig,
> = Config extends {
  readonly includeResponse: true;
}
  ? [A, HttpClientResponse.HttpClientResponse]
  : A;

export const make = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?:
      | ((
          client: HttpClient.HttpClient,
        ) => Effect.Effect<HttpClient.HttpClient>)
      | undefined;
  } = {},
): PokedexClient => {
  const unexpectedStatus = (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.json, () => 'Unexpected status code'),
      (description) =>
        Effect.fail(
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.StatusCodeError({
              request: response.request,
              response,
              description:
                typeof description === 'string'
                  ? description
                  : JSON.stringify(description),
            }),
          }),
        ),
    );
  const withResponse =
    <Config extends OperationConfig>(config: Config | undefined) =>
    (
      f: (
        response: HttpClientResponse.HttpClientResponse,
      ) => Effect.Effect<any, any>,
    ): ((
      request: HttpClientRequest.HttpClientRequest,
    ) => Effect.Effect<any, any>) => {
      const withOptionalResponse = (
        config?.includeResponse
          ? (response: HttpClientResponse.HttpClientResponse) =>
              Effect.map(f(response), (a) => [a, response])
          : (response: HttpClientResponse.HttpClientResponse) => f(response)
      ) as any;
      return options?.transformClient
        ? (request) =>
            Effect.flatMap(
              Effect.flatMap(options.transformClient!(httpClient), (client) =>
                client.execute(request),
              ),
              withOptionalResponse,
            )
        : (request) =>
            Effect.flatMap(httpClient.execute(request), withOptionalResponse);
    };
  const decodeSuccess =
    <Schema extends Schema.Constraint>(schema: Schema) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      HttpClientResponse.schemaBodyJson(schema)(response);
  const decodeError =
    <const Tag extends string, Schema extends Schema.Constraint>(
      tag: Tag,
      schema: Schema,
    ) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(schema)(response),
        (cause) => Effect.fail(PokedexClientError(tag, cause, response)),
      );
  return {
    httpClient,
    healthCheck: (options) =>
      HttpClientRequest.get(`/health`).pipe(
        withResponse(options?.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(HealthCheck200),
            '400': decodeError('HealthCheck400', HealthCheck400),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    healthLiveness: (options) =>
      HttpClientRequest.get(`/health/live`).pipe(
        withResponse(options?.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(HealthLiveness200),
            '400': decodeError('HealthLiveness400', HealthLiveness400),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    healthReadiness: (options) =>
      HttpClientRequest.get(`/health/ready`).pipe(
        withResponse(options?.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(HealthReadiness200),
            '400': decodeError('HealthReadiness400', HealthReadiness400),
            '503': decodeError('HealthReadiness503', HealthReadiness503),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    listPokemon: (options) =>
      HttpClientRequest.get(`/pokemon`).pipe(
        HttpClientRequest.setUrlParams({
          page: options?.params?.['page'] as any,
          pageSize: options?.params?.['pageSize'] as any,
          classification: options?.params?.['classification'] as any,
          type: options?.params?.['type'] as any,
          search: options?.params?.['search'] as any,
          sortBy: options?.params?.['sortBy'] as any,
          sortOrder: options?.params?.['sortOrder'] as any,
        }),
        withResponse(options?.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(ListPokemon200),
            '400': decodeError('ListPokemon400', ListPokemon400),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    createPokemon: (options) =>
      HttpClientRequest.post(`/pokemon`).pipe(
        HttpClientRequest.bodyJsonUnsafe(options.payload),
        withResponse(options.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(CreatePokemon201),
            '400': decodeError('CreatePokemon400', CreatePokemon400),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    getPokemonById: (id, options) =>
      HttpClientRequest.get(`/pokemon/${id}`).pipe(
        withResponse(options?.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(GetPokemonById200),
            '400': decodeError('GetPokemonById400', GetPokemonById400),
            '404': decodeError('GetPokemonById404', GetPokemonById404),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    replacePokemon: (id, options) =>
      HttpClientRequest.put(`/pokemon/${id}`).pipe(
        HttpClientRequest.bodyJsonUnsafe(options.payload),
        withResponse(options.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(ReplacePokemon200),
            '400': decodeError('ReplacePokemon400', ReplacePokemon400),
            '404': decodeError('ReplacePokemon404', ReplacePokemon404),
            orElse: unexpectedStatus,
          }),
        ),
      ),
    deletePokemon: (id, options) =>
      HttpClientRequest.delete(`/pokemon/${id}`).pipe(
        withResponse(options?.config)(
          HttpClientResponse.matchStatus({
            '2xx': decodeSuccess(DeletePokemondefault),
            '400': decodeError('DeletePokemon400', DeletePokemon400),
            '404': decodeError('DeletePokemon404', DeletePokemon404),
            '204': () => Effect.void,
            orElse: unexpectedStatus,
          }),
        ),
      ),
  };
};

export interface PokedexClient {
  readonly httpClient: HttpClient.HttpClient;
  /**
   * Full health check with per-component breakdown.
   * Always returns 200 — inspect the `status` field for component state.
   */
  readonly healthCheck: <Config extends OperationConfig>(
    options: { readonly config?: Config | undefined } | undefined,
  ) => Effect.Effect<
    WithOptionalResponse<typeof HealthCheck200.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'HealthCheck400', typeof HealthCheck400.Type>
  >;
  /**
   * Kubernetes liveness probe.
   * Returns 200 as long as the process is running.
   */
  readonly healthLiveness: <Config extends OperationConfig>(
    options: { readonly config?: Config | undefined } | undefined,
  ) => Effect.Effect<
    WithOptionalResponse<typeof HealthLiveness200.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'HealthLiveness400', typeof HealthLiveness400.Type>
  >;
  /**
   * Kubernetes readiness probe.
   * Returns 200 only when the service is ready to accept traffic, and 503
   * with the same body when the aggregate component status is `unhealthy`.
   */
  readonly healthReadiness: <Config extends OperationConfig>(
    options: { readonly config?: Config | undefined } | undefined,
  ) => Effect.Effect<
    WithOptionalResponse<typeof HealthReadiness200.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'HealthReadiness400', typeof HealthReadiness400.Type>
    | PokedexClientError<'HealthReadiness503', typeof HealthReadiness503.Type>
  >;
  /**
   * List all Pokemon with optional filtering and pagination.
   */
  readonly listPokemon: <Config extends OperationConfig>(
    options:
      | {
          readonly params?: typeof ListPokemonParams.Encoded | undefined;
          readonly config?: Config | undefined;
        }
      | undefined,
  ) => Effect.Effect<
    WithOptionalResponse<typeof ListPokemon200.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'ListPokemon400', typeof ListPokemon400.Type>
  >;
  /**
   * Add a new Pokemon entry to the Pokedex.
   */
  readonly createPokemon: <Config extends OperationConfig>(options: {
    readonly payload: typeof CreatePokemonRequestJson.Encoded;
    readonly config?: Config | undefined;
  }) => Effect.Effect<
    WithOptionalResponse<typeof CreatePokemon201.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'CreatePokemon400', typeof CreatePokemon400.Type>
  >;
  /**
   * Get a single Pokemon by its national Pokedex number.
   *
   * The response body is a discriminated union — the shape depends on the
   * `classification` field: `"normal"`, `"legendary"`, or `"mythical"`.
   */
  readonly getPokemonById: <Config extends OperationConfig>(
    id: string,
    options: { readonly config?: Config | undefined } | undefined,
  ) => Effect.Effect<
    WithOptionalResponse<typeof GetPokemonById200.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'GetPokemonById400', typeof GetPokemonById400.Type>
    | PokedexClientError<'GetPokemonById404', typeof GetPokemonById404.Type>
  >;
  /**
   * Fully replace an existing Pokemon entry.
   */
  readonly replacePokemon: <Config extends OperationConfig>(
    id: string,
    options: {
      readonly payload: typeof ReplacePokemonRequestJson.Encoded;
      readonly config?: Config | undefined;
    },
  ) => Effect.Effect<
    WithOptionalResponse<typeof ReplacePokemon200.Type, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'ReplacePokemon400', typeof ReplacePokemon400.Type>
    | PokedexClientError<'ReplacePokemon404', typeof ReplacePokemon404.Type>
  >;
  /**
   * Remove a Pokemon entry from the Pokedex.
   */
  readonly deletePokemon: <Config extends OperationConfig>(
    id: string,
    options: { readonly config?: Config | undefined } | undefined,
  ) => Effect.Effect<
    WithOptionalResponse<typeof DeletePokemondefault.Type | void, Config>,
    | HttpClientError.HttpClientError
    | SchemaError
    | PokedexClientError<'DeletePokemon400', typeof DeletePokemon400.Type>
    | PokedexClientError<'DeletePokemon404', typeof DeletePokemon404.Type>
  >;
}

export interface PokedexClientError<Tag extends string, E> {
  readonly _tag: Tag;
  readonly request: HttpClientRequest.HttpClientRequest;
  readonly response: HttpClientResponse.HttpClientResponse;
  readonly cause: E;
}

class PokedexClientErrorImpl extends Data.Error<{
  _tag: string;
  cause: any;
  request: HttpClientRequest.HttpClientRequest;
  response: HttpClientResponse.HttpClientResponse;
}> {}

export const PokedexClientError = <Tag extends string, E>(
  tag: Tag,
  cause: E,
  response: HttpClientResponse.HttpClientResponse,
): PokedexClientError<Tag, E> =>
  new PokedexClientErrorImpl({
    _tag: tag,
    cause,
    response,
    request: response.request,
  }) as any;
