/**
 * Conditional component - displays contents only when condition is met.
 * Hidden unless input port > 1 or "force visible" is set.
 */

import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';
import { Port } from '../../flow/port';
import type { PortData } from '../../flow/data-types';
import type { SourceType } from '../../flow/port';

@customElement('ds-conditional')
export class ConditionalComponent extends PlainLayoutComponent {
  static readonly typeSchema: ComponentTypeSchema = {
    name: 'conditional',
    displayName: 'Conditional',
    category: 'layout',    acceptsChildren: true,

    description: 'Show contents only when input port > 1 or force visible',
    configSchema: {
      type: 'object',
      properties: {
        forceVisible: {
          type: 'boolean',
          description: 'Always show contents regardless of input',
          default: false,
        },
      },
    },
  };

  @property({ type: Boolean }) forceVisible = false;

  @state() private inputValue = 0;

  private inputPort: Port;

  constructor(config: Record<string, unknown>) {
    super(config);

    this.inputPort = this.node.addPort(
      new Port({ name: 'input', type: 'number', direction: 'input' })
    );
    this.inputPort.addDataHandler(this.onInputData.bind(this));
  }

  private async onInputData(
    data: PortData,
    _sourceType: SourceType
  ): Promise<void> {
    this.inputValue = (data.value as number) || 0;
    this.requestUpdate();
  }

  public override onConfigUpdate(): void {
    const config = this.componentConfig?.config || {};
    this.forceVisible = config.forceVisible === true;
    this.requestUpdate();
  }

  override render(): TemplateResult {
    const isVisible = this.forceVisible || this.inputValue > 1;

    return html`
      <div 
        id="component-${this.id}" 
        class="conditional"
        style="display: ${isVisible ? 'contents' : 'none'};"
      >
        <widget-children></widget-children>
      </div>
    `;
  }

  }