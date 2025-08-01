import { NextRequest, NextResponse } from 'next/server'
import { processEmails } from '@/services/email-service'
import { Settings } from '@/lib/types'
import { getShouldStop } from '../../jobs/stop/route'

// Add a GET method for testing
export async function GET() {
  console.log('Email processing API GET called - health check')
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Email processing API is working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('=== Email Processing API Called ===')
  
  try {
    // Parse request body
    let settings: Settings
    try {
      const requestBody = await request.json()
      console.log('Raw request body keys:', Object.keys(requestBody).join(', '))

      // Handle both direct settings and wrapped settings format
      settings = requestBody.settings || requestBody

      console.log('Settings received:', {
        imapServer: settings?.imapServer,
        port: settings?.port,
        useSSL: settings?.useSSL,
        username: settings?.username,
        // Don't log password for security
      })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        {
          error: 'Invalid request body',
          processedCount: 0,
          errors: ['Failed to parse request JSON']
        },
        { status: 400 }
      )
    }
    
    // Validate required settings
    if (!settings.imapServer || !settings.username || !settings.password) {
      const missingFields = []
      if (!settings.imapServer) missingFields.push('imapServer')
      if (!settings.username) missingFields.push('username')
      if (!settings.password) missingFields.push('password')
      
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`
      console.error('Validation error:', errorMessage)
      
      return NextResponse.json(
        { 
          error: errorMessage,
          processedCount: 0,
          errors: [errorMessage]
        },
        { status: 400 }
      )
    }
    
    console.log('Starting email processing...')
    
    // Additional validation
    if (settings.port < 1 || settings.port > 65535) {
      const errorMessage = `Invalid port number: ${settings.port}. Must be between 1 and 65535.`
      console.error('Validation error:', errorMessage)
      return NextResponse.json(
        { 
          error: errorMessage,
          processedCount: 0,
          errors: [errorMessage]
        },
        { status: 400 }
      )
    }
    
    const result = await processEmails(settings)
    console.log('Email processing completed successfully:', result)
    
    return NextResponse.json(result, { status: 200 })
    
  } catch (error) {
    console.error('=== Process emails API error ===')
    console.error('Error object:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    
    const errorMessage = error instanceof Error ? error.message : String(error) || 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
    
    console.error('Processed error details:', {
      message: errorMessage,
      stack: errorStack,
      originalError: error
    })
    
    const errorResponse = { 
      error: errorMessage,
      processedCount: 0,
      errors: [errorMessage]
    }
    
    console.log('Returning error response:', errorResponse)
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}