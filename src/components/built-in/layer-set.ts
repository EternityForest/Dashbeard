/**
 * LayerSet component - stacks all immediate children using CSS grid.
 */

import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';

@customElement('ds-layer-set')
export class LayerSetComponent extends PlainLayoutComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'layer-set',
    displayName: 'Layer Set',
    category: 'layout',    acceptsChildren: true,

    description: 'Stack all children using CSS grid',
    configSchema: {
      type: 'object',
      properties: {
        gap: {
          type: 'string',
          description: 'Gap between layers',
          default: '0px',
        },
      },
    },
  };

  /**
   * Gap between layers.
   */
  gap = '0px';

  public override onConfigUpdate(): void {
    const config = this.componentConfig?.config || {};
    this.gap = (config.gap as string) || '0px';
    this.requestUpdate();
  }

  override render(): TemplateResult {
    return html`
      <div id="component-${this.id}" class="layer-set">
        <widget-children
          class="layer-set-children"
          style="gap: ${this.gap};"
        ></widget-children>
      </div>
    `;
  }

  }