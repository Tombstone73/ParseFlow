import { NextRequest, NextResponse } from 'next/server'
import { Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'

// Test email content for AI classification
const TEST_EMAIL_CONTENT = {
  order: {
    subject: "Order Confirmation #12345",
    body: "Thank you for your order! Order details: 10x Widget A at $25.00 each. Total: $250.00. Payment processed successfully."
  },
  estimate: {
    subject: "Quote Request - Website Development",
    body: "Here's your estimate for the website project: Design: $2,000, Development: $5,000, Testing: $1,000. Total estimate: $8,000."
  },
  other: {
    subject: "Meeting Reminder",
    body: "Don't forget about our team meeting tomorrow at 2 PM in the conference room."
  }
}

export async function POST(request: NextRequest) {
  try {
    const { aiProvider, googleApiKey, classificationInstructions, orderKeywords, estimateKeywords }: Settings = await request.json()
    
    await addLog('info', `Testing AI connection for provider: ${aiProvider}`)
    
    const testResults = {
      provider: aiProvider,
      connected: false,
      error: null as string | null,
      tests: [] as Array<{
        type: string
        input: { subject: string, body: string }
        expected: string
        actual: string | null
        success: boolean
        confidence: number
        reasoning: string
        duration: number
      }>
    }

    // Test each email type
    for (const [expectedType, emailContent] of Object.entries(TEST_EMAIL_CONTENT)) {
      const startTime = Date.now()
      
      try {
        await addLog('info', `Testing AI classification for ${expectedType} email`)
        
        // Create a mock email object for testing
        const testEmail = {
          id: `test-${expectedType}`,
          subject: emailContent.subject,
          body: emailContent.body,
          from: 'test@example.com',
          to: 'user@example.com',
          date: new Date(),
          senderEmail: 'test@example.com',
          classification: 'inbox' as const,
          status: 'unread' as const,
          parsed: { type: 'other' as const, data: null, confidence: 0 }
        }

        // Test the AI classification
        const result = await testAIClassification(testEmail, {
          aiProvider,
          googleApiKey,
          classificationInstructions,
          orderKeywords,
          estimateKeywords,
          useAiProcessing: true
        } as Settings)

        const duration = Date.now() - startTime
        const success = result.type === expectedType || (expectedType === 'other' && result.type === 'other')

        testResults.tests.push({
          type: expectedType,
          input: emailContent,
          expected: expectedType,
          actual: result.type,
          success,
          confidence: result.confidence,
          reasoning: result.reasoning,
          duration
        })

        await addLog('info', `AI test for ${expectedType}: ${success ? 'PASS' : 'FAIL'} (${result.type}, confidence: ${result.confidence})`)

      } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        testResults.tests.push({
          type: expectedType,
          input: emailContent,
          expected: expectedType,
          actual: null,
          success: false,
          confidence: 0,
          reasoning: `Error: ${errorMessage}`,
          duration
        })

        await addLog('error', `AI test for ${expectedType} failed: ${errorMessage}`)
      }
    }

    // Determine overall connection status
    const successfulTests = testResults.tests.filter(t => t.success).length
    const totalTests = testResults.tests.length
    
    if (successfulTests === 0) {
      testResults.connected = false
      testResults.error = "All AI classification tests failed"
    } else if (successfulTests < totalTests) {
      testResults.connected = true
      testResults.error = `${totalTests - successfulTests} out of ${totalTests} tests failed`
    } else {
      testResults.connected = true
    }

    await addLog('info', `AI connection test completed: ${successfulTests}/${totalTests} tests passed`)

    return NextResponse.json(testResults)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `AI connection test failed: ${errorMessage}`)
    
    return NextResponse.json({
      provider: 'unknown',
      connected: false,
      error: errorMessage,
      tests: []
    }, { status: 500 })
  }
}

async function testAIClassification(email: any, settings: Settings) {
  try {
    // Import the AI classification function
    const { classifyEmail } = await import('@/services/classification-service')
    return await classifyEmail(email, settings)
  } catch (error) {
    throw new Error(`AI classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
