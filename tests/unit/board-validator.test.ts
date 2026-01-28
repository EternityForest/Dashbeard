import { describe, it, expect } from 'vitest';
import {
  validateBoard,
  validateUniqueComponentIds,
  validateBindingReferences,
  validateBoardComplete,
} from '@/boards/board-validator';
import { BoardDefinition } from '@/boards/board-types';

const validBoard: BoardDefinition = {
  id: 'simple-dashboard',
  metadata: {
    version: '1.0',
    name: 'Simple Dashboard',
    description: 'A simple example dashboard with interconnected widgets',
    author: 'Dashbeard',
    created: '2024-01-16',
  },
  rootComponent: {
    id: 'main-layout',
    type: 'flex-layout',
    config: {
      direction: 'column',
      gap: 12,
      label: 'Dashboard Controls',
    },
    children: [
      {
        id: 'counter-var',
        type: 'variable',
        config: {
          value: 0,
          label: 'Counter',
        },
        layout: {
          grow: 0,
        },
      },
      {
        id: 'slider-control-1',
        type: 'slider',
        config: {
          value: 50,
          min: 0,
          max: 100,
          step: 5,
          label: 'Intensity',
        },
        layout: {
          grow: 1,
        },
      },
      {
        id: 'slider-control-2',
        type: 'slider',
        config: {
          value: 50,
          min: 0,
          max: 100,
          step: 5,
          label: 'Intensity',
        },
        layout: {
          grow: 1,
        },
      },
    ],
  },
  bindings: [
    {
      fromPort: 'slider-control-1.value',
      toPort: 'counter-var.value',
      id: 'binding-1',
    },
    {
      fromPort: 'slider-control-2.value',
      toPort: 'counter-var.value',
      id: 'binding-2',
    },
  ],
};

describe('Board Validation', () => {
  it('should validate a valid board', () => {
    expect(() => {
      validateBoard(validBoard);
    }).not.toThrow();
  });

  it('should reject missing metadata', () => {
    const invalid = {
      components: [],
      bindings: [],
    };

    expect(() => {
      validateBoard(invalid);
    }).toThrow('validation failed');
  });

  it('should reject missing version', () => {
    const invalid = {
      metadata: { name: 'Test' },
      components: [],
      bindings: [],
    };

    expect(() => {
      validateBoard(invalid);
    }).toThrow('validation failed');
  });

  it('should reject missing name', () => {
    const invalid = {
      metadata: { version: '1.0' },
      components: [],
      bindings: [],
    };

    expect(() => {
      validateBoard(invalid);
    }).toThrow('validation failed');
  });

  it('should detect duplicate component IDs', () => {
    const board: BoardDefinition = {
      id: 'simple-dashboard',
      metadata: { version: '1.0', name: 'Test' },
      rootComponent: {
        id: 'main-layout',
        type: 'flex-layout',
        config: {},
        children: [
          { id: 'comp1', type: 'variable', config: {} },
          { id: 'comp1', type: 'switch', config: {} },
        ],
      },
      bindings: [],
    };

    expect(() => {
      validateUniqueComponentIds(board.rootComponent!, new Set<string>());
    }).toThrow('Duplicate component ID');
  });

  it('should validate unique component IDs', () => {
    expect(() => {
      validateUniqueComponentIds(validBoard.rootComponent!,new Set<string>());
    }).not.toThrow();
  });

  it('should detect binding from non-existent source component', () => {
    const board: BoardDefinition = {
      id: 'simple-dashboard',
      metadata: { version: '1.0', name: 'Test' },
      rootComponent: {
        id: 'main-layout',
        type: 'flex-layout',
        config: {},
        children: [
          { id: 'comp1', type: 'variable', config: {} },
          { id: 'comp2', type: 'switch', config: {} },
        ],
      },
      bindings: [
        {
          fromPort: 'missing.value',
          toPort: 'comp1.value',
          id: 'binding-1',
        },
      ],
    };

    expect(() => {
      validateBindingReferences(board);
    }).toThrow('non-existent component');
  });

  it('should detect binding to non-existent target component', () => {
    const board: BoardDefinition = {
      id: 'simple-dashboard',
      metadata: { version: '1.0', name: 'Test' },
      rootComponent: {
        id: 'main-layout',
        type: 'flex-layout',
        config: {},
        children: [
          { id: 'comp1', type: 'variable', config: {} },
          { id: 'comp3', type: 'switch', config: {} },
        ],
      },
      bindings: [
        {
          fromPort: 'comp1.value',
          toPort: 'missing.value',
          id: 'binding-1',
        },
      ],
    };
    expect(() => {
      validateBindingReferences(board);
    }).toThrow('non-existent component');
  });

  it('should validate binding references', () => {
    expect(() => {
      validateBindingReferences(validBoard);
    }).not.toThrow();
  });

  it('should perform complete validation', () => {
    expect(() => {
      validateBoardComplete(validBoard);
    }).not.toThrow();
  });

  it('should fail complete validation on schema error', () => {
    expect(() => {
      validateBoardComplete({
        metadata: { version: '1.0' }, // missing name
        components: [],
        bindings: [],
      });
    }).toThrow('validation failed');
  });

  it('should fail complete validation on duplicate IDs', () => {
    expect(() => {
      validateBoardComplete({
        metadata: { version: '1.0', name: 'Test' },
        rootComponent: 
          {
            id: 'main-layout',
            type: 'flex-layout',
            config: {
              direction: 'column',
              gap: 12,
              label: 'Dashboard Controls',
            },
            children: [
              { id: 'comp', type: 'variable', config: {} },
              { id: 'comp', type: 'switch', config: {} },
            ],
          },
        bindings: [],
      });
    }).toThrow('Duplicate component ID');
  });

  it('should fail complete validation on missing references', () => {
    expect(() => {
      validateBoardComplete({
        metadata: { version: '1.0', name: 'Test' },
        rootComponent: { id: 'comp1', type: 'variable', config: {} },
        bindings: [
          {
            fromPort: 'comp1.output',
            toPort: 'missing.input',
            id: 'binding-1',
          },
        ],
      });
    }).toThrow('non-existent component');
  });
});
