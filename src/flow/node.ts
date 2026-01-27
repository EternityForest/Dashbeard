/* eslint-disable @typescript-eslint/require-await */
/**
 * Base Node class for the data flow graph.
 * Every component in the system maps to exactly one Node.
 */

import { Port } from './port';


/**
 * Base class for all nodes in the data flow graph.
 * Nodes represent processing units that consume and produce data.
 * They connect to other nodes via ports.
 */
export class Node {

  /**
   * Unique identifier for this node instance.
   */
  readonly id: string;

  /**
   * Map of downstream-facing ports (consumers).
   * Keyed by port name.
   */
  protected downstreamPorts: Map<string, Port> = new Map();

  /**
   * Map of upstream-facing ports (producers).
   * Keyed by port name.
   */
  protected upstreamPorts: Map<string, Port> = new Map();

  /**
   * Whether this node is currently active and running.
   */
  private isReady = false;

  private onReadyListeners: (() => void)[] = []; 

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get all declared downstream-facing ports.
   * Subclasses must declare all ports upfront.
   *
   * @returns Map of port name to Port
   */
  getDeclaredDownstreamPorts(): Map<string, Port> {
    return this.downstreamPorts;
  }

  /**
   * Get all declared upstream-facing ports.
   * Subclasses must declare all ports upfront.
   *
   * @returns Map of port name to Port
   */
  getDeclaredUpstreamPorts(): Map<string, Port> {
    return this.upstreamPorts;
  }

  addPort(port: Port): Port {
    port.parentNode = this;
    if (port.isUpstream) {
      this.downstreamPorts.set(port.name, port);
    } else {
      this.upstreamPorts.set(port.name, port);
    }
    return port;
  } 

  /**
   * Initialize the node.
   * Called by NodeGraph after the node is added.
   * Override to perform setup (e.g., subscribe to config changes).
   */
  async onReady(): Promise<void> {
    if(this.isReady) {
      return;
    }
    for (const listener of this.onReadyListeners) {
      listener();
    }
    this.isReady = true;

  }

  addOnReadyListener(listener: () => void): void {
    this.onReadyListeners.push(listener);
    if (this.isReady) {
      listener();
    }
  }

  /**
   * Clean up the node.
   * Called by NodeGraph before the node is removed.
   * Override to perform cleanup (e.g., clear subscriptions).
   */
  async onDestroy(): Promise<void> {
    this.isReady = false;
    this.downstreamPorts.clear();
    this.upstreamPorts.clear();
  }

  /**
   * Check if this node is ready (has been initialized).
   */
  getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Get a specific downstream port by name.
   */
  getDownstreamPort(name: string): Port | undefined {
    return this.downstreamPorts.get(name);
  }

  /**
   * Get a specific upstream port by name.
   */
  getUpstreamPort(name: string): Port | undefined {
    return this.upstreamPorts.get(name);
  }

  listPorts(): string[] {
    const ports =[...this.downstreamPorts.values(), ...this.upstreamPorts.values()];
    return ports.map(port => port.name);
  }

  /**
   * Initialize all ports for this node.
   * Called automatically by NodeGraph.
   * Stores references to all ports for later access.
   */
  initializePorts(): void {
    this.downstreamPorts = this.getDeclaredDownstreamPorts();
    this.upstreamPorts = this.getDeclaredUpstreamPorts();
  }
}
