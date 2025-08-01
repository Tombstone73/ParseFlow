import { Settings } from '@/lib/types'
import { getEmails, deleteEmail, addLog, getSettings } from '@/lib/data-store'
import { startProcessing, updateProgress, finishOperation, errorOperation } from './status-service'

export interface CleanupResult {
  deletedCount: number
  errors: string[]
  totalChecked: number
}

export async function performArchiveCleanup(settings?: Settings): Promise<CleanupResult> {
  try {
    startProcessing('Starting archive cleanup...')
    await addLog('info', '=== Starting archive cleanup ===')

    // Get settings if not provided
    if (!settings) {
      settings = await getSettings()
      if (!settings) {
        throw new Error('Settings not found')
      }
    }

    // Check if auto cleanup is enabled
    if (!settings.autoCleanupEnabled) {
      await addLog('info', 'Auto cleanup is disabled, skipping cleanup')
      finishOperation('Cleanup skipped - disabled in settings')
      return {
        deletedCount: 0,
        errors: [],
        totalChecked: 0
      }
    }

    const retentionDays = settings.cleanupRetentionDays || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    await addLog('info', `Cleanup settings: retention=${retentionDays} days, cutoff=${cutoffDate.toISOString()}`)

    // Get all emails
    const allEmails = await getEmails()
    
    // Filter archived emails older than retention period
    const archivedEmails = allEmails.filter(email => 
      email.classification === 'pending' && 
      new Date(email.date) < cutoffDate
    )

    await addLog('info', `Found ${archivedEmails.length} archived emails older than ${retentionDays} days`)

    if (archivedEmails.length === 0) {
      finishOperation('No archived emails to clean up')
      return {
        deletedCount: 0,
        errors: [],
        totalChecked: allEmails.length
      }
    }

    const result: CleanupResult = {
      deletedCount: 0,
      errors: [],
      totalChecked: allEmails.length
    }

    // Delete old archived emails
    for (let i = 0; i < archivedEmails.length; i++) {
      const email = archivedEmails[i]
      
      try {
        updateProgress((i / archivedEmails.length) * 100, `Deleting email ${i + 1}/${archivedEmails.length}`)
        
        const success = await deleteEmail(email.id)
        if (success) {
          result.deletedCount++
          await addLog('info', `Deleted archived email: ${email.subject} (${email.date})`)
        } else {
          const error = `Failed to delete email: ${email.subject}`
          result.errors.push(error)
          await addLog('error', error)
        }
      } catch (error) {
        const errorMessage = `Error deleting email ${email.subject}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMessage)
        await addLog('error', errorMessage)
      }
    }

    await addLog('info', `=== Archive cleanup completed ===`)
    await addLog('info', `Deleted: ${result.deletedCount} emails`)
    await addLog('info', `Errors: ${result.errors.length}`)

    finishOperation(`Cleanup completed: deleted ${result.deletedCount} emails`)

    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `Archive cleanup failed: ${errorMessage}`)
    errorOperation(`Cleanup failed: ${errorMessage}`)
    
    return {
      deletedCount: 0,
      errors: [errorMessage],
      totalChecked: 0
    }
  }
}

export async function scheduleCleanup(settings: Settings): Promise<void> {
  if (!settings.autoCleanupEnabled || !settings.cleanupFrequency) {
    return
  }

  const now = new Date()
  let nextCleanup: Date

  switch (settings.cleanupFrequency) {
    case 'daily':
      nextCleanup = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      break
    case 'weekly':
      nextCleanup = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      break
    case 'monthly':
      nextCleanup = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      break
    default:
      return
  }

  await addLog('info', `Next automatic cleanup scheduled for: ${nextCleanup.toISOString()}`)

  // In a real application, you would use a proper job scheduler
  // For now, we'll just log the schedule
  setTimeout(async () => {
    try {
      await performArchiveCleanup(settings)
      // Reschedule next cleanup
      await scheduleCleanup(settings)
    } catch (error) {
      await addLog('error', `Scheduled cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, nextCleanup.getTime() - now.getTime())
}

export function getCleanupScheduleDescription(settings: Settings): string {
  if (!settings.autoCleanupEnabled) {
    return 'Automatic cleanup is disabled'
  }

  const frequency = settings.cleanupFrequency || 'weekly'
  const retention = settings.cleanupRetentionDays || 30

  return `Automatically delete archived emails older than ${retention} days, running ${frequency}`
}