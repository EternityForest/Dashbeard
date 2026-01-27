import { describe, it, expect, } from 'vitest';
import { Node } from '@/flow/node';
import { Port } from '@/flow/port';

// Simple test implementation
class TestNode extends Node {

  override getDeclaredDownstreamPorts(): Map<string, Port> {
    const ports = new Map<string, Port>();
    ports.set('input', new Port('input', 'any', true));
    return ports;
  }

  override getDeclaredUpstreamPorts(): Map<string, Port> {
    const ports = new Map<string, Port>();
    ports.set('output', new Port('output', 'any', false));
    return ports;
  }
}

describe('Node', () => {
  it('should create node with id and config', () => {
    const node = new TestNode('node-1');

    expect(node.id).toBe('node-1');
  });

  it('should initialize ports', () => {
    const node = new TestNode('node-1');

    node.initializePorts();

    expect(node.getDownstreamPort('input')).toBeDefined();
    expect(node.getUpstreamPort('output')).toBeDefined();
  });


  it('should track ready state', async () => {
    const node = new TestNode('node-1');

    expect(node.getIsReady()).toBe(false);

    await node.onReady();

    expect(node.getIsReady()).toBe(true);
  });

  it('should cleanup on destroy', async () => {
    const node = new TestNode('node-1');

    node.initializePorts();
    await node.onReady();

    await node.onDestroy();

    expect(node.getIsReady()).toBe(false);
  });

  it('should get ports by name', () => {
    const node = new TestNode('node-1');

    node.initializePorts();

    const input = node.getDownstreamPort('input');
    const output = node.getUpstreamPort('output');

    expect(input?.name).toBe('input');
    expect(output?.name).toBe('output');
  });

  it('should return undefined for missing ports', () => {
    const node = new TestNode('node-1');

    node.initializePorts();

    expect(node.getDownstreamPort('missing')).toBeUndefined();
    expect(node.getUpstreamPort('missing')).toBeUndefined();
  });

});
