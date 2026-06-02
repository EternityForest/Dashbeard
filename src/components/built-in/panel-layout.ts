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
    category: 'layout',    acceptsChildren: true,

    description: 'Container for arranging children with flexbox',
    configSchema: {
      type: 'object',
      properties: {
        expand: {
          type: 'number',
          default: 1,
        },

        'max-width': {
          type: 'string',
          default: '36rem',
        },

        height: {
          type: 'string',
          default: '',
        },

        'max-height': {
          type: 'string',
          default: '',
        },
      },
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
    const config = this?.componentConfig?.config || {};
    const height = config['height'] || '';
    const maxHeight = config['max-height'] || '';
    const maxWidth = config['max-width'] || '36rem';
    const expand = config['expand'] || 1;

    return html`
      <widget-children
        style="max-width: ${maxWidth}; height: ${height}; max-height: ${maxHeight}; flex-grow: ${expand}; display: flex; flex-direction: column;"
        class="panel-layout card border flex-col margin paper"
      ></widget-children>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
