import './editor/components/dashboard-editor.ts';
import './editor/editor-state.ts';
import type { IBoardBackend } from './editor/types';
import type { DashboardEditor } from './editor/components/dashboard-editor.ts';

export function createEditor(
  container: HTMLElement,
  backend: IBoardBackend,
  editMode: boolean,
): DashboardEditor {


  // Create editor element
  const editorElement = document.createElement('ds-dashboard-editor');
  container.appendChild(editorElement);

  // Create editor instance
  const editor = editorElement as unknown as DashboardEditor;
  
  // Configure editor
  editor.backend = backend;

  editor.editorState.setEditMode(editMode);
  editor.editorState.backend = backend;


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
