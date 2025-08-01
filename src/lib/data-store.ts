import { Log, Email, Rule, Settings } from './types'

// In-memory storage for logs (temporary)
let logs: Log[] = [
  {
    id: '1',
    level: 'info',
    message: 'ParseFlow application started - ready for production email processing',
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    level: 'info',
    message: 'Configure your email settings in the Settings tab to begin processing emails',
    timestamp: new Date().toISOString()
  }
]

// Persistent storage variables
let emails: Email[] = []
let rules: Rule[] = []
let settings: Settings | null = null

// Flags to track if data has been loaded from files
let rulesLoaded = false
let emailsLoaded = false

// Function to reset loaded flags (useful for testing or reloading)
export function resetLoadedFlags(): void {
  rulesLoaded = false
  emailsLoaded = false
}

// Unique ID generator to avoid duplicate keys
let idCounter = 0
function generateUniqueId(): string {
  return `${Date.now()}-${++idCounter}-${Math.random().toString(36).substr(2, 9)}`
}

// Logs
export async function getLogs(): Promise<Log[]> {
  return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function addLog(level: Log['level'], message: string): Promise<void> {
  const log: Log = {
    id: generateUniqueId(),
    level,
    message,
    timestamp: new Date().toISOString()
  }
  logs.unshift(log)
  
  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs = logs.slice(0, 1000)
  }
}

export async function archiveAllLogs(): Promise<void> {
  logs = []
}

// Emails
export async function getEmails(): Promise<Email[]> {
  // Load emails from file if not already loaded
  if (!emailsLoaded) {
    try {
      const { loadEmailsFromFile } = await import('./server-storage')
      emails = await loadEmailsFromFile()
      emailsLoaded = true
    } catch (error) {
      console.error('Failed to load emails from file:', error)
      // Continue with empty emails array
    }
  }
  
  return [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getEmailsByType(type: 'order' | 'estimate' | 'other'): Promise<Email[]> {
  return emails.filter(email => email.parsed?.type === type)
}

export async function addEmail(email: Omit<Email, 'id'>): Promise<Email> {
  // Ensure emails are loaded first
  await getEmails()
  
  const newEmail: Email = {
    ...email,
    id: generateUniqueId()
  }
  emails.push(newEmail)
  
  // Save to file
  try {
    const { saveEmailsToFile } = await import('./server-storage')
    await saveEmailsToFile(emails)
  } catch (error) {
    console.error('Failed to save emails to file:', error)
    // Don't throw error for email saving to avoid breaking email processing
  }
  
  return newEmail
}

export async function updateEmail(id: string, updates: Partial<Email>): Promise<Email | null> {
  // Ensure emails are loaded first
  await getEmails()
  
  const index = emails.findIndex(email => email.id === id)
  if (index === -1) return null

  emails[index] = { ...emails[index], ...updates }
  
  // Save to file
  try {
    const { saveEmailsToFile } = await import('./server-storage')
    await saveEmailsToFile(emails)
  } catch (error) {
    console.error('Failed to save emails to file:', error)
    // Don't throw error for email saving to avoid breaking email processing
  }
  
  return emails[index]
}

export async function deleteEmail(id: string): Promise<boolean> {
  // Ensure emails are loaded first
  await getEmails()
  
  const index = emails.findIndex(email => email.id === id)
  if (index === -1) return false

  emails.splice(index, 1)
  
  // Save to file
  try {
    const { saveEmailsToFile } = await import('./server-storage')
    await saveEmailsToFile(emails)
  } catch (error) {
    console.error('Failed to save emails to file:', error)
    // Don't throw error for email saving to avoid breaking email processing
  }
  
  return true
}

export async function bulkUpdateEmails(updates: Array<{ id: string } & Partial<Email>>): Promise<number> {
  // Ensure emails are loaded first
  await getEmails()
  
  let updatedCount = 0
  
  for (const update of updates) {
    const index = emails.findIndex(email => email.id === update.id)
    if (index !== -1) {
      const { id, ...updateData } = update
      emails[index] = { ...emails[index], ...updateData }
      updatedCount++
    }
  }
  
  if (updatedCount > 0) {
    // Save to file
    try {
      const { saveEmailsToFile } = await import('./server-storage')
      await saveEmailsToFile(emails)
    } catch (error) {
      console.error('Failed to save emails to file:', error)
      // Don't throw error for email saving to avoid breaking email processing
    }
  }
  
  return updatedCount
}

export async function bulkDeleteEmails(ids: string[]): Promise<number> {
  // Ensure emails are loaded first
  await getEmails()
  
  const initialLength = emails.length
  emails = emails.filter(email => !ids.includes(email.id))
  const deletedCount = initialLength - emails.length
  
  if (deletedCount > 0) {
    // Save to file
    try {
      const { saveEmailsToFile } = await import('./server-storage')
      await saveEmailsToFile(emails)
    } catch (error) {
      console.error('Failed to save emails to file:', error)
      // Don't throw error for email saving to avoid breaking email processing
    }
  }
  
  return deletedCount
}

// Rules
export async function getRules(type?: 'whitelist' | 'blacklist'): Promise<Rule[]> {
  // Load rules from file if not already loaded
  if (!rulesLoaded) {
    try {
      const { loadRulesFromFile } = await import('./server-storage')
      rules = await loadRulesFromFile()
      rulesLoaded = true
    } catch (error) {
      console.error('Failed to load rules from file:', error)
      // Continue with empty rules array
    }
  }
  
  if (type) {
    return rules.filter(rule => rule.type === type)
  }
  return [...rules]
}

export async function addRule(rule: Omit<Rule, 'id'>): Promise<Rule> {
  // Ensure rules are loaded first
  await getRules()
  
  const newRule: Rule = {
    ...rule,
    id: generateUniqueId()
  }
  rules.push(newRule)
  
  // Save to file
  try {
    const { saveRulesToFile } = await import('./server-storage')
    await saveRulesToFile(rules)
    console.log(`Successfully persisted rule: ${newRule.type} - ${newRule.pattern}`)
  } catch (error) {
    console.error('Failed to save rules to file:', error)
    throw new Error('Failed to persist rule')
  }
  
  await addLog('info', `Added ${rule.type} rule: ${rule.pattern}`)
  return newRule
}

export async function updateRule(id: string, updates: Partial<Rule>): Promise<Rule | null> {
  // Ensure rules are loaded first
  await getRules()
  
  const index = rules.findIndex(rule => rule.id === id)
  if (index === -1) return null
  
  rules[index] = { ...rules[index], ...updates }
  
  // Save to file
  try {
    const { saveRulesToFile } = await import('./server-storage')
    await saveRulesToFile(rules)
  } catch (error) {
    console.error('Failed to save rules to file:', error)
    throw new Error('Failed to persist rule update')
  }
  
  await addLog('info', `Updated rule: ${rules[index].pattern}`)
  return rules[index]
}

export async function deleteRule(id: string): Promise<boolean> {
  // Ensure rules are loaded first
  await getRules()
  
  const index = rules.findIndex(rule => rule.id === id)
  if (index === -1) return false
  
  const rule = rules[index]
  rules.splice(index, 1)
  
  // Save to file
  try {
    const { saveRulesToFile } = await import('./server-storage')
    await saveRulesToFile(rules)
  } catch (error) {
    console.error('Failed to save rules to file:', error)
    throw new Error('Failed to persist rule deletion')
  }
  
  await addLog('info', `Deleted rule: ${rule.pattern}`)
  return true
}

// Settings
export async function getSettings(): Promise<Settings | null> {
  console.log('getSettings called, current settings:', settings ? { ...settings, password: '[HIDDEN]' } : null)

  // If settings is null, try to load from file as fallback (server-side only)
  // Note: This is handled by the API routes instead to avoid client-side bundling issues

  return settings
}

export async function saveSettings(newSettings: Settings): Promise<void> {
  console.log('saveSettings called with:', { ...newSettings, password: '[HIDDEN]' })
  settings = { ...newSettings }
  console.log('Settings saved in memory')
  await addLog('info', `Settings updated for IMAP server: ${newSettings.imapServer}`)
}