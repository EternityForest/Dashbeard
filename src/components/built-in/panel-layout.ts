import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement} from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';


@customElement('ds-panel-layout')
export class PanelLayoutComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'panel-layout',
    displayName: 'Panel Layout',
    category: 'layout',
    description: 'Container for arranging children with flexbox',
    configSchema: {
      type: 'object',
      properties: {
      },
    }
  };


  /**
   * Synchronize component with node config.
   */
  public override onConfigUpdate(): void {
    // const config = this.componentConfig;

    this.requestUpdate();
  }

  override updated(_changedProperties: Map<string, unknown>) {
        this.renderRoot
      ?.querySelector(`#panel-layout-${this.id}`)
      ?.replaceChildren();

    (this.componentConfig?.children || []).forEach((cnf) => {
      const child = this.allComponents.get(cnf.id);
      if (child) {
        const existing = this.renderRoot
          ?.querySelector(`#panel-layout-${this.id}`)
          ?.querySelector(`#${cnf.id}`);
        if (existing) {
          existing.remove();
        }

        this.renderRoot
          ?.querySelector(`#panel-layout-${this.id}`)
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
        id="panel-layout-${this.id}"
        class="panel-layout card border flex-col gaps padding margin"
      ></div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
