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
@customElement('ds-slider')
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
          default: 0,
        },
        max: {
          type: 'number',
          description: 'Maximum value',
          default: 100,
        },
        defaultValue: {
          type: 'number',
          description: 'Current value',
          default: 50,
        },
        step: {
          type: 'number',
          description: 'Step size',
          default: 1,
        },
        label: {
          type: 'string',
          description: 'Display label',
          default: 'Value',
        },
      },
    }
  };

  /**
   * Current slider value.
   */
  @property({ type: Number }) value: number = 50;

  /**
   * Minimum value.
   */
  @property({ type: Number }) min: number = 0;

  /**
   * Maximum value.
   */
  @property({ type: Number }) max: number = 100;

  /**
   * Step size.
   */
  @property({ type: Number }) step: number = 1;

  /**
   * Display label.
   */
  @property() label: string = 'Slider';

  constructor(config: ComponentConfig) {
    super(config);

    this.node
      .addPort(new Port('value', 'number', false))
      .addDataHandler(this.onPortData.bind(this));

    this.value = config.config.defaultValue as number ?? 50;

    this.onConfigUpdate();
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
    const config = this.componentConfig;
    const specificConfig: Record<string, unknown> = this.componentConfig.config || {};

    if (config) {
      this.min = (specificConfig.min as number) ?? 0;
      this.max = (specificConfig.max as number) ?? 100;
      this.step = (specificConfig.step as number) ?? 1;
      this.label = (specificConfig.label as string) || 'Slider';
    }
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
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }

  /**
   * Render the slider component.
   */
  override render(): TemplateResult {
    const percentage = this.getPercentage();

    return html`
      <div class="small-dashboard-widget-container">
        <label>${this.label}</label>
        <div class="slider-wrapper">
          <input
            type="range"
            .value="${String(this.value)}"
            .min="${String(this.min)}"
            .max="${String(this.max)}"
            .step="${String(this.step)}"
            @input="${this.handleInput.bind(this)}"
            style="--percentage: ${percentage}%"
          />
        </div>
        <div class="slider-display">
          <span class="value">${this.value}</span>
          <span class="range">${this.min} - ${this.max}</span>
        </div>
      </div>
    `;
  }
}
