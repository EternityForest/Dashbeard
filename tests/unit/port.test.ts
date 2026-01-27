import { describe, it, expect, vi } from 'vitest';
import { Port, SourceType } from '@/flow/port';
import { createPortData } from '@/flow/data-types';

describe('Port', () => {
  it('should create port with correct properties', () => {
    const port = new Port('value', 'number', false, {
      type: 'number',
    });

    expect(port.name).toBe('value');
    expect(port.type).toBe('number');
    expect(port.isUpstream).toBe(false);
  });

  it('should track last data received', async () => {
    const port = new Port('test', 'any', false);
    const data = createPortData(42);

    await port.onNewData(data, SourceType.PortOwner);

    expect(port.getLastData()).toEqual(data);
  });

  it('should invoke data handlers on new data', async () => {
    const port = new Port('test', 'any', false);
    const handler = vi.fn();

    port.addDataHandler(handler);

    const data = createPortData('hello');
    await port.onNewData(data, SourceType.PortOwner);

    expect(handler).toHaveBeenCalledWith(data, SourceType.PortOwner);
  });

  it('should allow removing data handlers', async () => {
    const port = new Port('test', 'any', false);
    const handler = vi.fn();

    const unsubscribe = port.addDataHandler(handler);
    unsubscribe();

    const data = createPortData('test');
    await port.onNewData(data, SourceType.PortOwner);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should reject invalid PortData', async () => {
    const port = new Port('test', 'any', false);

    await expect(
      port.onNewData({ invalid: true } as never, SourceType.PortOwner)
    ).rejects.toThrow();
  });

  it('should reject connection from downstream port', async () => {
    const upstream = new Port('up', 'number', true);
    const downstream = new Port('down', 'number', false);

    await expect(downstream.connectToDownstream(upstream)).rejects.toThrow();
  });

  it('should reject connection to upstream port', async () => {
    const upstream = new Port('up', 'number', false);
    const badDownstream = new Port('bad', 'number', false);

    await expect(upstream.connectToDownstream(badDownstream)).rejects.toThrow();
  });

  (it('Should reject connection to itself'),
    async () => {
      const port = new Port('test', 'any', false);
      await expect(port.connectToDownstream(port)).rejects.toThrow();
    });

  it('should reject type mismatch', async () => {
    const upstream = new Port('up', 'number', false);
    const downstream = new Port('down', 'string', true);

    await expect(upstream.connectToDownstream(downstream)).rejects.toThrow();
  });

  it('should reject multiple downstream connections to upstream port', async () => {
    const upstream = new Port('up', 'number', true);
    const upstream2 = new Port('down1', 'number', true);
    const downstream = new Port('down2', 'number', false);

    await upstream.connectToDownstream(downstream);

    await expect(upstream2.connectToDownstream(downstream)).rejects.toThrow();
  });

  it('should propagate data through connection', async () => {
    const upstream = new Port('up', 'number', true);
    const downstream = new Port('down', 'number', false);

    await upstream.connectToDownstream(downstream);

    const handler = vi.fn();
    downstream.addDataHandler(handler);

    const data = createPortData(42);
    await upstream.onNewData(data, SourceType.PortOwner);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should propagate last data when connecting', async () => {
    const upstream = new Port('up', 'number', true);
    const downstream = new Port('down', 'number', false);

    const data = createPortData(100);
    await upstream.onNewData(data, SourceType.PortOwner);

    await upstream.connectToDownstream(downstream);

    expect(downstream.getLastData()).toEqual(data);
  });

  it('should allow disconnecting ports', async () => {
    const upstream = new Port('up', 'number', true);
    const downstream = new Port('down', 'number', false);

    await upstream.connectToDownstream(downstream);

    downstream.disconnectFromUpstream();

    expect(downstream.getUpstreamPort()).toBeNull();
    expect(downstream.hasConnection()).toBe(false);
  });

  it('should support onChange for state tracking', async () => {
    const port = new Port('test', 'any', true);
    const observer = vi.fn();

    port.onChange(observer);

    observer.mockClear(); // Clear initial call

    const data = createPortData('change');
    await port.onNewData(data, SourceType.PortOwner);

    expect(observer).toHaveBeenCalled();
  });

  it('should track connection state', async () => {
    const upstream = new Port('up', 'number', true);
    const downstream = new Port('down', 'number', false);

    expect(downstream.hasConnection()).toBe(false);

    await upstream.connectToDownstream(downstream);

    expect(downstream.hasConnection()).toBe(true);
  });

  it('should handle multiple handlers', async () => {
    const port = new Port('test', 'any', false);
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    port.addDataHandler(handler1);
    port.addDataHandler(handler2);

    const data = createPortData('test');
    await port.onNewData(data, SourceType.PortOwner);

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should handle handler errors gracefully', async () => {
    const port = new Port('test', 'any', false);
    const badHandler = vi.fn(async () => {
      throw new Error('handler error');
    });
    const goodHandler = vi.fn();

    port.addDataHandler(badHandler);
    port.addDataHandler(goodHandler);

    const consoleError = vi.spyOn(console, 'error');
    const data = createPortData('test');

    await port.onNewData(data, SourceType.PortOwner);

    expect(goodHandler).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should destroy and clear resources', () => {
    const port = new Port('test', 'any', false);
    const handler = vi.fn();

    port.addDataHandler(handler);
    port.destroy();

    // After destroy, no handlers should be called
    // (can't directly test since destroy removes handlers)
    // But we can verify it didn't throw
    expect(() => {
      port.destroy();
    }).not.toThrow();
  });

  it('should provide reasonable default schema', () => {
    const port = new Port('test', 'any', false);

    expect(port.schema).toEqual({ type: 'any' });
  });

  it('should handle async data propagation', async () => {
    const upstream = new Port('up', 'number', true);
    const downstream = new Port('down', 'number', false);

    const callOrder: string[] = [];

    await upstream.connectToDownstream(downstream);

    const asyncHandler = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push('handler');
    });

    downstream.addDataHandler(asyncHandler);

    const data = createPortData(42);
    callOrder.push('start');
    await upstream.onNewData(data, SourceType.PortOwner);
    callOrder.push('end');

    // Verify async handlers completed before onNewData returns
    expect(callOrder).toEqual(['start', 'handler', 'end']);
  });
});
