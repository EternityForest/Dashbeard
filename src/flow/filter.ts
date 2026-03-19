/**
 * Filter system for data transformation in bindings.
 * Filters are applied in a stack along a binding path.
 * Each filter transforms data flowing through it.
 */

import { Node } from './node';
import { Port, SourceType } from './port';

/**
 * Base class for filter implementations.
 * Subclasses implement the actual transformation logic.
 */
export abstract class FilterImplementation {
  /**
   * Constructor receives the initial upstream value.
   */
  constructor(public config: Record<string, unknown>) {}

  /**
   * Transform data flowing forward (upstream → downstream).
   * Called when data arrives at the filter's input port.
   *
   * @param inputValue The value from the upstream port
   * @returns The transformed value to send to output port
   */
  abstract filterInput(inputValue: unknown): unknown;

  /**
   * Transform data flowing backward (downstream → upstream).
   * Called when data comes back from the downstream port.
   * Optional - only needed for bidirectional filters.
   *
   * @param outputValue The value from the downstream port
   * @returns The transformed value to send back to input port
   */
  filterOutput(outputValue: unknown): unknown {
    // Default: pass through unchanged
    return outputValue;
  }
}
/**
 * Static port declaration for additional filter ports.
 * Beyond the main input/output, filters can have other ports.
 */
export interface FilterPortDeclaration {
  name: string;
  type: string;
  description: string;
}

/**
 * Manifest declaring a filter type.
 * Filters declare their config schema, type behavior, and static ports.
 */
export interface FilterManifest {
  type: string;
  displayName: string;
  description: string;

  // JSON Schema for filter configuration
  configSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };

  // Input/output type information
  inputType?: string;  // Type filter accepts (default 'any')
  outputType?: string; // Type filter produces (default: same as input)

  // Additional static ports beyond main input/output
  staticPorts?: {
    inputs?: FilterPortDeclaration[];
    outputs?: FilterPortDeclaration[];
  };

  // Create ports dynamically based on upstream type
  // Must work without knowing downstream type
  createPorts(upstreamType: string): {
    input: { name: string; type: string };
    output: { name: string; type: string };
  };

  // Factory function to create a filter implementation instance
  createImplementation(config: Record<string, unknown>): FilterImplementation;
}

/**
 * Filter instance configuration (stored in binding).
 */
export interface FilterStackItem {
  type: string; // References FilterManifest.type
  config: Record<string, unknown>;
}

/**
 * Registry of available filters.
 */
export class FilterRegistry {
  private filters = new Map<string, FilterManifest>();

  register(manifest: FilterManifest): void {
    this.filters.set(manifest.type, manifest);
  }

  getManifest(type: string): FilterManifest | undefined {
    return this.filters.get(type);
  }

  getAll(): FilterManifest[] {
    return Array.from(this.filters.values());
  }
}

/**
 * Runtime instance of a filter.
 * Created from FilterStackItem config.
 */
export class Filter {
  manifest: FilterManifest;
  config: Record<string, unknown>;
  node: FilterNode;
  implementation: FilterImplementation;

  constructor(manifest: FilterManifest, config: Record<string, unknown>, filterId: string) {
    this.manifest = manifest;
    this.config = config;
    this.implementation = manifest.createImplementation(config);
    this.node = new FilterNode(filterId, manifest, this.implementation);
  }

  /**
   * Get the output type this filter produces.
   * If outputType declared, use that. Otherwise same as input.
   */
  getOutputType(inputType: string): string {
    return this.manifest.outputType || inputType;
  }

  destroy(): void {
    this.node.destroy();
  }
}

/**
 * Node representing a filter in the data flow graph.
 */
export class FilterNode extends Node {
  manifest: FilterManifest;
  implementation: FilterImplementation;
  inputPort: Port | undefined;
  outputPort: Port | undefined;

  constructor(id: string, manifest: FilterManifest, implementation: FilterImplementation) {
    super(id);
    this.manifest = manifest;
    this.implementation = implementation;
  }

  /**
   * Set up the filter's ports based on the upstream type.
   * Called after the filter is added to the graph.
   */
  setupPorts(upstreamType: string): void {
    // Create main input/output ports
    const ports = this.manifest.createPorts(upstreamType);

    const inputPort = new Port(ports.input.name, ports.input.type, false);
    const outputPort = new Port(ports.output.name, ports.output.type, true);

    this.addPort(inputPort);
    this.addPort(outputPort);

    this.inputPort = inputPort;
    this.outputPort = outputPort;

    // Wire up data handlers for forward data flow
    // When data arrives at input, transform it and send to output
    inputPort.addDataHandler(async (data, source) => {
      if(source != SourceType.Upstream) return;
      const transformedValue = await this.onData(data.value);
      if (transformedValue !== null && transformedValue !== undefined) {
        await outputPort.onNewData(
          { value: transformedValue, timestamp: Date.now() },
          SourceType.PortOwner
        );
      }
    });

    // Wire up reverse data flow for bidirectional filters
    // When data arrives at output from downstream, transform backward and send to input
    outputPort.addDataHandler(async (data, source) => {
      if(source != SourceType.Downstream) return;

      const transformedValue = this.implementation.filterOutput(data.value);
      if (transformedValue !== null && transformedValue !== undefined) {
        // Propagate transformed data back upstream through the input port
        // This enables bidirectional filters to work properly
        await inputPort.onNewData(
          { value: transformedValue, timestamp: Date.now() },
          SourceType.PortOwner
        );
      }
    });

    // Add static additional ports
    if (this.manifest.staticPorts?.inputs) {
      for (const portDecl of this.manifest.staticPorts.inputs) {
        this.addPort(new Port(portDecl.name, portDecl.type, false));
      }
    }

    if (this.manifest.staticPorts?.outputs) {
      for (const portDecl of this.manifest.staticPorts.outputs) {
        this.addPort(new Port(portDecl.name, portDecl.type, true));
      }
    }
  }

  /**
   * Transform data flowing through the filter.
   * Uses the filter implementation's filterInput method.
   */
  async onData(inputData: unknown): Promise<unknown> {
    return this.implementation.filterInput(inputData);
  }
}

/**
 * Global filter registry instance.
 */
export const filterRegistry = new FilterRegistry();

