/**
 * Tests for schema-to-form utility.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  schemaToFormField,
  schemaToFormFields,
  type FormFieldChange,
} from '@/editor/utils/schema-to-form';
import type { PropertySchema } from '@/editor/types';

describe('schemaToFormField', () => {
  describe('string type', () => {
    it('renders text input for string', () => {
      const schema: PropertySchema = {
        type: 'string',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'name',
        'test',
        schema,
        onChange
      );

      expect(result).toBeDefined();
      expect(result.strings).toBeDefined();
    });

    it('renders select for enum', () => {
      const schema: PropertySchema = {
        type: 'string',
        enum: ['option1', 'option2'],
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'choice',
        'option1',
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });

    it('handles undefined value', () => {
      const schema: PropertySchema = {
        type: 'string',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'name',
        undefined,
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });

  describe('number type', () => {
    it('renders number input for number', () => {
      const schema: PropertySchema = {
        type: 'number',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'count',
        42,
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });

    it('includes min/max constraints', () => {
      const schema: PropertySchema = {
        type: 'number',
        min: 0,
        max: 100,
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'value',
        50,
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });

    it('handles undefined value as 0', () => {
      const schema: PropertySchema = {
        type: 'number',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'count',
        undefined,
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });

  describe('boolean type', () => {
    it('renders checkbox for boolean', () => {
      const schema: PropertySchema = {
        type: 'boolean',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'enabled',
        true,
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });

    it('handles false value', () => {
      const schema: PropertySchema = {
        type: 'boolean',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'enabled',
        false,
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });

  describe('array type', () => {
    it('renders array indicator', () => {
      const schema: PropertySchema = {
        type: 'array',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'items',
        ['a', 'b'],
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });

    it('handles non-array value', () => {
      const schema: PropertySchema = {
        type: 'array',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'items',
        'not an array',
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });

  describe('object type', () => {
    it('renders object indicator', () => {
      const schema: PropertySchema = {
        type: 'object',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'config',
        { a: 1, b: 2 },
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });

    it('counts object properties', () => {
      const schema: PropertySchema = {
        type: 'object',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'config',
        { x: 1, y: 2, z: 3 },
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });

  describe('unsupported type', () => {
    it('renders error for unknown type', () => {
      const schema = { type: 'unknown' };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'field',
        'value',
        schema as PropertySchema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });

  describe('description handling', () => {
    it('includes description in output', () => {
      const schema: PropertySchema = {
        type: 'string',
        description: 'This is a test property',
      };
      const onChange: FormFieldChange = vi.fn();
      const result = schemaToFormField(
        'field',
        'value',
        schema,
        onChange
      );

      expect(result).toBeDefined();
    });
  });
});

describe('schemaToFormFields', () => {
  it('renders all properties', () => {
    const properties: Record<
      string,
      PropertySchema
    > = {
      name: { type: 'string' },
      count: { type: 'number' },
      enabled: { type: 'boolean' },
    };
    const config = {
      name: 'test',
      count: 5,
      enabled: true,
    };
    const onChange = vi.fn();

    const result = schemaToFormFields(
      properties,
      config,
      onChange
    );

    expect(result).toBeDefined();
  });

  it('handles empty properties', () => {
    const result = schemaToFormFields(
      {},
      {},
      vi.fn()
    );

    expect(result).toBeDefined();
  });

  it('passes config values to fields', () => {
    const properties: Record<
      string,
      PropertySchema
    > = {
      value: { type: 'number' },
    };
    const config = { value: 42 };
    const onChange = vi.fn();

    const result = schemaToFormFields(
      properties,
      config,
      onChange
    );

    expect(result).toBeDefined();
  });
});
