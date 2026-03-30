/**
 * Register built-in components with the editor's component registry.
 * Components self-describe via static typeSchema property.
 */

import { getComponentRegistry } from './component-registry';
import { BUILT_IN_COMPONENTS } from '../components/built-in';
import { DashboardComponent } from '@/components/dashboard-component';

/** Register all built-in components with the editor.
 * Should be called once at startup before opening the editor.
 */
export function registerBuiltInComponents(): void {
  const registry = getComponentRegistry();

  Object.entries(BUILT_IN_COMPONENTS).forEach(
    ([_name, ComponentClass]) => {
      const typeSchema = (ComponentClass as any)
        .typeSchema as ComponentTypeSchema;
      if (!typeSchema) {
        console.warn(
          `Component ${ComponentClass.name} does not have a typeSchema`
        );
      } else {
        registry.register(typeSchema.name, typeSchema, () => {
          // Factory not needed for editor
        });
      }
    }
  );
}
