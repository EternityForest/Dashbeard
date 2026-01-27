import { describe, it, expect, vi } from 'vitest';
import { NodeGraph } from '@/flow/node-graph';
import { Node, NodeSchema } from '@/flow/node';
import { Port } from '@/flow/port';

// Test implementation
class TestNode extends Node {

  constructor(id: string) {
    super(id);
    this.addPort(new Port('input', 'any', false));
    this.addPort(new Port('output', 'any', true));
  }

}

class NumberNode extends Node {
  
  constructor(id: string) {
    super(id);
    this.addPort(new Port('input', 'number', false));
    this.addPort(new Port('result', 'number', true));
  }

}

describe('NodeGraph', () => {
  it('should add and retrieve nodes', () => {
    const graph = new NodeGraph();
    const node = new TestNode('node-1');

    graph.addNode(node);

    expect(graph.getNode('node-1')).toBe(node);
  });

  it('should reject duplicate node IDs', () => {
    const graph = new NodeGraph();
    const node1 = new TestNode('node-1', {});
    const node2 = new TestNode('node-1', {});

    graph.addNode(node1);

    expect(() => {
      graph.addNode(node2);
    }).toThrow('already exists');
  });

  it('should get all nodes', () => {
    const graph = new NodeGraph();
    const node1 = new TestNode('node-1', {});
    const node2 = new TestNode('node-2', {});

    graph.addNode(node1);
    graph.addNode(node2);

    const nodes = graph.getNodes();
    expect(nodes).toHaveLength(2);
    expect(nodes).toContain(node1);
    expect(nodes).toContain(node2);
  });

  it('should create bindings between compatible ports', async () => {
    const graph = new NodeGraph();
    const source = new NumberNode('source');
    const sink = new NumberNode('sink');

    graph.addNode(source);
    graph.addNode(sink);

    await graph.addBinding('source.result', 'sink.input');

    const bindings = graph.getBindings();
    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toEqual({
      upstreamNodeId: 'source',
      upstreamPortName: 'result',
      downstreamNodeId: 'sink',
      downstreamPortName: 'input',
    });
  });

  it('should reject binding when upstream node not found', async () => {
    const graph = new NodeGraph();
    const sink = new TestNode('sink', {});

    graph.addNode(sink);

    await expect(
      graph.addBinding('missing', 'output', 'sink', 'input')
    ).rejects.toThrow('not found');
  });

  it('should reject binding when downstream node not found', async () => {
    const graph = new NodeGraph();
    const source = new TestNode('source', {});

    graph.addNode(source);

    await expect(
      graph.addBinding('source', 'output', 'missing', 'input')
    ).rejects.toThrow('not found');
  });

  it('should reject binding when upstream port not found', async () => {
    const graph = new NodeGraph();
    const source = new TestNode('source', {});
    const sink = new TestNode('sink', {});

    graph.addNode(source);
    graph.addNode(sink);

    await expect(
      graph.addBinding('source', 'missing', 'sink', 'input')
    ).rejects.toThrow('not found');
  });

  it('should reject binding when downstream port not found', async () => {
    const graph = new NodeGraph();
    const source = new TestNode('source', {});
    const sink = new TestNode('sink', {});

    graph.addNode(source);
    graph.addNode(sink);

    await expect(
      graph.addBinding('source', 'output', 'sink', 'missing')
    ).rejects.toThrow('not found');
  });

  it('should reject bindings with port type mismatches', async () => {
    const graph = new NodeGraph();
    const numNode = new NumberNode('num');
    const anyNode = new TestNode('any');

    graph.addNode(numNode);
    graph.addNode(anyNode);

    // number output to any input should fail ( mismatch)
    await expect(
      graph.addBinding('num.result', 'any.input')
    ).rejects.toThrow('type mismatch');
  });

  it('should detect cycles', async () => {
    const graph = new NodeGraph();
    const node1 = new NumberNode('node1', {});
    const node2 = new NumberNode('node2', {});
    const node3 = new NumberNode('node3', {});

    graph.addNode(node1);
    graph.addNode(node2);
    graph.addNode(node3);

    // Create chain: node1 -> node2 -> node3
    await graph.addBinding('node1.result', 'node2.input');
    await graph.addBinding('node2.result', 'node3.input');
    
    // Try to create cycle: node3 -> node1
    await expect(
     graph.addBinding('node3.result', 'node1.input')
    ).rejects.toThrow();
  });


  it('should initialize all nodes on ready()', async () => {
    const graph = new NodeGraph();
    const node1 = new TestNode('node-1');
    const node2 = new TestNode('node-2');

    const onReady1 = vi.spyOn(node1, 'onReady');
    const onReady2 = vi.spyOn(node2, 'onReady');

    graph.addNode(node1);
    graph.addNode(node2);

    await graph.ready();

    expect(onReady1).toHaveBeenCalled();
    expect(onReady2).toHaveBeenCalled();
  });

  it('should not call onReady multiple times', async () => {
    const graph = new NodeGraph();
    const node = new TestNode('node', {});

    const onReady = vi.spyOn(node, 'onReady');

    graph.addNode(node);
    await graph.ready();
    await graph.ready();

    expect(onReady).toHaveBeenCalledOnce();
  });

  it('should destroy all nodes', async () => {
    const graph = new NodeGraph();
    const node1 = new TestNode('node-1', {});
    const node2 = new TestNode('node-2', {});

    const onDestroy1 = vi.spyOn(node1, 'onDestroy');
    const onDestroy2 = vi.spyOn(node2, 'onDestroy');

    graph.addNode(node1);
    graph.addNode(node2);

    await graph.ready();
    await graph.destroy();

    expect(onDestroy1).toHaveBeenCalled();
    expect(onDestroy2).toHaveBeenCalled();
  });

  it('should remove node and its bindings', async () => {
    const graph = new NodeGraph();
    const source = new NumberNode('source');
    const middle = new NumberNode('middle');
    const sink = new NumberNode('sink');

    graph.addNode(source);
    graph.addNode(middle);
    graph.addNode(sink);

    await graph.addBinding('source.result', 'middle.input');
    await graph.addBinding('middle.result', 'sink.input');

    expect(graph.getBindings()).toHaveLength(2);

    await graph.removeNode('middle');

    expect(graph.getNode('middle')).toBeUndefined();
    expect(graph.getBindings()).toHaveLength(0);
  });



  it('should handle complex graph topology', async () => {
    const graph = new NodeGraph();

    // Linear chain: n1 -> n2 -> n3 -> n4
    const n1 = new NumberNode('n1');
    const n2 = new NumberNode('n2');
    const n3 = new NumberNode('n3');
    const n4 = new NumberNode('n4');

    graph.addNode(n1);
    graph.addNode(n2);
    graph.addNode(n3);
    graph.addNode(n4);

    await graph.addBinding('n1.result', 'n2.input');
    await graph.addBinding('n2.result', 'n3.input');
    await graph.addBinding('n3.result', 'n4.input');

    expect(graph.getBindings()).toHaveLength(3);
    expect(graph.getNodes()).toHaveLength(4);
  });

  it('should prevent cycles in complex topology', async () => {
    const graph = new NodeGraph();

    const n1 = new NumberNode('n1');
    const n2 = new NumberNode('n2');
    const n3 = new NumberNode('n3');
    const n4 = new NumberNode('n4');

    graph.addNode(n1);
    graph.addNode(n2);
    graph.addNode(n3);
    graph.addNode(n4);

    await graph.addBinding('n1.result', 'n2.input');
    await graph.addBinding('n2.result', 'n3.input');
    await graph.addBinding('n3.result', 'n4.input');

    // Try to create cycle: n4 -> n1
    await expect(graph.addBinding('n4.result', 'n1.input')).rejects.toThrow();
  });

  it('should call onDestroy on removed nodes', async () => {
    const graph = new NodeGraph();
    const node = new TestNode('node', {});

    const onDestroy = vi.spyOn(node, 'onDestroy');

    graph.addNode(node);
    await graph.ready();
    await graph.removeNode('node');

    expect(onDestroy).toHaveBeenCalled();
  });
});
