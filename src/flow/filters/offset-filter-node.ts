/**
 * Offset Filter Node - Bidirectional offset/subtract implementation.
 *
 * Behavior:
 * - Input → Output: adds configured offset value
 * - Output → Input: subtracts configured offset value
 * - Has extra 'offset' port for dynamic offset values
 */

import { FilterNode } from '../filter';
import { PortData, createPortData } from '../data-types';
import { SourceType } from '../port';

export class OffsetFilterNode extends FilterNode {
  private currentOffset: number = 0;

  async onReady(): Promise<void> {
    // Set up data handlers for ports
    const inputPort = this.getInputPort('input');
    const offsetPort = this.getInputPort('offset');

    if (inputPort) {
      inputPort.addDataHandler(this.handleInputData.bind(this));
    }

    if (offsetPort) {
      offsetPort.addDataHandler(this.handleOffsetData.bind(this));
    }

    await super.onReady();
  }

  /**
   * Handle incoming offset value from the extra 'offset' port.
   */
  private async handleOffsetData(data: PortData, sourceType: SourceType): Promise<void> {
    if (typeof data.value === 'number') {
      this.currentOffset = data.value;
    }
  }

  /**
   * Handle data flowing through the filter.
   * Applies transformation based on source direction.
   */
  private async handleInputData(data: PortData, sourceType: SourceType): Promise<void> {
    if (typeof data.value !== 'number') {
      // Non-number values pass through unchanged
      return;
    }

    let transformedValue = data.value;

    // Apply transformation based on direction
    if (sourceType === SourceType.Downstream) {
      // Data coming from downstream (output → input direction)
      // Subtract the offset
      transformedValue = data.value - this.currentOffset;
    } else if (sourceType === SourceType.Upstream) {
      // Data coming from upstream (input → output direction)
      // Add the offset
      transformedValue = data.value + this.currentOffset;
    }

    // Forward transformed data
    const outputPort = this.getOutputPort('output');
    if (outputPort) {
      const transformedData = createPortData(transformedValue);
      await outputPort.onNewData(transformedData, SourceType.PortOwner);
    }
  }
}
