import { NextRequest, NextResponse } from 'next/server'
import { performArchiveCleanup, getCleanupScheduleDescription } from '@/services/cleanup-service'
import { getSettings, addLog } from '@/lib/data-store'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'run') {
      await addLog('info', 'Manual archive cleanup requested')
      
      const result = await performArchiveCleanup()
      
      return NextResponse.json({
        success: true,
        ...result
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "run" to perform cleanup.' },
      { status: 400 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `Cleanup API error: ${errorMessage}`)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      deletedCount: 0,
      errors: [errorMessage],
      totalChecked: 0
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings()
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      )
    }

    const scheduleDescription = getCleanupScheduleDescription(settings)

    return NextResponse.json({
      enabled: settings.autoCleanupEnabled || false,
      frequency: settings.cleanupFrequency || 'weekly',
      retentionDays: settings.cleanupRetentionDays || 30,
      scheduleDescription
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}