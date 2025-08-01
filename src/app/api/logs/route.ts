import { NextRequest, NextResponse } from 'next/server'
import { getLogs, archiveAllLogs, addLog } from '@/lib/data-store'

export async function GET() {
  try {
    const logs = await getLogs()
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Get logs error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { level, message } = await request.json()

    if (!level || !message) {
      return NextResponse.json(
        { error: 'Level and message are required' },
        { status: 400 }
      )
    }

    if (!['info', 'warning', 'error'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid log level. Must be info, warning, or error' },
        { status: 400 }
      )
    }

    await addLog(level, message)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Add log error:', error)
    return NextResponse.json(
      { error: 'Failed to add log' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await archiveAllLogs()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Archive logs error:', error)
    return NextResponse.json(
      { error: 'Failed to archive logs' },
      { status: 500 }
    )
  }
}
