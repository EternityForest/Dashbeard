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
    category: 'layout',
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
          default: '1rem',
        },
        componentGridHeight: {
          type: 'string',
          description: 'Height of the component grid',
          default: '6rem',
        },
      },
    }
  };

  /**
   * Flex direction: 'row' or 'column'.
   */
  @property() direction: 'row' | 'column' = 'column';

  @property() componentGridHeight: string = '6rem';

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
      this.direction = (config.config.direction as 'row' | 'column') || 'row';
      this.gap = (config.config.gap as string) ?? '8px';
      this.componentGridHeight =
        (config.config.componentGridHeight as string) ?? '6rem';
    }
    this.requestUpdate();
  }

  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div
        id="component-${this.id}"
        class="stack-layout"
        style="flex-direction: ${this.direction}; 
      gap: ${this.gap};
      --component-grid-height: ${this.componentGridHeight};
      "
      ></div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
