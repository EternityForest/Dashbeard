/**
 * Convert ConfigSchema to Lit form field templates.
 * Maps schema types to appropriate HTML input elements.
 */

import { html, TemplateResult } from 'lit';
import type { ConfigSchema } from '../types';

/**
 * Form field change callback.
 */
export type FormFieldChange = (
  value: unknown
) => void;

/**
 * Convert a ConfigSchema property to a form field template.
 * Handles different types: string, number, boolean, array,
 * object, with special handling for enums and constraints.
 *
 * @param name Property name to display as label
 * @param value Current property value
 * @param schema ConfigSchema defining the property
 * @param onChange Callback when value changes
 * @returns Template result for form field
 */
export function schemaToFormField(
  name: string,
  value: unknown,
  schema: ConfigSchema,
  onChange: FormFieldChange
): TemplateResult {
  switch (schema.type) {
    case 'string':
      return renderStringField(
        name,
        value,
        schema,
        onChange
      );
    case 'number':
      return renderNumberField(
        name,
        value,
        schema,
        onChange
      );
    case 'boolean':
      return renderBooleanField(
        name,
        value,
        schema,
        onChange
      );
    case 'array':
      return renderArrayField(
        name,
        value,
        schema,
        onChange
      );
    case 'object':
      return renderObjectField(
        name,
        value,
        schema,
        onChange
      );
    default:
      return html`
        <div style="color: #999; font-size: 12px;">
          Unsupported type: ${schema.type}
        </div>
      `;
  }
}

/**
 * Render string property as text input or select.
 */
function renderStringField(
  name: string,
  value: unknown,
  schema: ConfigSchema,
  onChange: FormFieldChange
): TemplateResult {
  const stringValue = String(value || '');

  // Enum: render as select dropdown
  if (schema.enum && Array.isArray(schema.enum)) {
    return html`
      <label style="display: block; margin-bottom: 12px;
                    font-size: 13px;">
        <div style="font-weight: 500; margin-bottom: 4px;">
          ${formatName(name)}
        </div>
        <select
          style="width: 100%;"
          @change="${(e: Event) =>
            onChange(
              (e.target as HTMLSelectElement).value
            )}"
        >
          ${(schema.enum as unknown[]).map(
            (opt) => (stringValue === String(opt) ?html`
              <option value="${String(opt)}"
                selected
              >
                ${String(opt)}
              </option>
            `:
            html`
              <option value="${String(opt)}">
                ${String(opt)}
              </option>
            `)
          )}
        </select>
      </label>
    `;
  }

  // Regular text input
  return html`
    <label style="display: block; margin-bottom: 12px;
                  font-size: 13px;">
      <div style="font-weight: 500; margin-bottom: 4px;">
        ${formatName(name)}
      </div>
      <input type="text"
             style="width: 100%;"
             .value="${stringValue}"
             @change="${(e: Event) =>
               onChange(
                 (e.target as HTMLInputElement).value
               )}" />
    </label>
  `;
}

/**
 * Render number property as number input.
 */
function renderNumberField(
  name: string,
  value: unknown,
  schema: ConfigSchema,
  onChange: FormFieldChange
): TemplateResult {
  const numValue = Number(value || 0);
  const min =
    typeof schema.minimum === 'number'
      ? schema.minimum
      : undefined;
  const max =
    typeof schema.maximum === 'number'
      ? schema.maximum
      : undefined;

  return html`
    <label style="display: block; margin-bottom: 12px;
                  font-size: 13px;">
      <div style="font-weight: 500; margin-bottom: 4px;">
        ${formatName(name)}
      </div>

      <input type="number"
             style="width: 100%;"
             .value="${String(numValue)}"
             ?min="${min !== undefined}"
             .min="${min?.toString() || ''}"
             ?max="${max !== undefined}"
             .max="${max?.toString() || ''}"
             @change="${(e: Event) =>
               onChange(
                 Number(
                   (
                     e.target as
                     HTMLInputElement
                   ).value
                 )
               )}" />
    </label>
  `;
}

/**
 * Render boolean property as checkbox.
 */
function renderBooleanField(
  name: string,
  value: unknown,
  schema: ConfigSchema,
  onChange: FormFieldChange
): TemplateResult {
  const checked = Boolean(value);

  return html`
    <label style="display: flex; align-items: center;
                  margin-bottom: 12px;
                  font-size: 13px; cursor: pointer;">
      <input type="checkbox"
             style="width: 16px; height: 16px;
                     cursor: pointer; margin-right: 8px;"
             .checked="${checked}"
             @change="${(e: Event) =>
               onChange(
                 (e.target as HTMLInputElement).checked
               )}" />
      <div>
        <div style="font-weight: 500;">
          ${formatName(name)}
        </div>
      </div>
    </label>
  `;
}

/**
 * Render array property (basic support).
 * Shows array length and simple UI.
 */
function renderArrayField(
  name: string,
  value: unknown,
  schema: ConfigSchema,
  onChange: FormFieldChange
): TemplateResult {
  const arrayValue = Array.isArray(value)
    ? value
    : [];

  return html`
    <div style="display: block; margin-bottom: 12px;
                font-size: 13px;">
      <div style="font-weight: 500; margin-bottom: 4px;">
        ${formatName(name)} (Array)
      </div>
      <div style="font-size: 12px; color: #666;">
        ${arrayValue.length} items
      </div>
    </div>
  `;
}

/**
 * Render object property (basic support).
 * Shows object type indicator.
 */
function renderObjectField(
  name: string,
  value: unknown,
  schema: ConfigSchema,
  onChange: FormFieldChange
): TemplateResult {
  const objValue = typeof value === 'object'
    ? value
    : null;
  const keyCount =
    objValue && typeof objValue === 'object'
      ? Object.keys(objValue as Record<string, unknown>)
          .length
      : 0;

  return html`
    <div style="display: block; margin-bottom: 12px;
                font-size: 13px;">
      <div style="font-weight: 500; margin-bottom: 4px;">
        ${formatName(name)} (Object)
      </div>
      <div style="font-size: 12px; color: #666;">
        ${keyCount} properties
      </div>
    </div>
  `;
}

/**
 * Format property name for display.
 * Converts camelCase to Title Case.
 */
function formatName(name: string): string {
  return (
    name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  );
}

/**
 * Render multiple form fields for all properties
 * in a schema.
 *
 * @param configSchema Schema properties object
 * @param config Current config values
 * @param onChange Callback for property changes
 * @returns Template result
 */
export function schemaToFormFields(
  configSchema: ConfigSchema,
  config: Record<string, unknown>,
  onChange: (
    name: string,
    value: unknown
  ) => void
): TemplateResult {
  const properties = configSchema.properties || {};
  const entries = Object.entries(properties);

  if (entries.length === 0) {
    return html`
      <div style="font-size: 12px; color: #999;">
        No properties to edit
      </div>
    `;
  }

  return html`
    ${entries.map(([name, schema]) =>
      schemaToFormField(
        name,
        config[name],
        schema,
        (value) => onChange(name, value)
      )
    )}
  `;
}
