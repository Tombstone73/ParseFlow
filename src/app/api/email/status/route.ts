import { NextResponse } from 'next/server'
import { getLogs } from '@/lib/data-store'

export async function GET() {
  try {
    // Get recent logs to determine current status
    const logs = await getLogs()
    const recentLogs = logs.slice(-10) // Get last 10 logs
    
    // Check if email processing is currently running
    const isProcessing = recentLogs.some(log => 
      log.message.includes('Starting email processing') && 
      !logs.some(laterLog => 
        laterLog.timestamp > log.timestamp && 
        laterLog.message.includes('Email processing completed')
      )
    )
    
    // Get the most recent processing result
    const lastProcessingLog = logs.find(log => 
      log.message.includes('Successfully processed:') || 
      log.message.includes('No unread messages found')
    )
    
    return NextResponse.json({
      isProcessing,
      recentLogs: recentLogs.map(log => ({
        level: log.level,
        message: log.message,
        timestamp: log.timestamp
      })),
      lastProcessingResult: lastProcessingLog ? {
        message: lastProcessingLog.message,
        timestamp: lastProcessingLog.timestamp,
        level: lastProcessingLog.level
      } : null
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to get processing status' },
      { status: 500 }
    )
  }
}
