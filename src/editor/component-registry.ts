/**
 * Component registry - maintains metadata and factories
 * for all available component types.
 * Enables schema-based editors and type validation.
 */

import { ComponentConfig } from '@/boards/board-types';
import type {
  ComponentTypeSchema,
  ConfigSchema,
} from './types';

/**
 * Central registry for all component types.
 * Provides metadata, validation, and factories.
 */
export class ComponentRegistry {
  private schemas = new Map<
    string,
    ComponentTypeSchema
  >();

  private factories = new Map<
    string,
    (id: string, config: Record<string, unknown>) =>
      void
  >();

  /**
   * Register a component type with its schema.
   *
   * @param type The component type identifier
   * @param schema Metadata about the component
   * @param factory Function to create instances
   */
  register(
    type: string,
    schema: ComponentTypeSchema,
    factory: (
      id: string,
      config: Record<string, unknown>
    ) => void
  ): void {
    if (this.schemas.has(type)) {
      throw new Error(
        `Component type already registered: ${type}`
      );
    }
    this.schemas.set(type, schema);
    this.factories.set(type, factory);
  }

  /**
   * Get schema for a component type.
   * @throws If component type not found
   */
  getSchema(type: string): ComponentTypeSchema {
    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(
        `Component type not registered: ${type}`
      );
    }
    return schema;
  }

  /**
   * Check if a component type is registered.
   */
  hasType(type: string): boolean {
    return this.schemas.has(type);
  }

  /**
   * Get all registered component types.
   */
  getAllTypes(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get all schemas grouped by category.
   */
  getComponentsByCategory(): Map<
    string,
    ComponentTypeSchema[]
  > {
    const grouped = new Map<
      string,
      ComponentTypeSchema[]
    >();

    for (const schema of this.schemas.values()) {
      const cat = schema.category;
      if (!grouped.has(cat)) {
        grouped.set(cat, []);
      }
      grouped.get(cat)!.push(schema);
    }

    return grouped;
  }


  /**
   * Validate a component's configuration against
   * its schema.
   *
   * @returns Array of error messages (empty if valid)
   */
  validateConfig(
    type: string,
    config: ComponentConfig['config']
  ): string[] {
    const schema = this.getSchema(type);
    const errors: string[] = [];
    const properties = schema.configSchema.properties || {};

    for (const [propName, propSchema] of Object.entries(
      properties
    )) {
      const value = config[propName];
      const propErrors = this.validateProperty(
        propName,
        value,
        propSchema
      );
      errors.push(...propErrors);
    }

    return errors;
  }

  /**
   * Validate a single property value against ConfigSchema.
   */
  private validateProperty(
    propName: string,
    value: unknown,
    schema: ConfigSchema
  ): string[] {
    const errors: string[] = [];
    const requiredList = schema.required || [];

    if (requiredList.includes(propName) && value === undefined) {
      errors.push(
        `Property "${propName}" is required`
      );
      return errors;
    }

    if (value === undefined) {
      return errors;
    }

    // Type validation
    const actualType = typeof value;
    const schemaType = schema.type;

    if (schemaType === 'array') {
      if (!Array.isArray(value)) {
        errors.push(
          `Property "${propName}" must be array, got ${actualType}`
        );
      }
    } else if (schemaType === 'object') {
      if (
        actualType !== 'object' ||
        value === null ||
        Array.isArray(value)
      ) {
        errors.push(
          `Property "${propName}" must be object, got ${actualType}`
        );
      }
    } else if (schemaType && schemaType !== actualType) {
      errors.push(
        `Property "${propName}" must be ${schemaType.toString()}, got ${actualType}`
      );
      return errors;
    }

    // Enum validation
    if (
      schema.enum &&
      !schema.enum.includes(value as never)
    ) {
      errors.push(
        `Property "${propName}" must be one of: ${schema.enum.join(', ')}`
      );
    }

    // Number constraints
    if (
      schemaType === 'number' &&
      typeof value === 'number'
    ) {
      if (
        schema.minimum !== undefined &&
        value < schema.minimum
      ) {
        errors.push(
          `Property "${propName}" must be >= ${schema.minimum}`
        );
      }
      if (
        schema.maximum !== undefined &&
        value > schema.maximum
      ) {
        errors.push(
          `Property "${propName}" must be <= ${schema.maximum}`
        );
      }
    }

    return errors;
  }

  /**
   * Get default configuration for a component type.
   */
  getDefaultConfig(type: string): Record<
    string,
    unknown
  > {
    const schema = this.getSchema(type);
    const defaults: Record<string, unknown> = {};
    const properties = schema.configSchema.properties || {};

    for (const [key, propSchema] of Object.entries(
      properties
    )) {
      if (propSchema.default !== undefined) {
        defaults[key] = propSchema.default;
      }
    }

    return defaults;
  }

  /**
   * Clear all registered components.
   * Useful for testing.
   */
  clear(): void {
    this.schemas.clear();
    this.factories.clear();
  }
}

/**
 * Singleton instance.
 */
let globalRegistry: ComponentRegistry | null = null;

/**
 * Get or create the global component registry.
 */
export function getComponentRegistry(): ComponentRegistry {
  if (!globalRegistry) {
    globalRegistry = new ComponentRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing).
 */
export function resetComponentRegistry(): void {
  globalRegistry = null;
}
