import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';

@customElement('ds-tool-bar')
export class ToolBarComponent extends PlainLayoutComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'tool-bar',
    displayName: 'Plain Layout',
    category: 'layout',
    description: 'Container for arranging children with flexbox',
    configSchema: {
      type: 'object',
      properties: {},
    },
  };

  /**
   * Render the flex layout container with child placeholders.
   */
  override render(): TemplateResult {
    return html`
      <div id="component-${this.id}" style="display: contents;">
        <widget-children class="tool-bar"></widget-children>
      </div>
    `;
  }

  override firstUpdated() {
    this.onConfigUpdate();
  }
}
