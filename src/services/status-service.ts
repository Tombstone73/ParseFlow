// Global status management for tracking operations
export type OperationStatus = 'idle' | 'fetching' | 'processing' | 'parsing' | 'classifying'

export interface StatusState {
  status: OperationStatus
  message: string
  progress?: number
  startTime?: number
}

// Global status state
let currentStatus: StatusState = {
  status: 'idle',
  message: 'Ready'
}

// Status change listeners
const listeners: Array<(status: StatusState) => void> = []

export function getCurrentStatus(): StatusState {
  return { ...currentStatus }
}

export function setStatus(status: OperationStatus, message: string, progress?: number): void {
  const newStatus: StatusState = {
    status,
    message,
    progress,
    startTime: status !== 'idle' ? (currentStatus.startTime || Date.now()) : undefined
  }
  
  currentStatus = newStatus
  
  // Notify all listeners
  listeners.forEach(listener => {
    try {
      listener(newStatus)
    } catch (error) {
      console.error('Status listener error:', error)
    }
  })
  
  console.log(`Status changed: ${status} - ${message}${progress !== undefined ? ` (${progress}%)` : ''}`)
}

export function addStatusListener(listener: (status: StatusState) => void): () => void {
  listeners.push(listener)
  
  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

export function clearStatus(): void {
  setStatus('idle', 'Ready')
}

// Helper functions for common operations
export function startFetching(message: string = 'Fetching emails...'): void {
  setStatus('fetching', message)
}

export function startProcessing(message: string = 'Processing emails...'): void {
  setStatus('processing', message)
}

export function startParsing(message: string = 'Parsing emails with AI...'): void {
  setStatus('parsing', message)
}

export function startClassifying(message: string = 'Classifying emails...'): void {
  setStatus('classifying', message)
}

export function updateProgress(progress: number, message?: string): void {
  if (currentStatus.status !== 'idle') {
    setStatus(currentStatus.status, message || currentStatus.message, progress)
  }
}

export function finishOperation(message: string = 'Operation completed'): void {
  // Show completion message briefly before going idle
  setStatus(currentStatus.status, message, 100)
  
  setTimeout(() => {
    clearStatus()
  }, 2000)
}

export function errorOperation(message: string = 'Operation failed'): void {
  setStatus('idle', message)
  
  // Clear error message after a delay
  setTimeout(() => {
    if (currentStatus.message === message) {
      clearStatus()
    }
  }, 5000)
}