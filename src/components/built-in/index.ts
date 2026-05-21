/**
 * Built-in dashboard components.
 * Export all standard widgets for board creation.
 */

import type { DashboardComponentConstructor } from '../dashboard-component';
import { VariableComponent } from './variable';
import { SliderComponent } from './slider';
import { SwitchComponent } from './switch';
import { ButtonComponent } from './button';
import { TextboxComponent } from './textbox';
import { StackLayoutComponent } from './stack-layout';
import { PanelLayoutComponent } from './panel-layout';
import { PlainLayoutComponent } from './plain-layout';
import { PanelBodyComponent } from './panel-body';
import { PanelHeaderComponent } from './panel-header';
import { HeadingComponent } from './section-heading';
import { formLayoutComponent as FormLayoutComponent } from './form-layout';
import { ToolBarComponent } from './tool-bar';
/**
 * Registry mapping component type names to their constructors.
 */
export const BUILT_IN_COMPONENTS: Record<
  string,
  DashboardComponentConstructor
> = {
  variable: VariableComponent,
  slider: SliderComponent,
  switch: SwitchComponent,
  button: ButtonComponent,
  textbox: TextboxComponent,
  'stack-layout': StackLayoutComponent,
  'panel-layout': PanelLayoutComponent,
  'panel-header': PanelHeaderComponent,
  'panel-body': PanelBodyComponent,
  'plain-layout': PlainLayoutComponent,
  'form-layout': FormLayoutComponent,
  'tool-bar': ToolBarComponent,

  'heading':HeadingComponent
};
