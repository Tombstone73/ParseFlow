import { Email, Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'
import { promises as fs } from 'fs'
import path from 'path'
import { startParsing, updateProgress, finishOperation, errorOperation } from './status-service'
import { 
  saveEmailWithFiles, 
  refetchEmailWithAttachments, 
  saveParsedDataJson, 
  isWeTransferEmail,
  EmailFileData 
} from './email-file-service'

export interface OrderData {
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice?: number
    totalPrice?: number
    specifications?: string
  }>
  totalAmount?: number
  dueDate?: string
  rushOrder?: boolean
  specialInstructions?: string
  shippingAddress?: {
    name?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
  }
  billingAddress?: {
    name?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
  }
}

export interface EstimateData {
  estimateNumber?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  projectDescription?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice?: number
    totalPrice?: number
    specifications?: string
  }>
  totalAmount?: number
  validUntil?: string
  notes?: string
  requestedDelivery?: string
}

export interface ParsedEmailData {
  type: 'order' | 'estimate'
  data: OrderData | EstimateData
  confidence: number
  reasoning: string
  attachmentsSaved?: string[]
  emailFiles?: EmailFileData
}

export async function parseEmailWithAI(email: Email, settings: Settings, saveFiles: boolean = true): Promise<ParsedEmailData> {
  try {
    startParsing(`Parsing email: ${email.subject}`)
    await addLog('info', `Starting AI parsing for email: ${email.subject}`)

    // Check if this is a WeTransfer email (automatically treated as order)
    let expectedType: 'order' | 'estimate'
    if (isWeTransferEmail(email)) {
      expectedType = 'order'
      await addLog('info', `WeTransfer email detected, treating as order: ${email.subject}`)
    } else {
      // Determine the expected type based on email classification
      expectedType = email.parsed?.type === 'order' ? 'order' : 'estimate'
    }

    // Re-fetch email with full attachments if needed for file saving
    let fullEmail = email
    if (saveFiles && (!email.attachments || email.attachments.length === 0)) {
      try {
        await addLog('info', 'Re-fetching email with attachments (no timeout)...')

        // Remove timeout completely - let IMAP fetch complete naturally
        fullEmail = await refetchEmailWithAttachments(email, settings)
        await addLog('info', `Email re-fetched successfully with ${fullEmail.attachments?.length || 0} attachments`)

      } catch (refetchError) {
        await addLog('warning', `Could not re-fetch email attachments: ${refetchError instanceof Error ? refetchError.message : 'Unknown error'}`)
        await addLog('info', 'Continuing with original email data')
        fullEmail = email // Continue with original email
      }
    }
    
    // Create parsing prompt based on type
    const prompt = createParsingPrompt(fullEmail, expectedType, settings)
    
    // Call AI service
    let aiResponse: string
    try {
      if (settings.aiProvider === 'google') {
        aiResponse = await callGoogleAI(prompt, settings)
      } else if (settings.aiProvider === 'ollama') {
        aiResponse = await callOllamaAI(prompt, settings)
      } else {
        throw new Error(`Unsupported AI provider: ${settings.aiProvider}`)
      }
      await addLog('info', `AI response received successfully`)
    } catch (aiError) {
      await addLog('error', `AI call failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`)
      throw aiError
    }

    // Parse AI response
    let parsedData: Omit<ParsedEmailData, 'attachmentsSaved'>
    try {
      parsedData = parseAIParsingResponse(aiResponse, expectedType)
      await addLog('info', `AI response parsed successfully with confidence ${parsedData.confidence}`)
    } catch (parseError) {
      await addLog('error', `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      await addLog('debug', `Raw AI response: ${aiResponse.substring(0, 500)}...`)
      throw parseError
    }
    
    // Save email files if requested
    let emailFiles: EmailFileData | undefined
    let attachmentsSaved: string[] = []
    
    if (saveFiles) {
      try {
        await addLog('debug', `Starting file save process for email: ${fullEmail.subject}`)
        await addLog('debug', `Email has ${fullEmail.attachments?.length || 0} attachments`)

        // Extract order number from parsed data for folder naming
        const orderNumber = 'orderNumber' in parsedData.data ? parsedData.data.orderNumber :
                           'estimateNumber' in parsedData.data ? parsedData.data.estimateNumber : undefined

        // Save all email files (HTML, JSON, attachments)
        emailFiles = await saveEmailWithFiles(fullEmail, settings, orderNumber || undefined)
        attachmentsSaved = emailFiles.attachmentFiles

        await addLog('debug', `File save completed. Attachments saved: ${attachmentsSaved.length}`)
        
        // Save parsed data JSON in the same folder
        if (emailFiles.folderPath) {
          const parsedJsonFile = await saveParsedDataJson(
            emailFiles.folderPath, 
            parsedData.data, 
            expectedType
          )
          emailFiles.parsedJsonFile = parsedJsonFile
        }
        
      } catch (fileError) {
        await addLog('error', `Failed to save email files: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
        // Continue without file saving
      }
    }

    const result = {
      ...parsedData,
      attachmentsSaved,
      emailFiles
    }

    finishOperation()
    await addLog('info', `AI parsing completed successfully for ${email.subject}: ${result.type} with confidence ${result.confidence}`)
    if (emailFiles?.folderPath) {
      await addLog('info', `Email files saved to: ${emailFiles.folderPath}`)
    }
    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await addLog('error', `AI parsing failed for ${email.subject}: ${errorMessage}`)

    // Don't save files when parsing fails
    finishOperation()

    // Return fallback data with clear indication of failure
    const fallbackType = isWeTransferEmail(email) ? 'order' :
                        (email.parsed?.type === 'order' ? 'order' : 'estimate')
    return {
      type: fallbackType,
      data: fallbackType === 'order' ? createFallbackOrderData(email) : createFallbackEstimateData(email),
      confidence: 0.1,
      reasoning: `AI parsing failed: ${errorMessage}`,
      attachmentsSaved: []
    }
  }
}

function createParsingPrompt(email: Email, expectedType: 'order' | 'estimate', settings: Settings): string {
  const schema = expectedType === 'order' ? getOrderSchema() : getEstimateSchema()
  
  return `You are an expert email parser for a printing/graphics business. Parse the following email and extract structured data.

Email Subject: ${email.subject}
Email From: ${email.from}
Email Body: ${email.body}

Expected Type: ${expectedType}

Please extract all relevant information and format it according to this JSON schema:
${schema}

Instructions:
1. Extract all order/estimate details including items, quantities, prices, dates
2. Identify customer information (name, email, phone, addresses)
3. Look for special instructions, rush orders, delivery requirements
4. Parse item specifications, materials, sizes, colors
5. Extract monetary amounts and convert to numbers
6. Parse dates and format as ISO strings
7. If information is missing or unclear, use null values
8. Be thorough but accurate - only extract information that's clearly stated

Respond with valid JSON only, no other text:
`
}

function getOrderSchema(): string {
  return JSON.stringify({
    orderNumber: "string or null",
    customerName: "string or null",
    customerEmail: "string or null", 
    customerPhone: "string or null",
    items: [
      {
        description: "string - detailed item description",
        quantity: "number",
        unitPrice: "number or null",
        totalPrice: "number or null",
        specifications: "string or null - size, material, color, etc."
      }
    ],
    totalAmount: "number or null",
    dueDate: "ISO date string or null",
    rushOrder: "boolean",
    specialInstructions: "string or null",
    shippingAddress: {
      name: "string or null",
      address: "string or null",
      city: "string or null",
      state: "string or null",
      zipCode: "string or null"
    },
    billingAddress: {
      name: "string or null", 
      address: "string or null",
      city: "string or null",
      state: "string or null",
      zipCode: "string or null"
    }
  }, null, 2)
}

function getEstimateSchema(): string {
  return JSON.stringify({
    estimateNumber: "string or null",
    customerName: "string or null",
    customerEmail: "string or null",
    customerPhone: "string or null", 
    projectDescription: "string or null",
    items: [
      {
        description: "string - detailed item description",
        quantity: "number",
        unitPrice: "number or null",
        totalPrice: "number or null",
        specifications: "string or null - size, material, color, etc."
      }
    ],
    totalAmount: "number or null",
    validUntil: "ISO date string or null",
    notes: "string or null",
    requestedDelivery: "ISO date string or null"
  }, null, 2)
}

async function callGoogleAI(prompt: string, settings: Settings): Promise<string> {
  if (!settings.googleApiKey) {
    throw new Error('Google API key not configured')
  }

  await addLog('info', 'Calling Google AI API...')

  // Create AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 120000) // 2 minute timeout

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': settings.googleApiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      await addLog('error', `Google AI API error: ${response.status} - ${errorText}`)
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      await addLog('error', 'No response from Google AI')
      throw new Error('No response from Google AI')
    }

    await addLog('info', `Google AI response received (${aiResponse.length} characters)`)
    return aiResponse

  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      await addLog('error', 'Google AI API call timed out after 2 minutes')
      throw new Error('Google AI API call timed out after 2 minutes')
    }
    throw error
  }
}

async function callOllamaAI(prompt: string, settings: Settings): Promise<string> {
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemma',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const aiResponse = data.response

  if (!aiResponse) {
    throw new Error('No response from Ollama')
  }

  return aiResponse
}

function parseAIParsingResponse(response: string, expectedType: 'order' | 'estimate'): Omit<ParsedEmailData, 'attachmentsSaved'> {
  try {
    // Clean up the response
    let cleanResponse = response.trim()
    
    // Look for JSON in the response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanResponse = jsonMatch[0]
    }

    const parsed = JSON.parse(cleanResponse)
    
    // Validate the structure
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid items array in parsed data')
    }

    // Calculate confidence based on completeness
    let confidence = 0.5
    const requiredFields = expectedType === 'order' 
      ? ['customerName', 'items'] 
      : ['customerName', 'items', 'projectDescription']
    
    const presentFields = requiredFields.filter(field => parsed[field] && parsed[field] !== null)
    confidence = Math.min(0.95, 0.3 + (presentFields.length / requiredFields.length) * 0.6)
    
    // Add bonus for having detailed items
    if (parsed.items.length > 0 && parsed.items[0].description) {
      confidence += 0.1
    }

    return {
      type: expectedType,
      data: parsed,
      confidence: Math.max(0.1, Math.min(0.95, confidence)),
      reasoning: `Successfully parsed ${parsed.items.length} items with ${presentFields.length}/${requiredFields.length} required fields`
    }

  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}



function createFallbackOrderData(email: Email): OrderData {
  return {
    orderNumber: undefined,
    customerName: extractCustomerName(email.from) || undefined,
    customerEmail: email.senderEmail || undefined,
    customerPhone: undefined,
    items: [{
      description: `Order from email: ${email.subject}`,
      quantity: 1,
      unitPrice: undefined,
      totalPrice: undefined,
      specifications: undefined
    }],
    totalAmount: undefined,
    dueDate: undefined,
    rushOrder: email.subject.toLowerCase().includes('rush'),
    specialInstructions: email.body.substring(0, 500),
    shippingAddress: undefined,
    billingAddress: undefined
  }
}

function createFallbackEstimateData(email: Email): EstimateData {
  return {
    estimateNumber: undefined,
    customerName: extractCustomerName(email.from) || undefined,
    customerEmail: email.senderEmail || undefined,
    customerPhone: undefined,
    projectDescription: email.subject,
    items: [{
      description: `Estimate request from email: ${email.subject}`,
      quantity: 1,
      unitPrice: undefined,
      totalPrice: undefined,
      specifications: undefined
    }],
    totalAmount: undefined,
    validUntil: undefined,
    notes: email.body.substring(0, 500),
    requestedDelivery: undefined
  }
}

function extractCustomerName(fromField: string): string | null {
  // Extract name from "Name <email>" format
  const match = fromField.match(/^"?([^"<]+)"?\s*</)
  if (match) {
    return match[1].trim()
  }
  
  // If no name found, try to extract from email
  const emailMatch = fromField.match(/([^@]+)@/)
  if (emailMatch) {
    return emailMatch[1].replace(/[._]/g, ' ').trim()
  }
  
  return null
}