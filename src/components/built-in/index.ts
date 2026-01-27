/**
 * Built-in dashboard components.
 * Export all standard widgets for board creation.
 */

import type { DashboardComponentConstructor } from '../dashboard-component';
import { VariableComponent } from './variable';
import { SliderComponent } from './slider';
import { FlexLayoutComponent } from './flex-layout';

/**
 * Registry mapping component type names to their constructors.
 */
export const BUILT_IN_COMPONENTS: Record<string, DashboardComponentConstructor> = {
  variable: VariableComponent
  , slider: SliderComponent
  , 'flex-layout': FlexLayoutComponent
}