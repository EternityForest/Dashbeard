/**
 * Editor module - public API for dashboard editing.
 * Exports all core types and utilities needed for
 * building the editor UI.
 *
 * Data Model (Unified Format):
 * - BoardDefinition: Single format for editor & runtime
 * - Component: Unified type everywhere
 * - BindingDefinition: Port connections with transforms
 * No conversion layer - direct use throughout.
 */

// Core types (re-exported from canonical source)
export type {
  ComponentConfig as Component,
  BindingDefinition,
  BoardDefinition,
} from '@/boards/board-types';

// Editor types (editor-specific schemas and backends)
export type {
  PortSchema,
  ComponentTypeSchema,
  PropertySchema,
  IBoardBackend,
  ComponentRegistryEntry,
  ValidationResult,
} from './types';

// Component registry for schema-based editing
export {
  ComponentRegistry,
  getComponentRegistry,
  resetComponentRegistry,
} from './component-registry';

// Binding validation for data flow integrity
export { BindingValidator } from './binding-validator';

// Storage backends for persistence
export {
  MemoryBackend,
  LocalStorageBackend,
  ApiBackend,
  CompositeBackend,
} from './board-storage';

// Editor state management
export { EditorState } from './editor-state';

// Main editor component
export { DashboardEditor } from './components/dashboard-editor';

// Built-in component registration
export { registerBuiltInComponents } from './register-built-in-components';
