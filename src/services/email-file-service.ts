import { Email, Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'
import { promises as fs } from 'fs'
import path from 'path'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export interface EmailFileData {
  folderPath: string
  htmlFile: string
  jsonFile: string
  attachmentFiles: string[]
  parsedJsonFile?: string
}

export interface EmailMetadata {
  id: string
  subject: string
  from: string
  to: string
  date: string
  messageId?: string
  inReplyTo?: string
  references?: string[]
  headers: Record<string, string>
  attachmentCount: number
  bodyHtml?: string
  bodyText?: string
  size: number
}

/**
 * Creates a dedicated folder for an email and saves all related files
 */
export async function saveEmailWithFiles(
  email: Email, 
  settings: Settings, 
  orderNumber?: string
): Promise<EmailFileData> {
  try {
    await addLog('info', `Starting file save process for email: ${email.subject}`)

    // Extract customer name from email
    const customerName = extractCustomerName(email.from)
    
    // Create folder name
    const date = new Date(email.date).toISOString().split('T')[0] // YYYY-MM-DD
    const orderVar = orderNumber || 'ORDER_VAR'
    const folderName = `${customerName}_${date}_${orderVar}`.replace(/[^a-zA-Z0-9_-]/g, '_')
    
    // Create full folder path
    const basePath = settings.storagePath || './data/email_files'
    const folderPath = path.join(basePath, folderName)
    
    // Ensure directory exists
    await fs.mkdir(folderPath, { recursive: true })
    await addLog('info', `Created email folder: ${folderPath}`)

    // Save HTML content
    const htmlFile = await saveEmailHtml(email, folderPath)
    
    // Save JSON metadata
    const jsonFile = await saveEmailJson(email, folderPath)
    
    // Save attachments
    await addLog('debug', `About to save ${email.attachments?.length || 0} attachments`)
    const attachmentFiles = await saveEmailAttachments(email, folderPath, settings)
    await addLog('debug', `Attachment saving completed. Files saved: ${attachmentFiles.length}`)
    
    const result: EmailFileData = {
      folderPath,
      htmlFile,
      jsonFile,
      attachmentFiles
    }

    await addLog('info', `Successfully saved email files to: ${folderPath}`)
    return result

  } catch (error) {
    await addLog('error', `Failed to save email files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

/**
 * Re-fetches an email from IMAP server with full content and attachments
 */
export async function refetchEmailWithAttachments(
  email: Email, 
  settings: Settings
): Promise<Email> {
  let client: any | null = null
  
  try {
    await addLog('info', `Re-fetching email with attachments: ${email.subject}`)

    // Create IMAP connection
    await addLog('debug', `Creating IMAP connection to ${settings.imapServer}:${settings.port}`)
    client = new ImapFlow({
      host: settings.imapServer,
      port: settings.port,
      secure: settings.useSSL,
      auth: {
        user: settings.username,
        pass: settings.password
      },
      logger: false,
      socketTimeout: 30000, // 30 second socket timeout
      connectionTimeout: 15000 // 15 second connection timeout
    })

    await addLog('debug', 'Connecting to IMAP server...')
    await client.connect()
    await addLog('debug', 'IMAP connection established')

    await addLog('debug', 'Getting mailbox lock for INBOX...')
    const lock = await client.getMailboxLock('INBOX')
    await addLog('debug', 'Mailbox lock acquired')

    try {
      // Search for the email by subject and sender
      const searchCriteria = {
        subject: email.subject,
        from: email.senderEmail || extractEmailFromFrom(email.from)
      }

      await addLog('debug', `Searching for email with criteria: ${JSON.stringify(searchCriteria)}`)
      const searchResults = await client.search(searchCriteria)
      await addLog('debug', `Found ${searchResults.length} matching emails`)

      if (searchResults.length === 0) {
        throw new Error('Email not found in IMAP server')
      }

      // Fetch the first matching email with full content
      await addLog('debug', `Fetching email content for message ${searchResults[0]}...`)
      const messages = client.fetch(searchResults[0], {
        envelope: true,
        source: true,
        bodyStructure: true
      })
      await addLog('debug', 'Starting to process fetched messages...')

      for await (let message of messages) {
        await addLog('debug', 'Processing message content...')

        // Parse the full email content
        await addLog('debug', 'Parsing email source with simpleParser...')
        const parsed = await simpleParser(message.source)
        await addLog('debug', `Parsed email: ${parsed.attachments?.length || 0} attachments found`)

        // Update email with full content and attachments
        const updatedEmail: Email = {
          ...email,
          body: parsed.html || parsed.text || email.body,
          attachments: parsed.attachments?.map(att => ({
            filename: att.filename || 'unnamed',
            contentType: att.contentType || 'application/octet-stream',
            size: att.size || 0,
            data: att.content
          })) || []
        }

        await addLog('info', `Successfully re-fetched email with ${updatedEmail.attachments?.length || 0} attachments`)

        // Log attachment details
        if (updatedEmail.attachments && updatedEmail.attachments.length > 0) {
          for (const att of updatedEmail.attachments) {
            const hasData = att.data && att.data.length > 0;
            await addLog('debug', `Attachment: ${att.filename} (${att.contentType}, ${(att.size / 1024).toFixed(1)} KB) - Data: ${hasData ? 'YES' : 'NO'}`)
          }
        }

        return updatedEmail
      }

      throw new Error('No message content found')

    } finally {
      lock.release()
      await client.logout()
    }

  } catch (error) {
    if (client) {
      try {
        await client.logout()
      } catch (cleanupError) {
        await addLog('error', `Failed to cleanup IMAP connection: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`)
      }
    }
    
    await addLog('error', `Failed to re-fetch email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    // Return original email if re-fetch fails
    return email
  }
}

/**
 * Saves email content as HTML file
 */
async function saveEmailHtml(email: Email, folderPath: string): Promise<string> {
  const htmlContent = generateEmailHtml(email)
  const htmlFile = path.join(folderPath, 'email_content.html')
  
  await fs.writeFile(htmlFile, htmlContent, 'utf8')
  await addLog('info', `Saved email HTML: ${htmlFile}`)
  
  return htmlFile
}

/**
 * Saves email metadata as JSON file
 */
async function saveEmailJson(email: Email, folderPath: string): Promise<string> {
  const metadata: EmailMetadata = {
    id: email.id,
    subject: email.subject,
    from: email.from,
    to: email.to,
    date: email.date,
    headers: {}, // Will be populated if we have access to raw headers
    attachmentCount: email.attachments?.length || 0,
    bodyHtml: email.body.includes('<') ? email.body : undefined,
    bodyText: email.body.includes('<') ? undefined : email.body,
    size: email.body.length
  }

  const jsonFile = path.join(folderPath, 'email_metadata.json')
  await fs.writeFile(jsonFile, JSON.stringify(metadata, null, 2), 'utf8')
  await addLog('info', `Saved email JSON: ${jsonFile}`)
  
  return jsonFile
}

/**
 * Saves all email attachments to the folder
 */
async function saveEmailAttachments(
  email: Email,
  folderPath: string,
  settings: Settings
): Promise<string[]> {
  await addLog('debug', `saveEmailAttachments called with ${email.attachments?.length || 0} attachments`)

  if (!email.attachments || email.attachments.length === 0) {
    await addLog('debug', 'No attachments to save')
    return []
  }

  const savedFiles: string[] = []
  const attachmentsDir = path.join(folderPath, 'attachments')
  
  // Create attachments subdirectory
  await fs.mkdir(attachmentsDir, { recursive: true })

  for (const attachment of email.attachments) {
    try {
      await addLog('debug', `Processing attachment: ${attachment.filename}`)

      // Check if attachment has data
      if (!attachment.data) {
        await addLog('warning', `Attachment ${attachment.filename} has no data, skipping`)
        continue
      }

      // Sanitize filename
      const filename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filepath = path.join(attachmentsDir, filename)

      // Convert attachment data to buffer if needed
      let data: Buffer;
      if (Buffer.isBuffer(attachment.data)) {
        data = attachment.data;
      } else if (typeof attachment.data === 'string') {
        // Try base64 first, then utf8
        try {
          data = Buffer.from(attachment.data, 'base64');
        } catch {
          data = Buffer.from(attachment.data, 'utf8');
        }
      } else {
        await addLog('warning', `Attachment ${filename} has unsupported data type, skipping`)
        continue
      }

      await addLog('debug', `Attachment ${filename} data converted to buffer: ${data.length} bytes`)

      // Check file size against settings
      if (data.length > settings.maxAttachmentSize * 1024 * 1024) {
        await addLog('warning', `Attachment ${filename} exceeds size limit (${settings.maxAttachmentSize}MB), skipping`)
        continue
      }

      await fs.writeFile(filepath, data)
      savedFiles.push(filepath)

      await addLog('info', `Saved attachment: ${filepath} (${(data.length / 1024).toFixed(1)} KB)`)
    } catch (error) {
      await addLog('error', `Failed to save attachment ${attachment.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return savedFiles
}

/**
 * Generates HTML content for email display
 */
function generateEmailHtml(email: Email): string {
  const isHtmlContent = email.body.includes('<')
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(email.subject)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .email-header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .email-header h1 {
            margin: 0 0 15px 0;
            color: #2563eb;
            font-size: 24px;
        }
        .email-meta {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px 15px;
            font-size: 14px;
        }
        .email-meta .label {
            font-weight: 600;
            color: #6b7280;
        }
        .email-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ${isHtmlContent ? '' : 'white-space: pre-wrap;'}
        }
        .attachments {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .attachment-item {
            padding: 8px 12px;
            background: #f3f4f6;
            border-radius: 4px;
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    </style>
</head>
<body>
    <div class="email-header">
        <h1>${escapeHtml(email.subject)}</h1>
        <div class="email-meta">
            <span class="label">From:</span>
            <span>${escapeHtml(email.from)}</span>
            <span class="label">To:</span>
            <span>${escapeHtml(email.to)}</span>
            <span class="label">Date:</span>
            <span>${new Date(email.date).toLocaleString()}</span>
            <span class="label">Status:</span>
            <span>${email.status}</span>
            ${email.classification ? `
            <span class="label">Classification:</span>
            <span>${email.classification}</span>
            ` : ''}
        </div>
    </div>
    
    <div class="email-content">
        ${isHtmlContent ? email.body : escapeHtml(email.body)}
    </div>
    
    ${email.attachments && email.attachments.length > 0 ? `
    <div class="attachments">
        <h3>Attachments (${email.attachments.length})</h3>
        ${email.attachments.map(att => `
            <div class="attachment-item">
                <span>${escapeHtml(att.filename)}</span>
                <span>${(att.size / 1024).toFixed(1)} KB</span>
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280;">
        Email saved on ${new Date().toLocaleString()} by ParseFlow Email Management System
    </div>
</body>
</html>`
}

/**
 * Extracts customer name from email "from" field
 */
function extractCustomerName(fromField: string): string {
  // Extract name from "Name <email>" format
  const match = fromField.match(/^"?([^"<]+)"?\s*</)
  if (match) {
    return match[1].trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
  }
  
  // If no name found, try to extract from email
  const emailMatch = fromField.match(/([^@]+)@/)
  if (emailMatch) {
    return emailMatch[1].replace(/[._]/g, '_')
  }
  
  return 'Unknown_Customer'
}

/**
 * Extracts email address from "from" field
 */
function extractEmailFromFrom(fromField: string): string {
  const match = fromField.match(/<([^>]+)>/)
  if (match) {
    return match[1].toLowerCase()
  }
  
  // If no angle brackets, assume the whole string is an email or extract first word
  const parts = fromField.split(' ')
  const emailLike = parts.find(part => part.includes('@'))
  return emailLike ? emailLike.toLowerCase() : fromField.toLowerCase()
}

/**
 * Escapes HTML characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Checks if an email is from WeTransfer
 */
export function isWeTransferEmail(email: Email): boolean {
  const senderEmail = email.senderEmail || extractEmailFromFrom(email.from)
  return senderEmail.includes('wetransfer.com') || 
         senderEmail.includes('we.tl') ||
         email.from.toLowerCase().includes('wetransfer')
}

/**
 * Saves parsed data as JSON file in the email folder
 */
export async function saveParsedDataJson(
  folderPath: string, 
  parsedData: any, 
  type: 'order' | 'estimate'
): Promise<string> {
  const parsedJsonFile = path.join(folderPath, `parsed_${type}_data.json`)
  await fs.writeFile(parsedJsonFile, JSON.stringify(parsedData, null, 2), 'utf8')
  await addLog('info', `Saved parsed ${type} data: ${parsedJsonFile}`)
  return parsedJsonFile
}