// Client-side logging utility
export async function logActivity(level: 'info' | 'warning' | 'error', message: string) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message })
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

export function logInfo(message: string) {
  return logActivity('info', message)
}

export function logWarning(message: string) {
  return logActivity('warning', message)
}

export function logError(message: string) {
  return logActivity('error', message)
}
