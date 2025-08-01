import { NextRequest, NextResponse } from 'next/server'
import { getEmails, updateEmail, getRules, addLog } from '@/lib/data-store'

export async function POST(request: NextRequest) {
  try {
    await addLog('info', 'Starting email re-classification based on current rules')
    
    // Get all emails and rules
    const emails = await getEmails()
    const rules = await getRules()

    await addLog('info', `Re-classification debug: Found ${emails.length} emails and ${rules.length} rules`)

    if (emails.length === 0) {
      await addLog('warning', 'No emails found to re-classify - this might indicate a data persistence issue')
      return NextResponse.json({
        message: 'No emails to re-classify',
        updated: 0
      })
    }
    
    // Create rule maps for efficient lookup
    const whitelistRules = rules.filter(rule => rule.type === 'whitelist')
    const blacklistRules = rules.filter(rule => rule.type === 'blacklist')
    
    await addLog('info', `Found ${whitelistRules.length} whitelist rules and ${blacklistRules.length} blacklist rules`)
    
    let updatedCount = 0
    const emailsToDelete = []
    
    for (const email of emails) {
      const senderEmail = email.senderEmail?.toLowerCase() || email.from.toLowerCase()
      let newClassification = email.classification
      let shouldDelete = false
      
      // Check blacklist rules first
      for (const rule of blacklistRules) {
        const pattern = rule.pattern.toLowerCase()
        if (senderEmail === pattern || senderEmail.includes(pattern) || pattern.includes(senderEmail)) {
          // Blacklisted emails should be deleted
          shouldDelete = true
          await addLog('info', `Email from ${senderEmail} matches blacklist rule: ${pattern} - marking for deletion`)
          break
        }
      }
      
      if (shouldDelete) {
        emailsToDelete.push(email.id)
        continue
      }
      
      // Check whitelist rules
      for (const rule of whitelistRules) {
        const pattern = rule.pattern.toLowerCase()
        if (senderEmail === pattern || senderEmail.includes(pattern) || pattern.includes(senderEmail)) {
          newClassification = 'inbox'
          await addLog('info', `Email from ${senderEmail} matches whitelist rule: ${pattern} - moving to inbox`)
          break
        }
      }
      
      // If no rules matched, set to unsorted
      if (newClassification === email.classification && !shouldDelete) {
        // Check if it should be unsorted (no rules matched)
        let hasMatchingRule = false
        for (const rule of [...whitelistRules, ...blacklistRules]) {
          const pattern = rule.pattern.toLowerCase()
          if (senderEmail === pattern || senderEmail.includes(pattern) || pattern.includes(senderEmail)) {
            hasMatchingRule = true
            break
          }
        }
        
        if (!hasMatchingRule && email.classification !== 'unsorted') {
          newClassification = 'unsorted'
          await addLog('info', `Email from ${senderEmail} has no matching rules - moving to unsorted`)
        }
      }
      
      // Update email if classification changed
      if (newClassification !== email.classification) {
        await updateEmail(email.id, { classification: newClassification })
        updatedCount++
      }
    }
    
    // Delete blacklisted emails
    if (emailsToDelete.length > 0) {
      const { deleteEmail } = await import('@/lib/data-store')
      for (const emailId of emailsToDelete) {
        await deleteEmail(emailId)
      }
      await addLog('info', `Deleted ${emailsToDelete.length} blacklisted emails`)
    }
    
    await addLog('info', `Email re-classification complete: ${updatedCount} emails updated, ${emailsToDelete.length} emails deleted`)
    
    return NextResponse.json({
      message: 'Email re-classification complete',
      updated: updatedCount,
      deleted: emailsToDelete.length,
      total: emails.length
    })
    
  } catch (error) {
    console.error('Email re-classification error:', error)
    await addLog('error', `Email re-classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      { error: 'Failed to re-classify emails' },
      { status: 500 }
    )
  }
}
