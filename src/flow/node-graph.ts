/**
 * NodeGraph manages the data flow graph.
 * Responsible for:
 * - Node registration and lifecycle
 * - Binding creation with validation
 * - Cycle detection
 * - Port connection management
 */

import { Node } from './node';
import type { BindingDefinition } from '../boards/board-types';
import { LoadedBinding } from './loaded-binding';
import { Filter, filterRegistry } from '@/flow/filter';
import { Observable } from '@/core/observable';
/**
 * NodeGraph manages all nodes and their connections in the data flow system.
 * Enforces invariants:
 * - No cycles
 * - Valid port connections
 * - Proper node lifecycle
 */
export class NodeGraph {
  /**
   * Map of node ID to node instance.
   */
  private nodes = new Map<string, Node>();

  /**
   * Map of binding IDs to their LoadedBinding instances.
   * Holds the filter stack and node wiring for each binding.
   */
  private loadedBindings = new Map<string, LoadedBinding>();

  public nodeGraphRefreshed: Observable<null> = new Observable<null>(null);

  /**
   * Track which nodes have been initialized.
   */
  private readyNodes = new Set<string>();

  /**
   * Add a node to the graph.
   * Initialize its ports but don't call onReady yet.
   *
   * @param node The node to add
   * @throws If node ID already exists
   */
  addNode(node: Node): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with ID "${node.id}" already exists`);
    }

    this.nodes.set(node.id, node);
  }

  getBindings(): LoadedBinding[] {
    return Array.from(this.loadedBindings.values());
  }

  /**
   * Remove a node from the graph.
   * Automatically disconnects all bindings to/from this node.
   * Calls onDestroy on the node.
   *
   * @param nodeId The ID of the node to remove
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node with ID "${nodeId}" not found`);
    }

    const affectedBindings = Array.from(this.loadedBindings.values()).filter(
      (b) => b.sourceNode.id === nodeId || b.destinationNode.id === nodeId
    )

    for (const binding of affectedBindings) {
      this.deleteBinding(binding.config);
    }

    // Clean up
    if (this.readyNodes.has(nodeId)) {
      await node.onDestroy();
      this.readyNodes.delete(nodeId);
    }

    this.nodes.delete(nodeId);
  }

  canBind(upstreamPort: string, downstreamPort: string): boolean {
    const [upstreamNodeId, upstreamPortName] = upstreamPort.split('.');
    const [downstreamNodeId, downstreamPortName] = downstreamPort.split('.');
    const upstreamNode = this.nodes.get(upstreamNodeId);
    const downstreamNode = this.nodes.get(downstreamNodeId);
    if (!upstreamNode || !downstreamNode) {
      return false;
    }

    if (upstreamNodeId === downstreamNodeId) {
      return false;
    }
    if (upstreamPortName === downstreamPortName) {
      return false;
    }
    const upstreamPortObj = upstreamNode.getInputPort(upstreamPortName);
    const downstreamPortObj =
      downstreamNode.getOutputPort(downstreamPortName);

    if (!upstreamPortObj || !downstreamPortObj) {
      return false;
    }

    if (
      (upstreamPortObj.type + '.').startsWith(downstreamPortObj.type + '.') ||
      (downstreamPortObj.type + '.').startsWith(upstreamPortObj.type + '.')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Load a binding with optional filter stack.
   * Creates filter nodes and wires them between upstream and downstream.
   *
   * @param binding The binding definition
   * @throws If filter types not registered or nodes not found
   */
  async loadBinding(binding: BindingDefinition): Promise<void> {
    const upstreamCompId = binding.fromPort.split('.')[0];
    const downstreamCompId = binding.toPort.split('.')[0];

    const upstreamNode = this.getNode(upstreamCompId);
    const downstreamNode = this.getNode(downstreamCompId);
    if (!upstreamNode || !downstreamNode) {
      throw new Error(
        `Binding references non-existent component: ${binding.fromPort} → ${binding.toPort}`
      );
    }

    // Detect cycles before connecting
    this.detectCycle(downstreamNode.id, upstreamNode.id);

    const loadedBinding = new LoadedBinding(this, binding);
    this.loadedBindings.set(binding.id, loadedBinding);

    await loadedBinding.doConnect();
    this.nodeGraphRefreshed.notifyObservers();
  }

  /**
   * Delete a binding in the data flow graph.
   * Removes the binding and any associated filter nodes.
   *
   * @param upstreamPort The upstream port reference (componentId.portName)
   * @param downstreamPort The downstream port reference (componentId.portName)
   * @throws If binding not found
   */
  deleteBinding(
    bindingConfig : BindingDefinition,
  ) {
    // Find the LoadedBinding that matches these ports
    let bindingToDelete: LoadedBinding | undefined;
    for (const [, loadedBinding] of this.loadedBindings) {
      if (
        loadedBinding.config.fromPort === bindingConfig.fromPort &&
        loadedBinding.config.toPort === bindingConfig.toPort
      ) {
        bindingToDelete = loadedBinding;
        break;
      }
    }

    bindingToDelete?.destroy();

    this.nodeGraphRefreshed.notifyObservers();
  }

  /**
   * Remove a binding between two ports.
   *
   * @param binding The binding to remove
   */
  private disconnectBinding(binding: BindingDefinition): void {
    const upstreamNode = this.nodes.get(binding.fromPort.split('.')[0]);
    if (upstreamNode) {
      const port = upstreamNode.getOutputPort(binding.fromPort.split('.')[1]);
      if (port) {
        port.disconnectFromUpstream();
      }
    }
  }

  /**
   * Detect if adding a binding from upstreamNode to downstreamNode would create a cycle.
   * Uses DFS to check if there's already a path from downstreamNode back to upstreamNode.
   * If yes, adding this binding would create a cycle.
   *
   * @param downstreamNodeId The node we want to connect TO
   * @param upstreamNodeId The node we want to connect FROM
   * @throws If adding this binding would create a cycle
   */
  private detectCycle(downstreamNodeId: string, upstreamNodeId: string): void {
    // Check if there's a path from downstreamNode BACK TO upstreamNode
    // If yes, connecting upstreamNode -> downstreamNode would create a cycle
    const visited = new Set<string>();
    if (this.hasPath(downstreamNodeId, upstreamNodeId, visited)) {
      throw new Error(
        `Adding binding from "${upstreamNodeId}" to "${downstreamNodeId}" would create a cycle`
      );
    }
  }

  /**
   * DFS to check if there's a path from source to target.
   *
   * @param source Starting node ID
   * @param target Target node ID
   * @param visited Set of already-visited nodes
   * @returns true if path exists
   */
  private hasPath(
    source: string,
    target: string,
    visited: Set<string>
  ): boolean {
    if (source === target) return true;
    if (visited.has(source)) return false;

    visited.add(source);

    // Get all nodes this source connects to (downstream connections)
    const outgoing: string[] = this.loadedBindings
      .values()
      .filter((b: LoadedBinding) => b.sourceNode.id === source)
      .map((b: LoadedBinding) => b.destinationNode.id);

    for (const next of outgoing) {
      if (this.hasPath(next, target, visited)) return true;
    }

    return false;
  }

  /**
   * Initialize all nodes in the graph.
   * Calls onReady() on each node in dependency order (topological sort).
   * For simplicity, we just call onReady on all nodes.
   * In production, would do proper topological sort.
   */
  async ready(): Promise<void> {
    for (const node of this.nodes.values()) {
      if (!this.readyNodes.has(node.id)) {
        await node.onReady();
        this.readyNodes.add(node.id);
      }
    }
  }

  /**
   * Shut down the entire graph.
   * Calls onDestroy() on all nodes.
   */
  async destroy(): Promise<void> {
    for (const node of this.nodes.values()) {
      if (this.readyNodes.has(node.id)) {
        await node.onDestroy();
      }
    }
    for (const loadedBinding of this.loadedBindings) {
      loadedBinding[1].destroy();
    }
    this.nodes.clear();
    this.readyNodes.clear();
    this.loadedBindings.clear();
  }

  async clear(): Promise<void> {
    await this.destroy();
    this.nodes.clear();
  }

  /**
   * Get a node by ID.
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes.
   */
  getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

}
