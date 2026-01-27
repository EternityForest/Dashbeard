/**
 * Bindings editor panel - edits data flow bindings between components.
 * Shows all bindings or only those connected to the selected component.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import type { BindingDefinition, Component } from '../../types';
import type { BoardRuntime } from '@/runtime';

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
  formState: { upstream: string; downstream: string } = {
    upstream: '',
    downstream: '',
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
        const [upstreamCompId] = b.upstream.split('.');
        const [downstreamCompId] = b.downstream.split('.');
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
    const ports = Array.from(node.getDeclaredDownstreamPorts().values());
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
    const ports = Array.from(node.getDeclaredUpstreamPorts().values());
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

    const sourcePort = sourceNode.getDownstreamPort(sourcePortName);
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

      for (const port of targetNode.getDeclaredUpstreamPorts().values()) {
        if (
          sourcePort.type === port.type ||
          sourcePort.type === 'any' ||
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

    const targetPort = targetNode.getUpstreamPort(targetPortName);
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

      for (const port of sourceNode.getDeclaredDownstreamPorts().values()) {
        if (
          port.type === targetPort.type ||
          port.type === 'any' ||
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
        await runtime.deleteBinding(binding.upstream, binding.downstream);
      } catch (err) {
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
    upstream: string,
    downstream: string
  ): Promise<void> {
    if (!this.editorState) return;

    const board = this.editorState.board.get();
    if (!board) return;

    // Validate format
    if (!upstream.includes('.') || !downstream.includes('.')) {
      alert('Invalid port format. Use "componentId.portName"');
      return;
    }

    // Check for duplicate
    if (
      board.bindings.some(
        (b) => b.upstream === upstream && b.downstream === downstream
      )
    ) {
      alert('This binding already exists');
      return;
    }

    // Create in runtime first
    const runtime = this.getRuntime();
    if (runtime) {
      try {
        await runtime.getGraph().addBinding(upstream, downstream);
      } catch (err) {
        alert(`Failed to create binding: ${err}`);
        return;
      }
    }

    // Create binding
    const binding: BindingDefinition = {
      id: `binding-${Date.now()}`,
      upstream,
      downstream,
    };

    board.bindings.push(binding);
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
    const [upstreamCompId, upstreamPort] = binding.upstream.split('.');
    const [downstreamCompId, downstreamPort] = binding.downstream.split('.');

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
  private handleUpstreamChange(value: string): void {
    this.formState.upstream = value;
    this.requestUpdate();
  }

  /**
   * Handle downstream port selection change.
   */
  private handleDownstreamChange(value: string): void {
    this.formState.downstream = value;
    this.requestUpdate();
  }

  /**
   * Get downstream port options - all if upstream not set, filtered if set.
   */
  private getDownstreamOptions(): Array<{
    componentId: string;
    portName: string;
    type: string;
  }> {
    if (!this.formState.upstream) {
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
      const [upstreamCompId, upstreamPort] =
        this.formState.upstream.split('.');
      return this.getCompatibleInputPorts(upstreamCompId, upstreamPort);
    }
  }

  /**
   * Get upstream port options - all if downstream not set, filtered if set.
   */
  private getUpstreamOptions(): Array<{
    componentId: string;
    portName: string;
    type: string;
  }> {
    if (!this.formState.downstream) {
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
      const [downstreamCompId, downstreamPort] =
        this.formState.downstream.split('.');
      return this.getCompatibleOutputPorts(downstreamCompId, downstreamPort);
    }
  }

  /**
   * Render the form to create a new binding.
   */
  private renderCreateBindingForm(): TemplateResult {
    const downstreamOptions = this.getDownstreamOptions();
    const upstreamOptions = this.getUpstreamOptions();

    return html`
      <form
        @submit="${(e: Event) => {
          e.preventDefault();
          if (this.formState.upstream && this.formState.downstream) {
            this.handleCreateBinding(
              this.formState.upstream,
              this.formState.downstream
            ).catch(alert);
            this.formState = { upstream: '', downstream: '' };
            this.requestUpdate();
          }
        }}"
      >
        <div class="form-group">
          <label>Source Port (upstream)</label>
          <input
            type="text"
            name="upstream"
            placeholder="componentId.portName"
            list="upstream-ports"
            .value="${this.formState.upstream}"
            @input="${(e: Event) =>
              this.handleUpstreamChange(
                (e.target as HTMLInputElement).value
              )}"
          />
          <datalist id="upstream-ports">
            ${upstreamOptions.map(
              (port) => html`
                <option value="${port.componentId}.${port.portName}">
                  ${port.componentId}.${port.portName} (${port.type})
                </option>
              `
            )}
          </datalist>
          ${this.formState.downstream && upstreamOptions.length === 0
            ? html`<div class="error-hint">
                No compatible output ports for selected input port
              </div>`
            : ''}
        </div>

        <div class="form-group">
          <label>Target Port (downstream)</label>
          <input
            type="text"
            name="downstream"
            placeholder="componentId.portName"
            list="downstream-ports"
            .value="${this.formState.downstream}"
            @input="${(e: Event) =>
              this.handleDownstreamChange(
                (e.target as HTMLInputElement).value
              )}"
          />
          <datalist id="downstream-ports">
            ${downstreamOptions.map(
              (port) => html`
                <option value="${port.componentId}.${port.portName}">
                  ${port.componentId}.${port.portName} (${port.type})
                </option>
              `
            )}
          </datalist>
          ${this.formState.upstream && downstreamOptions.length === 0
            ? html`<div class="error-hint">
                No compatible input ports for selected output port
              </div>`
            : ''}
        </div>

        <button
          type="submit"
          class="create-button"
          ?disabled="${!this.formState.upstream || !this.formState.downstream}"
        >
          Create Binding
        </button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-bindings': BindingsEditor;
  }
}
