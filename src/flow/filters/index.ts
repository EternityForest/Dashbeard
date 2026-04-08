/**
 * Built-in filters for common data transformations.
 */
import type { PortSchema } from '../port'

import { FilterManifest, FilterImplementation } from '../filter';
import { filterRegistry } from '../filter';

/**
 * Invert filter implementation: logical NOT
 */
class InvertImplementation extends FilterImplementation {
  filterInput(inputValue: unknown): unknown {
    const num = Number(inputValue) || 0;
    return num === 0 ? 1 : 0;
  }

  filterOutput(outputValue: unknown): unknown {
    const num = Number(outputValue) || 0;
    return num === 0 ? 1 : 0;
  }
}

/**
 * Add filter implementation: adds config value to input
 */
class AddImplementation extends FilterImplementation {
  filterInput(inputValue: unknown): unknown {
    const num = Number(inputValue) || 0;
    const value = Number(this.config.value) || 0;
    return num + value;
  }
  filterOutput(outputValue: unknown): unknown {
    const num = Number(outputValue) || 0;
    const value = Number(this.config.value) || 0;
    return num - value;
  }
}

/**
 * Multiply filter implementation: scales input by factor
 */
class MultiplyImplementation extends FilterImplementation {
  filterInput(inputValue: unknown): unknown {
    const num = Number(inputValue) || 0;
    const factor = Number(this.config.factor) || 1;
    return num * factor;
  }
  filterOutput(outputValue: unknown): unknown {
    const num = Number(outputValue) || 0;
    const factor = Number(this.config.factor) || 1;
    return num / factor;
  }
}

/**
 * Clamp filter implementation: constrains value within bounds
 */
class ClampRangeImplementation extends FilterImplementation {
  filterInput(inputValue: unknown): unknown {
    const num = Number(inputValue) || 0;
    const min = Number(this.config.min) ?? 0;
    const max = Number(this.config.max) ?? 100;
    return Math.max(min, Math.min(max, num));
  }

  filterOutput(outputValue: unknown): unknown {
    return this.filterInput(outputValue);
  }
}


/**
 * Lowpass filter implementation: exponential moving average
 */
class LowpassImplementation extends FilterImplementation {
  private lastValue: unknown = null;
  private initialized = false;

  filterInput(inputValue: unknown): unknown {
    if (!this.initialized) {
      this.lastValue = inputValue;
      this.initialized = true;
      return inputValue;
    }

    const alpha = Number(this.config.alpha) || 0.3;
    const currentNum = Number(inputValue) || 0;
    const lastNum = Number(this.lastValue) || 0;

    this.lastValue = lastNum * (1 - alpha) + currentNum * alpha;
    return this.lastValue;
  }

}


/**
 * Invert filter: logical NOT (returns 1 if input is 0, else 0).
 */
export const invertFilter: FilterManifest = {
  type: 'invert',
  displayName: 'Invert',
  description: 'Logical NOT: returns 1 if input is 0, else 0',
  configSchema: { type: 'object', properties: {} },
  outputType: 'number',
  createPorts(upstreamType: PortSchema) {
    return {
      input: upstreamType,
      output: upstreamType,
    };
  },
  createImplementation(config: Record<string, unknown>) {
    return new InvertImplementation(config);
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
  createPorts(upstreamType: PortSchema) {
    return {
      input: upstreamType,
      output: upstreamType,
    };
  },
  createImplementation(config: Record<string, unknown>) {
    return new AddImplementation(config);
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
  createPorts(upstreamType: PortSchema, config:Record<string, unknown>) {
    const os = structuredClone(upstreamType);
    if(os.min != undefined){
      os.min = os.min as number * (config.factor as number)
    }

    if(os.max != undefined){
      os.max = os.max as number * (config.factor as number)
    }

    return {
      input: upstreamType,
      output: os,
    };
  },
  createImplementation(config: Record<string, unknown>) {
    return new MultiplyImplementation(config);
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
  createPorts(upstreamType: PortSchema, config:Record<string, unknown>) {
    const os = structuredClone(upstreamType);
    os.min = config.min as number;
    os.max = config.max as number;
    return {
      input: upstreamType,
      output: os,
    };
  },
  createImplementation(config: Record<string, unknown>) {
    return new ClampRangeImplementation(config);
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
  createPorts(upstreamType: PortSchema, config:Record<string, unknown>) {
    const os = structuredClone(upstreamType);
    os.min = config.min as number;
    os.max = config.max as number;
    return {
      input: upstreamType,
      output: os,
    };
  },
  createImplementation(config: Record<string, unknown>) {
    return new LowpassImplementation(config);
  },
};


filterRegistry.register(invertFilter);
filterRegistry.register(addFilter);
filterRegistry.register(multiplyFilter);
filterRegistry.register(clampRangeFilter);
filterRegistry.register(lowpassFilter);
