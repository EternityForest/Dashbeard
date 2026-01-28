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
 public inputPorts: Map<string, Port> = new Map();

  /**
   * Map of upstream-facing ports (producers).
   * Keyed by port name.
   */
  public outputPorts: Map<string, Port> = new Map();

  /**
   * Whether this node is currently active and running.
   */
  private isReady = false;

  private onReadyListeners: (() => void)[] = []; 

  constructor(id: string) {
    this.id = id;
  }

  destroy(): void {

    this.inputPorts.forEach((port) => {
      port.destroy();
    })
    this.outputPorts.forEach((port) => {
      port.destroy();
    })
    this.onReadyListeners = []; 
    this.inputPorts.clear();
    this.outputPorts.clear();
  }

  /**
   * Get all declared upstream-facing ports.
   * Subclasses must declare all ports upfront.
   *
   * @returns Map of port name to Port
   */
  getDeclaredOutputPorts(): Map<string, Port> {
    return this.outputPorts;
  }

  addPort(port: Port): Port {
    port.parentNode = this;
    if (!port.isOutput) {
      this.inputPorts.set(port.name, port);
    } else {
      this.outputPorts.set(port.name, port);
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
    this.inputPorts.clear();
    this.outputPorts.clear();
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
  getInputPort(name: string): Port {
    if(!this.inputPorts.has(name)) {
      throw new Error(`Port not found: ${name} on ${this.id}`);
    }
    return this.inputPorts.get(name)!;
  }

  /**
   * Get a specific upstream port by name.
   */
  getOutputPort(name: string): Port {
    if(!this.outputPorts.has(name)) {
      throw new Error(`Port not found: ${name} on ${this.id}`);
    }
    return this.outputPorts.get(name)!;
  }

  listPorts(): string[] {
    const ports =[...this.inputPorts.values(), ...this.outputPorts.values()];
    return ports.map(port => port.name);
  }

}
