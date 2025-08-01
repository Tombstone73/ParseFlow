import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/services/email-service'
import { Settings } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()

    // Handle both direct settings and wrapped settings format
    const settings: Settings = requestBody.settings || requestBody

    const isSuccessful = await testConnection(settings)

    return NextResponse.json({ success: isSuccessful })
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}