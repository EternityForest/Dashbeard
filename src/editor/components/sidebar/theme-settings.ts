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

  /**
   * Current input value for external URL (before clicking Set).
   */
  @state() private urlInputValue = '';

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

    return html`
      <div class="section">
        <div class="section-title">Global Theme</div>

        <!-- External URL Theme -->
        <div class="custom-theme">
          <div class="custom-theme-label">Use System Theme</div>
          <div class="url-input-row">
            <input
              type="text"
              class="url-input"
              placeholder="https://example.com/theme.css"
              .value="${this.urlInputValue || currentUrl}"
              list="system-themes"
              @input="${(e: Event) => this.urlInputValue = (e.target as HTMLInputElement).value}"
            />
            <button class="set-button" @click="${() => this.setThemeUrl(this.urlInputValue || currentUrl)}">Set</button>
          </div>
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
            .value="${currentTheme}"
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

  static styles = css`
    .url-input-row {
      display: flex;
      gap: 8px;
    }
    .url-input {
      flex: 1;
    }
    .set-button {
      padding: 6px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .set-button:hover {
      background: #2563eb;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-theme-settings': ThemeSettings;
  }
}
