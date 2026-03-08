type Listener = () => void;
const listeners = new Set<Listener>();

export const tourEvents = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  requestReplay() {
    listeners.forEach((fn) => fn());
  },
};
