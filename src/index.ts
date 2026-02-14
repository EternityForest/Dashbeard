import './editor/components/dashboard-editor.ts';
import './editor/editor-state.ts';
import type { IBoardBackend } from './editor/types';
import type { DashboardEditor } from './editor/components/dashboard-editor.ts';
import { registerBuiltInComponents } from '../src/editor/register-built-in-components.ts';

// Register built-in components with editor
registerBuiltInComponents();


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
    const loadedBoard = await backend.load();
    editor.setBoard(loadedBoard);
  })().catch(() => {
    console.error('Failed to create board');
    alert('Failed to create board');
  });

  return editor;
}
