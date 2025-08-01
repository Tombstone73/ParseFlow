// Server-only storage utilities
import { promises as fs } from 'fs'
import path from 'path'
import { Settings, Rule, Email } from './types'

// File paths for persistence
const DATA_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const RULES_FILE = path.join(DATA_DIR, 'rules.json')
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Load settings from file
export async function loadSettingsFromFile(): Promise<Settings | null> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(fileContent)
    console.log('Loaded settings from file:', { ...settings, password: '[HIDDEN]' })
    return settings
  } catch (error) {
    console.log('No settings file found or failed to load')
    return null
  }
}

// Save settings to file
export async function saveSettingsToFile(settings: Settings): Promise<void> {
  try {
    await ensureDataDir()
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    console.log('Settings saved to file successfully')
  } catch (error) {
    console.error('Failed to save settings to file:', error)
    throw new Error('Failed to save settings')
  }
}

// Load rules from file
export async function loadRulesFromFile(): Promise<Rule[]> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(RULES_FILE, 'utf-8')
    const rules = JSON.parse(fileContent)
    console.log(`Loaded ${rules.length} rules from file`)
    return rules
  } catch (error) {
    console.log('No rules file found or failed to load, starting with empty rules')
    return []
  }
}

// Save rules to file
export async function saveRulesToFile(rules: Rule[]): Promise<void> {
  try {
    await ensureDataDir()
    await fs.writeFile(RULES_FILE, JSON.stringify(rules, null, 2))
    console.log(`Saved ${rules.length} rules to file successfully`)
  } catch (error) {
    console.error('Failed to save rules to file:', error)
    throw new Error('Failed to save rules')
  }
}

// Load emails from file
export async function loadEmailsFromFile(): Promise<Email[]> {
  try {
    await ensureDataDir()
    const fileContent = await fs.readFile(EMAILS_FILE, 'utf-8')
    const emails = JSON.parse(fileContent)
    console.log(`Loaded ${emails.length} emails from file`)
    return emails
  } catch (error) {
    console.log('No emails file found or failed to load, starting with empty emails')
    return []
  }
}

// Save emails to file
export async function saveEmailsToFile(emails: Email[]): Promise<void> {
  try {
    await ensureDataDir()
    await fs.writeFile(EMAILS_FILE, JSON.stringify(emails, null, 2))
    console.log(`Saved ${emails.length} emails to file successfully`)
  } catch (error) {
    console.error('Failed to save emails to file:', error)
    throw new Error('Failed to save emails')
  }
}