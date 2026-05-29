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


    return html`
      <div class="section">
        <div class="section-title">Global Theme</div>

        <!-- External URL Theme -->
        <div class="custom-theme">
          <div class="custom-theme-label">Use System Theme</div>
          <input
            type="text"
            class="url-input"
            placeholder="https://example.com/theme.css"
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
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-editor-theme-settings': ThemeSettings;
  }
}
