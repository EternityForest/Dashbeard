/**
 * Bindings editor panel - edits data flow bindings between components.
 * Shows all bindings or only those connected to the selected component.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import type { BindingDefinition, Component } from '../../types';
import type { BoardRuntime } from '@/runtime';
import { filterRegistry } from '@/flow/filter';

/**
 * Bindings editor for connecting component ports.
 * Provides UI to view, create, and delete bindings with port autocomplete
 * and type compatibility filtering.
 */
@customElement('ds-editor-bindings')
export class BindingsEditor extends LitElement {
  /**
   * Editor state to track board and selection.
   */
  @property({ type: Object }) editorState?: EditorState;

  /**
   * Currently selected component (for filtering).
   */
  @property({ type: Object })
  selectedComponent: Component | null = null;

  /**
   * All components in the board.
   */
  @property({ type: Array })
  allComponents: Component[] = [];

  /**
   * Current bindings in the board.
   */
  @property({ type: Array })
  bindings: BindingDefinition[] = [];

  /**
   * Relevant bindings (connected to selected component or all if none selected).
   */
  @property({ type: Array })
  relevantBindings: BindingDefinition[] = [];

  /**
   * Form state for binding creation.
   */
  @property({ type: Object })
  formState: {
    fromPort: string;
    toPort: string;
    filters: Array<{ type: string; config: Record<string, unknown> }>;
  } = {
    fromPort: '',
    toPort: '',
    filters: [],
  };

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }

  connectedCallback(): void {
    super.connectedCallback();

    if (!this.editorState) {
      throw new Error('Bindings editor requires EditorState');
    }
    
    this.editorState.nodeGraphChanged.subscribe(() => {
      this.updateSelection();
    });

    // Subscribe to selection and board changes
    this.editorState.selectedComponentId.subscribe(() => {
      this.updateSelection();
    });

    

    this.editorState.board.subscribe(() => {
      this.updateBindings();
    });
  }

  /**
   * Update component selection and binding list.
   */
  private updateSelection(): void {
    const board = this.editorState?.board.get();
    const componentId = this.editorState?.selectedComponentId.get();

    if (!board) {
      this.selectedComponent = null;
      this.allComponents = [];
      this.bindings = [];
      this.relevantBindings = [];
      this.requestUpdate();
      return;
    }

    // Get all components
    this.allComponents = this.collectComponents(board.rootComponent);

    // Update selected component
    if (componentId) {
      this.selectedComponent =
        this.editorState?.findComponent(componentId) || null;
    } else {
      this.selectedComponent = null;
    }

    this.updateBindings();
    this.requestUpdate();
  }

  /**
   * Update bindings list and filter relevant ones.
   */
  private updateBindings(): void {
    const board = this.editorState?.board.get();
    this.bindings = board?.bindings || [];

    if (this.selectedComponent) {
      // Show bindings connected to selected component
      this.relevantBindings = this.bindings.filter((b) => {
        const [upstreamCompId] = b.fromPort.split('.');
        const [downstreamCompId] = b.toPort.split('.');
        return (
          upstreamCompId === this.selectedComponent!.id ||
          downstreamCompId === this.selectedComponent!.id
        );
      });
    } else {
      // Show all bindings
      this.relevantBindings = this.bindings;
    }

    this.requestUpdate();
  }

  /**
   * Get the board runtime instance from the editor.
   */
  private getRuntime(): BoardRuntime | null {
    return this.editorState?.editorComponent.renderer?.runtime || null;
  }

  /**
   * Get all available filters for binding.
   */
  private getAvailableFilters(): Array<{ type: string; displayName: string }> {
    return filterRegistry.getAll().map((manifest) => ({
      type: manifest.type,
      displayName: manifest.displayName,
    }));
  }

  /**
   * Add filter to the filter stack in form state.
   */
  private addFilterToStack(filterType: string): void {
    const manifest = filterRegistry.getManifest(filterType);
    if (!manifest) return;

    // Create default config from schema
    const defaultConfig: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(
      manifest.configSchema.properties || {}
    )) {
      if (typeof prop === 'object' && prop !== null && 'default' in prop) {
        defaultConfig[key] = (prop as any).default;
      }
    }

    this.formState.filters.push({
      type: filterType,
      config: defaultConfig,
    });
    this.requestUpdate();
  }

  /**
   * Remove filter from stack by index.
   */
  private removeFilterFromStack(index: number): void {
    this.formState.filters.splice(index, 1);
    this.requestUpdate();
  }

  /**
   * Collect all components from the tree.
   */
  private collectComponents(component: Component | null): Component[] {
    const result: Component[] = [];
    if (!component) return result;

    result.push(component);
    if (component.children) {
      for (const child of component.children) {
        result.push(...this.collectComponents(child));
      }
    }
    return result;
  }

  /**
   * Get all output ports for a component from the runtime.
   */
  private getOutputPorts(
    componentId: string
  ): Array<{ name: string; type: string }> {
    const runtime = this.getRuntime();
    if (!runtime) return [];

    const node = runtime.getNode(componentId);
    if (!node) return [];

    // Get actual output ports (downstream-facing ports on the node)
    const ports = Array.from(node.outputPorts.values());
    return ports.map((port) => ({
      name: port.name,
      type: port.type,
    }));
  }

  /**
   * Get all input ports for a component from the runtime.
   */
  private getInputPorts(
    componentId: string
  ): Array<{ name: string; type: string }> {
    const runtime = this.getRuntime();
    if (!runtime) return [];

    const node = runtime.getNode(componentId);
    if (!node) return [];

    // Get actual input ports (upstream-facing ports on the node)
    const ports = Array.from(node.inputPorts.values());
    return ports.map((port) => ({
      name: port.name,
      type: port.type,
    }));
  }

  /**
   * Get compatible input ports for an output port from the runtime.
   */
  private getCompatibleInputPorts(
    sourceComponentId: string,
    sourcePortName: string
  ): Array<{ componentId: string; portName: string; type: string }> {
    const runtime = this.getRuntime();
    if (!runtime) return [];

    const sourceNode = runtime.getNode(sourceComponentId);
    if (!sourceNode) return [];

    const sourcePort = sourceNode.getOutputPort(sourcePortName);
    if (!sourcePort) return [];

    const compatible: Array<{
      componentId: string;
      portName: string;
      type: string;
    }> = [];

    for (const component of this.allComponents) {
      if (component.id === sourceComponentId) continue; // Skip self-binding

      const targetNode = runtime.getNode(component.id);
      if (!targetNode) continue;

      for (const port of targetNode.inputPorts.values()) {
        if (
          sourcePort.type === port.type ||
          port.type.startsWith(sourcePort.type) ||
          sourcePort.type.startsWith(port.type) ||
          port.type === 'any'
        ) {
          compatible.push({
            componentId: component.id,
            portName: port.name,
            type: port.type,
          });
        }
      }
    }

    return compatible;
  }

  /**
   * Get compatible output ports for an input port from the runtime.
   */
  private getCompatibleOutputPorts(
    targetComponentId: string,
    targetPortName: string
  ): Array<{ componentId: string; portName: string; type: string }> {
    const runtime = this.getRuntime();
    if (!runtime) return [];

    const targetNode = runtime.getNode(targetComponentId);
    if (!targetNode) return [];

    const targetPort = targetNode.getInputPort(targetPortName);
    if (!targetPort) return [];

    const compatible: Array<{
      componentId: string;
      portName: string;
      type: string;
    }> = [];

    for (const component of this.allComponents) {
      if (component.id === targetComponentId) continue; // Skip self-binding

      const sourceNode = runtime.getNode(component.id);
      if (!sourceNode) continue;

      for (const port of sourceNode.outputPorts.values()) {
        if (
          port.type === targetPort.type ||
          port.type.startsWith(targetPort.type) ||
          targetPort.type.startsWith(port.type) ||
          targetPort.type === 'any'
        ) {
          compatible.push({
            componentId: component.id,
            portName: port.name,
            type: port.type,
          });
        }
      }
    }

    return compatible;
  }

  /**
   * Handle binding deletion.
   */
  private async handleDeleteBinding(bindingId: string): Promise<void> {
    if (!this.editorState) return;

    const board = this.editorState.board.get();
    if (!board) return;

    const binding = board.bindings.find((b) => b.id === bindingId);
    if (!binding) return;

    // Delete from runtime first
    const runtime = this.getRuntime();
    if (runtime) {
      try {
        runtime.getGraph().deleteBinding(binding);
      } catch (err) {
        alert(`Failed to delete binding in runtime: ${err}`);
        console.warn(`Failed to delete binding in runtime: ${err}`);
      }
    }

    // Update board definition
    board.bindings = board.bindings.filter((b) => b.id !== bindingId);
    this.editorState.board.set(board);
    this.editorState.markDirty();
    this.updateBindings();
    this.requestUpdate();
  }

  /**
   * Handle new binding creation.
   */
  private async handleCreateBinding(
    fromPort: string,
    toPort: string,
    filters?: Array<{ type: string; config: Record<string, unknown> }>
  ): Promise<void> {
    if (!this.editorState) return;

    const board = this.editorState.board.get();
    if (!board) return;

    // Validate format
    if (!fromPort.includes('.') || !toPort.includes('.')) {
      alert('Invalid port format. Use "componentId.portName"');
      return;
    }

    // Check for duplicate
    if (
      board.bindings.some(
        (b) => b.fromPort === fromPort && b.toPort === toPort
      )
    ) {
      alert('This binding already exists');
      return;
    }

    // Create binding
    const newBinding: BindingDefinition = {
      id: `binding-${Date.now()}`,
      fromPort: fromPort,
      toPort: toPort,
      ...(filters && filters.length > 0 && { filters }),
    };
    // Create in runtime first
    const runtime = this.getRuntime();
    if (runtime) {
      try {
        // For now, create binding without filters in runtime
        // Filter wiring will happen when the full binding is created
        await runtime.getGraph().loadBinding(newBinding);        
      } catch (err) {
        alert(`Failed to create binding: ${err.toString()}`);
        return;
      }
    }



    board.bindings.push(newBinding);
    this.editorState.board.set(board);
    this.editorState.markDirty();
    this.updateBindings();
    this.requestUpdate();
  }

  override render(): TemplateResult {
    return html`
      <div class="panel">
        <div class="panel-header">Bindings</div>
        <div class="panel-content">
          ${this.selectedComponent
            ? html`<div class="hint">
                Showing bindings for <strong>${this.selectedComponent.id}</strong>
              </div>`
            : html`<div class="hint">Showing all bindings</div>`}

          ${this.relevantBindings.length > 0
            ? html`
                <div class="bindings-list">
                  ${this.relevantBindings.map((binding) =>
                    this.renderBinding(binding)
                  )}
                </div>
              `
            : html`<div class="warning">No bindings</div>`}

          <!-- Create New Binding Section -->
          <div class="create-binding-section">
            <div class="section-header">Add Binding</div>
            ${this.renderCreateBindingForm()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single binding.
   */
  private renderBinding(binding: BindingDefinition): TemplateResult {
    const [upstreamCompId, upstreamPort] = binding.fromPort.split('.');
    const [downstreamCompId, downstreamPort] = binding.toPort.split('.');

    return html`
      <div class="binding-item">
        <div class="binding-flow">
          <div class="port-ref">
            <span class="comp-id">${upstreamCompId}</span>
            <span class="port-name">.${upstreamPort}</span>
          </div>
          <div class="arrow">→</div>
          <div class="port-ref">
            <span class="comp-id">${downstreamCompId}</span>
            <span class="port-name">.${downstreamPort}</span>
          </div>
        </div>
        <button
          class="delete-binding"
          @click="${() => this.handleDeleteBinding(binding.id)}"
          title="Delete binding"
        >
          ✕
        </button>
      </div>
    `;
  }

  /**
   * Handle upstream port selection change.
   */
  private handleFromPortChange(value: string): void {
    this.formState.fromPort = value;
    this.requestUpdate();
  }

  /**
   * Handle downstream port selection change.
   */
  private handleToPortChange(value: string): void {
    this.formState.toPort = value;
    this.requestUpdate();
  }

  /**
   * Get downstream port options - all if upstream not set, filtered if set.
   */
  private getToPortOptions(): Array<{
    componentId: string;
    portName: string;
    type: string;
  }> {
    if (!this.formState.fromPort) {
      // Show all input ports
      return this.allComponents.flatMap((comp) =>
        this.getInputPorts(comp.id).map((port) => ({
          componentId: comp.id,
          portName: port.name,
          type: port.type,
        }))
      );
    } else {
      // Show only compatible input ports
      const [fromCompId, fromPort] =
        this.formState.fromPort.split('.');
      return this.getCompatibleInputPorts(fromCompId, fromPort);
    }
  }

  /**
   * Get upstream port options - all if downstream not set, filtered if set.
   */
  private getFromPortOptions(): Array<{
    componentId: string;
    portName: string;
    type: string;
  }> {
    if (!this.formState.toPort) {
      // Show all output ports
      return this.allComponents.flatMap((comp) =>
        this.getOutputPorts(comp.id).map((port) => ({
          componentId: comp.id,
          portName: port.name,
          type: port.type,
        }))
      );
    } else {
      // Show only compatible output ports
      const [toCompId, toPort] =
        this.formState.toPort.split('.');
      return this.getCompatibleOutputPorts(toCompId, toPort);
    }
  }

  /**
   * Render the form to create a new binding.
   */
  private renderCreateBindingForm(): TemplateResult {
    const toPortOptions = this.getToPortOptions();
    const fromPortOptions = this.getFromPortOptions();

    return html`
      <form
        @submit="${(e: Event) => {
          e.preventDefault();
          if (this.formState.fromPort && this.formState.toPort) {
            this.handleCreateBinding(
              this.formState.fromPort,
              this.formState.toPort,
              this.formState.filters
            ).catch(alert);
            this.formState = { fromPort: '', toPort: '', filters: [] };
            this.requestUpdate();
          }
        }}"
      >
        <div class="form-group">
          <label>Source Port</label>
          <input
            type="text"
            name="upstream"
            placeholder="componentId.portName"
            list="upstream-ports"
            .value="${this.formState.fromPort}"
            @input="${(e: Event) =>
              this.handleFromPortChange(
                (e.target as HTMLInputElement).value
              )}"
          />
          <datalist id="upstream-ports">
            ${fromPortOptions.map(
              (port) => html`
                <option value="${port.componentId}.${port.portName}">
                  ${port.componentId}.${port.portName} (${port.type})
                </option>
              `
            )}
          </datalist>
          ${this.formState.toPort && fromPortOptions.length === 0
            ? html`<div class="error-hint">
                No compatible output ports for selected input port
              </div>`
            : ''}
        </div>

        <div class="form-group">
          <label>Target Port(downstream)</label>
          <input
            type="text"
            name="downstream"
            placeholder="componentId.portName"
            list="downstream-ports"
            .value="${this.formState.toPort}"
            @input="${(e: Event) =>
              this.handleToPortChange(
                (e.target as HTMLInputElement).value
              )}"
          />
          <datalist id="downstream-ports">
            ${toPortOptions.map(
              (port) => html`
                <option value="${port.componentId}.${port.portName}">
                  ${port.componentId}.${port.portName} (${port.type})
                </option>
              `
            )}
          </datalist>
          ${this.formState.fromPort && toPortOptions.length === 0
            ? html`<div class="error-hint">
                No compatible input ports for selected output port
              </div>`
            : ''}
        </div>

        <!-- Filter Stack Section -->
        ${this.renderFilterStackUI()}

        <button
          type="submit"
          class="create-button"
          ?disabled="${!this.formState.fromPort || !this.formState.toPort}"
        >
          Create Binding
        </button>
      </form>
    `;
  }

  /**
   * Render the filter stack UI section in the form.
   */
  private renderFilterStackUI(): TemplateResult {
    const availableFilters = this.getAvailableFilters();

    return html`
      <div class="form-group" style="border-top: 1px solid #ddd; padding-top: 12px; margin-top: 12px;">
        <label style="margin-bottom: 8px; display: block;">Filters (Optional)</label>

        ${this.formState.filters.length > 0
          ? html`
              <div style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 3px;">
                ${this.formState.filters.map(
                  (filter, index) => html`
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${index < this.formState.filters.length - 1 ? '8px' : '0'};">
                      <span style="font-size: 12px; font-weight: 600;">
                        ${filterRegistry.getManifest(filter.type)?.displayName || filter.type}
                      </span>
                      <button
                        type="button"
                        style="padding: 2px 6px; font-size: 11px; background: #fee; border: 1px solid #fcc; color: #c33; cursor: pointer; border-radius: 2px;"
                        @click="${() => this.removeFilterFromStack(index)}"
                      >
                        ✕
                      </button>
                    </div>
                  `
                )}
              </div>
            `
          : ''}

        <select
          @change="${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            if (select.value) {
              this.addFilterToStack(select.value);
              select.value = '';
            }
          }}"
          style="width: 100%; padding: 6px 8px; font-size: 12px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;"
        >
          <option value="">Add filter...</option>
          ${availableFilters.map(
            (filter) => html`<option value="${filter.type}">${filter.displayName}</option>`
          )}
        </select>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-bindings': BindingsEditor;
  }
}
