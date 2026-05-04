import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

import "./models/common.tsp";
import "./models/pokemon.tsp";
import "./health.tsp";
import "./pokedex.tsp";
import "./battle.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Nest Pokemon API" })
@server("http://localhost:3000", "Local development server")
@info(#{
  version: "1.0.0",
  contact: #{
    name: "Craftzing",
    url: "https://craftzing.com",
  },
  license: #{
    name: "UNLICENSED",
  },
})
namespace NestPokemon;
