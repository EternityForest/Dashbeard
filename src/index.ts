import './editor/components/dashboard-editor.ts';
import './editor/editor-state.ts';
import type { IBoardBackend } from './editor/types';
import type { DashboardEditor } from './editor/components/dashboard-editor.ts';
import { DashboardComponentConstructor } from './components/dashboard-component.ts';

interface EditorConfig{
  components?: DashboardComponentConstructor[]
}

export function createEditor(
  container: HTMLElement,
  backend: IBoardBackend,
  editMode: boolean,
  config: EditorConfig
): DashboardEditor {


  config = config || {};

  // Create editor element
  const editorElement = document.createElement('ds-dashboard-editor');
  container.appendChild(editorElement);

  // Create editor instance
  const editor = editorElement as unknown as DashboardEditor;
  
  // Configure editor
  editor.backend = backend;

  for(const i of config?.components||[]){
    editor.renderer.runtime.componentClasses.set(i.typeSchema.name,i)
  }
  editor.requestUpdate();

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
