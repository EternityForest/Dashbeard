/**
 * Component tree panel - hierarchical component display.
 */

import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import type { Component } from '../../types';

/**
 * Component tree panel showing hierarchy.
 */
@customElement('ds-editor-component-tree')
export class ComponentTree extends LitElement {
  /**
   * Editor state to track selection.
   */
  @property({ type: Object }) editorState?: EditorState;

  /**
   * Components from board's rootComponent.
   */
  @property({ type: Array })
  components: Component[] = [];

  /**
   * Currently selected component ID.
   */
  @property()
  selectedComponentId: string | null = null;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }
  connectedCallback(): void {
    super.connectedCallback();

    if (!this.editorState) {
      throw new Error('Component tree requires EditorState');
    }

    // Subscribe to board changes
    this.editorState.board.subscribe(() => {
      this.updateComponents();
    });

    if(this.editorState.board.get()) {
      this.updateComponents();
    }

    // Subscribe to component selection
    this.editorState.selectedComponentId.subscribe(
      (id) => {
        this.selectedComponentId = id;
        this.requestUpdate();
      }
    );
  }

  /**
   * Update components list from editor state.
   */
  private updateComponents(): void {
    const board =
      this.editorState?.board.get();

    if (!board?.rootComponent) {
      this.components = [];
    } else {
      // Display root component and its children
      this.components = [board.rootComponent];
    }
    this.requestUpdate();
  }

  /**
   * Handle component selection.
   */
  private selectComponent(componentId: string): void {
    if (!this.editorState) {
      return;
    }
    this.editorState.selectComponent(componentId);
  }

  /**
   * Get icon category for component type.
   */
  private getIconCategory(type: string): string {
    if (type === 'flex-layout') return 'layout';
    if (type === 'slider') return 'input';
    if (type === 'variable') return 'data';
    return 'display';
  }

  /**
   * Render a single component tree item.
   */
  private renderComponent(
    component: Component,
    depth: number
  ): TemplateResult {
    const category = this.getIconCategory(
      component.type
    );
    const hasChildren =
      component.children &&
      component.children.length > 0;

    return html`
      <div class="tree-item ${this
        .selectedComponentId === component.id
        ? 'selected'
        : ''}"
           @click="${() =>
             this.selectComponent(component.id)}"
           style="padding-left: ${
             16 + depth * 16
           }px;">
        <div class="tree-icon ${category}">
          ${component.children ? 'C' : component
            .type.charAt(0)
            .toUpperCase()}
        </div>
        <div class="tree-name">
          ${component.id}
        </div>
        <div class="tree-type">
          ${component.type}
        </div>
      </div>

      ${hasChildren
        ? component?.children?.map(
            (child) =>
              this.renderComponent(child, depth + 1)
          )
        : html``}
    `;
  }

  override render(): TemplateResult {
    if (this.components.length === 0) {
      return html`
        <div class="warning">
          No components on this page
        </div>
      `;
    }

    return html`
      <div class="tree">
        ${this.components.map(
          (comp) => this.renderComponent(comp, 0)
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-component-tree': ComponentTree;
  }
}
