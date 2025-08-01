import { NextRequest, NextResponse } from 'next/server'
import { getEmails, updateEmail, getSettings, addLog } from '@/lib/data-store'
import { parseEmailWithAI } from '@/services/ai-parsing-service'

export async function POST(request: NextRequest) {
  try {
    const { emailId, type } = await request.json()
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
    }

    if (!type || !['order', 'estimate'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "order" or "estimate"' },
        { status: 400 }
      )
    }

    await addLog('info', `Auto-parsing triggered for email ${emailId} as ${type}`)

    // Get settings for AI configuration
    const settings = await getSettings()
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 400 }
      )
    }

    if (!settings.useAiProcessing) {
      await addLog('info', 'AI processing disabled - skipping auto-parse')
      return NextResponse.json({
        success: true,
        message: 'AI processing disabled - email moved without parsing',
        parsed: false
      })
    }

    // Get the email
    const allEmails = await getEmails()
    const email = allEmails.find(e => e.id === emailId)

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    try {
      await addLog('info', `Auto-parsing email: ${email.subject} as ${type}`)

      // Prepare email for parsing
      const emailToProcess = {
        ...email,
        parsed: {
          type: type as 'order' | 'estimate',
          data: null,
          confidence: 0.5
        }
      }

      // Parse with AI and save files
      const parsedData = await parseEmailWithAI(emailToProcess, settings, true)

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
        const result = {
          success: true,
          parsed: true,
          email: {
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
          }
        }
        
        await addLog('info', `Successfully auto-parsed email: ${email.subject} (confidence: ${parsedData.confidence})`)
        if (parsedData.emailFiles) {
          await addLog('info', `Email files saved to: ${parsedData.emailFiles.folderPath}`)
        }

        return NextResponse.json(result)
      } else {
        return NextResponse.json(
          { error: 'Failed to update email with parsed data' },
          { status: 500 }
        )
      }

    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      await addLog('error', `Auto-parsing failed for ${email.subject}: ${errorMessage}`)
      
      return NextResponse.json({
        success: false,
        parsed: false,
        error: errorMessage,
        message: 'Email moved but parsing failed'
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `Auto-parse request failed: ${errorMessage}`)
    
    return NextResponse.json({
      success: false,
      parsed: false,
      error: errorMessage
    }, { status: 500 })
  }
}