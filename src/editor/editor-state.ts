/**
 * Editor state management using Observable pattern.
 * Provides reactive state for the dashboard editor.
 */

import { Observable } from '../core/observable';
import type { BoardDefinition } from './types';
import type { DashboardEditor } from './components/dashboard-editor';
import type { Component } from './types';
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

    component.config[name] = value;


    const componentInstance = this.editorComponent.renderer?.runtime.loadedComponents.get(componentId);

    if (!componentInstance) {
      throw new Error('Component not found');
    }

    componentInstance.componentConfig.config[name] = value;

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
}
