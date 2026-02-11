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

import { Port } from '../../flow/port';
import type { PortData } from '../../flow/data-types';
import { SourceType } from '../../flow/port';

/**
 * Variable component - simple storage and output of values.
 * Used for constants, state, or user-input values.
 */
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
      },
    },
  };

  /**
   * Reactive property for the current value.
   */
  @property() value: unknown = null;

  /**
   * Display label.
   */
  @property() label: string = 'Variable';

  constructor(config: ComponentConfig) {
    super(config);

    this.value = config.config.defaultValue ?? null;

    this.node
      .addPort(new Port('value', config.config.type as string, true))
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

      // Check if type changed - requires recreation with new port
      const currentPort = this.node.getOutputPort('value');
      const newType = config.config.type as string;

      if (currentPort && currentPort.type !== newType) {
        // Type changed - request recreation
        this.requestRecreation().catch((err) => {
          console.error('Failed to recreate variable component:', err);
        });
        return; // Don't update - component will be recreated
      }
    }
    this.requestUpdate();
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
      <div class="small-dashboard-widget-container">
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
