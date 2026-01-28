/**
 * Runtime representation of a binding with its filter stack.
 * Manages the actual data flow from upstream → filters → downstream.
 */

import { Filter, filterRegistry } from './filter';
import { Node } from './node';
import type { NodeGraph } from './node-graph';
import type { BindingDefinition } from '../boards/board-types';

/**
 * Represents a binding at runtime.
 * Holds the upstream/downstream node references and any filters applied.
 */
export class LoadedBinding {
  /**
   * Binding ID from board definition.
   */
  id: string;

  /**
   * Upstream component node (source of data).
   */
  sourceNode: Node;
  sourcePortName: string;

  /**
   * Downstream component node (destination of data).
   */
  destinationNode: Node;
  destinationPortName: string;

  /**
   * Filters applied in sequence.
   * Data flows: upstream → filter[0] → filter[1] → ... → downstream
   */
  filters: Filter[] = [];

  parentGraph: NodeGraph;

  config: BindingDefinition;

  constructor(parentGraph: NodeGraph, binding: BindingDefinition) {
    this.parentGraph = parentGraph;

    this.config = binding;
    const [upstreamCompId, upstreamPortName] = binding.fromPort.split('.');
    const [downstreamCompId, downstreamPortName] = binding.toPort.split('.');

    const upstreamNode = this.parentGraph.getNode(upstreamCompId);
    const downstreamNode = this.parentGraph.getNode(downstreamCompId);

    if (!upstreamNode || !downstreamNode) {
      throw new Error(
        `Binding references non-existent component: ${binding.fromPort} → ${binding.toPort}`
      );
    }

    // Instantiate filters if present
    if (binding.filters && binding.filters.length > 0) {
      let currentType =
        upstreamNode.getOutputPort(upstreamPortName)?.type || 'any';

      for (let i = 0; i < binding.filters.length; i++) {
        const filterDef = binding.filters[i];
        const manifest = filterRegistry.getManifest(filterDef.type);

        if (!manifest) {
          throw new Error(`Filter type not registered: "${filterDef.type}"`);
        }

        // Create filter instance
        const filterId = `${binding.id}-filter-${i}`;
        const filter = new Filter(manifest, filterDef.config, filterId);

        // Add filter node to graph
        this.parentGraph.addNode(filter.node);

        // Setup ports with current upstream type
        filter.node.setupPorts(currentType);

        this.addFilter(filter);

        // Update type for next filter/downstream
        currentType = filter.getOutputType(currentType);
      }
    }

    // Store the loaded binding

    this.id = binding.id;
    this.sourceNode = upstreamNode;
    this.sourcePortName = upstreamPortName;
    this.destinationNode = downstreamNode;
    this.destinationPortName = downstreamPortName;
  }

  destroy(): void {
    for (const filter of this.filters) {
      filter.destroy();
    }
    this.filters = [];
  }

  /**
   * Add a filter to the filter stack.
   * Filters are applied in order: first added = closest to upstream.
   */
  addFilter(filter: Filter): void {
    this.filters.push(filter);
  }

  /**
   * Get the actual downstream port type after applying filters.
   * If filters exist, check against the last filter's output type.
   * Otherwise use upstream port type.
   */
  getEffectiveDownstreamType(upstreamType: string): string {
    if (this.filters.length === 0) {
      return upstreamType;
    }
    // Output type of the last filter in the stack
    return this.filters[this.filters.length - 1].getOutputType(upstreamType);
  }

  /**
   * Get intermediate type after applying N filters.
   * Useful for wiring filter chain.
   */
  getIntermediateType(filterIndex: number, upstreamType: string): string {
    if (filterIndex < 0 || filterIndex >= this.filters.length) {
      return upstreamType;
    }
    // Calculate cumulative output type up to this filter
    let currentType = upstreamType;
    for (let i = 0; i <= filterIndex; i++) {
      currentType = this.filters[i].getOutputType(currentType);
    }
    return currentType;
  }


  async doConnect(): Promise<void> {
    const port = this.sourceNode.getOutputPort(this.sourcePortName);
    const destinationPort = this.destinationNode.getInputPort(
      this.destinationPortName
    );

    if (this.filters.length > 0) {
      // Connect the first filter
      await this.filters[0].node.inputPort?.connectToOutput(port);

      for (const filter of this.filters.slice(1)) {
        await filter.node.inputPort?.connectToOutput(filter.node.outputPort!);
      }

      await this.filters[
        this.filters.length - 1
      ].node.outputPort?.connectToInput(destinationPort);
    } else {
      await port.connectToInput(destinationPort);
    }
  }

  disconnect() {
    const port = this.sourceNode.getOutputPort(this.sourcePortName);

    port.disconnectFromUpstream();
  }
}
