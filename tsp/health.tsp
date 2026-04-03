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
  check(): OkResponse & Body<HealthResponse> | ApiError;

  /**
   * Kubernetes liveness probe.
   * Returns 200 as long as the process is running.
   */
  @get
  @route("/live")
  @summary("Liveness probe")
  @operationId("healthLiveness")
  liveness(): OkResponse & Body<LivenessResponse> | ApiError;

  /**
   * Kubernetes readiness probe.
   * Returns 200 only when the service is ready to accept traffic
   * (i.e. the database connection is available).
   */
  @get
  @route("/ready")
  @summary("Readiness probe")
  @operationId("healthReadiness")
  readiness(): OkResponse & Body<HealthResponse> | ApiError;
}
