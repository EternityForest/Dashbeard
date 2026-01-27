/**
 * Core data types for the data flow engine.
 */

/**
 * Represents a single piece of data flowing through the binding system.
 * All data is wrapped in this type to preserve metadata.
 */
export interface PortData {
  /** The actual value */
  value: unknown;

  /** Unix timestamp (ms) when value was created */
  timestamp: number;

  /** Optional metadata about the value */
  annotation?: Record<string, unknown>;
}

/**
 * Create a new PortData tuple.
 *
 * @param value The data value
 * @param timestamp Optional timestamp (defaults to now)
 * @param annotation Optional metadata
 */
export function createPortData(
  value: unknown,
  timestamp?: number,
  annotation?: Record<string, unknown>
): PortData {
  return {
    value,
    timestamp: timestamp ?? Date.now(),
    annotation,
  };
}
