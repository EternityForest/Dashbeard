/**
 * Board Runtime - loads and manages dashboard execution.
 * Coordinates component creation, data flow, and cleanup.
 */

import { Node } from '@/flow/node';
import { NodeGraph } from '@/flow/node-graph';
import { BoardDefinition } from '@/boards/board-types';
import { validateBoardComplete } from '@/boards/board-validator';
import { DashboardComponent } from '@/components/dashboard-component';
import type { ComponentConfig } from '@/boards/board-types';
import { Observable } from '@/core/observable';
/**
 * Maps board component types to their Node implementations.
 * Populated at runtime to support custom components.
 */
export type ComponentFactory = (id: string, config: ComponentConfig) => Node;

/**
 * Runtime for loading and executing dashboard boards.
 */
export class BoardRuntime {
  /**
   * The data flow graph managing all nodes and bindings.
   */
  private graph = new NodeGraph();

  /**
   * Currently loaded board definition.
   */
  private board?: BoardDefinition;

  public loadedComponents: Map<string, DashboardComponent> = new Map();

  public rootComponent?: DashboardComponent;
  /**
   * Map of component IDs to their Node instances.
   */
  private nodes = new Map<string, Node>();

  /**
   * Map of component types to their factory functions.
   */
  private classes = new Map<string, typeof DashboardComponent>();

  public nodeGraphRefreshed: Observable<null> = new Observable<null>(null);

  public lastClickedComponent: Observable<string | null> = new Observable<
    string | null
  >(null);
  /**
   * Register a component class.
   *
   * @param type Component type name
   * @param cls Class to create Node instances
   */
  registerComponentType(type: string, cls: typeof DashboardComponent): void {
    this.classes.set(type, cls);
  }

  loadComponent(componentDef: ComponentConfig) {
    const cls = this.classes.get(componentDef.type);
    if (!cls) {
      throw new Error(`Component type not registered: "${componentDef.type}"`);
    }

    const component = new cls(componentDef);
    this.nodes.set(componentDef.id, component.getNode());
    this.graph.addNode(component.getNode());
    this.loadedComponents.set(componentDef.id, component);
    component.allComponents = this.loadedComponents;

    for (const child of componentDef.children || []) {
      this.loadComponent(child);
    }

    this.nodeGraphRefreshed.notifyObservers();
    return component;
  }

  onComponentClick(componentId: string) {
    this.lastClickedComponent.set(componentId);
  }
  /**
   * Load a board definition from JSON.
   * Validates structure, creates nodes, and establishes bindings.
   *
   * @param boardDef The board definition (JSON object or string)
   * @throws If board is invalid or component types not registered
   */
  async loadBoard(boardDef: unknown): Promise<void> {
    // Validate board structure
    const validated = validateBoardComplete(boardDef);
    this.board = validated;

    if (validated.rootComponent) {
      // Create all nodes, starting at the root
      this.rootComponent = this.loadComponent(validated.rootComponent);
    }

    // Establish all bindings
    for (const binding of validated.bindings) {
      await this.graph.addBinding(binding.upstream, binding.downstream);
    }

    // Initialize all nodes
    await this.graph.ready();

    // Set up event listener for component recreation requests
    this.setupRecreationListener();
    this.nodeGraphRefreshed.notifyObservers();
  }

  /**
   * Set up event listener for component recreation requests.
   * Listens for custom 'component-recreation-requested' events from components.
   */
  private setupRecreationListener(): void {
    if (!this.rootComponent) return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const  componentId: string  = (customEvent.detail?.componentId || '') as string;

      if (!componentId) {
        console.error('Received recreation request without componentId');
        return;
      }

      this.recreateComponent(componentId).catch(console.error);
    };

    // Attach listener to root component (events bubble up)
    this.rootComponent.addEventListener(
      'component-recreation-requested',
      handler
    );
  }

  /**
   * Unload the current board and clean up all resources.
   */
  async unloadBoard(): Promise<void> {
    await this.graph.destroy();
    this.nodes.clear();
    this.board = undefined;
    this.nodeGraphRefreshed.notifyObservers();
  }

  /**
   * Get a node by component ID.
   */
  getNode(componentId: string): Node | undefined {
    return this.nodes.get(componentId);
  }

  /**
   * Get all nodes in the board.
   */
  getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get the current board definition.
   */
  getBoard(): BoardDefinition | undefined {
    return this.board;
  }

  /**
   * Get the data flow graph.
   */
  getGraph(): NodeGraph {
    return this.graph;
  }

  /**
   * Get component by ID (for UI binding).
   */
  getComponent(componentId: string): DashboardComponent | undefined {
    const comp = this.loadedComponents.get(componentId);
    return comp;
  }

  /**
   * Serialize current board state.
   * Captures runtime configuration values.
   */
  exportState(): BoardDefinition {
    if (!this.board) {
      throw new Error('No board loaded');
    }

    // Capture current config from all components
    const board = { ...this.board };

    if (board.rootComponent) {
      const rootComponent = this.getLatestComponentConfig(
        board.rootComponent.id
      );

      if (rootComponent) {
        board.rootComponent.config = rootComponent.config || {};
      }
    }
    return board;
  }

  getLatestComponentConfig(componentId: string): ComponentConfig | undefined {
    const comp = this.loadedComponents.get(componentId);
    const config = comp?.componentConfig;

    for (const child of config?.children || []) {
      child.config = this.getLatestComponentConfig(child.id)?.config || {};
    }

    return config;
  }

  /**
   * Load a new component and add it to the board.
   * If adding to a parent, the component is added to the parent's children.
   *
   * @param componentDef Component definition
   * @param parentId Optional parent component ID. If provided, adds to parent's children.
   * @returns The created component instance
   */
  async addComponent(
    componentDef: ComponentConfig,
    parentId?: string
  ): Promise<DashboardComponent> {
    const component = this.loadComponent(componentDef);

    // If adding to a parent, add to parent's children array
    if (parentId) {
      const parent = this.loadedComponents.get(parentId);
      if (!parent) {
        throw new Error(`Parent component not found: ${parentId}`);
      }
      if (!parent.componentConfig.children) {
        parent.componentConfig.children = [];
      }
      parent.componentConfig.children.push(componentDef);
      parent.onConfigUpdate();
    }
    this.nodeGraphRefreshed.notifyObservers();

    return component;
  }

  /**
   * Delete a component from the board.
   * Removes from parent's children if applicable.
   * Cleans up all nodes and bindings.
   *
   * @param componentId ID of component to delete
   */
  async deleteComponent(
    componentId: string,
    keepReferences: boolean = false
  ): Promise<void> {
    const component = this.loadedComponents.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    if (!keepReferences) {
      // Remove from parent's children if applicable
      for (const [_parentId, parent] of this.loadedComponents) {
        if (parent.componentConfig.children) {
          const index = parent.componentConfig.children.findIndex(
            (c) => c.id === componentId
          );
          if (index >= 0) {
            parent.componentConfig.children.splice(index, 1);
            parent.onConfigUpdate();
            break;
          }
        }
      }
    }
    // Recursively delete children
    const childrenToDelete = Array.from(this.loadedComponents.values()).filter(
      (comp) => {
        const parent = this.loadedComponents.get(componentId);
        return parent?.componentConfig.children?.some(
          (c) => c.id === comp.componentId
        );
      }
    );

    for (const child of childrenToDelete) {
      await this.deleteComponent(child.componentId);
    }

    // Remove from loaded components and nodes
    this.loadedComponents.delete(componentId);
    const node = this.nodes.get(componentId);
    if (node) {
      await this.graph.removeNode(componentId);
      this.nodes.delete(componentId);
    }
        this.nodeGraphRefreshed.notifyObservers();

  }

  /**
   * Change the type of a component while preserving its children.
   * Creates a new component of the target type with the old component's children.
   *
   * @param componentId ID of component to change
   * @param newType New component type
   * @returns The new component instance
   */
  async swapComponentType(
    componentId: string,
    newType: string
  ): Promise<DashboardComponent> {
    const oldComponent = this.loadedComponents.get(componentId);
    if (!oldComponent) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const cls = this.classes.get(newType);
    if (!cls) {
      throw new Error(`Component type not registered: "${newType}"`);
    }

    const oldComponentClass = this.classes.get(
      oldComponent.componentConfig.type
    );

    if (oldComponentClass?.typeSchema.category == 'layout') {
      if (!(cls?.typeSchema.category == 'layout')) {
        throw new Error(`Cannot change layout type to non-layout`);
      }
    }
    // Preserve the old config but update the type
    const oldConfig = oldComponent.componentConfig;
    const newConfig: ComponentConfig = cls.getDefaultConfig();

    // Remove old component (but preserve children array)
    const children = oldConfig.children || [];
    await this.deleteComponent(componentId, true);

    // Create new component with same ID and children
    const newComponent = new cls(newConfig);
    this.nodes.set(newConfig.id, newComponent.getNode());
    this.graph.addNode(newComponent.getNode());
    this.loadedComponents.set(newConfig.id, newComponent);
    newComponent.allComponents = this.loadedComponents;

    // Re-add children
    newComponent.componentConfig.children = children;

    // Update parent's reference
    for (const [_parentId, parent] of this.loadedComponents) {
      if (parent.componentConfig.children) {
        const childConfig = parent.componentConfig.children.find(
          (c) => c.id === componentId
        );
        if (childConfig) {
          // empty object and make it equal to the new config
          Object.assign(childConfig, newConfig);
          parent.onConfigUpdate();
          break;
        }
      }
    }
    this.nodeGraphRefreshed.notifyObservers();

    return newComponent;
  }

  /**
   * Check if a binding is compatible between old and new component ports.
   * Returns true if both ports exist and types match (or either is 'any').
   *
   * @param upstream The upstream port reference (componentId.portName)
   * @param downstream The downstream port reference (componentId.portName)
   * @returns true if binding can be restored
   */
  private isBindingCompatible(upstream: string, downstream: string): boolean {
    return this.graph.canBind(upstream, downstream);
  }

  /**
   * Recreate a component in place, preserving its ID, children, and compatible bindings.
   * Used when a component's configuration changes in ways that affect its ports.
   * Useful for components like 'variable' when type changes (string → number).
   *
   * @param componentId ID of the component to recreate
   * @returns The newly created component instance
   * @throws If component not found or recreation fails
   */
  async recreateComponent(componentId: string): Promise<DashboardComponent> {
    const oldComponent = this.loadedComponents.get(componentId);
    if (!oldComponent) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const componentType = oldComponent.componentConfig.type;
    const cls = this.classes.get(componentType);
    if (!cls) {
      throw new Error(`Component type not registered: "${componentType}"`);
    }

    // Capture state before deletion
    const oldConfig = oldComponent.componentConfig;
    const children = oldConfig.children || [];
    const affectedBindings = this.graph
      .getBindings()
      .filter(
        (b) =>
          b.upstreamNodeId === componentId || b.downstreamNodeId === componentId
      )
      .map((b) => ({
        upstream: `${b.upstreamNodeId}.${b.upstreamPortName}`,
        downstream: `${b.downstreamNodeId}.${b.downstreamPortName}`,
      }));

    // Delete old component (preserve parent reference)
    await this.deleteComponent(componentId, true);

    // Create new component with same ID
    const newComponent = new cls(oldConfig);
    this.nodes.set(oldConfig.id, newComponent.getNode());
    this.graph.addNode(newComponent.getNode());
    this.loadedComponents.set(oldConfig.id, newComponent);
    newComponent.allComponents = this.loadedComponents;

    // Restore children
    newComponent.componentConfig.children = children;

    // Update parent's reference
    for (const [_parentId, parent] of this.loadedComponents) {
      if (parent.componentConfig.children) {
        const childConfig = parent.componentConfig.children.find(
          (c) => c.id === componentId
        );
        if (childConfig) {
          Object.assign(childConfig, newComponent.componentConfig);
          parent.onConfigUpdate();
          break;
        }
      }
    }

    // Re-establish compatible bindings
    for (const binding of affectedBindings) {
      if (this.isBindingCompatible(binding.upstream, binding.downstream)) {
        try {
          await this.graph.addBinding(binding.upstream, binding.downstream);
        } catch (err) {
          console.warn(
            `Failed to restore binding ${binding.upstream} → ${binding.downstream}: ${err}`
          );
        }
      } else {
        console.info(
          `Binding ${binding.upstream} → ${binding.downstream} is incompatible after recreation`
        );
      }
    }
    this.nodeGraphRefreshed.notifyObservers();
    return newComponent;
  }

  /**
   * Delete a binding in the data flow graph.
   *
   * @param upstreamPort The upstream port reference (componentId.portName)
   * @param downstreamPort The downstream port reference (componentId.portName)
   * @throws If binding not found
   */
  async deleteBinding(upstreamPort: string, downstreamPort: string): Promise<void> {
    this.graph.removeBinding(upstreamPort, downstreamPort);
    this.nodeGraphRefreshed.notifyObservers();
  }
}
