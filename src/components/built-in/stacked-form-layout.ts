import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';

@customElement('ds-stacked-form-layout')
export class formLayoutComponent extends PlainLayoutComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'stacked-form-layout',
    displayName: 'form Layout',
    category: 'layout',
    description: 'Form container for input widgets',
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

  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div id="component-${this.id}">
        <widget-children class="stacked-form"></widget-children>
      </div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
