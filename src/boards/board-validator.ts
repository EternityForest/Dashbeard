/**
 * Board validation using JSON Schema.
 */

import Ajv from 'ajv';
import {
  BoardDefinition,
  BOARD_SCHEMA,
  ComponentConfig,
  BindingDefinition,
} from './board-types';
import { filterRegistry } from '@/flow/filter';

const ajv = new Ajv({ strict: false });
const validateBoardSchema = ajv.compile(BOARD_SCHEMA);

/**
 * Validate a board definition against the schema.
 *
 * @param board The board to validate
 * @throws If validation fails
 * @returns The validated board (type-safe)
 */
export function validateBoard(board: unknown): BoardDefinition {
  if (!validateBoardSchema(board)) {
    const errors = validateBoardSchema.errors || [];
    const message = errors
      .map((e) => `${e.instancePath || 'root'}: ${e.message}`)
      .join('; ');
    throw new Error(`Board validation failed: ${message}`);
  }

  return board as BoardDefinition;
}

/**
 * Validate unique component IDs within a board.
 *
 * @param board The board to check
 * @throws If duplicate IDs found
 */
export function validateUniqueComponentIds(rootComponent: ComponentConfig,
  seen: Set<string>|undefined
): Set<string> {
  const ids = seen ?? new Set<string>();
  if(ids.has(rootComponent.id)) {
    throw new Error(`Duplicate component ID: "${rootComponent.id}"`);
  }
  ids.add(rootComponent.id);
  for (const component of rootComponent?.children || []) {
    validateUniqueComponentIds(component, ids);
  }
  return ids;
}

/**
 * Validate that all bindings reference existing components.
 *
 * @param board The board to check
 * @throws If binding references non-existent component
 */
export function validateBindingReferences(board: BoardDefinition): void {
  const componentIds = validateUniqueComponentIds(board.rootComponent, new Set<string>());

  for (const binding of board.bindings) {
    if (!componentIds.has(binding.fromPort.split('.')[0])) {
      throw new Error(
        `Binding references non-existent component: "${binding.fromPort}"`
      );
    }
    if (!componentIds.has(binding.toPort.split('.')[0])) {
      throw new Error(
        `Binding references non-existent component: "${binding.toPort}"`
      );
    }
  }
}

/**
 * Validate that all filters in bindings are registered.
 *
 * @param board The board to check
 * @throws If filter type not found in registry
 */
export function validateBindingFilters(board: BoardDefinition): void {
  for (const binding of board.bindings) {
    if (binding.filters) {
      for (const filter of binding.filters) {
        const manifest = filterRegistry.getManifest(filter.type);
        if (!manifest) {
          throw new Error(
            `Binding filter type not registered: "${filter.type}"`
          );
        }
      }
    }
  }
}

/**
 * Fully validate a board definition.
 * Checks schema, unique IDs, binding references, and filter types.
 *
 * @param board The board to validate
 * @throws If any validation fails
 * @returns The validated board
 */
export function validateBoardComplete(board: unknown): BoardDefinition {
  const validated = validateBoard(board);
  validateUniqueComponentIds(validated.rootComponent, new Set<string>());
  validateBindingReferences(validated);
  validateBindingFilters(validated);
  return validated;
}
