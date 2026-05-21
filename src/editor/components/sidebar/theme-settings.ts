/**
 * CSS Theme Settings Panel
 * Allows selection of global CSS theme for the dashboard.
 */

import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EditorState } from '../../editor-state';
import type { SystemTheme } from '../../types';
import '../resource-browser';

@customElement('ds-editor-theme-settings')
export class ThemeSettings extends LitElement {
  /**
   * Editor state reference.
   */
  @property({ type: Object }) editorState?: EditorState;

  /**
   * System themes from external URLs.
   */
  @state() private systemThemes: SystemTheme[] = [];

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

    .url-input {
      width: 100%;
      padding: 6px 8px;
      font-size: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }

    .url-input:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
    }

    .theme-source-label {
      font-size: 11px;
      color: #666;
      margin-top: 12px;
      margin-bottom: 4px;
    }

    .theme-source-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
      color: #999;
      font-size: 11px;
    }

    .theme-source-divider::before,
    .theme-source-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #eee;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadSystemThemes();
  }

  private async loadSystemThemes(): Promise<void> {
    if (!this.editorState?.backend?.getSystemThemes) {
      return;
    }
    try {
      this.systemThemes = await this.editorState.backend.getSystemThemes();
    } catch (err) {
      console.warn('Failed to load system themes:', err);
    }
  }

  override render(): TemplateResult {
    if (!this.editorState) {
      return html`<div style="padding: 12px; color: #999;">
        No editor state
      </div>`;
    }

    const currentTheme = this.editorState.board.get()?.cssTheme || '';
    // URL takes precedence over file - check if current theme is a URL
    const isUrl = currentTheme.startsWith('http://') || currentTheme.startsWith('https://') || currentTheme.startsWith('data:');
    const currentUrl = isUrl ? currentTheme : '';
    const currentFile = isUrl ? '' : currentTheme;

    return html`
      <div class="section">
        <div class="section-title">Global Theme</div>

        <!-- External URL Theme -->
        <div class="custom-theme">
          <div class="custom-theme-label">External URL (takes precedence)</div>
          <input
            type="text"
            class="url-input"
            placeholder="https://example.com/theme.css"
            .value="${currentUrl}"
            list="system-themes"
            @change="${(e: Event) => this.setThemeUrl((e.target as HTMLInputElement).value)}"
          />
          <datalist id="system-themes">
            ${this.systemThemes.map(
              (theme) => html`<option value="${theme.url}">${theme.name}</option>`
            )}
          </datalist>
        </div>

        <div class="theme-source-divider">or use file</div>

        <!-- Custom Theme File -->
        <div class="custom-theme">
          <div class="custom-theme-label">Custom CSS File</div>
          <ds-resource-browser
            .value="${currentFile}"
            .label="CSS File"
            .fileFilter="\\.css$"
            .onChange="${(path: string) => this.setThemeFile(path)}"
            .boardId="${this.editorState.board.get()?.id || ''}"
            .backend="${this.editorState.backend}"
          ></ds-resource-browser>
        </div>
      </div>
    `;
  }

  private setThemeUrl(url: string): void {
    if (!this.editorState) return;
    this.editorState.setCSSTheme(url);
    this.requestUpdate();
  }

  private setThemeFile(themePath: string): void {
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
