/* eslint-disable @typescript-eslint/require-await */
/**
 * Variable component - stores and outputs a value.
 */

import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DashboardComponent } from '../dashboard-component';
import type { ComponentConfig } from '../../boards/board-types';
import type { ComponentTypeSchema } from '../../editor/types';
import { doSerialized } from '../../core/serialized-actions';

import { Port, PortSchema } from '../../flow/port';
import type { PortData } from '../../flow/data-types';
import { SourceType } from '../../flow/port';

@customElement('ds-variable')
export class VariableComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'variable',
    displayName: 'Variable',
    category: 'data',
    description: 'Stores and outputs a value',
    configSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'The value type',
          enum: ['string', 'number'],
          default: 'string',
        },
        defaultValue: {
          type: 'string',
          description: 'The default value',
          default: '',
        },
        label: {
          type: 'string',
          description: 'Display label',
          default: 'Variable',
        },
        visible: {
          type: 'boolean',
          description: 'Display in UI',
          default: false,
        },

        min: {
          type: 'number',
          description: 'Min val for numeric variables',
          default: 0,
        },
        max: {
          type: 'number',
          description: 'Max val for numeric variables',
          default: 100,
        },
      },
    },
  };

  @property() value: unknown = null;

  @property() label: string = 'Variable';

  @property() visible: boolean = true;

  constructor(config: ComponentConfig) {
    super(config);

    this.value = config.config.defaultValue ?? null;

    const ps: PortSchema = {
      type: (config.config.type as string) || 'string',
    };

    if (config.config.type == 'number') {
      ps.min = config.config.min;
      ps.max = config.config.max;
    }

    this.node
      .addPort(new Port('value', config.config.type as string, true, ps))
      .addDataHandler(this.onPortData.bind(this));
    this.onConfigUpdate();
  }

  protected async onPortData(
    data: PortData,
    sourceType: SourceType
  ): Promise<void> {
    if (data.value === this.value) return;
    if (sourceType === SourceType.PortOwner) return;
    this.value = data.value;
    this.requestUpdate();
    await this.sendData('value', this.value);
  }

  /**
   * Synchronize component value with node config.
   * Detects type changes and requests recreation if needed.
   */
  public override onConfigUpdate(): void {
    const config = this.componentConfig;
    if (config) {
      this.label = (config.config.label as string) || 'Variable';
      this.visible = config.config.visible as boolean;

      // Type changed - request recreation
      this.requestRecreation().catch((err) => {
        console.error('Failed to recreate variable component:', err);
      });
    }
  }

  /**
   * Input handler - when user changes the value.
   */
  private handleValueChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    let newValue: unknown = target.value;

    // Try to parse as number
    if (!isNaN(Number(newValue)) && newValue !== '') {
      newValue = Number(newValue);
    }

    this.value = newValue;

    doSerialized(() => this.sendData('value', this.value));
  }

  /**
   * Render the variable component.
   */
  override render(): TemplateResult {
    return html`
      <div
        class="small-dashboard-widget-container${this.visible ? '' : ' hidden'}"
      >
        <label>${this.label}</label>
        <input
          type="text"
          .value="${String(this.value)}"
          @change="${this.handleValueChange.bind(this)}"
          placeholder="Enter value"
        />
      </div>
    `;
  }
}
