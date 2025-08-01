import { NextRequest, NextResponse } from 'next/server'
import { Settings } from '@/lib/types'
import { addLog, getRules } from '@/lib/data-store'
import { processEmails } from '@/services/email-service'

export async function POST(request: NextRequest) {
  try {
    const settings: Settings = await request.json()
    
    await addLog('info', '=== Starting Optimized Email Processing ===')
    
    // Pre-load rules for faster processing
    const rules = await getRules()
    const whitelistRules = rules.filter(rule => rule.type === 'whitelist' && rule.active)
    const blacklistRules = rules.filter(rule => rule.type === 'blacklist' && rule.active)
    
    await addLog('info', `Loaded ${whitelistRules.length} whitelist rules and ${blacklistRules.length} blacklist rules`)
    
    // Create lookup maps for O(1) rule checking
    const whitelistMap = new Set(whitelistRules.map(rule => rule.pattern.toLowerCase()))
    const blacklistMap = new Set(blacklistRules.map(rule => rule.pattern.toLowerCase()))
    
    await addLog('info', `Whitelist patterns: ${Array.from(whitelistMap).slice(0, 5).join(', ')}${whitelistMap.size > 5 ? '...' : ''}`)
    await addLog('info', `Blacklist patterns: ${Array.from(blacklistMap).slice(0, 5).join(', ')}${blacklistMap.size > 5 ? '...' : ''}`)
    
    // Add rule maps to settings for faster processing
    const optimizedSettings = {
      ...settings,
      _whitelistMap: whitelistMap,
      _blacklistMap: blacklistMap
    }
    
    // Process emails with optimized settings
    const result = await processEmails(optimizedSettings)
    
    await addLog('info', `Optimized processing completed: ${result.processedCount} emails processed`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await addLog('error', `Optimized email processing failed: ${errorMessage}`)
    
    return NextResponse.json({
      error: errorMessage,
      processedCount: 0,
      errors: [errorMessage]
    }, { status: 500 })
  }
}
