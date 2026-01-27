/**
 * Tests for ComponentRegistry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ComponentRegistry,
  getComponentRegistry,
  resetComponentRegistry,
} from '@/editor/component-registry';
import type { ComponentTypeSchema } from '@/editor/types';

const sampleSchema: ComponentTypeSchema = {
  name: 'slider',
  displayName: 'Slider',
  category: 'input',
  description: 'A numeric slider input',
  properties: {
    min: {
      type: 'number',
      default: 0,
      description: 'Minimum value',
    },
    max: {
      type: 'number',
      default: 100,
      description: 'Maximum value',
    },
    label: {
      type: 'string',
      required: true,
      description: 'Display label',
    },
  },
  ports: {
    inputs: [
      {
        name: 'value',
        direction: 'input',
        type: 'number',
      },
    ],
    outputs: [
      {
        name: 'value',
        direction: 'output',
        type: 'number',
      },
    ],
  },
};

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  describe('register', () => {
    it('registers a component type', () => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
      expect(registry.hasType('slider')).toBe(true);
    });

    it('throws on duplicate registration', () => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
      expect(() => {
        registry.register(
          'slider',
          sampleSchema,
          () => {}
        );
      }).toThrow('already registered');
    });
  });

  describe('getSchema', () => {
    it('returns schema for registered type', () => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
      const schema = registry.getSchema('slider');
      expect(schema.name).toBe('slider');
      expect(schema.category).toBe('input');
    });

    it('throws for unregistered type', () => {
      expect(() => {
        registry.getSchema('unknown');
      }).toThrow('not registered');
    });
  });

  describe('hasType', () => {
    it('returns true for registered types', () => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
      expect(registry.hasType('slider')).toBe(true);
    });

    it('returns false for unregistered types', () => {
      expect(registry.hasType('unknown')).toBe(false);
    });
  });

  describe('getAllTypes', () => {
    it('returns all registered types', () => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
      registry.register(
        'text',
        { ...sampleSchema, name: 'text' },
        () => {}
      );
      const types = registry.getAllTypes();
      expect(types).toContain('slider');
      expect(types).toContain('text');
      expect(types.length).toBe(2);
    });
  });

  describe('validateConfig', () => {
    beforeEach(() => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
    });

    it('accepts valid config', () => {
      const errors = registry.validateConfig('slider', {
        label: 'Volume',
        min: 0,
        max: 100,
      });
      expect(errors).toHaveLength(0);
    });

    it('requires required properties', () => {
      const errors = registry.validateConfig('slider', {
        min: 0,
        max: 100,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('required');
    });

    it('validates property types', () => {
      const errors = registry.validateConfig('slider', {
        label: 123, // Should be string
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('validates numeric constraints', () => {
      const schema: ComponentTypeSchema = {
        ...sampleSchema,
        properties: {
          level: {
            type: 'number',
            min: 0,
            max: 100,
          },
        },
      };
      registry.clear();
      registry.register('gauge', schema, () => {});

      const errors = registry.validateConfig('gauge', {
        level: 150,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('<=');
    });

    it('validates enum values', () => {
      const schema: ComponentTypeSchema = {
        ...sampleSchema,
        properties: {
          theme: {
            type: 'string',
            enum: ['light', 'dark'],
          },
        },
      };
      registry.clear();
      registry.register('panel', schema, () => {});

      const errors = registry.validateConfig('panel', {
        theme: 'invalid',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultConfig', () => {
    beforeEach(() => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
    });

    it('returns defaults from schema', () => {
      const defaults =
        registry.getDefaultConfig('slider');
      expect(defaults.min).toBe(0);
      expect(defaults.max).toBe(100);
    });

    it('handles missing defaults', () => {
      const defaults =
        registry.getDefaultConfig('slider');
      expect('label' in defaults).toBe(false);
    });
  });


  describe('getComponentsByCategory', () => {
    it('groups components by category', () => {
      registry.register(
        'slider',
        sampleSchema,
        () => {}
      );
      registry.register(
        'gauge',
        { ...sampleSchema, name: 'gauge', category: 'display' },
        () => {}
      );

      const grouped =
        registry.getComponentsByCategory();
      expect(grouped.get('input')).toHaveLength(1);
      expect(grouped.get('display')).toHaveLength(1);
    });
  });

  describe('singleton', () => {
    it('returns same instance', () => {
      resetComponentRegistry();
      const reg1 = getComponentRegistry();
      const reg2 = getComponentRegistry();
      expect(reg1).toBe(reg2);
    });

    it('can be reset for testing', () => {
      const reg1 = getComponentRegistry();
      reg1.register('slider', sampleSchema, () => {});
      expect(reg1.hasType('slider')).toBe(true);

      resetComponentRegistry();
      const reg2 = getComponentRegistry();
      expect(reg2.hasType('slider')).toBe(false);
    });
  });
});
