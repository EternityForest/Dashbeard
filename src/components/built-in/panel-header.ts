import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement} from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';


@customElement('ds-panel-header')
export class PanelHeaderComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'panel-header',
    displayName: 'Panel Header',
    category: 'layout',
    description: 'Header for panel-layout',
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
      ?.querySelector(`#component-${this.id}`)
      ?.replaceChildren();

    (this.componentConfig?.children || []).forEach((cnf) => {
      const child = this.allComponents.get(cnf.id);
      if (child) {
        const existing = this.renderRoot
          ?.querySelector(`#component-${this.id}`)
          ?.querySelector(`#component-${cnf.id}`);
        if (existing) {
          existing.remove();
        }

        this.renderRoot
          ?.querySelector(`#component-${this.id}`)
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
        id="component-${this.id}"
        class="panel-header"
      ></div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
