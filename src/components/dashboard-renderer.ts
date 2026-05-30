/**
 * DashboardRenderer - renders a complete dashboard from a board definition.
 * Handles component instantiation, binding, and layout.
 */

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BoardRuntime } from '../runtime';
import { BoardDefinition } from '../boards/board-types';
import type { DashboardComponent } from './dashboard-component';
import { Observable } from '../core/observable';
/**
 * DashboardRenderer - renders a board definition as interactive UI.
 */
@customElement('ds-dashboard-renderer')
export class DashboardRenderer extends LitElement {
  /**
   * The board definition to render.
   */
  @property({ type: Object }) board?: BoardDefinition;

  /**
   * Runtime instance managing the board execution.
   */
  public runtime = new BoardRuntime();

  /**
   * Error message if board loading failed.
   */
  @property() error: string = '';

  /**
   * Whether the board is currently loaded.
   */
  @property({ type: Boolean }) isLoaded: boolean = false;

  /**
   * Path to CSS theme file for the dashboard.
   * Empty string uses default (barrel.css).
   */
  readonly cssTheme: Observable<string> = new Observable('');
  /**
   * Load a board definition.
   */
  async loadBoard(boardDef: BoardDefinition): Promise<void> {
    this.isLoaded = false;
    this.board = boardDef;

    // Apply CSS theme from board definition
    this.cssTheme.set(boardDef.cssTheme || '');

    // Theme variables will be applied in updated() after render

    // Load the board
    await this.runtime.loadBoard(boardDef);
    this.isLoaded = true;
    this.error = '';

    // Render components
    this.requestUpdate();
    await this.updateComplete;

    if (!this.runtime.rootComponent) {
      this.error = 'No root component found';
      return;
    }

    this.renderRoot
      ?.querySelector('#dashboard-content')
      ?.replaceChildren(this.runtime.rootComponent);
  }

  constructor() {
    super();
    this.cssTheme.subscribe((_cssTheme) => {
      this.requestUpdate();
    });
  }

  /**
   * Rerender the board after component changes (add, delete, or type swap).
   * Detaches the root component from DOM, then reattaches it.
   * This preserves all component objects and state while updating the UI.
   */
  async rerenderBoard(): Promise<void> {
    if (!this.runtime.rootComponent) {
      this.error = 'No root component found';
      return;
    }

    const container = this.renderRoot?.querySelector('#dashboard-content');
    if (!container) {
      return;
    }

    const boarddef = this.runtime.getBoard();
  

    // Detach from DOM (preserves component objects and state)
    container.replaceChildren();

    // Reattach to DOM
    container.appendChild(this.runtime.rootComponent);  
    
    if (boarddef) {
      this.applyThemeVariables(boarddef);
    }

  }

  /**
   * Apply CSS variable overrides from board settings.
   * Creates or updates a style element with custom properties.
   * Called after render completes to ensure renderRoot is available.
   *
   * @param boardDef Board definition containing theme overrides
   */
  private applyThemeVariables(boardDef: BoardDefinition): void {
    if (!this.renderRoot) {
      return;
    }

    if(!boardDef){
      return;
    }
    let overrides = boardDef.settings?.themeOverrides;
    if(!overrides){
      overrides = {};
    }

    // Build CSS custom property declarations
    let cssText = '';
    if (overrides) {
      const declarations = Object.entries(overrides)
        .map(([name, value]) => `${name}: ${value};`)
        .join('\n');
      cssText = `:root { ${declarations} }`;
    }

    // Get or create style element
    let styleElement = this.renderRoot.querySelector(
      '#dashboard-theme-variables'
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dashboard-theme-variables';
      // Insert as last child of dashboard div so it comes after the external CSS link
      // This ensures CSS variable overrides take precedence in cascade
      const dashboardDiv = this.renderRoot.querySelector('.dashboard');
      if (dashboardDiv) {
        dashboardDiv.appendChild(styleElement);
      } else {
        this.renderRoot.appendChild(styleElement);
      }
    }

    styleElement.textContent = cssText;
  }


  /**
   * Called after each update.
   * Ensures theme variables are applied after render completes.
   */
  updated(changedProperties: Map<string, unknown>): void {

    const styleElement = this.renderRoot.querySelector(
      '#dashboard-theme-variables'
    )

    if ((styleElement==null)||(changedProperties.has('board') && this.board)) {
      // If dashboard element doesn't exist yet, defer to next microtask
      // This handles the case where loadBoard is called before renderer is attached to DOM
      if (!this.renderRoot?.querySelector('.dashboard')) {
        queueMicrotask(() => this.applyThemeVariables(this.board!));
      } else {
        this.applyThemeVariables(this.board);
      }
    }
  }

  /**
   * Render the dashboard.
   */
  override render(): TemplateResult {
    if (!this.board) {
      return html`<div class="renderer-error">No board loaded</div>`;
    }

    if (this.error) {
      return html`<div class="error renderer-error">${this.error}</div>`;
    }

    if (!this.isLoaded) {
      return html`<div class="renderer-error highlight">
        Loading dashboard...
      </div>`;
    }

    if (!this.runtime.rootComponent) {
      return html`<div class="empty">No root component found</div>`;
    }

    return html`
      <div class="dashboard" @click=${this.clickHandler.bind(this)}>
        <link rel="stylesheet" type="text/css" href="${this.cssTheme.get()}" />
        <div class="dashboard-content" id="dashboard-content"></div>
      </div>
    `;
  }

  firstUpdated(): void {
    if (this.runtime.rootComponent) {
      this.renderRoot
        ?.querySelector('#dashboard-content')
        ?.appendChild(this.runtime.rootComponent);
    }
  }

  clickHandler(event: MouseEvent): void {
    // get the component that was clicked
    const path = event.composedPath() as Element[];

    for (let i = 0; i < path.length; i++) {
      if ((path[i] as DashboardComponent | null)?.componentConfig?.id) {
        this.runtime.onComponentClick(
          (path[i] as DashboardComponent | null)?.componentConfig.id
        );
        break;
      }
    }
  }
  /**
   * Cleanup on disconnect.
   */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    void this.runtime.unloadBoard();
  }

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }
}
