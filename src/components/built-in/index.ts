/**
 * Built-in dashboard components.
 * Export all standard widgets for board creation.
 */

import type { DashboardComponentConstructor } from '../dashboard-component';
import { VariableComponent } from './variable';
import { SliderComponent } from './slider';
import { StackLayoutComponent } from './stack-layout';
import { PanelLayoutComponent } from './panel-layout';
import { PlainLayoutComponent } from './plain-layout';
/**
 * Registry mapping component type names to their constructors.
 */
export const BUILT_IN_COMPONENTS: Record<string, DashboardComponentConstructor> = {
  variable: VariableComponent
  , slider: SliderComponent
  , 'stack-layout': StackLayoutComponent,
  'panel-layout': PanelLayoutComponent,
  'plain-layout': PlainLayoutComponent
}