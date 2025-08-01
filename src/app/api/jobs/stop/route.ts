import { NextRequest, NextResponse } from 'next/server'
import { addLog } from '@/lib/data-store'
import { setShouldStopParsing } from '../../emails/parse/route'

// Global flag to signal processes to stop
let shouldStop = false

export async function POST(request: NextRequest) {
  try {
    console.log('Stop request received')

    // Set the global stop flags
    shouldStop = true
    setShouldStopParsing(true)

    await addLog('warning', 'Stop signal sent - processes will halt at next checkpoint')
    console.log('Stop signal sent')

    // Reset the flags after a delay to allow for new processes
    setTimeout(() => {
      shouldStop = false
      setShouldStopParsing(false)
      console.log('Stop flags reset')
    }, 5000)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Stop signal sent to all running processes' 
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stop request failed:', errorMessage)
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
