/**
 * Slider component - numeric range input.
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
/**
 * Slider component - numeric range input for selecting values within bounds.
 */
@customElement('dashbeard-slider')
export class SliderComponent extends DashboardComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'slider',
    displayName: 'Slider',
    category: 'input',
    description: 'Numeric range input for selecting values within bounds',
    configSchema: {
      type: 'object',
      properties: {
        min: {
          type: 'number',
          description: 'Minimum value',
        },
        max: {
          type: 'number',
          description: 'Maximum value',
        },
        defaultValue: {
          type: 'number',
          description: 'Current value',
        },
        step: {
          type: 'number',
          description: 'Step size',
          minimum: 0.00001,
        },
        label: {
          type: 'string',
          description: 'Display label',
          default: 'Value',
        },
      },
    },
  };

  /**
   * Current slider value.
   */
  @property({ type: "number" }) value=0;


  @property({ type: String }) unit= '';

  @property({ type: String }) displayUnit= '';

  /**
   * Minimum value.
   */
  @property({ type: String }) min= '';

  /**
   * Maximum value.
   */
  @property({ type: String }) max= '';
  /**
   * Step size.
   */
  @property({ type: String }) step= '';
  /**
   * Display label.
   */
  @property() label: string = 'Slider';

  constructor(config: ComponentConfig) {
    super(config);

    const port = this.node.addPort(
      new Port({name: 'value',  type: 'number', direction: 'input' })
    );

    port.addDataHandler(this.onPortData.bind(this));

    this.value = (parseFloat(config?.config?.defaultValue as string || '')) ?? 50;

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
    this.componentConfig.config.value = data.value;
    this.requestUpdate();
  }

  /**
   * Synchronize component with node config.
   */
  public override onConfigUpdate(): void {
    const specificConfig: Record<string, unknown> =
      this.componentConfig.config || {};

    const sourceportschema = this.node
      .getInputPort('value')
      .getUpstreamPort()
      ?.schema.get();

    this.unit = ''

    if (sourceportschema) {

      if(sourceportschema.min !== undefined) {
        this.min = sourceportschema.min.toString()
      }

      if(sourceportschema.max !== undefined) {
        this.max = sourceportschema.max.toString()
      }

      if(sourceportschema.step !== undefined) {
        this.step = sourceportschema.step.toString()
      }

      if(sourceportschema.unit !== undefined) {
        this.unit = sourceportschema.unit
      }
    }      

    if(specificConfig.min !== undefined) {
      this.min = specificConfig.min?.toString() || '0'
    }

    if(specificConfig.max !== undefined) {
      this.max = specificConfig.max?.toString() || '100'
    }

    if(specificConfig.step !== undefined) {
      this.step = specificConfig.step?.toString() || ''
    }
    

    if(this.step === '') {
      this.step = '0.01'
    }
    

    this.displayUnit = this.unit
    this.label = (specificConfig.label as string) || 'Slider';

    this.requestUpdate();
  }

  /**
   * Handle slider input.
   */
  private handleInput(event: Event): void {
    doSerialized(() => {
      const target = event.target as HTMLInputElement;
      this.value = Number(target.value);
      void this.sendData('value', this.value);
    });
  }

  /**
   * Calculate percentage for visual fill effect.
   */
  private getPercentage(): number {
    return ((this.value - parseFloat(this.min) /
     (parseFloat(this.max)- parseFloat(this.min)))) * 100;
  }

  /**
   * Render the slider component.
   */
  override render(): TemplateResult {
    const percentage = this.getPercentage();

    return html`
      <label class="noselect"
        >${this.label} (${this.value}${this.displayUnit})
        <input
          class="max-w-12rem display-cont"
          type="range"
          .value="${String(this.value)}"
          .min="${String(this.min)}"
          .max="${String(this.max)}"
          .step="${String(this.step)}"
          @input="${this.handleInput.bind(this)}"
          style="--percentage: ${percentage}%;max-width: 12rem"
        />
      </label>
    `;
  }
}
