import { Settings } from './types'
import { addLog } from './data-store'

export interface Job {
  id: string
  type: 'email-processing' | 'email-processing-optimized'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime?: Date
  endTime?: Date
  result?: any
  error?: string
  settings?: Settings
  currentOperation?: string
  totalEmails?: number
  processedEmails?: number
}

// In-memory job queue (in production, this would be a proper queue like Redis)
const jobs = new Map<string, Job>()
let currentJob: Job | null = null

// Unique ID generator to avoid duplicate keys
let jobIdCounter = 0
function generateUniqueJobId(type: string): string {
  return `${type}-${Date.now()}-${++jobIdCounter}-${Math.random().toString(36).substr(2, 9)}`
}

export function createJob(type: 'email-processing' | 'email-processing-optimized', settings: Settings): Job {
  const job: Job = {
    id: generateUniqueJobId(type),
    type,
    status: 'pending',
    progress: 0,
    settings
  }
  
  jobs.set(job.id, job)
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values()).sort((a, b) => 
    (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
  )
}

export function getCurrentJob(): Job | null {
  return currentJob
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id)
  if (!job) return undefined
  
  const updatedJob = { ...job, ...updates }
  jobs.set(id, updatedJob)
  
  // Update current job reference if it's the same job
  if (currentJob?.id === id) {
    currentJob = updatedJob
  }
  
  return updatedJob
}

export async function processJob(job: Job): Promise<void> {
  if (currentJob && currentJob.status === 'running') {
    throw new Error('Another job is already running')
  }
  
  currentJob = job
  
  try {
    await addLog('info', `Starting background job: ${job.id}`)
    
    updateJob(job.id, {
      status: 'running',
      startTime: new Date(),
      progress: 0
    })
    
    if (!job.settings) {
      throw new Error('Job settings are required')
    }

    // Create progress callback to update job status
    const progressCallback = (operation: string, progress: number, total?: number, processed?: number) => {
      updateJob(job.id, {
        currentOperation: operation,
        progress: Math.min(100, Math.max(0, progress)),
        totalEmails: total,
        processedEmails: processed
      })
    }

    let result
    if (job.type === 'email-processing-optimized') {
      // Use optimized processing with pre-loaded rules
      await addLog('info', 'Using optimized email processing with pre-loaded rules')

      // Pre-load rules for faster processing
      const { getRules } = await import('../lib/data-store')
      const rules = await getRules()
      const whitelistRules = rules.filter(rule => rule.type === 'whitelist' && rule.active)
      const blacklistRules = rules.filter(rule => rule.type === 'blacklist' && rule.active)

      // Create lookup maps for O(1) rule checking
      const whitelistMap = new Set(whitelistRules.map(rule => rule.pattern.toLowerCase()))
      const blacklistMap = new Set(blacklistRules.map(rule => rule.pattern.toLowerCase()))

      // Add rule maps to settings for faster processing
      const optimizedSettings = {
        ...job.settings,
        _whitelistMap: whitelistMap,
        _blacklistMap: blacklistMap
      }

      const { processEmails } = await import('../services/email-service')
      result = await processEmails(optimizedSettings, progressCallback)

    } else {
      // Use regular processing
      const { processEmails } = await import('../services/email-service')
      result = await processEmails(job.settings, progressCallback)
    }
    
    updateJob(job.id, {
      status: 'completed',
      endTime: new Date(),
      progress: 100,
      result
    })
    
    await addLog('info', `Background job completed: ${job.id}`)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    updateJob(job.id, {
      status: 'failed',
      endTime: new Date(),
      error: errorMessage
    })
    
    await addLog('error', `Background job failed: ${job.id} - ${errorMessage}`)
    throw error
    
  } finally {
    currentJob = null
  }
}

// Start processing jobs in the background
export async function startJobProcessor(): Promise<void> {
  // This would typically be a separate worker process
  // For now, we'll process jobs on-demand
}

// Clean up old completed jobs (keep last 10)
export function cleanupJobs(): void {
  const allJobs = getAllJobs()
  const completedJobs = allJobs.filter(job => job.status === 'completed' || job.status === 'failed')
  
  if (completedJobs.length > 10) {
    const jobsToRemove = completedJobs.slice(10)
    jobsToRemove.forEach(job => jobs.delete(job.id))
  }
}
