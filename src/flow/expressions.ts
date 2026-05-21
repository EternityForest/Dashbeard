/**
 * Expression evaluation for the flow graph engine.
 * Uses safe-expr-eval for expression parsing with a predefined set of functions.
 */

import { evaluate as safeEvaluate } from 'safe-expr-eval';
import type { PortData } from './data-types';

/**
 * Context passed to evaluate() containing node graph and current evaluation state.
 */
export interface EvaluationContext {
  /** The node graph instance for port lookups */
  nodeGraph: {
    getNode(nodeId: string): unknown;
  };
  /** Current node ID being evaluated */
  currentNodeId?: string;
  /** Optional cache for resolved port data */
  portCache?: Map<string, PortData>;
}

/**
 * Get the predefined functions for expression evaluation.
 * Includes math, string, logic, type functions, and port() lookup.
 *
 * @param context Evaluation context for resolving port references
 */
export function getPredefinedFunctions(context: EvaluationContext) {
  return {
    // Math functions
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    min: (...args: number[]) => Math.min(...args),
    max: (...args: number[]) => Math.max(...args),
    pow: Math.pow,
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    exp: Math.exp,
    PI: Math.PI,
    E: Math.E,

    // String functions
    length: (s: unknown) => (s === null ? 0 : String(s).length),
    upper: (s: unknown) => String(s).toUpperCase(),
    lower: (s: unknown) => String(s).toLowerCase(),
    trim: (s: unknown) => String(s).trim(),
    slice: (s: unknown, start?: number, end?: number) =>
      String(s).slice(start, end),
    replace: (s: unknown, find: string, repl: string) =>
      String(s).split(find).join(repl),
    split: (s: unknown, sep: string) => String(s).split(sep),
    join: (arr: unknown[], sep: string) => Array(arr).join(sep),

    // Logic functions
    if: (cond: unknown, then: unknown, else_: unknown) =>
      cond ? then : else_,
    and: (...args: unknown[]) => args.every(Boolean),
    or: (...args: unknown[]) => args.some(Boolean),
    not: (v: unknown) => !v,

    // Type functions
    typeOf: (v: unknown) => typeof v,
    isNull: (v: unknown) => v === null || v === undefined,
    isNumber: (v: unknown) => typeof v === 'number' && Number.isNaN(v),
    isString: (v: unknown) => typeof v === 'string',
    isBoolean: (v: unknown) => typeof v === 'boolean',
    toNumber: (v: unknown) => Number(v),
    toString: (v: unknown) => String(v),
    toBoolean: (v: unknown) => Boolean(v),

    // port() function - get PortData from node graph
    port: (portRef: string): PortData | null => {
      const [nodeId, portName] = portRef.split('.');
      if (!nodeId || !portName) {
        return null;
      }

      const node = context.nodeGraph.getNode(nodeId);
      if (!node) {
        return null;
      }

      // Try to get from output ports first
      const outputPort = (
        node as {
          outputPorts?: Map<string, { getData(): PortData }>;
        }
      ).outputPorts?.get(portName);
      if (outputPort?.getData) {
        return outputPort.getData();
      }

      // Try input ports
      const inputPort = (
        node as {
          inputPorts?: Map<string, { getData(): PortData }>;
        }
      ).inputPorts?.get(portName);
      if (inputPort?.getData) {
        return inputPort.getData();
      }

      return null;
    },

    // Date/time functions
    now: () => Date.now(),
    date: () => new Date().toISOString().split('T')[0],
    time: () => new Date().toTimeString().split(' ')[0],

    // Array/object helpers
    has: (obj: unknown, key: string) => {
      if (typeof obj === 'object' && obj !== null) {
        return key in obj;
      }
      return false;
    },
    get: (obj: unknown, key: string) => {
      if (typeof obj === 'object' && obj !== null) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    },
  };
}

/**
 * Evaluate an input value that may be an expression.
 *
 * If the input is not a string or doesn't start with '=',
 * the input is returned unchanged.
 *
 * If it starts with '=', the expression is evaluated using
 * safe-expr-eval with predefined math, string, logic, and
 * type functions, plus a port("nodeId.portName") function
 * to retrieve PortData.
 *
 * @param input The input to evaluate
 * @param context Evaluation context with node graph reference
 * @returns The evaluated result or original input
 */
export function evaluate(
  input: unknown,
  context: EvaluationContext
): unknown {
  // Pass through if not a string or doesn't start with =
  if (typeof input !== 'string' || !input.startsWith('=')) {
    return input;
  }

  // Remove the = prefix and trim
  const expression = input.slice(1).trim();

  // Empty expression after =, return as-is
  if (!expression) {
    return input;
  }

  try {
    return safeEvaluate(expression, getPredefinedFunctions(context));
  } catch (error) {
    // On evaluation error, return original input
    console.warn('Expression evaluation error:', error);
    return input;
  }
}