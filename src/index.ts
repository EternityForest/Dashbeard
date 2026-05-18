import './editor/components/dashboard-editor.ts';
import './editor/editor-state.ts';
import type { IBoardBackend } from './editor/types';
import type { DashboardEditor } from './editor/components/dashboard-editor.ts';
import { DashboardComponentConstructor } from './components/dashboard-component.ts';

/**
 * Registered format-to-datalist mappings.
 * When a schema field has a matching format, the input gets a list attribute pointing to this datalist.
 */
const formatDatalistMap = new Map<string, string>();

/**
 * Register a datalist to be used for fields with a specific format.
 * @param format The JSON schema format (e.g., "tagpoint")
 * @param datalistId The ID of the HTMLDataListElement to use for autocomplete
 */
export function registerFormatDatalist(
  format: string,
  datalistId: string
): void {
  formatDatalistMap.set(format, datalistId);
}

/**
 * Get the datalist ID registered for a format.
 * @param format The JSON schema format
 * @returns The datalist ID, or undefined if not registered
 */
export function getFormatDatalist(format: string): string | undefined {
  return formatDatalistMap.get(format);
}

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
