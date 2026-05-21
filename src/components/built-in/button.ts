/**
 * Button component - clickable button that increments target port.
 */

import { html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';
import { doSerialized } from '../../core/serialized-actions';
import type { ComponentConfig } from '../../boards/board-types';
import type { ComponentTypeSchema } from '../../editor/types';
import { Port } from '../../flow/port';
import type { PortData } from '../../flow/data-types';
import type { SourceType } from '../../flow/port';

@customElement('ds-button')
export class ButtonComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'button',
    displayName: 'Button',
    category: 'input',
    description: 'Clickable button that increments target port',
    configSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'Button label',
          default: 'Click',
        },
      },
    },
  };

  @property({ type: 'number' }) enabled = 1;
  @property() label = 'Click';
  @property({ type: 'number' }) counter = 0;

  private targetPort: Port;

  constructor(config: ComponentConfig) {
    super(config);

    this.targetPort = this.node.addPort(
      new Port({ name: 'target', type: 'number', direction: 'input' })
    );


    const enabledPort = this.node.addPort(
      new Port({ name: 'enabled', type: 'number', direction: 'input' })
    );

    enabledPort.addDataHandler(this.onEnabledData.bind(this));

    this.enabled = (parseInt(config?.config?.defaultValue as string || '', 10)) ?? 1;

    this.onConfigUpdate();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async onEnabledData(
    data: PortData,
    _sourceType: SourceType
  ): Promise<void> {
    this.enabled = data.value as number;
    this.requestUpdate();
  }

  public override onConfigUpdate(): void {
    const specificConfig: Record<string, unknown> = this.componentConfig.config || {};
    this.label = (specificConfig.label as string) || 'Click';
    this.requestUpdate();
  }

  private handleClick(): void {
    if (this.enabled< .01) return;

    doSerialized(() => {

      this.counter = this?.targetPort.getLastData()?.value as number | 0;
      this.counter++;
      void this.sendData('target', this.counter);
    });
  }


  protected override updated(_changedProperties: PropertyValues): void {
    const button = this.renderRoot?.querySelector('button');
    if (button) {
      button.disabled = this.enabled < .01;
    }
  }
  override render(): TemplateResult {
    const isDisabled = this.enabled < .01;

    return html`
        <button
          ?disabled="${isDisabled}"
          @click="${this.handleClick.bind(this)}"
        >
          ${this.label}
        </button>
    `;
  }
}