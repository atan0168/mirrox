// Simple pub-sub for alerts changes so UI can react immediately
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeAlertsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAlertsChanged(): void {
  // Copy to array to avoid mutation during iteration issues
  const current = Array.from(listeners);
  for (const l of current) {
    try {
      l();
    } catch {
      // ignore individual listener errors
    }
  }
}
