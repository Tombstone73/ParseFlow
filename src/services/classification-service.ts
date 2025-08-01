import { Email, Settings } from '@/lib/types'
import { addLog } from '@/lib/data-store'
import { isWeTransferEmail } from './email-file-service'

export interface ClassificationResult {
  type: 'order' | 'estimate' | 'other'
  confidence: number
  reasoning: string
}

export async function classifyEmail(email: Email, settings: Settings): Promise<ClassificationResult> {
  try {
    await addLog('info', `Classifying email: ${email.subject}`)
    
    // Check if this is a WeTransfer email first
    if (isWeTransferEmail(email)) {
      await addLog('info', `WeTransfer email detected - automatically classified as order`)
      return {
        type: 'order',
        confidence: 0.95,
        reasoning: 'WeTransfer email automatically classified as order'
      }
    }
    
    // First, try keyword-based classification
    const keywordResult = classifyByKeywords(email, settings)
    
    if (keywordResult.confidence > 0.7) {
      await addLog('info', `Keyword classification: ${keywordResult.type} (confidence: ${keywordResult.confidence})`)
      return keywordResult
    }
    
    // If keyword classification is not confident enough and AI is enabled, use AI
    if (settings.useAiProcessing) {
      const aiResult = await classifyWithAI(email, settings)
      if (aiResult.confidence > keywordResult.confidence) {
        await addLog('info', `AI classification: ${aiResult.type} (confidence: ${aiResult.confidence})`)
        return aiResult
      }
    }
    
    // Fall back to keyword result
    await addLog('info', `Final classification: ${keywordResult.type} (confidence: ${keywordResult.confidence})`)
    return keywordResult
    
  } catch (error) {
    await addLog('error', `Classification error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      type: 'other',
      confidence: 0,
      reasoning: 'Classification failed due to error'
    }
  }
}

function classifyByKeywords(email: Email, settings: Settings): ClassificationResult {
  const content = `${email.subject} ${email.body}`.toLowerCase()
  
  // Get keywords from settings
  const orderKeywords = settings.orderKeywords?.split(',').map(k => k.trim().toLowerCase()) || []
  const estimateKeywords = settings.estimateKeywords?.split(',').map(k => k.trim().toLowerCase()) || []
  
  // Count keyword matches
  let orderScore = 0
  let estimateScore = 0
  
  for (const keyword of orderKeywords) {
    if (keyword && content.includes(keyword)) {
      orderScore++
    }
  }
  
  for (const keyword of estimateKeywords) {
    if (keyword && content.includes(keyword)) {
      estimateScore++
    }
  }
  
  // Determine classification
  if (orderScore > estimateScore && orderScore > 0) {
    return {
      type: 'order',
      confidence: Math.min(0.8, 0.3 + (orderScore * 0.1)),
      reasoning: `Found ${orderScore} order keywords: ${orderKeywords.filter(k => content.includes(k)).join(', ')}`
    }
  } else if (estimateScore > orderScore && estimateScore > 0) {
    return {
      type: 'estimate',
      confidence: Math.min(0.8, 0.3 + (estimateScore * 0.1)),
      reasoning: `Found ${estimateScore} estimate keywords: ${estimateKeywords.filter(k => content.includes(k)).join(', ')}`
    }
  } else {
    return {
      type: 'other',
      confidence: 0.5,
      reasoning: 'No clear keyword matches found'
    }
  }
}

async function classifyWithAI(email: Email, settings: Settings): Promise<ClassificationResult> {
  try {
    await addLog('info', `Starting AI classification with provider: ${settings.aiProvider}`)

    if (settings.aiProvider === 'google') {
      return await classifyWithGoogleAI(email, settings)
    } else if (settings.aiProvider === 'ollama') {
      return await classifyWithOllama(email, settings)
    } else {
      throw new Error(`Unsupported AI provider: ${settings.aiProvider}`)
    }

  } catch (error) {
    await addLog('error', `AI classification error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      type: 'other',
      confidence: 0,
      reasoning: `AI classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function classifyWithGoogleAI(email: Email, settings: Settings): Promise<ClassificationResult> {
  try {
    if (!settings.googleApiKey) {
      throw new Error('Google API key not configured')
    }

    await addLog('info', 'Calling Google AI for email classification')

    const prompt = createClassificationPrompt(email, settings)

    // Call Google AI API
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
          maxOutputTokens: 200
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      throw new Error('No response from Google AI')
    }

    return parseAIResponse(aiResponse)

  } catch (error) {
    await addLog('error', `Google AI classification error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

async function classifyWithOllama(email: Email, settings: Settings): Promise<ClassificationResult> {
  try {
    await addLog('info', 'Calling Ollama for email classification')

    const prompt = createClassificationPrompt(email, settings)

    // Call Ollama API
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
          num_predict: 200
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

    return parseAIResponse(aiResponse)

  } catch (error) {
    await addLog('error', `Ollama classification error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

function createClassificationPrompt(email: Email, settings: Settings): string {
  const orderKeywords = settings.orderKeywords || 'order, purchase, buy, invoice, payment'
  const estimateKeywords = settings.estimateKeywords || 'estimate, quote, proposal, bid, cost'
  const instructions = settings.classificationInstructions || 'Classify emails as order, estimate, or other based on content'

  return `${instructions}

Email Classification Task:
Classify this email as one of: order, estimate, or other

Order keywords: ${orderKeywords}
Estimate keywords: ${estimateKeywords}

Email Subject: ${email.subject}
Email Body: ${email.body.substring(0, 1000)}

Please respond in this exact JSON format:
{
  "type": "order|estimate|other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Only respond with valid JSON, no other text.`
}

function parseAIResponse(response: string): ClassificationResult {
  try {
    // Clean up the response - remove any markdown formatting or extra text
    let cleanResponse = response.trim()

    // Look for JSON in the response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanResponse = jsonMatch[0]
    }

    const parsed = JSON.parse(cleanResponse)

    // Validate the response structure
    if (!parsed.type || !['order', 'estimate', 'other'].includes(parsed.type)) {
      throw new Error('Invalid classification type in AI response')
    }

    const confidence = typeof parsed.confidence === 'number' ?
      Math.max(0, Math.min(1, parsed.confidence)) : 0.5

    return {
      type: parsed.type as 'order' | 'estimate' | 'other',
      confidence,
      reasoning: parsed.reasoning || 'AI classification completed'
    }

  } catch (error) {
    // If parsing fails, try to extract type from text
    const lowerResponse = response.toLowerCase()

    if (lowerResponse.includes('order') && !lowerResponse.includes('estimate')) {
      return {
        type: 'order',
        confidence: 0.6,
        reasoning: 'AI response contained "order" keyword'
      }
    } else if (lowerResponse.includes('estimate') || lowerResponse.includes('quote')) {
      return {
        type: 'estimate',
        confidence: 0.6,
        reasoning: 'AI response contained estimate/quote keywords'
      }
    } else {
      return {
        type: 'other',
        confidence: 0.3,
        reasoning: `Could not parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Helper function to check if an email should be processed or blacklisted
export async function checkWhitelistStatus(email: Email, settings: Settings): Promise<'inbox' | 'unsorted' | 'skip'> {
  try {
    const senderEmail = email.senderEmail?.toLowerCase() || ''

    // Use optimized rule maps if available (from optimized processing)
    const whitelistMap = (settings as any)._whitelistMap
    const blacklistMap = (settings as any)._blacklistMap

    if (whitelistMap && blacklistMap) {
      // Fast O(1) lookup using pre-loaded maps
      if (blacklistMap.has(senderEmail)) {
        await addLog('info', `  ${senderEmail} matched blacklist rule - skipping email`)
        return 'skip'
      }
      if (whitelistMap.has(senderEmail)) {
        await addLog('info', `  ${senderEmail} matched whitelist rule - adding to inbox`)
        return 'inbox'
      }
      await addLog('info', `  ${senderEmail} no rules matched - marking as unsorted`)
      return 'unsorted'
    }

    // Fallback to database lookup if maps not available
    const { getRules } = await import('../lib/data-store')
    const rules = await getRules()

    // Check for exact matches first
    for (const rule of rules) {
      if (rule.pattern.toLowerCase() === senderEmail) {
        if (rule.type === 'whitelist') {
          await addLog('info', `  ${senderEmail} matched whitelist rule: ${rule.pattern} - adding to inbox`)
          return 'inbox'
        } else if (rule.type === 'blacklist') {
          await addLog('info', `  ${senderEmail} matched blacklist rule: ${rule.pattern} - skipping email`)
          return 'skip' // Return 'skip' to indicate this email should not be processed
        }
      }
    }

    // Check for pattern matches (contains)
    for (const rule of rules) {
      if (senderEmail.includes(rule.pattern.toLowerCase()) || rule.pattern.toLowerCase().includes(senderEmail)) {
        if (rule.type === 'whitelist') {
          await addLog('info', `  ${senderEmail} matched whitelist pattern: ${rule.pattern} - adding to inbox`)
          return 'inbox'
        } else if (rule.type === 'blacklist') {
          await addLog('info', `  ${senderEmail} matched blacklist pattern: ${rule.pattern} - skipping email`)
          return 'skip' // Return 'skip' to indicate this email should not be processed
        }
      }
    }

    // Default: put emails without rules in unsorted (so they appear in unsorted list)
    await addLog('info', `  ${senderEmail} has no matching rules, defaulting to unsorted`)
    return 'unsorted'
  } catch (error) {
    await addLog('error', `Whitelist check error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return 'unsorted' // Default to unsorted instead of inbox so emails appear in unsorted list
  }
}

// Function to process email classification and update the email
export async function processEmailClassification(email: Email, settings: Settings): Promise<Email | null> {
  try {
    // Check whitelist/blacklist status
    const classification = await checkWhitelistStatus(email, settings)

    // Skip blacklisted emails entirely - don't store them
    if (classification === 'skip') {
      await addLog('info', `  Skipping blacklisted email from ${email.senderEmail}`)
      return null // Return null to indicate this email should not be stored
    }

    // Only classify content if email is inbox or unsorted (not blacklisted)
    let parsed = email.parsed
    if (classification === 'inbox' || classification === 'unsorted') {
      const classificationResult = await classifyEmail(email, settings)
      parsed = {
        type: classificationResult.type,
        data: null,
        confidence: classificationResult.confidence
      }
    }

    return {
      ...email,
      classification,
      parsed,
      status: 'processed'
    }
  } catch (error) {
    await addLog('error', `Email processing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      ...email,
      classification: 'unsorted', // Default to unsorted on error
      status: 'error'
    }
  }
}
