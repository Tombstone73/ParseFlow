import { Settings, ProcessEmailsResult, Email } from '@/lib/types'
import { addLog, addEmail } from '@/lib/data-store'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { processEmailClassification } from './classification-service'
import { startFetching, startProcessing, startClassifying, updateProgress, finishOperation, errorOperation } from './status-service'
import { isWeTransferEmail } from './email-file-service'

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

export async function testConnection(settings: Settings): Promise<boolean> {
  try {
    await addLog('info', `Testing connection to ${settings.imapServer}:${settings.port} (SSL: ${settings.useSSL})`)
    
    const client = new ImapFlow({
      host: settings.imapServer,
      port: settings.port,
      secure: settings.useSSL,
      auth: {
        user: settings.username,
        pass: settings.password
      },
      logger: false // Disable ImapFlow's internal logging
    })

    await addLog('info', 'Attempting to connect to IMAP server...')
    await client.connect()
    await addLog('info', 'IMAP connection established successfully')
    
    await addLog('info', 'Testing mailbox access...')
    const mailboxInfo = await client.getMailboxLock('INBOX')
    await addLog('info', `INBOX access successful - ${mailboxInfo.exists} messages exist`)
    mailboxInfo.release()
    
    await addLog('info', 'Closing connection...')
    await client.logout()
    await addLog('info', 'Connection test completed successfully')
    
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
    await addLog('error', `Connection test failed: ${errorMessage}`)
    await addLog('error', `Error details: ${errorStack}`)
    console.error('IMAP connection test error:', error)
    return false
  }
}

export async function processEmails(
  settings: Settings,
  progressCallback?: (operation: string, progress: number, total?: number, processed?: number) => void
): Promise<ProcessEmailsResult> {
  const startTime = Date.now()
  
  // Set initial status
  startFetching('Initializing email processing...')
  
  await addLog('info', '=== Starting email processing ===')
  await addLog('info', `Configuration: ${settings.imapServer}:${settings.port} (SSL: ${settings.useSSL})`)
  await addLog('info', `Username: ${settings.username}`)
  await addLog('info', `Date range: ${settings.startDate ? new Date(settings.startDate).toISOString() : 'No start date'} to ${settings.endDate ? new Date(settings.endDate).toISOString() : 'No end date'}`)

  progressCallback?.('Initializing email processing...', 0)

  let client: any | null = null
  
  try {
    await addLog('info', 'Step 1: Creating IMAP client...')
    
    // Create IMAP connection
    client = new ImapFlow({
      host: settings.imapServer,
      port: settings.port,
      secure: settings.useSSL,
      auth: {
        user: settings.username,
        pass: settings.password
      },
      logger: false // Disable ImapFlow's internal logging
    })

    await addLog('info', 'Step 2: Connecting to IMAP server...')
    startFetching('Connecting to IMAP server...')
    progressCallback?.('Connecting to IMAP server...', 10)
    await client.connect()
    await addLog('info', 'Successfully connected to IMAP server')
    progressCallback?.('Connected to IMAP server', 15)

    await addLog('info', 'Step 3: Accessing INBOX...')
    let lock = await client.getMailboxLock('INBOX')
    await addLog('info', `INBOX locked successfully - ${lock.exists} messages exist, ${lock.uidNext} next UID`)
    
    try {
      await addLog('info', 'Step 4: Searching for unread emails...')
      
      // First, let's see what messages exist
      try {
        const allMessages = client.fetch('1:*', { envelope: true })
        let totalCount = 0
        for await (let msg of allMessages) {
          totalCount++
        }
        await addLog('info', `Total messages in INBOX: ${totalCount}`)
      } catch (fetchError) {
        await addLog('warning', `Could not count total messages: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
      }
      
      // Now search for unread emails using proper IMAP search
      let searchResults: number[]
      try {
        await addLog('info', 'Searching for unread emails...')

        // Build search criteria
        let searchCriteria: any = { unseen: true }

        // Add date filtering if specified
        if (settings.startDate) {
          const startDate = new Date(settings.startDate)
          const now = new Date()
          if (startDate > now) {
            await addLog('warning', `Start date ${startDate.toISOString()} is in the future. No emails will be found.`)
          }
          searchCriteria.since = startDate
          await addLog('info', `Filtering emails since: ${startDate.toISOString()}`)
        }
        if (settings.endDate) {
          const endDate = new Date(settings.endDate)
          const now = new Date()
          if (endDate > now) {
            await addLog('warning', `End date ${endDate.toISOString()} is in the future. This may limit results.`)
          }
          searchCriteria.before = endDate
          await addLog('info', `Filtering emails before: ${endDate.toISOString()}`)
        }

        // Check if date range makes sense
        if (settings.startDate && settings.endDate) {
          const startDate = new Date(settings.startDate)
          const endDate = new Date(settings.endDate)
          if (startDate >= endDate) {
            await addLog('warning', `Start date (${startDate.toISOString()}) is not before end date (${endDate.toISOString()}). This may result in no emails being found.`)
          }
        }

        await addLog('info', `Search criteria: ${JSON.stringify(searchCriteria)}`)
        searchResults = await client.search(searchCriteria)
        await addLog('info', `Found ${searchResults.length} unread message UIDs: ${searchResults.join(', ')}`)
        progressCallback?.(`Found ${searchResults.length} unread emails`, 25, searchResults.length, 0)
      } catch (searchError) {
        await addLog('error', `Search for unread emails failed: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`)
        throw new Error(`Failed to search for unread emails: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`)
      }
      
      if (searchResults.length === 0) {
        await addLog('info', 'No unread messages found matching criteria')

        // If we have date filters, suggest trying without them
        if (settings.startDate || settings.endDate) {
          await addLog('info', 'SUGGESTION: Try removing the date filters to see if there are unread emails outside the specified date range.')
        }

        // Try a broader search to see if there are any unread emails at all
        try {
          const allUnreadResults = await client.search({ unseen: true })
          await addLog('info', `Total unread emails (ignoring date filters): ${allUnreadResults.length}`)
          if (allUnreadResults.length > 0) {
            await addLog('info', 'There are unread emails, but none match your date criteria. Consider adjusting your date range.')
          }
        } catch (broadSearchError) {
          await addLog('warning', `Could not perform broader search: ${broadSearchError instanceof Error ? broadSearchError.message : 'Unknown error'}`)
        }

        return {
          processedCount: 0,
          errors: []
        }
      }

      await addLog('info', `Step 5: Fetching ${searchResults.length} unread messages...`)

      // Fetch the unread messages with timeout
      let messages
      try {
        messages = client.fetch(searchResults, { envelope: true, source: true })
      } catch (fetchError) {
        await addLog('error', `Failed to fetch messages: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
        throw new Error(`Failed to fetch messages: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
      }

      let processedCount = 0
      const errors: string[] = []
      let messageCount = 0

      await addLog('info', 'Step 6: Processing fetched messages...')
      
      for await (let message of messages) {
        messageCount++
        const messageStartTime = Date.now()
        const currentSender = message.envelope?.from?.[0]?.address || 'Unknown'

        // Update progress with current email being processed
        const progressPercent = 25 + Math.floor((messageCount / searchResults.length) * 70)
        progressCallback?.(`Processing email from ${currentSender}`, progressPercent, searchResults.length, messageCount - 1)

        await addLog('info', `Processing message ${messageCount}/${searchResults.length} (UID: ${message.uid}, Seq: ${message.seq})`)

        try {
          // Log message envelope info
          if (message.envelope) {
            await addLog('info', `  Subject: ${message.envelope.subject || 'No Subject'}`)
            await addLog('info', `  From: ${message.envelope.from?.[0]?.name || 'Unknown'} <${message.envelope.from?.[0]?.address || 'Unknown'}>`)
            await addLog('info', `  Date: ${message.envelope.date || 'Unknown'}`)
            await addLog('info', `  Size: ${message.source?.length || 0} bytes`)
          }
          
          // Parse the email
          await addLog('info', '  Parsing email content...')
          const parsed = await simpleParser(message.source)
          
          // Extract email address from sender
          const fromText = parsed.from?.text || 'Unknown Sender'
          const senderEmail = extractEmailAddress(fromText)

          const email: Omit<Email, 'id'> = {
            subject: parsed.subject || 'No Subject',
            from: fromText,
            to: Array.isArray(parsed.to) ? parsed.to[0]?.text || settings.username : parsed.to?.text || settings.username,
            date: parsed.date?.toISOString() || new Date().toISOString(),
            body: parsed.text || parsed.html || 'No content',
            status: 'processed', // Changed from 'processing' to 'processed'
            parsed: undefined,
            classification: 'pending', // Initial classification
            senderEmail: senderEmail,
            attachments: parsed.attachments?.map(att => ({
              filename: att.filename || 'unnamed',
              contentType: att.contentType || 'application/octet-stream',
              size: att.size || 0,
              data: att.content
            })) || []
          }

          // Check if this is a WeTransfer email and handle specially
          let classifiedEmail: Email | null
          const tempEmail = { ...email, id: 'temp' } as Email
          if (isWeTransferEmail(tempEmail)) {
            await addLog('info', '  WeTransfer email detected - treating as order')
            classifiedEmail = {
              ...email,
              id: '', // Will be set by addEmail
              classification: 'inbox',
              parsed: {
                type: 'order',
                data: {},
                confidence: 0.9
              }
            } as Email
          } else {
            // Process normal classification
            await addLog('info', '  Processing email classification...')
            startClassifying(`Classifying email ${messageCount}/${messages.length}`)
            updateProgress((messageCount / messages.length) * 100)
            classifiedEmail = await processEmailClassification(tempEmail, settings)
          }

          // Add email to store only if not blacklisted (not null)
          if (classifiedEmail) {
            await addLog('info', '  Adding email to store...')
            await addEmail(classifiedEmail)

            const messageEndTime = Date.now()
            const messageDuration = (messageEndTime - messageStartTime) / 1000
            await addLog('info', `  ✓ Successfully processed: ${classifiedEmail.subject} (${messageDuration.toFixed(2)}s) - Classification: ${classifiedEmail.classification}`)

            processedCount++
          } else {
            const messageEndTime = Date.now()
            const messageDuration = (messageEndTime - messageStartTime) / 1000
            await addLog('info', `  ✓ Email skipped (blacklisted): ${email.subject} (${messageDuration.toFixed(2)}s)`)
            // Don't increment processedCount for skipped emails
          }

          // Mark as read (optional)
          // await client.messageFlagsAdd(message.seq, ['\\Seen'])
          
        } catch (emailError) {
          const errorMsg = `Failed to process message ${messageCount} (UID: ${message.uid}): ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
          const errorStack = emailError instanceof Error ? emailError.stack : 'No stack trace'
          errors.push(errorMsg)
          await addLog('error', errorMsg)
          await addLog('error', `Error stack: ${errorStack}`)
          console.error('Email processing error:', emailError)
        }
      }

      // This check is no longer needed since we already checked above
      // if (messageCount === 0) {
      //   await addLog('info', 'No unread messages found')
      // }

      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      await addLog('info', `=== Email processing completed ===`)
      await addLog('info', `Total processing time: ${duration.toFixed(2)} seconds`)
      await addLog('info', `Total unread messages found: ${messageCount}`)
      await addLog('info', `Successfully processed: ${processedCount}`)
      await addLog('info', `Errors encountered: ${errors.length}`)

      finishOperation(`Processed ${processedCount} emails in ${duration.toFixed(1)}s`)

      return {
        processedCount,
        errors
      }

    } finally {
      await addLog('info', 'Step 7: Releasing mailbox lock...')
      lock.release()
      await addLog('info', 'Step 8: Disconnecting from IMAP server...')
      await client.logout()
      await addLog('info', 'Disconnected from IMAP server')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
    
    // Provide more specific error messages based on common IMAP issues
    let userFriendlyMessage = errorMessage
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      userFriendlyMessage = `Cannot connect to IMAP server. Please check the server address and your internet connection.`
    } else if (errorMessage.includes('ECONNREFUSED')) {
      userFriendlyMessage = `Connection refused by IMAP server. Please check the port number and SSL settings.`
    } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('authentication')) {
      userFriendlyMessage = `Authentication failed. Please check your username and password/app password.`
    } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      userFriendlyMessage = `Connection timed out. Please check your network connection and server settings.`
    }
    
    await addLog('error', `=== Email processing failed ===`)
    await addLog('error', `Error: ${errorMessage}`)
    await addLog('error', `User-friendly message: ${userFriendlyMessage}`)
    await addLog('error', `Stack trace: ${errorStack}`)
    console.error('Email processing error:', error)
    
    errorOperation(userFriendlyMessage)
    
    // Try to cleanup connection if it exists
    if (client) {
      try {
        await client.logout()
        await addLog('info', 'Cleaned up IMAP connection after error')
      } catch (cleanupError) {
        await addLog('error', `Failed to cleanup connection: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}`)
      }
    }
    
    throw new Error(userFriendlyMessage)
  }
}