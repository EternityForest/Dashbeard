import './editor/components/dashboard-editor.ts';
import './editor/editor-state.ts';
import type { IBoardBackend } from './editor/types';
import type { DashboardEditor } from './editor/components/dashboard-editor.ts';
import { registerBuiltInComponents } from '../src/editor/register-built-in-components.ts';

// Register built-in components with editor
registerBuiltInComponents();

// Sample board for testing
// Uses unified BoardDefinition format
export const defaultBoard = {
  id: 'test-board-1',
  metadata: {
    name: 'Example Dashboard',
    version: '1.0.0',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  rootComponent: {
    id: 'layout-1',
    name: 'Main Layout',
    type: 'flex-layout',
    config: {
      direction: 'column',
      gap: '1rem',
    },
    children: [
      {
        id: 'comp-1',
        name: 'My Slider',
        type: 'slider',
        config: {
          min: 0,
          max: 100,
          defaultValue: 50,
          label: 'Value',
        },
      },
      {
        id: 'comp-2',
        name: 'My Variable',
        type: 'variable',
        config: {
          defaultValue: 'Hello World',
          label: 'Output',
        },
      },
    ],
  },
  bindings: [],
};

export function createEditor(
  container: HTMLElement,
  backend: IBoardBackend,
  editMode: boolean,
): DashboardEditor {


  // Create editor element
  const editorElement = document.createElement('ds-dashboard-editor');
  container.appendChild(editorElement);

  // Create editor instance
  const editor = editorElement as DashboardEditor;
  
  // Configure editor
  editor.backend = backend;

  editor.editorState.setEditMode(editMode);

  // Load sample board
  (async () => {
    editor.setBoard(defaultBoard);
  })().catch(() => {
    console.error('Failed to create board');
    alert('Failed to create board');
  });

  return editor;
}
