let previousPromise: Promise<void> | null = null;
let waitingCount = 0;

/**
 * Do a function async in the background,
 * but only after the previous one is done.
 */
export function doSerialized(f: () => void | Promise<void>) {
  async function wrapper() {
    if(waitingCount > 64) {
      console.error('Too many waiting promises');
      return;
    }
    waitingCount++;
    try {
      if (previousPromise) {
        await previousPromise;
      }
      const res = f();
      if (res instanceof Promise) {
        await res;
      }
    } 
    catch (e) {
      console.error(e);
    }
    finally {
      previousPromise = null;
      waitingCount--;
    }

  }
  previousPromise = wrapper();
}
