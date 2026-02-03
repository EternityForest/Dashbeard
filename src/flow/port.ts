/**
 * Port class representing a connection point in the data flow graph.
 * Ports are the mechanism for connecting nodes together.
 */

import { Observer, Observable } from '../core/observable';
import { PortData } from './data-types';
import type { Node } from './node';

export enum SourceType {
  Upstream,
  Downstream,
  PortOwner,
}

/**
 * Type guard for PortData.
 */
function isPortData(obj: unknown): obj is PortData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as Record<string, unknown>;
  return (
    typeof data.value !== 'undefined' && typeof data.timestamp === 'number'
  );
}

/**
 * Schema for port data validation.
 * Subclasses may override to provide stricter validation.
 */
export interface PortSchema {
  type: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Callback invoked when new data arrives at a port.
 * Async to support processing, filtering, and propagation.
 */
export type PortDataHandler = (
  data: PortData,
  sourceType: SourceType
) => Promise<void>;

/**
 * A port is a connection point for data flow in the graph.
 *
 * Ports can be:
 * - **Inputs**: Only connect to one output port
 * - **Outputs**: Can connect to many input ports
 *
 * Upstream ports are considered the source of truth for data.
 * Downstream ports are consumers of data.
 */
export class Port {
  /**
   * Human-readable name for this port.
   * Must be unique within a node.
   */
  readonly name: string;

  /**
   * Determines connection compatibility.
   * Upstream and downstream ports must have matching types.
   */
  readonly type: string;

  /**
   * True if this is a downstream-facing port (consumer).
   * False if this is an upstream-facing port (producer).
   */
  readonly isOutput: boolean;

  /**
   * JSON Schema describing the data format for this port.
   */
  readonly schema: PortSchema;

  /** Observable for tracking port state changes */
  private stateChanged = new Observable({});

  /* At most 1 upstream connection */
  private upstreamConnection: Port | null = null;

  /**
   * Handlers for incoming data.
   * Multiple handlers for same port (e.g., multiple observers).
   */
  private handlers = new Set<PortDataHandler>();

  private _upstreamBindingUnsubscribers: Set<() => void> = new Set();

  /**
   * Most recent data received at this port.
   * Used for default values and debugging.
   */
  private lastData: PortData | null = null;

  public parentNode: Node | null = null;

  constructor(
    name: string,
    type: string,
    isOutput: boolean,
    schema: PortSchema = { type: 'any' }
  ) {
    this.name = name;
    this.type = type;
    this.isOutput = isOutput;
    this.schema = schema;
  }

  /**
   * Get the upstream-facing port connected to this port.
   * Only meaningful for downstream-facing ports.
   * Upstream ports return null.
   */
  getUpstreamPort(): Port | null {
    if (this.isOutput) {
      // Downstream ports can have multiple downstream connections
      return null;
    }
    // Upstream ports have at most 1 downstream connection
    return this.upstreamConnection;
  }

  /**
   * Check if this upstream facing port has an upstream connection.
   */
  hasConnection(): boolean {
    if (this.isOutput) {
      throw new Error('hasConnection() called on upstream port');
    }
    return this.upstreamConnection !== null;
  }

  /**
   * Get the last data received at this port.
   */
  getLastData(): PortData | null {
    return this.lastData;
  }

  /**
   * Handle new data arriving at this port.
   * Called by the binding system or directly by publishers.
   *
   * @param data The new data
   * @param sourceType The source of the data
   */
  async onNewData(data: PortData, sourceType: SourceType): Promise<void> {
    if (!isPortData(data)) {
      throw new Error(
        `Invalid PortData at ${this.name}: ${JSON.stringify(data)}`
      );
    }

    this.lastData = data;

    // Invoke all handlers
    const handlers = Array.from(this.handlers);
    const promises = handlers.map((handler) =>
      Promise.resolve(handler(data, sourceType)).catch((err) => {
        console.error(`Error in port handler for ${this.name}:`, err);
      })
    );

    await Promise.all(promises);

    // Notify state observers
    this.stateChanged.set({ timestamp: Date.now() });
  }

  /**
   * Request fresh data from the source.
   * For upstream ports, propagates to the upstream node.
   * For downstream ports, this is a no-op.
   */
  async requestNewData(): Promise<void> {
    // Placeholder for future pull-based data flow
    // For now, data is push-based via onNewData()
  }

  /**
   * Subscribe to port state changes (not data, but connectivity changes).
   * Useful for UI binding.
   */
  onChange(observer: Observer<object>): () => void {
    return this.stateChanged.onChange(observer);
  }

  /**
   * Register a data handler for this port.
   *
   * @param handler Callback invoked on new data
   * @returns Function to unregister handler
   */
  addDataHandler(handler: PortDataHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  getFullName(): string {
    return `${this.name} (${this.type})`;
  }
  /**
   * Establish a connection between ports.
   * Called by NodeGraph during binding creation.
   * */
  async connectToOutput(upstreamPort: Port): Promise<void> {
    await upstreamPort.connectToInput(this);
  }

  /**
   * Establish a connection between ports.
   * Called by NodeGraph during binding creation.
   *
   * @param downstreamPort The port to connect to
   */
  async connectToInput(downstreamPort: Port): Promise<void> {
    // Validate that this is an upstream port
    if (!this.isOutput) {
      throw new Error(`${this.getFullName()} is not a downstream-facing port`);
    }

    // Validate that target is a downstream port
    if (downstreamPort.isOutput) {
      throw new Error(
        `Cannot connect to downstream-facing port ${downstreamPort.getFullName()}`
      );
    }

    // Validate type match
    if (this.type !== downstreamPort.type) {
      throw new Error(
        `Port type mismatch: ${this.getFullName()} (${this.type}) ` +
          `→ ${downstreamPort.getFullName()} (${downstreamPort.type})`
      );
    }

    if (this.type && downstreamPort.type && this.type !== downstreamPort.type) {
      throw new Error(
        `Port type mismatch: ${this.getFullName()} (${this.type}) ` +
          `→ ${downstreamPort.getFullName()} (${downstreamPort.type})`
      );
    }

    if (downstreamPort === this) {
      throw new Error(
        `Cannot connect to self: ${downstreamPort.getFullName()}`
      );
    }

    if (downstreamPort.upstreamConnection !== null) {
      console.warn(
        `Upstream port ${this.name} already connected ` +
          `to ${downstreamPort.upstreamConnection.getFullName()}`
      );
      if (downstreamPort.upstreamConnection !== this) {
        throw new Error(
          `Upstream port ${this.name} already connected ` +
            `to ${downstreamPort.upstreamConnection.getFullName()}`
        );
      }
    }

    // Establish connection
    downstreamPort.upstreamConnection = this;

    // Add data propagation handler on UPSTREAM to send to downstream
    const x = this.addDataHandler(async (data, sourceType) => {
      if (sourceType === SourceType.Downstream) return;
      await downstreamPort.onNewData(data, SourceType.Upstream);
    });
    downstreamPort._upstreamBindingUnsubscribers.add(x);

    const y = downstreamPort.addDataHandler(async (data, sourceType) => {
      // Don't make a loop.
      if (sourceType === SourceType.Upstream) return;
      await this.onNewData(data, SourceType.Downstream);
    });
    downstreamPort._upstreamBindingUnsubscribers.add(y);

    // If we have last data, propagate it to downstream
    if (this.lastData !== null) {
      await downstreamPort
        .onNewData(this.lastData, SourceType.PortOwner)
        .catch((err) => {
          console.error(`Error propagating data on connect: ${String(err)}`);
        });
    }
  }

  /**
   * Disconnect this port from its upstream connection.
   */
  disconnectFromOutput(): void {
    if (this.isOutput) {
      throw new Error('disconnectFromOutput() called on input port');
    }

    for (const unsub of this._upstreamBindingUnsubscribers) {
      unsub();
    }

    this.upstreamConnection = null;
    this.stateChanged.set({ timestamp: Date.now() });
  }

  /**
   * Clear all handlers and connections.
   * Called during node cleanup.
   */
  destroy(): void {
    this.handlers.clear();
    for (const unsub of this._upstreamBindingUnsubscribers) {
      unsub();
    }
    this.upstreamConnection = null;
    this.stateChanged.clearObservers();
  }
}
