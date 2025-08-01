import { NextRequest, NextResponse } from 'next/server'
import { Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'

export async function POST(request: NextRequest) {
  try {
    const { aiProvider, googleApiKey }: Settings = await request.json()
    
    await addLog('info', `Checking AI status for provider: ${aiProvider}`)
    
    const status = {
      provider: aiProvider,
      available: false,
      error: null as string | null,
      details: {} as any
    }

    if (aiProvider === 'google') {
      // Test Google AI availability
      if (!googleApiKey) {
        status.error = 'Google API key not configured'
        return NextResponse.json(status)
      }

      try {
        // Simple API call to check if the key works
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          method: 'GET',
          headers: {
            'x-goog-api-key': googleApiKey
          }
        })

        if (response.ok) {
          const data = await response.json()
          status.available = true
          status.details = {
            models: data.models?.length || 0,
            message: 'Google AI API is accessible'
          }
        } else {
          const errorText = await response.text()
          status.error = `Google AI API error: ${response.status} - ${errorText}`
        }
      } catch (error) {
        status.error = `Google AI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }

    } else if (aiProvider === 'ollama') {
      // Test Ollama availability
      try {
        const response = await fetch('http://127.0.0.1:11434/api/tags', {
          method: 'GET'
        })

        if (response.ok) {
          const data = await response.json()
          const hasGemma = data.models?.some((model: any) => model.name.includes('gemma'))
          
          status.available = hasGemma
          status.details = {
            models: data.models?.length || 0,
            hasGemma,
            message: hasGemma ? 'Ollama is running with Gemma model' : 'Ollama is running but Gemma model not found'
          }
          
          if (!hasGemma) {
            status.error = 'Gemma model not found. Run: ollama pull gemma'
          }
        } else {
          status.error = `Ollama API error: ${response.status}`
        }
      } catch (error) {
        status.error = `Ollama connection failed: ${error instanceof Error ? error.message : 'Is Ollama running on port 11434?'}`
      }

    } else {
      status.error = `Unsupported AI provider: ${aiProvider}`
    }

    await addLog('info', `AI status check completed: ${status.available ? 'Available' : 'Unavailable'}`)

    return NextResponse.json(status)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `AI status check failed: ${errorMessage}`)
    
    return NextResponse.json({
      provider: 'unknown',
      available: false,
      error: errorMessage,
      details: {}
    }, { status: 500 })
  }
}
