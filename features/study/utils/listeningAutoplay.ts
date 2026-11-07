type PlaybackState = {
  unit: string;
  generation: number;
  enabled: boolean;
  ready: boolean;
  active: boolean;
  start: () => void;
  stop: () => void;
};

let audioOwner: { stop: () => void } | undefined;

/** One automatic attempt per unit and screen lifetime. Manual intent always consumes it. */
export function createListeningAutoplay(initialForeground = true, used = new Set<string>()) {
  let state: PlaybackState | undefined;
  let focused = false;
  let hasFocused = false;
  let foreground = initialForeground;
  let sessionChanged = false;
  const owner = { stop: () => state?.stop() };
  const consume = () => { if (state?.unit) used.add(state.unit); };
  const stop = () => { consume(); state?.stop(); };
  const allowed = () => !!state?.active && focused && foreground && !sessionChanged;
  const claim = () => {
    if (audioOwner !== owner) audioOwner?.stop();
    audioOwner = owner;
  };
  const attempt = () => {
    if (!state?.unit || !state.ready || !allowed() || used.has(state.unit)) return;
    consume();
    if (state.enabled) { claim(); state.start(); }
  };
  return {
    update(next: PlaybackState) {
      if (state && next.generation !== state.generation) { stop(); sessionChanged = true; }
      if (state && next.unit !== state.unit) state.stop();
      const interrupted = state && ((state.active && !next.active) || (state.enabled && !next.enabled));
      state = next;
      if (interrupted || !next.active || !foreground || (!focused && hasFocused)) stop();
      attempt();
    },
    focus() { focused = true; hasFocused = true; attempt(); },
    blur() { focused = false; stop(); },
    foreground(value: boolean) { foreground = value; if (!value) stop(); },
    manual() {
      stop();
      if (!allowed()) return false;
      claim();
      return true;
    },
    cancel: stop,
    dispose() { stop(); if (audioOwner === owner) audioOwner = undefined; },
  };
}
