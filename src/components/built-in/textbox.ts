/**
 * Textbox component - text input inside a label.
 */

import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';
import { doSerialized } from '../../core/serialized-actions';
import type { ComponentConfig } from '../../boards/board-types';
import type { ComponentTypeSchema } from '../../editor/types';
import { Port } from '../../flow/port';
import type { PortData } from '../../flow/data-types';
import type { SourceType } from '../../flow/port';

@customElement('dashbeard-textbox')
export class TextboxComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'textbox',
    displayName: 'Textbox',
    category: 'input',
    description: 'Text input inside a label',
    configSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'Display label',
          default: 'Text',
        },
        placeholder: {
          type: 'string',
          description: 'Placeholder text',
          default: '',
        },
      },
    },
  };

  @property() value = '';
  @property() label = 'Text';
  @property() placeholder = '';

  constructor(config: ComponentConfig) {
    super(config);

    const port = this.node.addPort(
      new Port({ name: 'value', type: 'string', direction: 'input' })
    );

    port.addDataHandler(this.onPortData.bind(this));

    this.value = config?.config?.defaultValue as string || '';

    this.onConfigUpdate();

    port.upstreamConnection.subscribe(() => {
      this.onConfigUpdate();
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async onPortData(
    data: PortData,
    _sourceType: SourceType
  ): Promise<void> {
    this.value = data.value as string;
    this.componentConfig.config.value = data.value;
    this.requestUpdate();
  }

  public override onConfigUpdate(): void {
    const specificConfig: Record<string, unknown> = this.componentConfig.config || {};
    this.label = (specificConfig.label as string) || 'Text';
    this.placeholder = (specificConfig.placeholder as string) || '';
    this.requestUpdate();
  }

  private handleInput(event: Event): void {
    doSerialized(() => {
      const target = event.target as HTMLInputElement;
      this.value = target.value;
      void this.sendData('value', this.value);
    });
  }

  override render(): TemplateResult {
    return html`
        <label class="one-line-control">
          ${this.label}
          <input
            type="text"
            .value="${this.value}"
            .placeholder="${this.placeholder}"
            @change="${this.handleInput.bind(this)}"
          />
        </label>
    `;
  }
}