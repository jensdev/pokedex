export const CLOCK_TOKEN = Symbol('CLOCK_TOKEN');

/**
 * Domain port for the current time. Entities never call `new Date()`
 * themselves — the application layer reads the clock and passes timestamps
 * in, keeping the domain deterministic and trivially testable.
 */
export interface Clock {
  /** Current instant as an ISO 8601 string. */
  now(): string;
}
