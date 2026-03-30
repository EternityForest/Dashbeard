import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';

@customElement('ds-panel-body')
export class PanelBodyComponent extends PlainLayoutComponent {
  static readonly defaultChildren = [
  ];

  static readonly typeSchema: ComponentTypeSchema = {
    name: 'panel-body',
    displayName: 'Panel Body',
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

  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div
        id="component-${this.id}"
        class="panel-body flex-col margin padding"
      ></div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
