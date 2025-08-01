import { NextRequest, NextResponse } from 'next/server'
import { getCurrentStatus } from '@/services/status-service'

export async function GET(request: NextRequest) {
  try {
    const status = getCurrentStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      { 
        status: 'idle', 
        message: 'Error getting status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}