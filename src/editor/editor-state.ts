/**
 * Editor state management using Observable pattern.
 * Provides reactive state for the dashboard editor.
 */

import { Observable } from '../core/observable';
import type { BoardDefinition, IBoardBackend} from './types';
import type { DashboardEditor } from './components/dashboard-editor';
import type { Component } from './types';

/**
 * Position for inserting a component relative to a target.
 */
export type MovePosition = 'append' | 'before' | 'after';

/**
 * Centralized editor state with Observable-based reactivity.
 * All editor components subscribe to these observables for
 * reactive updates when state changes.
 */
export class EditorState {
  /**
   * Currently loaded board. null when no board is open.
   */
  readonly board: Observable<BoardDefinition | null>;

  /**
   * ID of currently selected component.
   * Used for highlighting and property inspection.
   */
  readonly selectedComponentId: Observable<string | null>;

  /**
   * Whether the board has unsaved changes.
   * Used to enable/disable save button and warn on
   * close.
   */
  readonly isDirty: Observable<boolean>;

  /**
   * Whether editor is in edit mode vs. view mode.
   * Controls whether clicks select components vs.
   * interact with the rendered dashboard.
   */
  readonly editMode: Observable<boolean>;

  readonly nodeGraphChanged : Observable<null>;


  public backend: IBoardBackend|null = null;

  public readonly editorComponent: DashboardEditor;


  constructor(editor: DashboardEditor) {
    this.board = new Observable(null) as Observable<BoardDefinition | null>;
    this.selectedComponentId = new Observable(null) as Observable<
      string | null
    >;
    this.isDirty = new Observable(false);
    this.editMode = new Observable(false);


    this.editorComponent = editor;
    this.nodeGraphChanged = editor.renderer.runtime.nodeGraphRefreshed;

  }

  /**
   * Find component by ID in board tree.
   */
  public findComponent(id: string): Component | null {
    const board = this.board.get()!;
    if (!board.rootComponent) {
      return null;
    }
    return this.findComponentInTree(board.rootComponent, id);
  }

  /**
   * Find component in component tree (recursive).
   */
  private findComponentInTree(
    component: Component,
    id: string
  ): Component | null {
    if (component.id === id) {
      return component;
    }
    if (component.children) {
      for (const child of component.children) {
        const found = this.findComponentInTree(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  setComponentProperty(
    componentId: string,
    name: string,
    value: unknown
  ): void {
    // Update property

    const component = this.findComponent(componentId)!;


    if(!component){
      throw new Error('Component not found');
    }

    if(!component.config){
      throw new Error('Component config not found');
    }
    
    if(value== undefined){
      delete component.config[name];
    }
    else{
      component.config[name] = value;
    }


    const componentInstance = this.editorComponent.renderer?.runtime.loadedComponents.get(componentId);

    if (!componentInstance) {
      throw new Error('Component not found');
    }

    if(!componentInstance.componentConfig){
      throw new Error('Component config not found');
    }
    if(!componentInstance.componentConfig.config){
      throw new Error('Component config not found');
    }

    if(value== undefined){
      delete componentInstance.componentConfig.config[name];
    }
    else{
      componentInstance.componentConfig.config[name] = value;
    }


    componentInstance.onConfigUpdate();

    // Mark dirty
    this.markDirty();
    // Trigger board update to re-render
    const board = this.board.get();
    if (board) {
      this.board.set(board);
    }
  }
  /**
   * Load a board and update state.
   * Clears previous selections.
   *
   * @param board The board to load
   */
  setBoard(board: BoardDefinition | null): void {
    this.board.set(board);
    this.isDirty.set(false);

    this.selectedComponentId.set(null);
  }

  /**
   * Select a component by ID.
   * Updates selectedComponentId.
   *
   * @param componentId The component ID to select,
   *                    or null to deselect
   */
  selectComponent(componentId: string | null): void {
    this.selectedComponentId.set(componentId);
  }

  /**
   * Mark the board as having unsaved changes.
   * Enables save button in sidebar.
   */
  markDirty(): void {
    this.isDirty.set(true);
  }

  /**
   * Clear the dirty flag (after save).
   */
  clearDirty(): void {
    this.isDirty.set(false);
  }

  /**
   * Toggle edit mode on/off.
   *
   * @param enabled Whether to enable edit mode
   */
  setEditMode(enabled: boolean): void {
    this.editMode.set(enabled);
  }

  /**
   * Set the CSS theme for the dashboard.
   *
   * @param themePath Path to CSS theme file or empty string for default
   */
  setCSSTheme(themePath: string): void {
    this.editorComponent.renderer?.cssTheme.set(themePath);
    this.markDirty();

    // Apply theme to currently loaded board
    const board = this.board.get();
    if (board) {
      board.cssTheme = themePath;
      this.board.set(board);
    }
  }

  /**
   * Set a CSS custom property override.
   *
   * @param variableName CSS variable name (e.g., '--primary-color')
   * @param value CSS value
   */
  setThemeVariable(variableName: string, value: string): void {
    const board = this.board.get();
    if (!board) return;

    if (!board.settings) {
      board.settings = {};
    }

    if (!board.settings.themeOverrides) {
      board.settings.themeOverrides = {};
    }

    if (value === '' || value === undefined) {
      // Remove override if empty
      delete board.settings.themeOverrides[variableName];
    } else {
      board.settings.themeOverrides[variableName] = value;
    }

    this.markDirty();
    this.board.set(board);

    // Trigger theme update in renderer
    if (this.editorComponent.renderer) {
      void this.editorComponent.renderer.rerenderBoard();
    }
  }

  /**
   * Find the parent of a component by ID.
   * Returns null if component is root or not found.
   */
  public findParent(childId: string): Component | null {
    const board = this.board.get()!;
    if (!board.rootComponent) {
      return null;
    }
    return this.findParentInTree(board.rootComponent, childId);
  }

  /**
   * Recursively find parent of component in tree.
   */
  private findParentInTree(
    component: Component,
    childId: string
  ): Component | null {
    if (component.children) {
      for (const child of component.children) {
        if (child.id === childId) {
          return component;
        }
        const found = this.findParentInTree(child, childId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Check if a component type is a layout component (can have children).
   */
  public isLayoutComponent(componentId: string): boolean {
    const component = this.findComponent(componentId);
    if (!component) return false;

    const cls = this.editorComponent.renderer?.runtime.componentClasses.get(
      component.type
    );
    return cls?.typeSchema.acceptsChildren || false;
  }

  /**
   * Check if descendantId is in the subtree of ancestorId.
   * Used to prevent circular parent-child relationships.
   */
  private isDescendantOf(ancestorId: string, descendantId: string): boolean {
    const ancestor = this.findComponent(ancestorId);
    if (!ancestor?.children) return false;

    for (const child of ancestor.children) {
      if (child.id === descendantId) return true;
      if (this.isDescendantOf(child.id, descendantId)) return true;
    }
    return false;
  }

  /**
   * Move a component from its current parent to a new parent.
   * Updates config, calls onConfigUpdate() on both parents.
   *
   * @param componentId ID of component to move
   * @param targetId ID of target component (new parent or sibling)
   * @param position Position relative to target: 'append' (into target), 'before'/'after' (as sibling)
   * @throws Error if validation fails
   */
  public moveComponent(
    componentId: string,
    targetId: string,
    position: MovePosition = 'append'
  ): void {
    // Validation
    if (componentId === 'root') {
      throw new Error('Cannot move root component');
    }

    if (componentId === targetId) {
      return; // No-op: moving to self
    }

    const targetComponent = this.findComponent(targetId);
    if (!targetComponent) {
      throw new Error(`Target component "${targetId}" not found`);
    }

    // Determine the new parent based on position
    let newParent: Component | null;
    let insertIndex: number;

    if (position === 'append') {
      // Moving INTO a layout component
      if (!this.isLayoutComponent(targetId)) {
        throw new Error(
          `Cannot move component into "${targetId}": not a layout component`
        );
      }
      if (this.isDescendantOf(componentId, targetId)) {
        throw new Error(
          'Cannot move component: would create circular reference'
        );
      }
      newParent = targetComponent;
      insertIndex = -1; // Append at end
    } else {
      // Moving as sibling (before/after target)
      newParent = this.findParent(targetId);
      if (!newParent) {
        throw new Error('Cannot reorder: target has no parent');
      }
      // Find index of target in parent's children
      insertIndex = newParent.children?.findIndex((c) => c.id === targetId) ?? -1;
      if (insertIndex === -1) {
        throw new Error('Target not found in parent children');
      }
      // Adjust index for 'after' position
      if (position === 'after') {
        insertIndex += 1;
      }
    }

    // Find component and old parent
    const component = this.findComponent(componentId);
    const oldParent = this.findParent(componentId);

    if (!component) {
      throw new Error(`Component "${componentId}" not found`);
    }

    if (!oldParent) {
      throw new Error('Cannot move component without parent');
    }

    // Remove from old parent
    if (oldParent.children) {
      const index = oldParent.children.findIndex((c) => c.id === componentId);
      if (index !== -1) {
        oldParent.children.splice(index, 1);
      }
    }

    // Add to new parent at the specified position
    if (!newParent.children) {
      newParent.children = [];
    }

    if (insertIndex === -1 || insertIndex >= newParent.children.length) {
      // Append
      newParent.children.push(component);
    } else {
      // Insert at specific position
      newParent.children.splice(insertIndex, 0, component);
    }

    // Get runtime instances and trigger updates
    const oldParentInstance = this.editorComponent.renderer?.runtime.loadedComponents.get(
      oldParent.id
    );
    const newParentInstance = this.editorComponent.renderer?.runtime.loadedComponents.get(
      newParent.id
    );

    if (oldParentInstance) {
      oldParentInstance.onConfigUpdate();
    }

    if (newParentInstance && newParent.id !== oldParent.id) {
      newParentInstance.onConfigUpdate();
    }

    this.markDirty();

    // Trigger board update
    const board = this.board.get();
    if (board) {
      this.board.set(board);
    }
  }
}
