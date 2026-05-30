/**
 * Popover Manager - tracks open popovers and handles back button to close them.
 * Implements a stack-based system for nested popovers.
 */

import { Observable } from './observable';

class PopoverManagerClass {
  private popoverStack: HTMLElement[] = [];
  private popoverChanged = new Observable<HTMLElement[]>([]);

  constructor() {
    // Listen for browser back button
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handlePopState.bind(this));
    }
  }

  /**
   * Handle browser back button - close last popover if any are open.
   */
  private handlePopState(event: PopStateEvent): void {
    if (this.popoverStack.length > 0) {
      // Prevent actual navigation if we have popovers open
      event.preventDefault();
      // Remove the hash that was added
      history.replaceState(null, '', ' ');
      // Close the last popover
      this.close();
    }
  }

  /**
   * Register a popover as open.
   * @param id Unique identifier for the popover
   */
  open(id: HTMLElement): void {
    id.addEventListener('toggle', () => {
      // ignore if it is opening else close
      if (id.matches(':popover-open')) return;
      this.close(id);
    });
  
    if (!this.popoverStack.includes(id)) {
      this.popoverStack.push(id);
      this.popoverChanged.set([...this.popoverStack]);
      id.showPopover();
    }
  }

  /**
   * Close the last opened popover.
   * @param id Optional specific popover ID to close (must be top of stack)
   */
  close(id?: HTMLElement): void {
    if (id) {
      const index = this.popoverStack.lastIndexOf(id);
      if (index === this.popoverStack.length - 1) {
        this.popoverStack.pop()?.hidePopover();
        this.popoverChanged.set([...this.popoverStack]);
      }
    } else if (this.popoverStack.length > 0) {
      this.popoverStack.pop()?.hidePopover();
      this.popoverChanged.set([...this.popoverStack]);
    }
  }

  /**
   * Get the current stack of open popovers.
   */
  getStack(): HTMLElement[] {
    return [...this.popoverStack];
  }

  /**
   * Check if any popovers are open.
   */
  hasOpenPopovers(): boolean {
    return this.popoverStack.length > 0;
  }

  /**
   * Get the topmost popover ID.
   */
  getTopPopover(): HTMLElement | undefined {
    return this.popoverStack[this.popoverStack.length - 1];
  }

  /**
   * Subscribe to popover stack changes.
   */
  subscribe(callback: (stack: HTMLElement[]) => void): () => void {
    return this.popoverChanged.subscribe(callback);
  }
}

export const PopoverManager = new PopoverManagerClass();