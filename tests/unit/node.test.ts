import { describe, it, expect, } from 'vitest';
import { Node } from '@/flow/node';
import { Port } from '@/flow/port';

// Simple test implementation
class TestNode extends Node {

  constructor(id: string) {
    super(id);
    this.addPort(new Port('input', 'any', true));
    this.addPort(new Port('output', 'any', false));
  }
}

describe('Node', () => {
  it('should create node with id and config', () => {
    const node = new TestNode('node-1');

    expect(node.id).toBe('node-1');
  });

  it('should initialize ports', () => {
    const node = new TestNode('node-1');

    expect(node.getInputPort('input')).toBeDefined();
    expect(node.getOutputPort('output')).toBeDefined();
  });


  it('should track ready state', async () => {
    const node = new TestNode('node-1');

    expect(node.getIsReady()).toBe(false);

    await node.onReady();

    expect(node.getIsReady()).toBe(true);
  });

  it('should cleanup on destroy', async () => {
    const node = new TestNode('node-1');
    await node.onReady();

    await node.onDestroy();

    expect(node.getIsReady()).toBe(false);
  });

  it('should get ports by name', () => {
    const node = new TestNode('node-1');

    const input = node.getInputPort('input');
    const output = node.getOutputPort('output');

    expect(input?.name).toBe('input');
    expect(output?.name).toBe('output');
  });

  it('should throw for missing ports', () => {
    const node = new TestNode('node-1');

    expect(() => {
      node.getInputPort('missing');
    }).toThrow();
    expect(() => {
      node.getOutputPort('missing');
    }).toThrow();
  
  });

});
