/**
 * Editor type definitions.
 * Re-exports types from board-types for single unified
 * format. No duplicate types - uses canonical definitions
 * from @/boards/board-types.
 */

// Re-export board types (canonical source of truth)
import type {
  ComponentConfig,
  BindingDefinition,
  BoardDefinition,
} from '@/boards/board-types';
export type {
  ComponentConfig as Component,
  BindingDefinition,
  BoardDefinition,
}
/**
 * JSON Schema subset for component configuration.
 * Supports types, enums, defaults, numeric constraints, and descriptions.
 */
export interface ConfigSchema {
  type?:
    | 'object'
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | string[];
  properties?: Record<string, ConfigSchema>;
  required?: string[];
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  description?: string;
  items?: ConfigSchema;
  format?: string;
  pattern?: string;
  fileFilter?: string;
  [key: string]: unknown;
}

/**
 * Port direction and type information.
 */
export interface PortSchema {
  name: string;
  direction: 'input' | 'output';
  type: string;
  description?: string;
}

/**
 * Component type metadata and schema.
 * Describes what properties a component can have and its ports.
 * This should be defined on the component itself.
 */
export interface ComponentTypeSchema {
  name: string;
  displayName: string;
  category:
    | 'layout'
    | 'input'
    | 'display'
    | 'logic'
    | 'data';
  description?: string;
  icon?: string;
  configSchema: ConfigSchema;
}

/**
 * Storage backend abstraction.
 * Different implementations can persist boards in
 * different ways (filesystem, database, cloud, etc).
 * Uses BoardDefinition as the single format.
 */
export interface IBoardBackend {
  load(id: string): Promise<BoardDefinition>;
  save(board: BoardDefinition): Promise<void>;
  create(board: BoardDefinition): Promise<string>;
  delete(id: string): Promise<void>;
  list(): Promise<BoardDefinition[]>;
}

/**
 * Component registry entry.
 * Provides metadata and factory for a component type.
 */
export interface ComponentRegistryEntry {
  schema: ComponentTypeSchema;
  factory: (
    id: string,
    config: Record<string, unknown>
  ) => Node;
}

/**
 * Validation result for operations.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
