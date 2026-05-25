/**
 * Switch component - checkbox with switch styling.
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

@customElement('dashbeard-switch')
export class SwitchComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'switch',
    displayName: 'Switch',
    category: 'input',
    description: 'Checkbox with switch styling',
    configSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'Display label',
          default: 'Switch',
        },
      },
    },
  };

  @property({ type: 'number' }) value = 0;
  @property() label = 'Switch';

  constructor(config: ComponentConfig) {
    super(config);

    const port = this.node.addPort(
      new Port({ name: 'value', type: 'number', direction: 'input' })
    );

    port.addDataHandler(this.onPortData.bind(this));

    this.value = (parseInt(config?.config?.defaultValue as string || '', 10)) ?? 0;

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
    this.value = data.value as number;
    this.requestUpdate();
  }

  public override onConfigUpdate(): void {
    const specificConfig: Record<string, unknown> = this.componentConfig.config || {};
    this.label = (specificConfig.label as string) || 'Switch';
    this.requestUpdate();
  }

  private handleChange(event: Event): void {
    doSerialized(() => {
      const target = event.target as HTMLInputElement;
      this.value = target.checked ? 1 : 0;
      void this.sendData('value', this.value);
    });
  }

  protected override updated(_changedProperties: PropertyValues): void {
    const checkbox = this.renderRoot?.querySelector('.toggle') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = parseFloat(this.value) > 0;
    }
  }

  override render(): TemplateResult {
    return html`
        <label class="noselect w-full switch-label">
          <input
            type="checkbox"
            class="toggle"
            ?checked="${parseFloat(this.value) > 0}"
            @change="${this.handleChange.bind(this)}"
          />
          <span>${this.label}</span>
        </label>
    `;
  }
}