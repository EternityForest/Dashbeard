/**
 * NodeGraph manages the data flow graph.
 * Responsible for:
 * - Node registration and lifecycle
 * - Binding creation with validation
 * - Cycle detection
 * - Port connection management
 */

import { i } from 'vitest/dist/reporters-w_64AS5f.js';
import { Node } from './node';

/**
 * Represents a binding between two ports.
 */
export interface Binding {
  upstreamNodeId: string;
  upstreamPortName: string;
  downstreamNodeId: string;
  downstreamPortName: string;
}

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
   * All active bindings in the graph.
   * Stored for inspection and validation.
   */
  private bindings: Binding[] = [];

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
    node.initializePorts();
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

    // Remove all bindings involving this node
    this.bindings = this.bindings.filter((binding) => {
      if (
        binding.upstreamNodeId === nodeId ||
        binding.downstreamNodeId === nodeId
      ) {
        this.disconnectBinding(binding);
        return false;
      }
      return true;
    });

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
    const upstreamPortObj = upstreamNode.getDownstreamPort(upstreamPortName);
    const downstreamPortObj = downstreamNode.getUpstreamPort(downstreamPortName);

    if (!upstreamPortObj || !downstreamPortObj) {
      return false;
    }
    
    if((upstreamPortObj.type+".").startsWith(downstreamPortObj.type + ".") || (downstreamPortObj.type+".").startsWith(upstreamPortObj.type + ".")){
      return true;
    }

    return false;
  }
  /**
   * Create a binding between two ports.
   * Validates:
   * - Both nodes exist
   * - Both ports exist
   * - Port types are compatible
   * - Creates no cycles
   * - Upstream port not already connected
   *
   * @param upstreamPort The upstream port to connect
   * @param downstreamPort The downstream port to connect
   */
  async addBinding(
    upstreamPort: string,
    downstreamPort: string
  ): Promise<void> {

    const [upstreamNodeId, upstreamPortName] = upstreamPort.split('.');
    const [downstreamNodeId, downstreamPortName] = downstreamPort.split('.');
    // Validate nodes exist
    const upstreamNode = this.nodes.get(upstreamNodeId);
    if (!upstreamNode) {
      throw new Error(`Upstream node "${upstreamNodeId}" not found`);
    }

    const downstreamNode = this.nodes.get(downstreamNodeId);
    if (!downstreamNode) {
      throw new Error(`Downstream node "${downstreamNodeId}" not found`);
    }

    // Validate ports exist
    const upstreamPortObj = upstreamNode.getDownstreamPort(upstreamPortName);
    if (!upstreamPortObj) {
      throw new Error(
        `Upstream port "${upstreamPortName}" not found on node "${upstreamNodeId}(${upstreamNode.listPorts().join(', ')})"`
      );
    }

    const downstreamPortObj = downstreamNode.getUpstreamPort(
      downstreamPortName
    );
    if (!downstreamPortObj) {
      throw new Error(
        `Downstream port "${downstreamPortName}" not found on node "${downstreamNodeId}"`
      );
    }

    // Detect cycles before connecting
    this.detectCycle(downstreamNodeId, upstreamNodeId);

    // Connect the ports (this also validates port compatibility)
    await upstreamPortObj.connectToDownstream(downstreamPortObj);

    // Record the binding
    this.bindings.push({
      upstreamNodeId,
      upstreamPortName,
      downstreamNodeId,
      downstreamPortName,
    });
  }

  /**
   * Remove a binding between two ports.
   *
   * @param binding The binding to remove
   */
  private disconnectBinding(binding: Binding): void {
    const upstreamNode = this.nodes.get(binding.upstreamNodeId);
    if (upstreamNode) {
      const port = upstreamNode.getUpstreamPort(binding.upstreamPortName);
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
    const outgoing = this.bindings
      .filter((b) => b.upstreamNodeId === source)
      .map((b) => b.downstreamNodeId);

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
    this.readyNodes.clear();
    this.bindings = [];
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

  /**
   * Get all bindings.
   */
  getBindings(): Binding[] {
    return [...this.bindings];
  }

  /**
   * Remove a binding between two ports by their references.
   *
   * @param upstreamPort The upstream port reference (componentId.portName)
   * @param downstreamPort The downstream port reference (componentId.portName)
   * @throws If binding not found
   */
  removeBinding(upstreamPort: string, downstreamPort: string): void {
    const [upstreamNodeId, upstreamPortName] = upstreamPort.split('.');
    const [downstreamNodeId, downstreamPortName] = downstreamPort.split('.');

    const bindingIndex = this.bindings.findIndex(
      (b) =>
        b.upstreamNodeId === upstreamNodeId &&
        b.upstreamPortName === upstreamPortName &&
        b.downstreamNodeId === downstreamNodeId &&
        b.downstreamPortName === downstreamPortName
    );

    if (bindingIndex === -1) {
      throw new Error(
        `Binding from "${upstreamPort}" to "${downstreamPort}" not found`
      );
    }

    const binding = this.bindings[bindingIndex];
    this.disconnectBinding(binding);
    this.bindings.splice(bindingIndex, 1);
  }
}
