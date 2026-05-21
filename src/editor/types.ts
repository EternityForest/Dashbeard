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
};
/**
 * JSON Schema subset for component configuration.
 * Supports types, enums, defaults, numeric constraints, and descriptions.
 */
export interface ConfigSchema {
  type?: 'object' | 'string' | 'number' | 'boolean' | 'array' | string[];
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
 * Component type metadata and schema.
 * Describes what properties a component can have and its ports.
 * This should be defined on the component itself.
 */
export interface ComponentTypeSchema {
  name: string;
  displayName: string;
  category: 'layout' | 'text' | 'input' | 'display' | 'logic' | 'data';
  description?: string;
  icon?: string;
  configSchema: ConfigSchema;
}

/** File must be accessible via some sort of URL */
export interface FileMetadata {
  name: string;
  size: number;
  url?: string;
  type: 'file' | 'folder';
}

/**
 * System theme from external URL.
 */
export interface SystemTheme {
  name: string;
  url: string;
}

/**
 * Storage backend abstraction for a single board.
 * Bound to a specific board ID for load/save operations.
 * Uses BoardDefinition as the single format.
 */
export interface IBoardBackend {
  load(): Promise<BoardDefinition>;
  save(board: BoardDefinition): Promise<void>;

  listResourceFolder(folder: string): Promise<FileMetadata[]>;

  /**
   * Get list of system themes from external URLs.
   * Returns name/url pairs for populating a datalist.
   * If not implemented, returns empty array.
   */
  getSystemThemes?(): Promise<SystemTheme[]>;
}

/**
 * Component registry entry.
 * Provides metadata and factory for a component type.
 */
export interface ComponentRegistryEntry {
  schema: ComponentTypeSchema;
  factory: (id: string, config: Record<string, unknown>) => Node;
}

/**
 * Validation result for operations.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
