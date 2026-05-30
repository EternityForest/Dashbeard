import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';

@customElement('ds-plain-layout')
export class PlainLayoutComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'plain-layout',
    displayName: 'Plain Layout',
    category: 'layout',
    description: 'Container for arranging children with flexbox',
    configSchema: {
      type: 'object',
      properties: {},
    },
  };

  /**
   * Synchronize component with node config.
   */
  public override onConfigUpdate(): void {
    // const config = this.componentConfig;

    this.requestUpdate();
  }

  override updated(_changedProperties: Map<string, unknown>) {
    const childrenTarget = this.renderRoot
      ?.querySelector('widget-children');

    if (!childrenTarget) {
      throw new Error('Could not find widget-children');
    }

    childrenTarget?.replaceChildren();

    (this.componentConfig?.children || []).forEach((cnf) => {
      const child = this.allComponents.get(cnf.id);
      if (child) {
        childrenTarget?.appendChild(child);
      }
    });
  }
  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div id="component-${this.id}" class="plain-layout">
        <widget-children></widget-children>
      </div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
