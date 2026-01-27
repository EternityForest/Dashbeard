/**
 * Editor sidebar - container for panels.
 * Houses component tree and property inspector using native details elements.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
// Import panel components
import './component-tree';
import './property-inspector';
import './bindings-editor';

/**
 * Editor sidebar container.
 * Stacks two panels vertically using native <details> elements.
 */
@customElement('ds-editor-sidebar')
export class EditorSidebar extends LitElement {
  /**
   * Editor state to pass to panels.
   */
  @property({ type: Object }) editorState?: EditorState;

  /**
   * Sidebar width in pixels.
   */
  @property({ type: Number }) width: number = 300;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }


  override render(): TemplateResult {
    if (!this.editorState) {
      return html`
        <div
          style="padding: 16px; color: #999;
                  font-size: 13px;"
        >
          No editor state provided
        </div>
      `;
    }

    return html`
      <div class="sidebar-content accordion">
        <!-- Component Tree Panel -->
        <details>
          <summary>Components</summary>
          <div class="panel-content">
            <ds-editor-component-tree .editorState="${this.editorState}">
            </ds-editor-component-tree>
          </div>
        </details>

        <!-- Property Inspector Panel -->
        <details open>
          <summary>Properties</summary>
          <div class="panel-content">
            <ds-editor-property-inspector .editorState="${this.editorState}">
            </ds-editor-property-inspector>
          </div>
        </details>

        <!-- Bindings Editor Panel -->
        <details>
          <summary>Bindings</summary>
          <div class="panel-content">
            <ds-editor-bindings .editorState="${this.editorState}">
            </ds-editor-bindings>
          </div>
        </details>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-sidebar': EditorSidebar;
  }
}
