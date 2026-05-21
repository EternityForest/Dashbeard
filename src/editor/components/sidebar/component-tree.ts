/**
 * Component tree panel - hierarchical component display.
 */

import { LitElement, html, TemplateResult } from 'lit';
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

  /**
   * ID of component being dragged.
   */
  @property()
  draggedComponentId: string | null = null;

  /**
   * ID of component being dragged over.
   */
  @property()
  dragOverComponentId: string | null = null;

  /**
   * Whether current drag-over target is valid.
   */
  @property()
  dragOverValid: boolean = false;

  /**
   * Current drag position: 'append' (into container) or 'sibling' (reorder).
   */
  @property()
  dragOverPosition: 'append' | 'sibling' = 'append';

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
    if (type === 'stack-layout') return 'layout';
    if (type === 'slider') return 'input';
    if (type === 'variable') return 'data';
    return 'display';
  }

  /**
   * Handle drag start on component tree item.
   */
  private handleDragStart(event: DragEvent, componentId: string): void {
    this.draggedComponentId = componentId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', componentId);
    }
    event.stopPropagation();
  }

  /**
   * Handle drag over component tree item.
   */
  private handleDragOver(event: DragEvent, targetComponentId: string): void {
    if (!this.draggedComponentId || this.draggedComponentId === targetComponentId) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();

    // Determine if dropping on top half (reorder as sibling) or bottom half (into container)
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAboveMid = event.clientY < midY;

    // Check if target is a layout component
    const isLayout = this.editorState?.isLayoutComponent(targetComponentId) ?? false;

    // Position logic:
    // - If above midpoint OR target is not a layout → treat as sibling (reorder)
    // - If below midpoint AND target is a layout → move into container
    let isValid = false;
    let position: 'append' | 'sibling' = 'sibling';

    if (isAboveMid || !isLayout) {
      // Reorder as sibling
      isValid = true;
      position = 'sibling';
    } else {
      // Move into container
      isValid = true;
      position = 'append';
    }

    // Prevent dropping onto own descendants
    if (this.draggedComponentId && this.editorState) {
      const targetComponent = this.editorState.findComponent(targetComponentId);
      if (targetComponent && this.editorState.findComponent(this.draggedComponentId)) {
        // Check if dragged is ancestor of target
        const checkDescendant = (parent: Component, childId: string): boolean => {
          if (!parent.children) return false;
          for (const child of parent.children) {
            if (child.id === childId) return true;
            if (checkDescendant(child, childId)) return true;
          }
          return false;
        };
        const draggedComp = this.editorState.findComponent(this.draggedComponentId);
        if (draggedComp && checkDescendant(draggedComp, targetComponentId)) {
          isValid = false;
        }
      }
    }

    this.dragOverComponentId = targetComponentId;
    this.dragOverValid = isValid;
    this.dragOverPosition = position;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isValid ? 'move' : 'none';
    }

    event.stopPropagation();
  }

  /**
   * Handle drag leave from component tree item.
   */
  private handleDragLeave(): void {
    this.dragOverComponentId = null;
    this.dragOverValid = false;
    this.dragOverPosition = 'append';
  }

  /**
   * Handle drop on component tree item.
   */
  private handleDrop(event: DragEvent, targetComponentId: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.dragOverValid || !this.draggedComponentId) {
      return;
    }

    // Determine actual position to pass
    const position: 'append' | 'before' | 'after' =
      this.dragOverPosition === 'append'
        ? 'append'
        : 'before'; // Default to before for reordering

    try {
      this.editorState?.moveComponent(
        this.draggedComponentId,
        targetComponentId,
        position
      );
    } catch (err) {
      alert(
        `Failed to move component: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }

    this.handleDragEnd();
  }

  /**
   * Handle drag end.
   */
  private handleDragEnd(): void {
    this.draggedComponentId = null;
    this.dragOverComponentId = null;
    this.dragOverValid = false;
    this.dragOverPosition = 'append';
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

    const isSelected = this.selectedComponentId === component.id;
    const isDraggedOver = this.dragOverComponentId === component.id;
    const dragClass = isDraggedOver
      ? this.dragOverValid
        ? 'drag-over-valid'
        : 'drag-over-invalid'
      : '';

    return html`
      <div
        class="tree-item ${isSelected ? 'selected' : ''} ${dragClass}"
        draggable="true"
        @click="${() => this.selectComponent(component.id)}"
        @dragstart="${(e: DragEvent) => this.handleDragStart(e, component.id)}"
        @dragover="${(e: DragEvent) => this.handleDragOver(e, component.id)}"
        @dragleave="${() => this.handleDragLeave()}"
        @drop="${(e: DragEvent) => this.handleDrop(e, component.id)}"
        @dragend="${() => this.handleDragEnd()}"
        style="padding-left: ${16 + depth * 16}px;">
        <div class="tree-icon ${category}">
          ${component.children ? 'C' : component
            .type.charAt(0)
            .toUpperCase()}
        </div>
        <div class="tree-name">
          ${component.id}
        </div>
        <div class="tree-type margin subtle">
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
      <div class="tree" style="text-wrap:nowrap">
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
