import { NextRequest, NextResponse } from 'next/server'
import { classifyEmail } from '@/services/classification-service'
import { Email, Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'

export async function POST(request: NextRequest) {
  try {
    const { email, settings } = await request.json()
    
    if (!email || !settings) {
      return NextResponse.json(
        { error: 'Email and settings are required' },
        { status: 400 }
      )
    }
    
    // Log the AI test
    await addLog('info', `AI Test: Testing classification for email "${email.subject}"`)
    
    // Create a mock email object for testing
    const testEmail: Email = {
      id: 'test-' + Date.now(),
      subject: email.subject || 'Test Email',
      from: email.from || 'test@example.com',
      to: settings.username || 'user@example.com',
      date: new Date().toISOString(),
      body: email.body || 'Test email body',
      status: 'processed',
      senderEmail: email.from || 'test@example.com'
    }
    
    // Test the AI classification
    const result = await classifyEmail(testEmail, settings)
    
    await addLog('info', `AI Test Result: ${result.type} (confidence: ${result.confidence})`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI test error:', error)
    await addLog('error', `AI Test Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      { error: 'Failed to test AI classification' },
      { status: 500 }
    )
  }
}
