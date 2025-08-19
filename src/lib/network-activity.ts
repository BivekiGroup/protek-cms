type Listener = (count: number) => void
let count = 0
const listeners = new Set<Listener>()

export function onNetworkChange(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  for (const fn of listeners) fn(count)
}

export function incNetwork() { count += 1; notify() }
export function decNetwork() { count = Math.max(0, count - 1); notify() }
export function getNetworkCount() { return count }
