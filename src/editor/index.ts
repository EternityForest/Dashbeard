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
  IBoardBackend,
  ComponentRegistryEntry,
  ValidationResult,
} from './types';

// Storage backends for persistence
export {
  MemoryBackend,
  LocalStorageBackend,
  ApiBackend,
  CompositeBackend,
} from '../backends';

// Editor state management
export { EditorState } from './editor-state';

// Main editor component
export { DashboardEditor } from './components/dashboard-editor';