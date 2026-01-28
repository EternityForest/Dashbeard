/**
 * Built-in filters for common data transformations.
 */

import { FilterManifest } from '../filter';
import type { FilterRegistry } from '../filter';
/**
 * Invert filter: logical NOT (returns 1 if input is 0, else 0).
 */
export const invertFilter: FilterManifest = {
  type: 'invert',
  displayName: 'Invert',
  description: 'Logical NOT: returns 1 if input is 0, else 0',
  configSchema: { type: 'object', properties: {} },
  outputType: 'number',
  createPorts(upstreamType: string) {
    return {
      input: { name: 'input', type: upstreamType },
      output: { name: 'output', type: 'number' },
    };
  },
};

/**
 * Add filter: adds a configurable value to input.
 */
export const addFilter: FilterManifest = {
  type: 'add',
  displayName: 'Add',
  description: 'Adds a configurable value to input',
  configSchema: {
    type: 'object',
    properties: {
      value: {
        type: 'number',
        default: 0,
        description: 'Value to add',
      },
    },
  },
  staticPorts: {
    inputs: [
      {
        name: 'operand',
        type: 'number',
        description: 'Additional value to add (dynamic)',
      },
    ],
  },
  createPorts(upstreamType: string) {
    return {
      input: { name: 'input', type: upstreamType },
      output: { name: 'output', type: upstreamType },
    };
  },
};

/**
 * Multiply filter: scales input by a factor.
 */
export const multiplyFilter: FilterManifest = {
  type: 'multiply',
  displayName: 'Multiply',
  description: 'Scales input by a configurable factor',
  configSchema: {
    type: 'object',
    properties: {
      factor: {
        type: 'number',
        default: 1,
        description: 'Multiplication factor',
      },
    },
  },
  staticPorts: {
    inputs: [
      {
        name: 'factor',
        type: 'number',
        description: 'Dynamic multiplication factor',
      },
    ],
  },
  createPorts(upstreamType: string) {
    return {
      input: { name: 'input', type: upstreamType },
      output: { name: 'output', type: upstreamType },
    };
  },
};

/**
 * ClampRange filter: constrains value within bounds.
 */
export const clampRangeFilter: FilterManifest = {
  type: 'clampRange',
  displayName: 'Clamp Range',
  description: 'Constrains value within min and max bounds',
  configSchema: {
    type: 'object',
    properties: {
      min: {
        type: 'number',
        default: 0,
        description: 'Minimum value',
      },
      max: {
        type: 'number',
        default: 100,
        description: 'Maximum value',
      },
    },
    required: ['min', 'max'],
  },
  createPorts(upstreamType: string) {
    return {
      input: { name: 'input', type: upstreamType },
      output: { name: 'output', type: upstreamType },
    };
  },
};

/**
 * If filter: conditional passthrough.
 * Passes data only if a condition port meets criteria.
 */
export const ifFilter: FilterManifest = {
  type: 'if',
  displayName: 'Conditional',
  description: 'Passes data only if condition meets criteria',
  configSchema: {
    type: 'object',
    properties: {
      condition: {
        type: 'string',
        enum: ['nonzero', 'positive', 'negative'],
        default: 'nonzero',
        description: 'Condition type',
      },
    },
    required: ['condition'],
  },
  staticPorts: {
    inputs: [
      {
        name: 'condition',
        type: 'number',
        description: 'Condition value to check',
      },
    ],
  },
  createPorts(upstreamType: string) {
    return {
      input: { name: 'input', type: upstreamType },
      output: { name: 'output', type: upstreamType },
    };
  },
};

/**
 * Lowpass filter: smooths input values over time.
 * Produces a stream of filtered values.
 */
export const lowpassFilter: FilterManifest = {
  type: 'lowpass',
  displayName: 'Low-pass Filter',
  description: 'Smooths values using exponential moving average',
  configSchema: {
    type: 'object',
    properties: {
      alpha: {
        type: 'number',
        default: 0.3,
        description: 'Smoothing factor (0-1, lower = more smoothing)',
      },
    },
    required: ['alpha'],
  },
  createPorts(upstreamType: string) {
    return {
      input: { name: 'input', type: upstreamType },
      output: { name: 'output', type: upstreamType },
    };
  },
};

/**
 * Offset filter: bidirectional offset/subtract.
 * Input → output: adds configured value
 * Output → input: subtracts configured value
 * Useful for coordinate systems, thresholds, etc.
 */
export const offsetFilter: FilterManifest = {
  type: 'offset',
  displayName: 'Offset',
  description: 'Bidirectional offset (add going forward, subtract going backward)',
  configSchema: {
    type: 'object',
    properties: {
      value: {
        type: 'number',
        default: 0,
        description: 'Offset value to add/subtract',
      },
    },
    required: ['value'],
  },
  staticPorts: {
    inputs: [
      {
        name: 'offset',
        type: 'number',
        description: 'Dynamic offset value',
      },
    ],
  },
  createPorts(upstreamType: string) {
    // Only works with numbers
    if (upstreamType !== 'number' && upstreamType !== 'any') {
      throw new Error(`Offset filter only works with number type, got: ${upstreamType}`);
    }
    return {
      input: { name: 'input', type: 'number' },
      output: { name: 'output', type: 'number' },
    };
  },
};

/**
 * Register all built-in filters.
 */
export function registerBuiltInFilters(filterRegistry: FilterRegistry): void {
  filterRegistry.register(invertFilter);
  filterRegistry.register(addFilter);
  filterRegistry.register(multiplyFilter);
  filterRegistry.register(clampRangeFilter);
  filterRegistry.register(ifFilter);
  filterRegistry.register(lowpassFilter);
  filterRegistry.register(offsetFilter);
}
