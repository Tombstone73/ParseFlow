import { NextRequest, NextResponse } from 'next/server'
import { getEmails, getSettings, addLog } from '@/lib/data-store'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const fileType = searchParams.get('type') // 'html', 'json', 'parsed', 'attachment'
    const filename = searchParams.get('filename')

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
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

    // Get settings for storage path
    const settings = await getSettings()
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 400 }
      )
    }

    // Try to find the email folder
    const basePath = settings.storagePath || './data/email_files'
    
    // Look for folders that might contain this email
    try {
      const folders = await fs.readdir(basePath)
      let emailFolder: string | null = null
      
      // Search for folder containing this email (by date and sender)
      const emailDate = new Date(email.date).toISOString().split('T')[0]
      const senderName = extractCustomerName(email.from)
      
      for (const folder of folders) {
        if (folder.includes(emailDate) && folder.includes(senderName)) {
          emailFolder = path.join(basePath, folder)
          break
        }
      }

      if (!emailFolder) {
        return NextResponse.json(
          { error: 'Email files not found' },
          { status: 404 }
        )
      }

      // Handle different file types
      switch (fileType) {
        case 'html':
          const htmlFile = path.join(emailFolder, 'email_content.html')
          const htmlContent = await fs.readFile(htmlFile, 'utf8')
          return new NextResponse(htmlContent, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=3600'
            }
          })

        case 'json':
          const jsonFile = path.join(emailFolder, 'email_metadata.json')
          const jsonContent = await fs.readFile(jsonFile, 'utf8')
          return new NextResponse(jsonContent, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600'
            }
          })

        case 'parsed':
          // Look for parsed data files
          const parsedFiles = await fs.readdir(emailFolder)
          const parsedFile = parsedFiles.find(f => f.startsWith('parsed_') && f.endsWith('.json'))
          
          if (!parsedFile) {
            return NextResponse.json(
              { error: 'Parsed data file not found' },
              { status: 404 }
            )
          }

          const parsedContent = await fs.readFile(path.join(emailFolder, parsedFile), 'utf8')
          return new NextResponse(parsedContent, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600'
            }
          })

        case 'attachment':
          if (!filename) {
            return NextResponse.json(
              { error: 'Filename is required for attachment download' },
              { status: 400 }
            )
          }

          const attachmentPath = path.join(emailFolder, 'attachments', filename)
          
          try {
            const attachmentData = await fs.readFile(attachmentPath)
            const stats = await fs.stat(attachmentPath)
            
            // Determine content type based on file extension
            const ext = path.extname(filename).toLowerCase()
            const contentType = getContentType(ext)
            
            return new NextResponse(attachmentData, {
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': stats.size.toString(),
                'Cache-Control': 'public, max-age=3600'
              }
            })
          } catch (error) {
            return NextResponse.json(
              { error: 'Attachment not found' },
              { status: 404 }
            )
          }

        case 'list':
          // List all files in the email folder
          const files = await fs.readdir(emailFolder, { withFileTypes: true })
          const fileList = []

          for (const file of files) {
            if (file.isFile()) {
              const filePath = path.join(emailFolder, file.name)
              const stats = await fs.stat(filePath)
              fileList.push({
                name: file.name,
                size: stats.size,
                type: 'file',
                modified: stats.mtime.toISOString()
              })
            } else if (file.isDirectory()) {
              // List attachments folder
              if (file.name === 'attachments') {
                const attachments = await fs.readdir(path.join(emailFolder, file.name))
                for (const attachment of attachments) {
                  const attachmentPath = path.join(emailFolder, file.name, attachment)
                  const stats = await fs.stat(attachmentPath)
                  fileList.push({
                    name: attachment,
                    size: stats.size,
                    type: 'attachment',
                    modified: stats.mtime.toISOString()
                  })
                }
              }
            }
          }

          return NextResponse.json({
            emailId,
            folderPath: emailFolder,
            files: fileList
          })

        default:
          return NextResponse.json(
            { error: 'Invalid file type. Use: html, json, parsed, attachment, or list' },
            { status: 400 }
          )
      }

    } catch (error) {
      await addLog('error', `Failed to access email files: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return NextResponse.json(
        { error: 'Failed to access email files' },
        { status: 500 }
      )
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `Email files request failed: ${errorMessage}`)
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

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

function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip'
  }

  return contentTypes[extension] || 'application/octet-stream'
}