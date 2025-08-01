import { NextRequest, NextResponse } from 'next/server'
import { Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

// Helper function to extract email address from "Name <email@domain.com>" format
function extractEmailAddress(fromField: string): string {
  const match = fromField.match(/<([^>]+)>/)
  if (match) {
    return match[1].toLowerCase()
  }
  // If no angle brackets, assume the whole string is an email or extract first word
  const parts = fromField.split(' ')
  const emailLike = parts.find(part => part.includes('@'))
  return emailLike ? emailLike.toLowerCase() : fromField.toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    await addLog('info', '=== Starting Address-Only Email Fetch (v2) ===')

    const requestBody = await request.json()
    await addLog('info', `Raw request body keys: ${Object.keys(requestBody).join(', ')}`)

    // Handle both direct settings and wrapped settings format
    const settings: Settings = requestBody.settings || requestBody

    await addLog('info', `Processed settings: ${JSON.stringify({
      imapServer: settings?.imapServer,
      port: settings?.port,
      username: settings?.username ? '[SET]' : '[MISSING]',
      password: settings?.password ? '[SET]' : '[MISSING]',
      useSSL: settings?.useSSL
    })}`)

    // Validate required settings
    if (!settings || !settings.imapServer || !settings.username || !settings.password) {
      const error = `Missing required IMAP settings. Received: ${JSON.stringify({
        hasSettings: !!settings,
        imapServer: settings?.imapServer || 'MISSING',
        username: settings?.username ? 'SET' : 'MISSING',
        password: settings?.password ? 'SET' : 'MISSING'
      })}`
      await addLog('error', error)
      throw new Error(error)
    }

    await addLog('info', `Connecting to ${settings.imapServer}:${settings.port}`)
    await addLog('info', `SSL enabled: ${settings.useSSL}`)

    const client = new ImapFlow({
      host: settings.imapServer,
      port: settings.port,
      secure: settings.useSSL,
      auth: {
        user: settings.username,
        pass: settings.password
      },
      logger: false
    })

    await client.connect()
    await addLog('info', 'Connected to IMAP server')

    const mailboxInfo = await client.getMailboxLock('INBOX')
    await addLog('info', `INBOX contains ${mailboxInfo.exists} messages`)

    // Build search criteria for date range
    const searchCriteria: any = {}
    
    if (settings.startDate) {
      searchCriteria.since = new Date(settings.startDate)
      await addLog('info', `Filtering emails since: ${settings.startDate}`)
    }
    
    if (settings.endDate) {
      searchCriteria.before = new Date(settings.endDate)
      await addLog('info', `Filtering emails before: ${settings.endDate}`)
    }

    // Search for messages in date range
    const searchResults = await client.search(searchCriteria)
    await addLog('info', `Found ${searchResults.length} messages in date range`)

    if (searchResults.length === 0) {
      mailboxInfo.release()
      await client.logout()
      return NextResponse.json({
        success: true,
        addresses: [],
        totalCount: 0,
        message: 'No emails found in the specified date range'
      })
    }

    // Fetch only envelope data (headers) for efficiency
    const messages = client.fetch(searchResults, { envelope: true })
    
    const addressMap = new Map<string, {
      email: string
      name: string
      count: number
      lastSeen: Date
      firstSeen: Date
    }>()

    let processedCount = 0
    const maxToProcess = Math.min(searchResults.length, 1000) // Limit for performance

    await addLog('info', `Processing ${maxToProcess} messages for email addresses...`)

    for await (let message of messages) {
      if (processedCount >= maxToProcess) break

      try {
        const envelope = message.envelope
        if (!envelope?.from?.[0]) continue

        const fromAddress = envelope.from[0]
        const email = fromAddress.address?.toLowerCase()
        const name = fromAddress.name || email || 'Unknown'

        if (email && email.includes('@')) {
          const existing = addressMap.get(email)
          const messageDate = envelope.date || new Date()

          if (existing) {
            existing.count++
            if (messageDate > existing.lastSeen) {
              existing.lastSeen = messageDate
            }
            if (messageDate < existing.firstSeen) {
              existing.firstSeen = messageDate
            }
            // Add this email to the list
            existing.emails.push({
              subject: message.envelope?.subject || 'No Subject',
              date: messageDate,
              name: name
            })
          } else {
            addressMap.set(email, {
              email,
              name,
              count: 1,
              lastSeen: messageDate,
              firstSeen: messageDate,
              emails: [{
                subject: message.envelope?.subject || 'No Subject',
                date: messageDate,
                name: name
              }]
            })
          }
        }

        processedCount++
        
        // Log progress every 100 messages
        if (processedCount % 100 === 0) {
          await addLog('info', `Processed ${processedCount}/${maxToProcess} messages...`)
        }

      } catch (error) {
        await addLog('warning', `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`)
        continue
      }
    }

    mailboxInfo.release()
    await client.logout()

    // Convert to array and sort by email count (most frequent first)
    const addresses = Array.from(addressMap.values()).sort((a, b) => {
      // Sort by count descending, then by last seen descending
      if (b.count !== a.count) {
        return b.count - a.count
      }
      return b.lastSeen.getTime() - a.lastSeen.getTime()
    })

    await addLog('info', `Address fetch completed: Found ${addresses.length} unique email addresses`)
    await addLog('info', `Top senders: ${addresses.slice(0, 5).map(a => `${a.email} (${a.count})`).join(', ')}`)

    return NextResponse.json({
      success: true,
      addresses,
      totalCount: addresses.length,
      processedMessages: processedCount,
      message: `Successfully extracted ${addresses.length} unique email addresses from ${processedCount} messages`
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'

    await addLog('error', `Address fetch failed: ${errorMessage}`)
    await addLog('error', `Error stack: ${errorStack}`)

    console.error('Address fetch error:', error)

    return NextResponse.json({
      success: false,
      error: errorMessage,
      addresses: [],
      totalCount: 0
    }, { status: 500 })
  }
}
