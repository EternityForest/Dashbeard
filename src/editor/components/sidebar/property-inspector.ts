/**
 * Property inspector panel - edits selected component properties.
 * Schema-driven form generation using ComponentRegistry.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import { schemaToFormFields } from '../../utils/schema-to-form';
import type { ComponentTypeSchema } from '../../types';
import type { ComponentConfig } from '@/boards/board-types';
import { DashboardComponent } from '@/components/dashboard-component';

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
  selectedComponent: ComponentConfig | null = null;

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

  /**
   * Available layout components for parent selector.
   */
  @property({ type: Array })
  layoutComponents: ComponentConfig[] = [];

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
      this.updateLayoutComponents();
    });

    // Load available types
    const runtime = this.editorState.editorComponent.renderer.runtime;
    this.availableTypes = [];
    for (const i of runtime.componentClasses.keys()) {
      this.availableTypes.push(i);
    }

    this.updateLayoutComponents();
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
    const schema =
      this.editorState?.editorComponent.renderer.runtime.componentClasses.get(
        component.type
      )?.typeSchema;

    this.componentSchema = schema || null;

    this.requestUpdate();
  }

  /**
   * Update list of layout components for parent selector.
   */
  private updateLayoutComponents(): void {
    const board = this.editorState?.board.get();
    if (!board?.rootComponent) {
      this.layoutComponents = [];
      return;
    }

    const layouts: ComponentConfig[] = [];
    const collectLayouts = (comp: ComponentConfig) => {
      if (this.editorState?.isLayoutComponent(comp.id)) {
        layouts.push(comp);
      }
      comp.children?.forEach(collectLayouts);
    };
    collectLayouts(board.rootComponent);
    this.layoutComponents = layouts;
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
   * Handle component rename.
   */
  private async handleRenameComponent(newId: string): Promise<void> {
    if (!this.selectedComponent || !this.editorState) {
      return;
    }

    const oldId = this.selectedComponent.id;
    newId = newId.trim();

    // Validation
    if (!newId) {
      alert('Component name cannot be empty');
      return;
    }

    if (newId === 'root') {
      alert('Cannot rename component to "root"');
      return;
    }

    if (newId === oldId) {
      return; // No change
    }

    // Check if name already exists
    const board = this.editorState.board.get();
    if (
      board?.rootComponent &&
      this.componentNameExists(board.rootComponent, newId)
    ) {
      alert(`A component named "${newId}" already exists`);
      return;
    }

    const runtime = this.editorState.editorComponent.renderer?.runtime;
    if (!runtime) {
      return;
    }

    try {
      // Update in board state
      this.selectedComponent.id = newId;
      if (board?.rootComponent) {
        this.updateComponentReferences(board.rootComponent, oldId, newId);
      }
      if (board?.bindings) {
        board.bindings.forEach((binding) => {
          if (binding.fromPort.startsWith(oldId + '.')) {
            binding.fromPort = newId + binding.fromPort.substring(oldId.length);
          }
          if (binding.toPort.startsWith(oldId + '.')) {
            binding.toPort = newId + binding.toPort.substring(oldId.length);
          }
        });
      }

      // Update in runtime
      await runtime.renameComponent(oldId, newId);

      this.editorState.markDirty();
      this.editorState.selectComponent(newId);
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to rename component:', err);
      alert('Failed to rename component');
      this.requestUpdate();
    }
  }

  /**
   * Update component references throughout the board after rename.
   */
  private updateComponentReferences(
    component: ComponentConfig,
    oldId: string,
    newId: string
  ): void {
    if (component.children) {
      component.children.forEach((child) => {
        if (child.id === oldId) {
          child.id = newId;
        }
        this.updateComponentReferences(child, oldId, newId);
      });
    }
  }

  /**
   * Check if a component name already exists in the board.
   */
  private componentNameExists(
    component: ComponentConfig,
    name: string
  ): boolean {
    if (component.id === name) return true;
    if (component.children) {
      for (const child of component.children) {
        if (this.componentNameExists(child, name)) return true;
      }
    }
    return false;
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

  private classForComponentType(
    type: string
  ): undefined | typeof DashboardComponent {
    return this.editorState?.editorComponent.renderer.runtime.componentClasses.get(
      type
    );
  }

  /**
   * Get available component types grouped by category.
   */
  private getTypesByCategory(): Map<string, string[]> {
    const runtime = this.editorState?.editorComponent.renderer.runtime;
    if (!runtime) return new Map();

    const grouped = new Map<string, string[]>();

    for (const type of this.availableTypes) {
      const cls = runtime.componentClasses.get(type);
      const category = cls?.typeSchema.category || 'data';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(type);
    }

    // Sort types within each category
    for (const types of grouped.values()) {
      types.sort();
    }

    // Return sorted by category name
    return new Map([...grouped.entries()].sort());
  }

  /**
   * Handle parent component change.
   */
  private handleParentChange(newParentId: string): void {
    if (!this.selectedComponent || !this.editorState) {
      return;
    }

    newParentId = newParentId.trim();
    if (!newParentId) {
      alert('Parent ID cannot be empty');
      return;
    }

    // Check if new parent exists
    const newParent = this.editorState.findComponent(newParentId);
    if (!newParent) {
      alert(`Component "${newParentId}" not found`);
      return;
    }

    // Validate is layout component
    if (!this.editorState.isLayoutComponent(newParentId)) {
      alert(
        `"${newParentId}" is not a layout component and cannot have children`
      );
      return;
    }

    try {
      this.editorState.moveComponent(this.selectedComponent.id, newParentId);
      this.requestUpdate();
    } catch (err) {
      alert(
        `Failed to move component: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
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
      const defaultConfig =
        this.editorState.editorComponent.renderer.runtime.componentClasses
          .get(childType)!
          .getDefaultConfig();

      let foundId = 1;
      while (runtime.loadedComponents.get(`${childType}-${foundId}`)) {
        foundId += 1;
      }
      const childDef: ComponentConfig = defaultConfig;
      childDef.id = `${childType}-${foundId}`;

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
          <div>
            <input
              type="text"
              class="component-name-input"
              .value="${this.selectedComponent.id}"
              @change="${(e: Event) => {
                const input = e.target as HTMLInputElement;
                this.handleRenameComponent(input.value).catch((e) => {
                  alert(e);
                });
              }}"
              ?readonly="${this.selectedComponent.id === 'root'}"
              title="${this.selectedComponent.id === 'root'
                ? 'Cannot rename root component'
                : 'Click to rename'}"
            />
          </div>
          <div class="component-type subtle">
            ${this.selectedComponent.type}
          </div>
        </div>
        <div class="panel-content">
          ${this.componentSchema.configSchema.properties &&
          Object.keys(this.componentSchema.configSchema.properties).length > 0
            ? schemaToFormFields(
                this.componentSchema.configSchema,
                this.selectedComponent.config || {},
                (name, value) => this.handlePropertyChange(name, value),
                {
                  boardId: this.editorState?.board.get()?.id,
                  backend: this.editorState?.backend,
                }
              )
            : html` <div>No properties to edit</div> `}

          <!-- Action Buttons -->
          <div class="actions">
            <!-- Parent Component -->
            ${this.selectedComponent.id !== 'root'
              ? html`
                  <div>
                    <div
                      style="font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 600;"
                    >
                      Parent Component
                    </div>
                    <input
                      list="parent-options"
                      type="text"
                      .value="${this.editorState?.findParent(
                        this.selectedComponent.id
                      )?.id || 'root'}"
                      @change="${(e: Event) => {
                        const input = e.target as HTMLInputElement;
                        this.handleParentChange(input.value);
                      }}"
                      title="Select parent component"
                    />
                    <datalist id="parent-options">
                      ${this.layoutComponents.map(
                        (comp) =>
                          html`<option value="${comp.id}">
                            ${comp.id} (${comp.type})
                          </option>`
                      )}
                    </datalist>
                  </div>
                `
              : html``}

            <!-- Add Child (if component supports children) -->
            ${this.classForComponentType(this.selectedComponent.type)!
              .typeSchema.category == 'layout'
              ? html`
                  <div>
                    <div
                      style="font-size: 11px; color: #999; margin-bottom: 8px; font-weight: 600;"
                    >
                      Add Child
                    </div>
                    ${((
                        categories: Map<string, string[]>
                      ) =>
                        Array.from(categories.entries()).map(
                          ([category, types]) =>
                            html`
                              <div class="category-group">
                                <div class="category-header">
                                  ${category.toUpperCase()}
                                </div>
                                <div class="type-selector">
                                  ${types.map(
                                    (type) => html`
                                      <button
                                        class="type-button"
                                        @click="${() =>
                                          this.handleAddChild(type)}"
                                        title="Add ${type} child"
                                      >
                                        + ${type}
                                      </button>
                                    `
                                  )}
                                </div>
                              </div>
                            `
                        ))(this.getTypesByCategory())}
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
