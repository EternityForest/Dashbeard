/* eslint-disable @typescript-eslint/require-await */
/**
 * Heading component - stores and outputs a value.
 */

import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';
import type { ComponentTypeSchema } from '../../editor/types';

@customElement('ds-heading')
export class HeadingComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'heading',
    displayName: 'Heading',
    category: 'text',
    description: 'Stores and outputs a value',
    configSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'What it says',
          default: 'Heading',
        },

        level: {
          type: 'number',
          description: 'Heading Level',
          default: 2,
        },
      },
    },
  };

  /**
   * Reactive property for the current value.
   */
  @property() value: unknown = null;

  @property() title: string = 'Heading';
  @property() level: number = 2;

  public override onConfigUpdate(): void {
    const config = this.componentConfig;
    if (config) {
      this.title = (config.config.title as string) || 'Heading';
      this.level = config.config.level as number;
    }
    this.requestUpdate();
  }

  override render(): TemplateResult {

    if (this.level == 1) {
      return html` <h1>${this.title}</h1> `;
    }

        if (this.level == 2) {
      return html` <h2>${this.title}</h2> `;
    }

        if (this.level == 2) {
      return html` <h3>${this.title}</h3> `;
    }

        if (this.level == 4) {
      return html` <h4>${this.title}</h4> `;
    }


      return html` <h2>${this.title}</h2> `;
    
  }
}
