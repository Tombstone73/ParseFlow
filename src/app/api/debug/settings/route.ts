import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/data-store'
import { loadSettingsFromFile } from '@/lib/server-storage'

export async function GET() {
  try {
    console.log('=== DEBUG SETTINGS ===')
    
    // Check memory
    const memorySettings = await getSettings()
    console.log('Memory settings:', memorySettings ? 'found' : 'null')
    
    // Check file
    const fileSettings = await loadSettingsFromFile()
    console.log('File settings:', fileSettings ? 'found' : 'null')
    
    return NextResponse.json({
      memory: {
        exists: !!memorySettings,
        hasUsername: !!(memorySettings?.username),
        hasPassword: !!(memorySettings?.password),
        imapServer: memorySettings?.imapServer || 'not set'
      },
      file: {
        exists: !!fileSettings,
        hasUsername: !!(fileSettings?.username),
        hasPassword: !!(fileSettings?.password),
        imapServer: fileSettings?.imapServer || 'not set'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug settings error:', error)
    return NextResponse.json(
      { error: 'Debug failed' },
      { status: 500 }
    )
  }
}
