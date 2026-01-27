/**
 * FlexLayout component - renders children with configurable flex direction.
 */

import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';

/**
 * FlexLayout component - container for arranging children with flexbox.
 */
@customElement('ds-flex-layout')
export class FlexLayoutComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'flex-layout',
    displayName: 'Flex Layout',
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
    },
    ports: {
      inputs: [],
      outputs: [],
    },
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

  override updated(_changedProperties: Map<string, unknown>) {
        this.renderRoot
      ?.querySelector(`#flex-layout-${this.id}`)
      ?.replaceChildren();

    (this.componentConfig?.children || []).forEach((cnf) => {
      const child = this.allComponents.get(cnf.id);
      if (child) {
        const existing = this.renderRoot
          ?.querySelector(`#flex-layout-${this.id}`)
          ?.querySelector(`#${cnf.id}`);
        if (existing) {
          existing.remove();
        }

        this.renderRoot
          ?.querySelector(`#flex-layout-${this.id}`)
          ?.appendChild(child);
      }
    });
  }
  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div
        id="flex-layout-${this.id}"
        class="flex-layout"
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
