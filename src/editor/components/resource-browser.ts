/**
 * Resource Browser Component
 * A component for browsing and selecting file resources.
 * Used in the editor for selecting images, CSS files, and other assets.
 */

import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { FileMetadata, IBoardBackend } from '../types';

/**
 * Resource browser for selecting and uploading dashboard assets.
 * Shows a text field with selected resource path and a button to open browser dialog.
 */
@customElement('ds-resource-browser')
export class ResourceBrowser extends LitElement {
  /**
   * Currently selected resource path.
   */
  @property({ type: String }) value: string = '';

  /**
   * Board ID for backend API calls.
   */
  @property({ type: String }) boardId: string = '';

  /**
   * Backend instance for API calls.
   */
  @property({ type: Object }) backend?: IBoardBackend;

  /**
   * File extension regex filter (e.g., '\.(css|scss)$')
   */
  @property({ type: String }) fileFilter: string = '';

  /**
   * Label for the input field.
   */
  @property({ type: String }) label: string = 'Resource';

  /**
   * Callback when resource is selected.
   */
  @property({ type: Function }) onChange?: (url: string) => void;

  @state()
  private showDialog = false;

  @state()
  private items: FileMetadata[] = [];

  @state()
  private currentFolder = '/';

  @state()
  private loading = false;

  @state()
  private error = '';

  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    }

    .field-group {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    label {
      display: block;
      font-weight: 500;
      margin-bottom: 4px;
      color: #333;
    }

    .input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    input[type='text'] {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 12px;
    }

    button {
      padding: 6px 12px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    button:hover {
      background: #0052a3;
    }

    /* Dialog styles */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    }

    .dialog {
      background: white;
      border-radius: 6px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dialog-header {
      padding: 16px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      color: #999;
      width: 24px;
      height: 24px;
    }

    .close-btn:hover {
      color: #333;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .folder-path {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      align-items: center;
      font-size: 12px;
    }

    .breadcrumb-btn {
      padding: 2px 6px;
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }

    .breadcrumb-btn:hover {
      background: #e0e0e0;
    }

    .resource-list {
      display: grid;
      gap: 8px;
    }

    .resource-item {
      padding: 8px;
      border: 1px solid #eee;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .resource-item:hover {
      background: #f5f5f5;
      border-color: #0066cc;
    }

    .resource-item.selected {
      background: #e8f2ff;
      border-color: #0066cc;
      font-weight: 500;
    }

    .resource-name {
      flex: 1;
    }

    .resource-size {
      color: #999;
      font-size: 11px;
    }

    .error {
      color: #d32f2f;
      padding: 8px;
      background: #ffebee;
      border-radius: 3px;
      margin-bottom: 12px;
      font-size: 12px;
    }

    .loading {
      text-align: center;
      padding: 32px;
      color: #999;
    }

    .dialog-footer {
      padding: 12px 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `;

  override render(): TemplateResult {
    return html`
      <div class="field-group">
        <div style="flex: 1;">
          <label>${this.label}</label>
          <div class="input-wrapper">
            <input
              type="text"
              .value="${this.value}"
              @change="${(e: Event) => this.onInputChange(e)}"
              placeholder="Select a resource..."
              readonly
            />
            <button @click="${() => this.openDialog()}">
              Browse
            </button>
          </div>
        </div>
      </div>

      ${this.showDialog ? this.renderDialog() : ''}
    `;
  }

  private renderDialog(): TemplateResult {
    return html`
      <div class="dialog-overlay" @click="${(e: Event) => e.target === e.currentTarget && this.closeDialog()}">
        <div class="dialog">
          <div class="dialog-header">
            <h2>Select Resource</h2>
            <button class="close-btn" @click="${() => this.closeDialog()}">
              ✕
            </button>
          </div>

          <div class="dialog-content">
            ${this.error ? html`<div class="error">${this.error}</div>` : ''}
            ${this.renderBrowseTab()}
          </div>

          <div class="dialog-footer">
            <button class="btn-secondary" @click="${() => this.closeDialog()}">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBrowseTab(): TemplateResult {
    if (this.loading) {
      return html`<div class="loading">Loading...</div>`;
    }

    const pathParts = this.currentFolder === '/' ? [] : this.currentFolder.split('/').filter(p => p);

    return html`
      <div class="folder-path">
        <button class="breadcrumb-btn" @click="${() => this.loadFolder('/')}">
          /
        </button>
        ${pathParts.map((part, idx) => {
          const path = '/' + pathParts.slice(0, idx + 1).join('/');
          return html`
            <span>/</span>
            <button class="breadcrumb-btn" @click="${() => this.loadFolder(path)}">
              ${part}
            </button>
          `;
        })}
      </div>

      <div class="resource-list">
        ${this.items.length === 0
          ? html`<div style="color: #999; text-align: center; padding: 20px;">
              No files found
            </div>`
          : this.items.map(
              (item) => html`
                <div
                  class="resource-item ${item.url === this.value ? 'selected' : ''}"
                  @click="${() => this.selectItem(item)}"
                >
                  <span class="resource-name">
                    ${item.type === 'folder' ? '📁 ' : '📄 '}${item.name}
                  </span>
                  ${item.size && item.type === 'file'
                    ? html`<span class="resource-size">
                        ${this.formatFileSize(item.size)}
                      </span>`
                    : ''}
                </div>
              `
            )}
      </div>
    `;
  }

  private async openDialog(): Promise<void> {
    this.showDialog = true;
    this.loading = true;
    this.error = '';

    try {
      await this.loadFolder('/');
    } catch (e) {
      this.error = `Failed to load resources: ${e}`;
    }
  }

  private closeDialog(): void {
    this.showDialog = false;
  }

  private async loadFolder(folder: string): Promise<void> {
    if (!this.boardId || !this.backend) {
      this.error = 'No board or backend configured';
      return;
    }

    try {
      this.loading = true;
      const items = await this.backend.listResourceFolder(this.boardId, folder);

      // Filter by file extension if specified
      let filtered = items;
      if (this.fileFilter) {
        const regex = new RegExp(this.fileFilter);
        filtered = items.filter(item => item.type === 'folder' || regex.test(item.name));
      }

      this.items = filtered;
      this.currentFolder = folder;
      this.error = '';
    } catch (e) {
      this.error = `Failed to load folder: ${e}`;
      this.items = [];
    } finally {
      this.loading = false;
    }
  }

  private selectItem(item: FileMetadata): void {
    if (item.type === 'folder') {
      // Navigate into folder
      const newPath = this.currentFolder === '/'
        ? '/' + item.name
        : this.currentFolder + '/' + item.name;
      this.loadFolder(newPath);
    } else if (item.url) {
      // Select file with URL
      this.value = item.url;
      if (this.onChange) {
        this.onChange(item.url);
      }
      this.closeDialog();
    }
  }

  private onInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    if (this.onChange) {
      this.onChange(input.value);
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-resource-browser': ResourceBrowser;
  }
}
