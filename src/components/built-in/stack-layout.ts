/**
 * FlexLayout component - renders children with configurable flex direction.
 */

import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';
/**
 * FlexLayout component - container for arranging children with flexbox.
 */
@customElement('ds-stack-layout')
export class StackLayoutComponent extends PlainLayoutComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'stack-layout',
    displayName: 'Stack Layout',
    category: 'layout',    acceptsChildren: true,

    description: 'Container for arranging children with flexbox',
    configSchema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['row', 'column'],
          description: 'Flex direction: row or column',
          default: 'row',
        },

        gap: {
          type: 'string',
          description: 'Gap between components',
          default: 'var(--gap)',
        }
      },
    },
  };

  /**
   * Flex direction: 'row' or 'column'.
   */
  @property() direction: 'row' | 'column' = 'column';

  /**
   * Gap between children in pixels.
   */
  @property({ type: String }) gap: string = '8px';

  /**
   * Synchronize component with node config.
   */
  public override onConfigUpdate(): void {
    const config = this.componentConfig;
    if (config) {
      this.direction = (config?.config?.direction as 'row' | 'column') || 'row';
      this.gap = (config?.config?.gap as string) ?? '8px';
    }
    this.requestUpdate();
  }

  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div id="component-${this.id}">
        <widget-children
          class="stack-layout"
          style="flex-direction: ${this.direction}; 
      gap: ${this.gap};
      flex-wrap:wrap;
      "
        ></widget-children>
      </div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
