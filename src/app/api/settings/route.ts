import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings, addLog } from '@/lib/data-store'
import { loadSettingsFromFile, saveSettingsToFile } from '@/lib/server-storage'
import { Settings } from '@/lib/types'

export async function GET() {
  try {
    console.log('GET /api/settings called')

    // Try to load settings with fallback
    let settings = null

    try {
      // First try to get from memory
      settings = await getSettings()
      console.log('Settings from memory:', settings ? 'found' : 'not found')
    } catch (memError) {
      console.log('Memory settings failed:', memError)
    }

    // If not in memory, load from file
    if (!settings) {
      try {
        console.log('Loading settings from file...')
        settings = await loadSettingsFromFile()
        console.log('Settings from file:', settings ? 'found' : 'not found')
        if (settings) {
          try {
            await saveSettings(settings) // Update memory cache
            console.log('Settings cached in memory')
          } catch (cacheError) {
            console.log('Failed to cache settings:', cacheError)
          }
        }
      } catch (fileError) {
        console.log('File settings failed:', fileError)
      }
    }

    console.log('Returning settings:', settings ? 'success' : 'empty object')
    return NextResponse.json({ settings: settings || null })
  } catch (error) {
    console.error('Get settings error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: Settings = await request.json()
    
    // Save to both memory and file
    await saveSettings(settings) // Update memory cache
    await saveSettingsToFile(settings) // Persist to file

    // Log settings update
    await addLog('info', `Settings updated: IMAP server ${settings.imapServer}, user ${settings.username}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save settings error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}