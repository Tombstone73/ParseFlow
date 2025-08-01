import { NextRequest, NextResponse } from 'next/server'
import { getEmails, updateEmail, getSettings, addLog } from '@/lib/data-store'
import { parseEmailWithAI } from '@/services/ai-parsing-service'

// Simple global stop flag
let shouldStopParsing = false

export function setShouldStopParsing(value: boolean) {
  shouldStopParsing = value
}

export function getShouldStopParsing(): boolean {
  return shouldStopParsing
}

export async function POST(request: NextRequest) {
  try {
    const { emailIds, type } = await request.json()

    console.log('Force parse request received:', { emailIds, type })

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      console.log('Invalid emailIds:', emailIds)
      return NextResponse.json(
        { error: 'Email IDs array is required' },
        { status: 400 }
      )
    }

    if (!type || !['order', 'estimate'].includes(type)) {
      console.log('Invalid type:', type)
      return NextResponse.json(
        { error: 'Type must be "order" or "estimate"' },
        { status: 400 }
      )
    }

    await addLog('info', `Starting AI parsing for ${emailIds.length} ${type} emails`)
    console.log(`Starting AI parsing for ${emailIds.length} ${type} emails`)

    // Get settings for AI configuration
    let settings = await getSettings()
    console.log('Settings loaded:', {
      hasSettings: !!settings,
      useAiProcessing: settings?.useAiProcessing,
      aiProvider: settings?.aiProvider
    })

    // If settings is null, try to reload from file
    if (!settings) {
      console.log('Settings not found in memory, attempting to reload...')
      // Force a settings reload by calling the settings API
      try {
        const settingsResponse = await fetch(`${process.env.NEXTJS_URL || 'http://localhost:3000'}/api/settings`)
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          console.log('Settings reloaded from API:', {
            hasSettings: !!settingsData,
            dataType: typeof settingsData,
            dataKeys: settingsData ? Object.keys(settingsData) : 'null'
          })

          // The API returns the settings wrapped in a 'settings' property
          if (settingsData && typeof settingsData === 'object') {
            // Check if settings are wrapped in a 'settings' property
            if (settingsData.settings) {
              settings = settingsData.settings
            } else {
              settings = settingsData
            }
            console.log('Settings successfully reloaded:', {
              useAiProcessing: settings.useAiProcessing,
              aiProvider: settings.aiProvider,
              hasGoogleApiKey: !!settings.googleApiKey
            })
          }
        } else {
          console.log('Settings API response not OK:', settingsResponse.status)
        }
      } catch (error) {
        console.log('Failed to reload settings:', error)
      }
    }

    if (!settings) {
      console.log('No settings found after reload attempt')
      return NextResponse.json(
        { error: 'Settings not configured - please check Settings page' },
        { status: 400 }
      )
    }

    console.log('Final settings check:', {
      useAiProcessing: settings?.useAiProcessing,
      aiProvider: settings?.aiProvider,
      hasGoogleApiKey: !!settings?.googleApiKey,
      settingsType: typeof settings,
      settingsKeys: settings ? Object.keys(settings) : 'null'
    })

    if (!settings?.useAiProcessing) {
      console.log('AI processing disabled in settings - useAiProcessing:', settings?.useAiProcessing)
      console.log('Full settings object:', JSON.stringify(settings, null, 2))
      return NextResponse.json(
        { error: 'AI processing is not enabled in settings. Please enable it in the Settings page.' },
        { status: 400 }
      )
    }

    // Get all emails and filter by IDs
    const allEmails = await getEmails()
    console.log(`Found ${allEmails.length} total emails`)

    const emailsToParse = allEmails.filter(email => emailIds.includes(email.id))
    console.log(`Found ${emailsToParse.length} emails to parse from IDs:`, emailIds)

    if (emailsToParse.length === 0) {
      console.log('No emails found with provided IDs')
      return NextResponse.json(
        { error: 'No emails found with provided IDs' },
        { status: 404 }
      )
    }

    const results = {
      parsed: 0,
      failed: 0,
      errors: [] as string[],
      parsedEmails: [] as any[]
    }

    // Process each email
    for (const email of emailsToParse) {
      // Check if we should stop processing
      if (getShouldStopParsing()) {
        console.log('Stop signal received - halting parsing')
        await addLog('warning', 'Parsing stopped by user request')
        break
      }

      try {
        console.log(`Processing email: ${email.id} - ${email.subject}`)
        await addLog('info', `Parsing email: ${email.subject}`)

        // Ensure the email is classified as the expected type
        const emailToProcess = {
          ...email,
          parsed: {
            type: type as 'order' | 'estimate',
            data: null,
            confidence: email.parsed?.confidence || 0.5
          }
        }

        console.log('Calling parseEmailWithAI...')
        // Parse with AI and save files
        const parsedData = await parseEmailWithAI(emailToProcess, settings, true)
        console.log('parseEmailWithAI completed:', {
          type: parsedData.type,
          confidence: parsedData.confidence,
          hasData: !!parsedData.data
        })

        // Update email with parsed data
        const updatedEmail = await updateEmail(email.id, {
          parsed: {
            type: parsedData.type,
            data: parsedData.data,
            confidence: parsedData.confidence
          },
          status: 'processed'
        })

        if (updatedEmail) {
          results.parsed++
          results.parsedEmails.push({
            id: email.id,
            subject: email.subject,
            parsedData: parsedData.data,
            confidence: parsedData.confidence,
            attachmentsSaved: parsedData.attachmentsSaved || [],
            emailFiles: parsedData.emailFiles ? {
              folderPath: parsedData.emailFiles.folderPath,
              htmlFile: parsedData.emailFiles.htmlFile,
              jsonFile: parsedData.emailFiles.jsonFile,
              parsedJsonFile: parsedData.emailFiles.parsedJsonFile,
              attachmentCount: parsedData.emailFiles.attachmentFiles.length
            } : undefined
          })
          
          await addLog('info', `Successfully parsed email: ${email.subject} (confidence: ${parsedData.confidence})`)
          if (parsedData.emailFiles) {
            await addLog('info', `Email files saved to: ${parsedData.emailFiles.folderPath}`)
          }
        } else {
          results.failed++
          results.errors.push(`Failed to update email: ${email.subject}`)
        }

      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Failed to parse ${email.subject}: ${errorMessage}`)
        await addLog('error', `Failed to parse email ${email.subject}: ${errorMessage}`)
      }
    }

    await addLog('info', `AI parsing completed: ${results.parsed} parsed, ${results.failed} failed`)

    return NextResponse.json(results)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `AI parsing request failed: ${errorMessage}`)
    
    return NextResponse.json({
      error: errorMessage,
      parsed: 0,
      failed: 0,
      errors: [errorMessage],
      parsedEmails: []
    }, { status: 500 })
  }
}

// GET endpoint to check parsing status or get parsed data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const type = searchParams.get('type') as 'order' | 'estimate' | null

    if (emailId) {
      // Get specific email's parsed data
      const allEmails = await getEmails()
      const email = allEmails.find(e => e.id === emailId)
      
      if (!email) {
        return NextResponse.json(
          { error: 'Email not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        email: {
          id: email.id,
          subject: email.subject,
          from: email.from,
          parsed: email.parsed,
          attachments: email.attachments?.map(a => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size
          })) || []
        }
      })
    }

    if (type) {
      // Get all emails of specific type with parsed data
      const allEmails = await getEmails()
      const filteredEmails = allEmails.filter(email => 
        email.parsed?.type === type && email.parsed?.data
      )

      return NextResponse.json({
        emails: filteredEmails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          parsed: email.parsed,
          attachments: email.attachments?.map(a => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size
          })) || []
        }))
      })
    }

    return NextResponse.json(
      { error: 'Either emailId or type parameter is required' },
      { status: 400 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}