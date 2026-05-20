import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';

@customElement('ds-panel-layout')
export class PanelLayoutComponent extends PlainLayoutComponent {
  static readonly defaultChildren = [
    {
      type: 'panel-header',
      id: '$parent-header',
      config: {},

      children: [
        {
          type: 'tool-bar',
          id: '$parent-toolbar',
          children: [{ type: 'heading', id: '$parent-heading' }],
        },
      ],
    },
    {
      type: 'panel-body',
      id: '$parent-body',

      config: {},
    },
  ];

  static readonly typeSchema: ComponentTypeSchema = {
    name: 'panel-layout',
    displayName: 'Panel Layout',
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
      <div id="component-${this.id}">
        <widget-children
          class="panel-layout card border flex-col margin"
        ></widget-children>
      </div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
