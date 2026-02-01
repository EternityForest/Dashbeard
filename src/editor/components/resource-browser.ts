/**
 * Resource Browser Component
 * A component for browsing, uploading, and selecting file resources.
 * Used in the editor for selecting images, CSS files, and other assets.
 */

import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface ResourceItem {
  path: string;
  displayName: string;
  type: string;
  mimeType?: string;
  size?: number;
  modified?: number;
}

interface BuiltinResource {
  url: string;
  displayName: string;
  category: string;
  type: string;
}

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
   * Module and resource identifiers for backend API calls.
   */
  @property({ type: String }) module: string = '';
  @property({ type: String }) resource: string = '';

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
  @property({ type: Function }) onChange?: (path: string) => void;

  @state()
  private showDialog = false;

  @state()
  private resources: ResourceItem[] = [];

  @state()
  private builtinResources: BuiltinResource[] = [];

  @state()
  private currentFolder = '';

  @state()
  private loading = false;

  @state()
  private error = '';

  @state()
  private activeTab: 'browse' | 'builtin' = 'browse';

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

    .tabs {
      display: flex;
      border-bottom: 1px solid #eee;
      background: #f9f9f9;
    }

    .tab {
      flex: 1;
      padding: 12px;
      text-align: center;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      background: transparent;
      font-size: 13px;
      font-weight: 500;
    }

    .tab.active {
      border-bottom-color: #0066cc;
      color: #0066cc;
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

    .upload-section {
      border-top: 1px solid #eee;
      padding: 12px;
      background: #f9f9f9;
    }

    .file-input-wrapper {
      position: relative;
      overflow: hidden;
      display: inline-block;
    }

    .file-input-wrapper input[type='file'] {
      position: absolute;
      left: -9999px;
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

          <div class="tabs">
            <button
              class="tab ${this.activeTab === 'browse' ? 'active' : ''}"
              @click="${() => this.activeTab = 'browse'}"
            >
              Browse Files
            </button>
            <button
              class="tab ${this.activeTab === 'builtin' ? 'active' : ''}"
              @click="${() => this.activeTab = 'builtin'}"
            >
              Built-in Resources
            </button>
          </div>

          <div class="dialog-content">
            ${this.error ? html`<div class="error">${this.error}</div>` : ''}

            ${this.activeTab === 'browse'
              ? this.renderBrowseTab()
              : this.renderBuiltinTab()}
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

    return html`
      <div class="folder-path">
        <button class="breadcrumb-btn" @click="${() => this.loadFolder('')}">
          /
        </button>
        ${this.currentFolder
          ? html`
              <span>/</span>
              <span>${this.currentFolder}</span>
            `
          : ''}
      </div>

      <div class="resource-list">
        ${this.resources.length === 0
          ? html`<div style="color: #999; text-align: center; padding: 20px;">
              No files found
            </div>`
          : this.resources.map(
              (resource) => html`
                <div
                  class="resource-item ${resource.path === this.value ? 'selected' : ''}"
                  @click="${() => this.selectResource(resource.path)}"
                >
                  <span class="resource-name">${resource.displayName}</span>
                  ${resource.size
                    ? html`<span class="resource-size">
                        ${this.formatFileSize(resource.size)}
                      </span>`
                    : ''}
                </div>
              `
            )}
      </div>

      <div class="upload-section">
        <div style="margin-bottom: 8px; font-weight: 500;">Upload New File</div>
        <div class="file-input-wrapper">
          <input
            type="file"
            id="file-upload"
            @change="${(e: Event) => this.handleFileUpload(e)}"
          />
          <button
            style="margin: 0;"
            @click="${() => (document.getElementById('file-upload') as HTMLInputElement)?.click()}"
          >
            Choose File
          </button>
        </div>
      </div>
    `;
  }

  private renderBuiltinTab(): TemplateResult {
    if (this.loading) {
      return html`<div class="loading">Loading...</div>`;
    }

    const grouped = this.groupByCategory(this.builtinResources);

    return html`
      <div class="resource-list">
        ${Object.entries(grouped).map(
          ([category, resources]) => html`
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 500; color: #666; margin-bottom: 8px;">
                ${this.formatCategory(category)}
              </div>
              ${resources.map(
                (resource) => html`
                  <div
                    class="resource-item ${resource.url === this.value ? 'selected' : ''}"
                    @click="${() => this.selectResource(resource.url)}"
                  >
                    <span class="resource-name">${resource.displayName}</span>
                  </div>
                `
              )}
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
      await this.loadFolder('');
      if (this.activeTab === 'browse') {
        await this.loadBuiltinResources();
      }
    } catch (e) {
      this.error = `Failed to load resources: ${e}`;
    }
  }

  private closeDialog(): void {
    this.showDialog = false;
  }

  private async loadFolder(folder: string): Promise<void> {
    if (!this.module || !this.resource) {
      this.error = 'Module and resource not configured';
      return;
    }

    try {
      this.loading = true;
      const url = `/api/dashboards/${this.module}/${this.resource}/files/list?subfolder=${encodeURIComponent(folder)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Filter by file extension if specified
      let resources = data.resources || [];
      if (this.fileFilter) {
        const regex = new RegExp(this.fileFilter);
        resources = resources.filter((r: ResourceItem) => regex.test(r.displayName));
      }

      this.resources = resources;
      this.currentFolder = folder;
      this.error = '';
    } catch (e) {
      this.error = `Failed to load folder: ${e}`;
      this.resources = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadBuiltinResources(): Promise<void> {
    try {
      const response = await fetch('/api/dashboards/builtin');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.builtinResources = data.resources || [];
    } catch (e) {
      this.builtinResources = [];
    }
  }

  private async handleFileUpload(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    const file = files[0];
    if (this.fileFilter) {
      const regex = new RegExp(this.fileFilter);
      if (!regex.test(file.name)) {
        this.error = `File type not allowed. Must match pattern: ${this.fileFilter}`;
        input.value = '';
        return;
      }
    }

    try {
      this.loading = true;
      const formData = new FormData();
      formData.append('path', file.name);
      formData.append('file', file);

      const response = await fetch(
        `/api/dashboards/${this.module}/${this.resource}/files/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Reload folder and select the uploaded file
      await this.loadFolder(this.currentFolder);
      this.selectResource(data.path);
      input.value = '';
    } catch (e) {
      this.error = `Upload failed: ${e}`;
    } finally {
      this.loading = false;
    }
  }

  private selectResource(path: string): void {
    this.value = path;
    if (this.onChange) {
      this.onChange(path);
    }
    this.closeDialog();
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

  private formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  private groupByCategory(
    resources: BuiltinResource[]
  ): Record<string, BuiltinResource[]> {
    return resources.reduce(
      (acc, resource) => {
        if (!acc[resource.category]) {
          acc[resource.category] = [];
        }
        acc[resource.category].push(resource);
        return acc;
      },
      {} as Record<string, BuiltinResource[]>
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-resource-browser': ResourceBrowser;
  }
}
