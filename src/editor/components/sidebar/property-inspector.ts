/**
 * Property inspector panel - edits selected component properties.
 * Schema-driven form generation using ComponentRegistry.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import { getComponentRegistry } from '../../component-registry';
import { schemaToFormFields } from '../../utils/schema-to-form';
import type { Component, ComponentTypeSchema } from '../../types';

/**
 * Property inspector for editing selected component.
 * Reads ComponentRegistry schemas and generates
 * property edit forms.
 */
@customElement('ds-editor-property-inspector')
export class PropertyInspector extends LitElement {
  /**
   * Editor state to track selection.
   */
  @property({ type: Object }) editorState?: EditorState;

  /**
   * Currently selected component (null if none).
   */
  @property({ type: Object })
  selectedComponent: Component | null = null;

  /**
   * Component type schema for selected component.
   */
  @property({ type: Object })
  componentSchema: ComponentTypeSchema | null = null;

  /**
   * Available component types for swapping.
   */
  @property({ type: Array })
  availableTypes: string[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }

  connectedCallback(): void {
    super.connectedCallback();

    if (!this.editorState) {
      throw new Error('Property inspector requires EditorState');
    }

    // Subscribe to selection changes
    this.editorState.selectedComponentId.subscribe(() => {
      this.updateSelection();
    });

    // Also subscribe to board changes
    this.editorState.board.subscribe(() => {
      this.updateSelection();
    });

    // Load available types
    const registry = getComponentRegistry();
    this.availableTypes = registry.getAllTypes();
  }

  /**
   * Update component selection from editor state.
   */
  private updateSelection(): void {
    const board = this.editorState?.board.get();
    const componentId = this.editorState?.selectedComponentId.get();

    if (!board || !componentId) {
      this.selectedComponent = null;
      this.componentSchema = null;
      this.requestUpdate();
      return;
    }

    // Find component in board
    const component = this.editorState?.findComponent(componentId);

    if (!component) {
      this.selectedComponent = null;
      this.componentSchema = null;
      this.requestUpdate();
      return;
    }

    this.selectedComponent = component;

    // Get schema from registry
    const registry = getComponentRegistry();
    const schema = registry.getSchema(component.type);
    this.componentSchema = schema || null;

    this.requestUpdate();
  }

  /**
   * Handle property change.
   */
  private handlePropertyChange(name: string, value: unknown): void {
    if (!this.selectedComponent) {
      return;
    }

    this.editorState?.setComponentProperty(
      this.selectedComponent.id,
      name,
      value
    );

    this.requestUpdate();
  }

  /**
   * Delete the selected component.
   */
  private async handleDeleteComponent(): Promise<void> {
    if (!this.selectedComponent || !this.editorState) {
      return;
    }

    if (!confirm(`Delete component "${this.selectedComponent.id}"?`)) {
      return;
    }

    const runtime = this.editorState.editorComponent.renderer?.runtime;
    if (!runtime) {
      return;
    }

    try {
      await runtime.deleteComponent(this.selectedComponent.id);
      await this?.editorState?.editorComponent?.renderer?.rerenderBoard();

      // Update board state
      const board = this.editorState.board.get();
      if (board) {
        this.editorState.board.set(board);
        // Select root or first available component
        if (board.rootComponent) {
          this.editorState.selectComponent(board.rootComponent.id);
        } else {
          this.editorState.selectComponent(null);
        }
      }

      this.editorState.markDirty();
    } catch (err) {
      console.error('Failed to delete component:', err);
      alert('Failed to delete component');
    }
  }

  /**
   * Swap component to a different type.
   */
  private async handleSwapType(newType: string): Promise<void> {
    if (!this.selectedComponent || !this.editorState) {
      return;
    }

    const runtime = this.editorState.editorComponent.renderer?.runtime;
    if (!runtime) {
      return;
    }

    try {
      const newComponent = await runtime.swapComponentType(
        this.selectedComponent.id,
        newType
      );
      await this.editorState.editorComponent.renderer?.rerenderBoard();

      // Update board state
      const board = this.editorState.board.get();
      if (board) {
        this.editorState.board.set(board);
      }

      this.editorState.markDirty();
      this.requestUpdate();

      this.editorState.selectComponent(newComponent.id);
      this.updateSelection();
    } catch (err) {
      console.error('Failed to swap component type:', err);
      alert('Failed to change component type');
    }
  }

  /**
   * Add a child component.
   */
  private async handleAddChild(childType: string): Promise<void> {
    if (!this.selectedComponent || !this.editorState) {
      return;
    }

    const runtime = this.editorState.editorComponent.renderer?.runtime;
    if (!runtime) {
      return;
    }

    try {
      const registry = getComponentRegistry();
      const defaultConfig = registry.getDefaultConfig(childType);

      const childDef: Component = {
        id: `${childType}-${Date.now()}`,
        type: childType,
        config: defaultConfig,
        children: [],
      };

      // Add to component's children array
      if (!this.selectedComponent.children) {
        this.selectedComponent.children = [];
      }

      // Add to runtime
      await runtime.addComponent(childDef, this.selectedComponent.id);
      await this.editorState.editorComponent.renderer?.rerenderBoard();

      // Update board state
      const board = this.editorState.board.get();
      if (board) {
        this.editorState.board.set(board);
      }

      this.editorState.markDirty();
      this.editorState.selectComponent(childDef.id);
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to add child component:', err);
      alert('Failed to add child component');
    }
  }

  override render(): TemplateResult {
    if (!this.selectedComponent) {
      return html`
        <div class="panel">
          <div class="panel-header">Properties</div>
          <div class="warning">No component selected</div>
        </div>
      `;
    }

    if (!this.componentSchema) {
      return html`
        <div class="panel">
          <div class="panel-header">Properties</div>
          <div class="warning">
            Component schema not found: ${this.selectedComponent.type}
          </div>
        </div>
      `;
    }

    return html`
      <div class="panel">
        <div class="panel-header">
          <div class="component-name">${this.selectedComponent.id}</div>
          <div class="component-type subtle">${this.selectedComponent.type}</div>
        </div>
        <div class="panel-content">
          ${this.componentSchema.configSchema.properties &&
          Object.keys(this.componentSchema.configSchema.properties).length > 0
            ? schemaToFormFields(
                this.componentSchema.configSchema,
                this.selectedComponent.config || {},
                (name, value) => this.handlePropertyChange(name, value)
              )
            : html`
                <div
                >
                  No properties to edit
                </div>
              `}

          <!-- Action Buttons -->
          <div class="actions">
            <!-- Change Type -->
            <div>
              <div
              >
                Change Type
              </div>
              <select
                @change="${(event) =>
                  event.target.value &&
                  this.handleSwapType(event.target.value)}"
              >
                <option>Change Type</option>
                ${this.availableTypes.map(
                  (type) =>
                    html`<option
                    value="${type}"
                    title="Change component to ${type}"
                  >
                    ${type}
                  </button>`
                )}
              </select>
            </div>

            <!-- Add Child (if component supports children) -->
            ${this.selectedComponent.children !== undefined
              ? html`
                  <div>
                    <div
                      style="font-size: 11px; color: #999; margin-bottom: 8px; font-weight: 600;"
                    >
                      Add Child
                    </div>
                    <div class="type-selector">
                      ${this.availableTypes.map(
                        (type) =>
                          html`<button
                            class="type-button"
                            @click="${() => this.handleAddChild(type)}"
                            title="Add ${type} child"
                          >
                            + ${type}
                          </button>`
                      )}
                    </div>
                  </div>
                `
              : ''}

            <!-- Delete Component -->
            <div class="action-group">
              <button
                class="danger"
                @click="${() => this.handleDeleteComponent()}"
                title="Delete this component"
              >
                Delete Component
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-property-inspector': PropertyInspector;
  }
}
