/**
 * Main editor component - wraps renderer with edit mode UI.
 * Top-level entry point for the dashboard editor.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../editor-state';
import type { IBoardBackend, BoardDefinition } from '../types';
import { DashboardRenderer } from '../../components/dashboard-renderer.ts';
import './sidebar/editor-sidebar';
/**
 * Main DashboardEditor component.
 * Wraps DashboardRenderer with edit mode, sidebar, and controls.
 */
@customElement('ds-dashboard-editor')
export class DashboardEditor extends LitElement {
  /**
   * Storage backend for loading/saving boards.
   */
  @property() backend?: IBoardBackend;

  /**
   * ID of board to load. Optional - can load via setBoard().
   */
  @property() boardId?: string;

  /**
   * Type-safe reference to the dashboard renderer element.
   */
  public renderer: DashboardRenderer = new DashboardRenderer();


  /**
   * EditorState instance for reactive state management.
   * Can be passed from parent or created internally.
   */
  @property({ type: Object }) editorState: EditorState = new EditorState(this);

  /**
   * Whether sidebar is visible. Can be toggled.
   */
  @property({ type: Boolean }) showSidebar: boolean = true;

  /**
   * Error message if board loading failed.
   */
  @property() error: string = '';

  /**
   * Loading state.
   */
  @property({ type: Boolean }) isLoading: boolean = false;


  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }

  constructor() {
    super();

    this.renderer.runtime.lastClickedComponent.subscribe((componentId) => {
      this.editorState.selectComponent(componentId);
    });
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Subscribe to board changes
    this.editorState.board.subscribe((board) => {
      this.requestUpdate();
      if (board && this.renderer) {
        this.loadBoardInRenderer(board).catch((err: Error) => {
          this.error = `Failed to render board: ${err.message}`;
          console.error(err);
          alert(err.message);
        });
      }
    });


    // Load board if boardId provided
    if (this.boardId && this.backend) {
      this.loadBoard(this.boardId).catch((err: Error) => {
        this.error = `Failed to load board: ${err.message}`;
        console.error(err);
        alert(err.message);
      });
    }
  }

  /**
   * Initialize the renderer after first render.
   */
  firstUpdated(): void {
    const container = this.renderRoot?.querySelector('#renderer-container');
    if (container) {
      container.appendChild(this.renderer);

      // Load board if already loaded
      const board = this.editorState.board.get();
      if (board) {
        this.loadBoardInRenderer(board).catch((err: Error) => {
          this.error = `Failed to render board: ${err.message}`;
          console.error(err);
        });
      }
    }
  }

  /**
   * Load a board by ID from backend.
   */
  async loadBoard(id: string): Promise<void> {
    if (!this.backend) {
      this.error = 'No storage backend configured';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const board = await this.backend.load(id);
      this.editorState.setBoard(board);
    } catch (err) {
      this.error = `Failed to load board: ${String(err)}`;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Save current board to backend.
   */
  async saveBoard(): Promise<void> {
    const board: BoardDefinition | null = this.editorState.board.get();

    if (!board || !this.backend) {
      return;
    }

    try {
      await this.backend.save(board);
      this.editorState.clearDirty();
    } catch (err) {
      this.error = `Failed to save board: ${String(err)}`;
    }
  }

  /**
   * Set board directly (for testing or manual load).
   */
  setBoard(board: BoardDefinition): void {
    this.editorState.setBoard(board);
  }

  /**
   * Load board into the renderer component.
   * No conversion needed - both use same format.
   */
  private async loadBoardInRenderer(board: BoardDefinition): Promise<void> {
    if (!this.renderer) {
      this.error = 'Dashboard renderer not initialized';
      return;
    }

    try {
      await this.renderer.loadBoard(board);
    } catch (err) {
      this.error = `Failed to render board: ${String(err)}`;
      console.error(err);
    }
  }

  /**
   * Toggle sidebar visibility.
   */
  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  override render(): TemplateResult {
    if (this.isLoading) {
      return html`
        <div class="editor-layout">
          <div class="editor-content">
            <div style="padding: 16px;">Loading board...</div>
          </div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="editor-layout">
          <div class="editor-content">
            <div class="error-message">${this.error}</div>
          </div>
        </div>
      `;
    }

    const dirty = this.editorState.isDirty.get();

    return html`
      <div class="editor-layout ${this.showSidebar ? '' : 'sidebar-hidden'}">
        <div class="editor-sidebar" hidden=${!this.showSidebar}>
          <div class="tool-bar nogrow">
            <button @click="${this.saveBoard.bind(this)}" ?disabled="${!dirty}">
              Save
            </button>
          </div>

          <ds-editor-sidebar
            style="flex: 1;"
            .editorState="${this.editorState}"
          >
          </ds-editor-sidebar>

          <div class="status-bar">
            <div>
              ${dirty
                ? html` <span class="status-dirty"> ● Unsaved changes </span> `
                : html`<span>All saved</span>`}
            </div>
          </div>
        </div>

        <div class="editor-content" id="renderer-container"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-dashboard-editor': DashboardEditor;
  }
}
