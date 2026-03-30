/**
 * Theme CSS Variables Customization Panel
 * Allows editing of CSS custom property overrides for the dashboard theme.
 */

import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import { THEME_VARIABLES_SCHEMA } from '../../utils/theme-variables';
import { schemaToFormField } from '../../utils/schema-to-form';

@customElement('ds-editor-theme-overrides')
export class ThemeOverrides extends LitElement {
  /**
   * Editor state reference.
   */
  @property({ type: Object }) editorState?: EditorState;

  static override styles = css`
    .section {
      padding: 12px;
    }

    .section-title {
      font-weight: 600;
      font-size: 13px;
      color: #333;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .variables-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .variable-group {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      background: #fafafa;
    }

    .variable-group-title {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .divider {
      height: 1px;
      background: #eee;
      margin: 12px 0;
    }

    .info {
      font-size: 11px;
      color: #999;
      padding: 8px;
      background: #f9f9f9;
      border-radius: 3px;
      border-left: 2px solid #ddd;
    }
  `;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this; // Renders to the element's light DOM
  }

  connectedCallback(): void {
    super.connectedCallback();

    if (!this.editorState) {
      return;
    }

    // Subscribe to board changes to refresh when theme overrides change
    this.editorState.board.subscribe(() => {
      this.requestUpdate();
    });
  }

  override render(): TemplateResult {
    if (!this.editorState) {
      return html`<div style="padding: 12px; color: #999;">
        No editor state
      </div>`;
    }

    const board = this.editorState.board.get();
    if (!board) {
      return html`<div style="padding: 12px; color: #999;">
        No board loaded
      </div>`;
    }

    const themeOverrides = board.settings?.themeOverrides || {};
    const properties = THEME_VARIABLES_SCHEMA.properties || {};

    const propslist = Object.entries(properties).map(([name, schema]) => {
      return {
        name,
        schema,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return html`
      <style>
        .section {
          padding: 12px;
        }

        .section-title {
          font-weight: 600;
          font-size: 13px;
          color: #333;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .variables-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .variable-group {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          background: #fafafa;
        }

        .variable-group-title {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .divider {
          height: 1px;
          background: #eee;
          margin: 12px 0;
        }

        .info {
          font-size: 11px;
          color: #999;
          padding: 8px;
          background: #f9f9f9;
          border-radius: 3px;
          border-left: 2px solid #ddd;
        }
      </style>
      <div class="section">
        <div class="section-title">CSS Variables</div>

        <div class="info">
          Override default CSS variables to customize the dashboard theme.
          All sizes need a unit such as px, mm, or rem.
        </div>

        <div class="divider"></div>

        <div class="variables-container">
          ${propslist.map(({name, schema}) =>
            schemaToFormField(
              name,
              themeOverrides[name],
              schema,
              (value) => this.setThemeVariable(name, String(value))
            )
          )}
        </div>
      </div>
    `;
  }

  private setThemeVariable(name: string, value: string): void {
    if (!this.editorState) return;
    this.editorState.setThemeVariable(name, value);
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-theme-overrides': ThemeOverrides;
  }
}
