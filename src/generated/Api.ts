import * as Schema from 'effect/Schema';
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from 'effect/unstable/httpapi';
// non-recursive definitions
export type HealthResponse = {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly checkedAt: string;
  readonly version: string;
  readonly components: {
    readonly database: {
      readonly status: 'healthy' | 'degraded' | 'unhealthy';
      readonly message?: string;
      readonly latencyMs?: number;
    };
    readonly cache?: {
      readonly status: 'healthy' | 'degraded' | 'unhealthy';
      readonly message?: string;
      readonly latencyMs?: number;
    };
    readonly externalPokeApi?: {
      readonly status: 'healthy' | 'degraded' | 'unhealthy';
      readonly message?: string;
      readonly latencyMs?: number;
    };
  };
};
export const HealthResponse = Schema.Struct({
  status: Schema.Literals(['healthy', 'degraded', 'unhealthy']).annotate({
    description: 'Possible states a health check component can be in.',
  }),
  checkedAt: Schema.String.annotate({
    description: 'When this check was performed.',
    format: 'date-time',
  }),
  version: Schema.String.annotate({
    description: 'Application version string (e.g. "1.0.0").',
  }),
  components: Schema.Struct({
    database: Schema.Struct({
      status: Schema.Literals(['healthy', 'degraded', 'unhealthy']).annotate({
        description: 'Possible states a health check component can be in.',
      }),
      message: Schema.optionalKey(Schema.String),
      latencyMs: Schema.optionalKey(
        Schema.Number.annotate({
          description: 'Round-trip latency in milliseconds, if measurable.',
          format: 'int32',
        }).check(Schema.isInt().annotate({ expected: 'an integer' })),
      ),
    }).annotate({
      description: 'Health status of an individual dependency or subsystem.',
    }),
    cache: Schema.optionalKey(
      Schema.Struct({
        status: Schema.Literals(['healthy', 'degraded', 'unhealthy']).annotate({
          description: 'Possible states a health check component can be in.',
        }),
        message: Schema.optionalKey(Schema.String),
        latencyMs: Schema.optionalKey(
          Schema.Number.annotate({
            description: 'Round-trip latency in milliseconds, if measurable.',
            format: 'int32',
          }).check(Schema.isInt().annotate({ expected: 'an integer' })),
        ),
      }).annotate({
        description: 'Health status of an individual dependency or subsystem.',
      }),
    ),
    externalPokeApi: Schema.optionalKey(
      Schema.Struct({
        status: Schema.Literals(['healthy', 'degraded', 'unhealthy']).annotate({
          description: 'Possible states a health check component can be in.',
        }),
        message: Schema.optionalKey(Schema.String),
        latencyMs: Schema.optionalKey(
          Schema.Number.annotate({
            description: 'Round-trip latency in milliseconds, if measurable.',
            format: 'int32',
          }).check(Schema.isInt().annotate({ expected: 'an integer' })),
        ),
      }).annotate({
        description: 'Health status of an individual dependency or subsystem.',
      }),
    ),
  }).annotate({ description: 'Per-component health details.' }),
}).annotate({
  description: 'Response body for health check endpoints.',
  identifier: 'HealthResponse',
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
export type PokemonVariant =
  | {
      readonly id: number;
      readonly name: string;
      readonly primaryType:
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
      readonly secondaryType?:
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
      readonly baseStats: {
        readonly hp: number;
        readonly attack: number;
        readonly defense: number;
        readonly specialAttack: number;
        readonly specialDefense: number;
        readonly speed: number;
      };
      readonly heightMetres: number;
      readonly weightKg: number;
      readonly isObtainable: boolean;
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly classification: 'normal';
      readonly encounterRate: number;
      readonly evolvesInto?: ReadonlyArray<number>;
    }
  | {
      readonly id: number;
      readonly name: string;
      readonly primaryType:
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
      readonly secondaryType?:
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
      readonly baseStats: {
        readonly hp: number;
        readonly attack: number;
        readonly defense: number;
        readonly specialAttack: number;
        readonly specialDefense: number;
        readonly speed: number;
      };
      readonly heightMetres: number;
      readonly weightKg: number;
      readonly isObtainable: boolean;
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly classification: 'legendary';
      readonly legendaryGroup: string;
      readonly isBoxLegendary: boolean;
      readonly mascotForGames?: ReadonlyArray<string>;
    }
  | {
      readonly id: number;
      readonly name: string;
      readonly primaryType:
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
      readonly secondaryType?:
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
      readonly baseStats: {
        readonly hp: number;
        readonly attack: number;
        readonly defense: number;
        readonly specialAttack: number;
        readonly specialDefense: number;
        readonly speed: number;
      };
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
export const PokemonVariant = Schema.Union([
  Schema.Struct({
    id: Schema.Number.annotate({
      description: 'National Pokedex number (e.g. 1 for Bulbasaur).',
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
    primaryType: Schema.Literals([
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
    ]).annotate({ description: 'Pokemon elemental type.' }),
    secondaryType: Schema.optionalKey(
      Schema.Literals([
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
      ]).annotate({ description: 'Pokemon elemental type.' }),
    ),
    baseStats: Schema.Struct({
      hp: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      attack: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      defense: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      specialAttack: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      specialDefense: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      speed: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
    }).annotate({ description: 'Six base stats shared by every Pokemon.' }),
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
    description:
      'A regular, catchable Pokemon with no special legendary status.',
  }),
  Schema.Struct({
    id: Schema.Number.annotate({
      description: 'National Pokedex number (e.g. 1 for Bulbasaur).',
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
    primaryType: Schema.Literals([
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
    ]).annotate({ description: 'Pokemon elemental type.' }),
    secondaryType: Schema.optionalKey(
      Schema.Literals([
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
      ]).annotate({ description: 'Pokemon elemental type.' }),
    ),
    baseStats: Schema.Struct({
      hp: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      attack: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      defense: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      specialAttack: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      specialDefense: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      speed: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
    }).annotate({ description: 'Six base stats shared by every Pokemon.' }),
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
  }),
  Schema.Struct({
    id: Schema.Number.annotate({
      description: 'National Pokedex number (e.g. 1 for Bulbasaur).',
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
    primaryType: Schema.Literals([
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
    ]).annotate({ description: 'Pokemon elemental type.' }),
    secondaryType: Schema.optionalKey(
      Schema.Literals([
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
      ]).annotate({ description: 'Pokemon elemental type.' }),
    ),
    baseStats: Schema.Struct({
      hp: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      attack: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      defense: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      specialAttack: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      specialDefense: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
      speed: Schema.Number.annotate({ format: 'int32' }).check(
        Schema.isInt().annotate({ expected: 'an integer' }),
      ),
    }).annotate({ description: 'Six base stats shared by every Pokemon.' }),
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
  }),
]).annotate({
  description:
    'Discriminated union of all concrete Pokemon classifications.\nUsed as the return type for Pokedex operations — emits an `anyOf` of the\nthree self-contained variant schemas, discriminated on `classification`.',
  identifier: 'PokemonVariant',
});
export type CreatePokemonRequest = {
  readonly name: string;
  readonly primaryType:
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
  readonly secondaryType?:
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
  readonly baseStats: {
    readonly hp: number;
    readonly attack: number;
    readonly defense: number;
    readonly specialAttack: number;
    readonly specialDefense: number;
    readonly speed: number;
  };
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly classification: 'normal' | 'legendary' | 'mythical';
};
export const CreatePokemonRequest = Schema.Struct({
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: 'a value with a length of at least 1',
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: 'a value with a length of at most 100',
    }),
  ),
  primaryType: Schema.Literals([
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
  ]).annotate({ description: 'Pokemon elemental type.' }),
  secondaryType: Schema.optionalKey(
    Schema.Literals([
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
    ]).annotate({ description: 'Pokemon elemental type.' }),
  ),
  baseStats: Schema.Struct({
    hp: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    attack: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    defense: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    specialAttack: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    specialDefense: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    speed: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
  }).annotate({ description: 'Six base stats shared by every Pokemon.' }),
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
  classification: Schema.Literals(['normal', 'legendary', 'mythical']).annotate(
    {
      description:
        'Pokemon classification used when creating or filtering Pokemon.',
    },
  ),
}).annotate({
  description: 'Payload for creating a new Pokemon entry.',
  identifier: 'CreatePokemonRequest',
});
export type UpdatePokemonRequest = {
  readonly name: string;
  readonly primaryType:
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
  readonly secondaryType?:
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
  readonly baseStats: {
    readonly hp: number;
    readonly attack: number;
    readonly defense: number;
    readonly specialAttack: number;
    readonly specialDefense: number;
    readonly speed: number;
  };
  readonly heightMetres: number;
  readonly weightKg: number;
  readonly isObtainable: boolean;
  readonly classification: 'normal' | 'legendary' | 'mythical';
};
export const UpdatePokemonRequest = Schema.Struct({
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: 'a value with a length of at least 1',
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: 'a value with a length of at most 100',
    }),
  ),
  primaryType: Schema.Literals([
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
  ]).annotate({ description: 'Pokemon elemental type.' }),
  secondaryType: Schema.optionalKey(
    Schema.Literals([
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
    ]).annotate({ description: 'Pokemon elemental type.' }),
  ),
  baseStats: Schema.Struct({
    hp: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    attack: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    defense: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    specialAttack: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    specialDefense: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
    speed: Schema.Number.annotate({ format: 'int32' }).check(
      Schema.isInt().annotate({ expected: 'an integer' }),
    ),
  }).annotate({ description: 'Six base stats shared by every Pokemon.' }),
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
  classification: Schema.Literals(['normal', 'legendary', 'mythical']).annotate(
    {
      description:
        'Pokemon classification used when creating or filtering Pokemon.',
    },
  ),
}).annotate({
  description: 'Payload for fully replacing an existing Pokemon entry.',
  identifier: 'UpdatePokemonRequest',
});
// schemas
export type HealthCheck200 = HealthResponse;
export const HealthCheck200 = HealthResponse;
export type HealthCheckdefault = ApiError;
export const HealthCheckdefault = ApiError;
export type HealthLiveness200 = LivenessResponse;
export const HealthLiveness200 = LivenessResponse;
export type HealthLivenessdefault = ApiError;
export const HealthLivenessdefault = ApiError;
export type HealthReadiness200 = HealthResponse;
export const HealthReadiness200 = HealthResponse;
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
export type ListPokemonQuery = {
  readonly page?: number;
  readonly pageSize?: number;
  readonly classification?: PokemonClassification;
  readonly type?: PokemonType;
  readonly search?: string;
  readonly sortBy?: 'id' | 'name' | 'createdAt';
  readonly sortOrder?: 'asc' | 'desc';
};
export const ListPokemonQuery = Schema.Struct({
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
export type ListPokemondefault = ApiError;
export const ListPokemondefault = ApiError;
export type CreatePokemonRequestJson = CreatePokemonRequest;
export const CreatePokemonRequestJson = CreatePokemonRequest;
export type CreatePokemon201 = PokemonVariant;
export const CreatePokemon201 = PokemonVariant;
export type CreatePokemondefault = ApiError;
export const CreatePokemondefault = ApiError;
export type GetPokemonByIdPathParams = { readonly id: number };
export const GetPokemonByIdPathParams = Schema.Struct({
  id: Schema.Number.annotate({ format: 'int32' })
    .check(Schema.isInt().annotate({ expected: 'an integer' }))
    .check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: 'a value greater than or equal to 1',
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(1025).annotate({
        expected: 'a value less than or equal to 1025',
      }),
    ),
});
export type GetPokemonById200 = PokemonVariant;
export const GetPokemonById200 = PokemonVariant;
export type GetPokemonByIddefault = ApiError;
export const GetPokemonByIddefault = ApiError;
export type ReplacePokemonPathParams = { readonly id: number };
export const ReplacePokemonPathParams = Schema.Struct({
  id: Schema.Number.annotate({ format: 'int32' }).check(
    Schema.isInt().annotate({ expected: 'an integer' }),
  ),
});
export type ReplacePokemonRequestJson = UpdatePokemonRequest;
export const ReplacePokemonRequestJson = UpdatePokemonRequest;
export type ReplacePokemon200 = PokemonVariant;
export const ReplacePokemon200 = PokemonVariant;
export type ReplacePokemondefault = ApiError;
export const ReplacePokemondefault = ApiError;
export type DeletePokemonPathParams = { readonly id: number };
export const DeletePokemonPathParams = Schema.Struct({
  id: Schema.Number.annotate({ format: 'int32' }).check(
    Schema.isInt().annotate({ expected: 'an integer' }),
  ),
});
export type DeletePokemondefault = ApiError;
export const DeletePokemondefault = ApiError;

class HealthGroup extends HttpApiGroup.make('Health').add(
  HttpApiEndpoint.get('healthCheck', '/health', {
    success: HealthCheck200,
    error: HealthCheckdefault,
  })
    .annotate(OpenApi.Identifier, 'healthCheck')
    .annotate(OpenApi.Summary, 'Full health check')
    .annotate(
      OpenApi.Description,
      'Full health check with per-component breakdown.\nAlways returns 200 — inspect the `status` field for component state.',
    ),
  HttpApiEndpoint.get('healthLiveness', '/health/live', {
    success: HealthLiveness200,
    error: HealthLivenessdefault,
  })
    .annotate(OpenApi.Identifier, 'healthLiveness')
    .annotate(OpenApi.Summary, 'Liveness probe')
    .annotate(
      OpenApi.Description,
      'Kubernetes liveness probe.\nReturns 200 as long as the process is running.',
    ),
  HttpApiEndpoint.get('healthReadiness', '/health/ready', {
    success: HealthReadiness200,
    error: HealthReadinessdefault,
  })
    .annotate(OpenApi.Identifier, 'healthReadiness')
    .annotate(OpenApi.Summary, 'Readiness probe')
    .annotate(
      OpenApi.Description,
      'Kubernetes readiness probe.\nReturns 200 only when the service is ready to accept traffic\n(i.e. the database connection is available).',
    ),
) {}

class PokedexGroup extends HttpApiGroup.make('Pokedex').add(
  HttpApiEndpoint.get('listPokemon', '/pokemon', {
    query: ListPokemonQuery,
    success: ListPokemon200,
    error: ListPokemondefault,
  })
    .annotate(OpenApi.Identifier, 'listPokemon')
    .annotate(OpenApi.Summary, 'List Pokemon')
    .annotate(
      OpenApi.Description,
      'List all Pokemon with optional filtering and pagination.',
    ),
  HttpApiEndpoint.post('createPokemon', '/pokemon', {
    payload: CreatePokemonRequestJson,
    success: CreatePokemon201.pipe(HttpApiSchema.status(201)),
    error: CreatePokemondefault,
  })
    .annotate(OpenApi.Identifier, 'createPokemon')
    .annotate(OpenApi.Summary, 'Create Pokemon')
    .annotate(OpenApi.Description, 'Add a new Pokemon entry to the Pokedex.'),
  HttpApiEndpoint.get('getPokemonById', '/pokemon/:id', {
    params: GetPokemonByIdPathParams,
    success: GetPokemonById200,
    error: [HttpApiSchema.Empty(404), GetPokemonByIddefault],
  })
    .annotate(OpenApi.Identifier, 'getPokemonById')
    .annotate(OpenApi.Summary, 'Get Pokemon by ID')
    .annotate(
      OpenApi.Description,
      'Get a single Pokemon by its national Pokedex number.\n\nThe response body is a discriminated union — the shape depends on the\n`classification` field: `"normal"`, `"legendary"`, or `"mythical"`.',
    ),
  HttpApiEndpoint.put('replacePokemon', '/pokemon/:id', {
    params: ReplacePokemonPathParams,
    payload: ReplacePokemonRequestJson,
    success: ReplacePokemon200,
    error: [HttpApiSchema.Empty(404), ReplacePokemondefault],
  })
    .annotate(OpenApi.Identifier, 'replacePokemon')
    .annotate(OpenApi.Summary, 'Replace Pokemon')
    .annotate(OpenApi.Description, 'Fully replace an existing Pokemon entry.'),
  HttpApiEndpoint.delete('deletePokemon', '/pokemon/:id', {
    params: DeletePokemonPathParams,
    success: HttpApiSchema.Empty(204),
    error: [HttpApiSchema.Empty(404), DeletePokemondefault],
  })
    .annotate(OpenApi.Identifier, 'deletePokemon')
    .annotate(OpenApi.Summary, 'Delete Pokemon')
    .annotate(OpenApi.Description, 'Remove a Pokemon entry from the Pokedex.'),
) {}

export class PokedexApi extends HttpApi.make('PokedexApi')
  .annotate(OpenApi.Title, 'Nest Pokemon API')
  .annotate(OpenApi.Version, '1.0.0')
  .annotate(OpenApi.License, { name: 'UNLICENSED' })
  .annotate(OpenApi.Servers, [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
      variables: {},
    },
  ])
  .add(HealthGroup, PokedexGroup) {}
