/**
 * Image component - displays an image or video.
 */

import type { ComponentTypeSchema } from '@/editor/types';
import { html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';

@customElement('ds-image')
export class ImageComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'image',
    displayName: 'Image',
    category: 'display',
    description: 'Display an image or video',
    configSchema: {
      type: 'object',
      properties: {
        src: {
          type: 'string',
          description: 'Image or video source URL',
          format: 'file',
        },
        height: {
          type: 'string',
          description: 'Height (e.g., 200px, auto)',
          default: '',
        },
        width: {
          type: 'string',
          description: 'Width (e.g., 300px, auto)',
          default: '',
        },
        alt: {
          type: 'string',
          description: 'Alt text for accessibility',
          default: '',
        },
      },
    },
  };

  @property() src = '';
  @property() height = '';
  @property() width = '';
  @property() alt = '';

  /**
   * Check if the source is a video file.
   */
  private isVideo(): boolean {
    if (!this.src) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const lowerSrc = this.src.toLowerCase();
    return videoExtensions.some(ext => lowerSrc.endsWith(ext));
  }

  public override onConfigUpdate(): void {
    const config = this.componentConfig?.config || {};
    this.src = (config.src as string) || '';
    this.height = (config.height as string) || '';
    this.width = (config.width as string) || '';
    this.alt = (config.alt as string) || '';
    this.requestUpdate();
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }

  override render(): TemplateResult {
    const style = [
      this.height ? `height: ${this.height}` : '',
      this.width ? `width: ${this.width}` : '',
    ].filter(Boolean).join('; ');

    if (!this.src) {
      return html`<div class="image-placeholder">No image source</div>`;
    }

    if (this.isVideo()) {
      return html`
        <video 
          class="image-element"
          style="${style}"
          autoplay 
          muted 
          loop 
          playsinline
        >
          <source src="${this.src}" />
          Your browser does not support video playback.
        </video>
      `;
    }

    return html`
      <img 
        class="image-element"
        style="${style}"
        src="${this.src}" 
        alt="${this.alt}"
        loading="lazy"
      />
    `;
  }
}