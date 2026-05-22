interface CircuitState {
  failures: number
  openedAt: number | null
}

const FAILURE_THRESHOLD = 5
const OPEN_DURATION_MS = 60_000 // 60s

const state: Record<string, CircuitState> = {}

function getState(providerName: string): CircuitState {
  if (!state[providerName]) {
    state[providerName] = { failures: 0, openedAt: null }
  }
  return state[providerName]!
}

export function isCircuitOpen(providerName: string): boolean {
  const s = getState(providerName)
  if (s.openedAt === null) return false
  if (Date.now() - s.openedAt > OPEN_DURATION_MS) {
    // Half-open: allow one attempt
    s.openedAt = null
    s.failures = 0
    return false
  }
  return true
}

export function recordSuccess(providerName: string) {
  const s = getState(providerName)
  s.failures = 0
  s.openedAt = null
}

export function recordFailure(providerName: string) {
  const s = getState(providerName)
  s.failures++
  if (s.failures >= FAILURE_THRESHOLD) {
    s.openedAt = Date.now()
  }
}

export async function withCircuitBreaker<T>(
  providerName: string,
  fn: () => Promise<T>
): Promise<T | null> {
  if (isCircuitOpen(providerName)) {
    return null
  }
  try {
    const result = await fn()
    recordSuccess(providerName)
    return result
  } catch (err: any) {
    recordFailure(providerName)
    if (err?.message?.startsWith('RATE_LIMITED:')) {
      // Immediately open circuit on rate limit
      state[providerName]!.failures = FAILURE_THRESHOLD
      state[providerName]!.openedAt = Date.now()
    }
    return null
  }
}
