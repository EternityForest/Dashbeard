/**
 * Lightweight observable system for reactive data binding.
 * Designed for embedded systems - intentionally minimal vs RxJS.
 */

/**
 * Deep equality check using simple value comparison.
 * Sufficient for most dashboard use cases.
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    a === null ||
    b === null ||
    a === undefined ||
    b === undefined
  ) {
    return a === b;
  }

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) return false;

  if (typeA === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(objB, key) &&
        isEqual(objA[key], objB[key])
    );
  }

  return false;
}

/**
 * Unsubscribe function returned from subscribe().
 */
export type Unsubscribe = () => void;

/**
 * Observer callback receives the new value.
 */
export type Observer<T> = (value: T) => void;

/**
 * Lightweight observable for reactive values.
 * Single subscription pattern - suitable for dashboard data binding.
 *
 * @template T The type of value held by this observable
 */
export class Observable<T> {
  private value: T;
  private observers = new Set<Observer<T>>();
  private subscriptionDepth = 0;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Get the current value without notifying observers.
   */
  get(): T {
    return this.value;
  }

  /**
   * Set a new value and notify observers if changed.
   * Uses deep equality to prevent unnecessary updates.
   *
   * @param newValue The new value to set
   */
  set(newValue: T): void {
    if (isEqual(this.value, newValue)) {
      return;
    }

    this.value = newValue;
    this.notifyObservers();
  }

  /**
   * Subscribe to changes to this observable.
   * Calls the observer immediately with current value.
   *
   * @param observer Callback invoked when value changes
   * @returns Function to unsubscribe
   */
  subscribe(observer: Observer<T>): Unsubscribe {
    this.observers.add(observer);

    return () => {
      this.observers.delete(observer);
    };
  }

  /**
   * Subscribe to changes without calling immediately.
   * Useful for side effects that shouldn't run on subscription.
   *
   * @param observer Callback invoked when value changes
   * @returns Function to unsubscribe
   */
  onChange(observer: Observer<T>): Unsubscribe {
    this.observers.add(observer);

    return () => {
      this.observers.delete(observer);
    };
  }

  /**
   * Notify all observers of current value.
   * Prevents infinite loops with subscription depth tracking.
   */
  public notifyObservers(): void {
    this.subscriptionDepth += 1;

    if (this.subscriptionDepth > 100) {
      console.error(
        'Observable: Possible infinite loop detected ' +
          '(subscription depth > 100)'
      );
      this.subscriptionDepth = 0;
      return;
    }

    const observers = Array.from(this.observers);
    for (const observer of observers) {
      observer(this.value);
    }

    this.subscriptionDepth -= 1;
  }

  /**
   * Check if this observable has any subscribers.
   */
  hasObservers(): boolean {
    return this.observers.size > 0;
  }

  /**
   * Clear all subscribers.
   */
  clearObservers(): void {
    this.observers.clear();
  }
}
