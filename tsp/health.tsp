import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace NestPokemon;

/** Possible states a health check component can be in. */
enum HealthStatus {
  Healthy: "healthy",
  Degraded: "degraded",
  Unhealthy: "unhealthy",
}

/** Health status of an individual dependency or subsystem. */
model ComponentHealth {
  status: HealthStatus;
  message?: string;

  /** Round-trip latency in milliseconds, if measurable. */
  latencyMs?: int32;
}

/** Response body for health check endpoints. */
model HealthResponse {
  /** Aggregate status — the worst status across all components. */
  status: HealthStatus;

  /** When this check was performed. */
  checkedAt: utcDateTime;

  /** Application version string (e.g. "1.0.0"). */
  version: string;

  /** Per-component health details. */
  components: {
    database: ComponentHealth;
    cache?: ComponentHealth;
    externalPokeApi?: ComponentHealth;
  };
}

/**
 * Readiness answers 503 with the same body when the aggregate status is
 * `unhealthy` — decision D3 in the hardening plan. The body is a full
 * `HealthResponse`, so a probe that fails still says which component failed.
 */
@doc("The service is not ready to accept traffic.")
@error
model ServiceUnavailableHealth {
  @statusCode statusCode: 503;
  @body body: HealthResponse;
}

/** Liveness probe response — confirms the process is running. */
model LivenessResponse {
  status: "ok";

  /** Process uptime in seconds. */
  uptime: float64;
}

@tag("Health")
@route("/health")
interface HealthController {
  /**
   * Full health check with per-component breakdown.
   * Always returns 200 — inspect the `status` field for component state.
   */
  @get
  @summary("Full health check")
  @operationId("healthCheck")
  check(): OkResponse & Body<HealthResponse> | BadRequestApiError | ApiError;

  /**
   * Kubernetes liveness probe.
   * Returns 200 as long as the process is running.
   */
  @get
  @route("/live")
  @summary("Liveness probe")
  @operationId("healthLiveness")
  liveness(): OkResponse & Body<LivenessResponse> | BadRequestApiError | ApiError;

  /**
   * Kubernetes readiness probe.
   * Returns 200 only when the service is ready to accept traffic, and 503
   * with the same body when the aggregate component status is `unhealthy`.
   */
  @get
  @route("/ready")
  @summary("Readiness probe")
  @operationId("healthReadiness")
  readiness(): OkResponse & Body<HealthResponse> | BadRequestApiError | ServiceUnavailableHealth | ApiError;
}
