/**
 * CSS Theme Variables Schema
 * Defines customizable CSS variables for dashboard theming.
 * These variables can be overridden at the board level.
 */

import type { ConfigSchema } from '../types';

/**
 * Schema for CSS custom properties (variables).
 * Supports colors, spacing, sizing, and typography.
 */
export const THEME_VARIABLES_SCHEMA: ConfigSchema = {
  type: 'object',
  description: 'CSS custom properties for theming',
  properties: {
    // Colors
    '--fg': {
      type: 'string',
      description: 'Primary brand color',
      default: '#0066cc',
      format: 'color',
    },

    '--control-fg': {
      type: 'string',
      description: 'Primary brand color',
      default: '#0066cc',
      format: 'color',
    },

    '--bg': {
      type: 'string',
      description: 'Background color',
      default: '#fff',
      format: 'color',
    },

    '--box-bg': {
      type: 'string',
      description: 'Box background color',
      default: '#fff',
      format: 'color',
    },

    '--accent-color': {
      type: 'string',
      description: 'Accent color',
      default: '#0066cc',
      format: 'color',
    },

    '--border-width': {
      type: 'string',
      description: 'Border width',
    },

    '--border-color': {
      type: 'string',
      description: 'Border color',
    },
    '--border-radius': {
      type: 'string',
      description: 'Border radius',
    },
  },
};

/**
 * Get default theme variable values.
 */
export function getDefaultThemeVariables(): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  const props = THEME_VARIABLES_SCHEMA.properties;

  if (props) {
    for (const [key, schema] of Object.entries(props)) {
      if (schema.default !== undefined) {
        defaults[key] = schema.default;
      }
    }
  }

  return defaults;
}
