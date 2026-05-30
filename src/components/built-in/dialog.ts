/**
 * Dialog component - A popover that stays open indefinitely or for N seconds.
 * Can be used as a splash screen with "open at start" option.
 */

import type { ComponentTypeSchema } from '@/editor/types';
import { html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PlainLayoutComponent } from './plain-layout';

import { PopoverManager } from '../../core/popover-manager';
import { Port } from '../../flow/port';
import type { PortData } from '../../flow/data-types';
import type { SourceType } from '../../flow/port';

@customElement('ds-dialog')
export class DialogComponent extends PlainLayoutComponent {
  static readonly defaultChildren = [
    {
      type: 'panel-layout',
      id: '$parent-content',
      config: {
        'max-width': '600px',
        height: '',
        'max-height': '',
      },
      children: [],
    },
  ];

  static readonly typeSchema: ComponentTypeSchema = {
    name: 'dialog',
    displayName: 'Dialog',
    category: 'layout',
    description:
      'A popover dialog that stays open or auto-closes after duration',
    configSchema: {
      type: 'object',
      properties: {
        showButton: {
          type: 'boolean',
          description: 'Show the button to open the dialog',
          default: true,
        },
        buttonLabel: {
          type: 'string',
          description: 'Label for the open button',
          default: 'Open Dialog',
        },
        duration: {
          type: 'number',
          description: 'Auto-close after N seconds (0 = never)',
          default: 0,
        },
        openAtStart: {
          type: 'boolean',
          description: 'Open automatically on load (splash screen)',
          default: false,
        },
        horizontalAlign: {
          type: 'string',
          enum: ['left', 'center', 'right'],
          description: 'Horizontal alignment of dialog',
          default: 'center',
        },
        verticalAlign: {
          type: 'string',
          enum: ['top', 'center', 'bottom'],
          description: 'Vertical alignment of dialog',
          default: 'center',
        },
        closeOnOverlayClick: {
          type: 'boolean',
          description: 'Close when clicking outside the dialog',
          default: true,
        },
      },
    },
  };

  @property({ type: Boolean }) showButton = true;
  @property() buttonLabel = 'Open Dialog';
  @property({ type: Number }) duration = 0;
  @property({ type: Boolean }) openAtStart = false;
  @property() horizontalAlign: 'left' | 'center' | 'right' = 'center';
  @property() verticalAlign: 'top' | 'center' | 'bottom' = 'center';
  @property({ type: Boolean }) closeOnOverlayClick = true;

  @state() private isOpen = false;
  private durationTimer?: number;
  private unsubscribe?: () => void;

  private triggerPort: Port;
  private visiblePort: Port;

  constructor(config: Record<string, unknown>) {
    super(config);

    this.triggerPort = this.node.addPort(
      new Port({ name: 'trigger', type: 'number', direction: 'input' })
    );
    this.triggerPort.addDataHandler(this.onTriggerData.bind(this));

    this.visiblePort = this.node.addPort(
      new Port({ name: 'visible', type: 'number', direction: 'output' })
    );

  }

  /**
   * Handle close triggered by external means (back button, etc.)
   */
  private handleExternalClose(): void {
    this.isOpen = false;
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = undefined;
    }
    void this.sendData('visible', 0);
    this.requestUpdate();
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    // Subscribe to popover stack changes to detect back button closes
    this.unsubscribe = PopoverManager.subscribe((stack) => {
      const popoverId = this.renderRoot.querySelector('[popover]') as HTMLElement;
      // If our popover is no longer in the stack but we thought we were open, close it
      if (this.isOpen && !stack.includes(popoverId)) {
        this.handleExternalClose();
      }
    });
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private async onTriggerData(
    data: PortData,
    _sourceType: SourceType
  ): Promise<void> {
    if (data.value && (data.value as number) > 0) {
      this.openDialog();
    } else {
      this.closeDialog();
    }
  }

  public override onConfigUpdate(): void {
    const config = this.componentConfig?.config || {};
    this.showButton = config.showButton !== false;
    this.buttonLabel = (config.buttonLabel as string) || 'Open Dialog';
    this.duration = (config.duration as number) || 0;
    this.openAtStart = config.openAtStart === true;
    this.horizontalAlign =
      (config.horizontalAlign as 'left' | 'center' | 'right') || 'center';
    this.verticalAlign =
      (config.verticalAlign as 'top' | 'center' | 'bottom') || 'center';
    this.closeOnOverlayClick = config.closeOnOverlayClick !== false;

    // Handle open at start
    if (this.openAtStart && !this.isOpen) {
      setTimeout(() => this.openDialog(), 30);
    }

    this.requestUpdate();
  }

  private openDialog(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    PopoverManager.open(this.renderRoot.querySelector('[popover]')!);

    // Emit visible state
    void this.sendData('visible', 1);

    // Set up auto-close timer
    if (this.duration > 0) {
      this.durationTimer = window.setTimeout(() => {
        this.closeDialog();
      }, this.duration * 1000);
    }

    this.requestUpdate();
  }

  private closeDialog(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
     PopoverManager.close(this.renderRoot.querySelector('[popover]')!);

    // Emit visible state
    void this.sendData('visible', 0);

    // Clear timer
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = undefined;
    }

    this.requestUpdate();
  }


  override render(): TemplateResult {
    // Position the popover itself using fixed positioning with top/left
    let topPos = '';
    let leftPos = '';
    let transform = '';

    if (this.verticalAlign === 'top') {
      topPos = 'top: 20px';
    } else if (this.verticalAlign === 'bottom') {
      topPos = 'bottom: 20px';
    } else {
      topPos = 'top: 50%';
      transform = 'translateY(-50%)';
    }

    if (this.horizontalAlign === 'left') {
      leftPos = 'left: 20px';
    } else if (this.horizontalAlign === 'right') {
      leftPos = 'right: 20px';
    } else {
      leftPos = 'left: 50%';
      transform = transform 
        ? 'translate(-50%, -50%)' 
        : 'translateX(-50%)';
    }

    transform = transform ? `transform: ${transform};` : '';

    const popoverPosition = [topPos, leftPos, transform].filter(Boolean).join('; ');

    return html`
      ${this.showButton
        ? html`
            <button
              class="dialog-trigger"
              @click="${this.openDialog.bind(this)}"
            >
              ${this.buttonLabel}
            </button>
          `
        : ''}

      <div
        popover
        class="dialog-inner-popover"
        id="dialog-${this.id}"
        style="${popoverPosition}"
      >
        <widget-children></widget-children>
      </div>
    `;
  }
}
