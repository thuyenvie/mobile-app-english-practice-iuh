/** Cancels pending playback on pause/navigation, including while a seek is still in flight. */
export function createPlaybackScheduler() {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  const listeners = new Set<() => void>();
  const setPending = (value: boolean) => {
    if (pending === value) return;
    pending = value;
    for (const listener of listeners) listener();
  };
  const cancel = () => {
    generation += 1;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    setPending(false);
  };
  return {
    cancel,
    getSnapshot: () => pending,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async schedule(seek: () => Promise<void>, play: () => void, delayMs: number) {
      cancel();
      const request = generation;
      setPending(true);
      try { await seek(); }
      catch (error) { if (request === generation) cancel(); throw error; }
      if (request !== generation) return;
      const start = () => {
        if (request !== generation) return;
        timer = undefined;
        setPending(false);
        play();
      };
      const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
      if (delay > 0) timer = setTimeout(start, delay);
      else start();
    },
  };
}
