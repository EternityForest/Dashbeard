/**
 * CSS Theme Settings Panel
 * Allows selection of global CSS theme for the dashboard.
 */

import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import '../resource-browser';

@customElement('ds-editor-theme-settings')
export class ThemeSettings extends LitElement {
  /**
   * Editor state reference.
   */
  @property({ type: Object }) editorState?: EditorState;

  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

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

    .theme-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .theme-option {
      display: flex;
      align-items: center;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      gap: 8px;
    }

    .theme-option:hover {
      background: #f5f5f5;
      border-color: #0066cc;
    }

    .theme-option.selected {
      background: #e8f2ff;
      border-color: #0066cc;
      font-weight: 500;
    }

    .radio-btn {
      width: 16px;
      height: 16px;
      border: 2px solid #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .theme-option.selected .radio-btn {
      border-color: #0066cc;
      background: #0066cc;
    }

    .radio-btn::after {
      content: '';
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
      display: none;
    }

    .theme-option.selected .radio-btn::after {
      display: block;
    }

    .theme-name {
      flex: 1;
      font-size: 12px;
    }

    .theme-description {
      font-size: 11px;
      color: #666;
    }

    .divider {
      height: 1px;
      background: #eee;
      margin: 12px 0;
    }

    .custom-theme {
      padding: 8px;
      border: 1px dashed #ddd;
      border-radius: 4px;
      background: #fafafa;
    }

    .custom-theme-label {
      font-size: 12px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
    }
  `;

  override render(): TemplateResult {
    if (!this.editorState) {
      return html`<div style="padding: 12px; color: #999;">
        No editor state
      </div>`;
    }

    const currentTheme = this.editorState.board.get()?.cssTheme || '';

    return html`
      <div class="section">
        <div class="section-title">Global Theme</div>

        <!-- Custom Theme -->
        <div class="custom-theme">
          <div class="custom-theme-label">Custom CSS File</div>
          <ds-resource-browser
            .value="${currentTheme}"
            .label="CSS File"
            .fileFilter="\\.css$"
            .onChange="${(path: string) => this.setTheme(path)}"
            .boardId="${this.editorState.board.get()?.id || ''}"
          ></ds-resource-browser>
        </div>
      </div>
    `;
  }

  private setTheme(themePath: string): void {
    if (!this.editorState) return;
    this.editorState.setCSSTheme(themePath);
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-theme-settings': ThemeSettings;
  }
}
