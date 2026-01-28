/**
 * Base class for all dashboard components.
 * Bridges Lit.js web components with the data flow system (Node).
 */

import { LitElement, html, css, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Node } from '@/flow/node';
import { PortData } from '@/flow/data-types';
import type { ComponentConfig } from '@/boards/board-types';
import type { ComponentTypeSchema } from '@/editor';
import { SourceType } from '@/flow/port';
/**
 * Base class for dashboard components.
 * Each component:
 * - Extends LitElement (Lit.js web component)
 * - Holds a Node (data flow system)
 * - Manages reactive UI and data flow
 */
export class DashboardComponent extends LitElement {
  static readonly typeSchema: ComponentTypeSchema = {
    name: '',
    displayName: 'Base Component',
    category: 'data',
    configSchema: {
      type: 'object',
      properties: {},
    }
  }

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }

  
  public static getDefaultConfig(): ComponentConfig {
    const c: ComponentConfig = { 
      id: this.typeSchema.name+'-'+Date.now(),
      type: this.typeSchema.name,
      config: {},
      children: [],
    }
    for (const [key, propSchema] of Object.entries(
      this?.typeSchema?.configSchema?.properties || {}
    )) {
      if (propSchema.default !== undefined) {
        c.config[key] = propSchema.default;
      }
    }
    return c
  }
  /**
   * Unique identifier for this component instance.
   */
  @property() componentId: string = '';

  /**
   * The actual Node instance this component wraps.
   * Handles all data flow logic.
   */
  protected node: Node;

  public allComponents: Map<string, DashboardComponent> = new Map();
  /**
   * Configuration for this component (reactive).
   * Updated when node config changes.
   */
  @property({ type: Object }) componentConfig: ComponentConfig;

  /**
   * Port input/output data (for display/debugging).
   * Subclasses can use this to show data flow.
   */
  @property({ type: Object }) portData: Record<string, PortData | null> = {};

  /**Called when node graph is ready and connections
   are made.
   */
  onGraphReady(): void {}

  //**Tell node to claim any unrendered childred it
  // has in the shadow DOM */
  attachChildren(_allComponents: Map<string, DashboardComponent>) {}

  constructor(config: ComponentConfig) {
    super();
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('componentId is required');
    }
    this.componentConfig = config;
    this.id = config.id;
    this.node = new Node(this.id);
  }

  /**
   * Called when node configuration changes.
   * Subclasses can override to respond to config updates.
   */
  public onConfigUpdate(): void {
    // Default: request update to re-render
    this.requestUpdate();
  }


  protected subscribeToPort(
    portName: string,
    onData: (data: PortData, sourceType: SourceType) => Promise<void>
  ): () => void {
    if (!this.node) {
      throw new Error('Node not set');
    }

    const port =
      this.node.getOutputPort(portName) ||
      this.node.getInputPort(portName);

    if (!port) {
      throw new Error(`Port not found: ${portName}`);
    }

    const handler = async (data: PortData, sourceType: SourceType) => {
      this.portData[portName] = data;
      await onData(data, sourceType);
      this.requestUpdate();
    };

    return port.addDataHandler(handler);
  }

  /**
   * Send data out through an output port.
   * Used by UI handlers to push data to connected components.
   *
   * @param portName Name of the output port
   * @param value The value to send
   */
  protected async sendData(portName: string, value: unknown): Promise<void> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let port = this.node.getOutputPort(portName);

    if (!port) {
       port = this.node.getInputPort(portName);
    }

    if (!port) {
      throw new Error(`Output port not found: ${portName}`);
    }

    const { createPortData } = await import('@/flow/data-types');
    const data = createPortData(value);
    await port.onNewData(data, SourceType.PortOwner);
  }

  /**
   * Get the underlying Node.
   */
  getNode(): Node {
    if (!this.node) {
      this.node = new Node(this.id);
    }
    return this.node;
  }

  /**
   * Base render method - shows placeholder.
   * Subclasses should override.
   */
  render(): TemplateResult {
    return html`<div style="padding: 10px; border: 1px solid #ccc;">
      <div><strong>${this.id}</strong></div>
      <div style="font-size: 0.85em; color: #666;">
        Component not implemented yet
      </div>
    </div>`;
  }

  /**
   * Request that this component be completely destroyed and recreated.
   * Used when configuration changes require port restructuring (e.g., type changes).
   * Preserves ID, children, and compatible bindings.
   */
  protected async requestRecreation(): Promise<void> {
    // Dispatch custom event that bubbles up to runtime
    const event = new CustomEvent('component-recreation-requested', {
      detail: { componentId: this.id },
      bubbles: true,
      cancelable: false,
    });
    this.dispatchEvent(event);
  }

  /**
   * Clean up on disconnect.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  /**
   * Define component-specific styles.
   * Subclasses can extend with additional styles.
   */
  static styles = css`
    :host {
      display: block;
    }
  `;
}

customElements.define('ds-dashboard-component', DashboardComponent);

export type DashboardComponentConstructor = typeof DashboardComponent;
