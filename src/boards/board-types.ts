/**
 * Board definition types and schemas.
 * Single unified format used by both editor and runtime.
 * No conversion between formats - this is the canonical representation.
 */

/** Just a JSON schema */
export interface ComponentSchema {
  properties: {
    "type": string;
    [key: string]: unknown;
  }
  [key: string]: unknown;
}


/**
 * A component instance in a board.
 * Unified type used everywhere (editor and runtime).
 */
export interface ComponentConfig {
  /** Unique ID within this board */
  id: string;

  /** Component type (e.g., 'variable', 'switch',
   * 'slider') */
  type: string;

  /** Configuration specific to this component type */
  config: Record<string, unknown>;

  /** Optional layout information */
  layout?: {
    grow?: number;
    width?: number;
    height?: number;
  };

  /** Optional child components for containers */
  children?: ComponentConfig[];
}

/**
 * Filter instance in a binding's filter stack.
 */
export interface BindingFilterItem {
  /** Filter type (e.g., 'add', 'multiply', 'invert') */
  type: string;

  /** Filter configuration */
  config: Record<string, unknown>;
}

/**
 * A binding connects two component ports together.
 */
export interface BindingDefinition {
  /** Unique ID for editor tracking */
  id: string;

  /** The output port of the upstream component */
  fromPort: string;

  /** Optional filter stack applied to the binding */
  filters?: BindingFilterItem[];

  /** The input port of the downstream component */
  toPort: string;

  /** Optional value transform (Phase 4) */
  transform?: string;
}

/**
 * Full board definition - the JSON representation of a
 * dashboard. Single format for both editor and runtime.
 */
export interface BoardDefinition {
  /** Unique board ID */
  id: string;

  /** Board metadata */
  metadata: {
    version?: string;
    name?: string;
    description?: string;
    author?: string;
    created?: string;
    modified?: string;
  };

  /** All components in this board */
  rootComponent: ComponentConfig | null;

  /** All bindings connecting components */
  bindings: BindingDefinition[];

  /** Optional board settings */
  settings?: {
    theme?: 'light' | 'dark';
  };
}

/**
 * JSON Schema for board validation.
 * Used by AJV to validate board definitions.
 */
export const BOARD_SCHEMA: Record<string, unknown> = {
  type: 'object',

  $defs: {
    component: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        config: { type: 'object' },
        layout: {
          type: 'object',
          properties: {
            grow: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
        children: {
          type: 'array',
          items: { $ref: '#/$defs/component' },
        },
      },
      required: ['id', 'type', 'config'],
    },
  },

  properties: {
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' },
        created: { type: 'string' },
        modified: { type: 'string' },
      },
      required: [],
    },
    rootComponent: { $ref: '#/$defs/component' },
    bindings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fromPort: { type: 'string' },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                config: { type: 'object' },
              },
              required: ['type', 'config'],
            },
          },
          toPort: { type: 'string' },
        },
        required: ['id', 'fromPort', 'toPort'],
      },
    },
    settings: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: ['light', 'dark'],
        },
      },
    },
  },
  required: ['metadata', 'rootComponent', 'bindings'],
};
