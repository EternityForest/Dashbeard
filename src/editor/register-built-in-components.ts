/**
 * Register built-in components with the editor's component registry.
 * Components self-describe via static typeSchema property.
 */

import { getComponentRegistry } from './component-registry';
import { SliderComponent } from '../components/built-in/slider';
import { VariableComponent } from '../components/built-in/variable';
import { FlexLayoutComponent } from '../components/built-in/flex-layout';

/**
 * Register all built-in components with the editor.
 * Should be called once at startup before opening the editor.
 */
export function registerBuiltInComponents(): void {
  const registry = getComponentRegistry();
  const components = [SliderComponent, VariableComponent, FlexLayoutComponent];

  for (const ComponentClass of components) {
    const typeSchema = (ComponentClass as any).typeSchema;
    if (!typeSchema) {
      console.warn(
        `Component ${ComponentClass.name} does not have a typeSchema`
      );
      continue;
    }

    registry.register(typeSchema.name, typeSchema, () => {
      // Factory not needed for editor
    });
  }
}
