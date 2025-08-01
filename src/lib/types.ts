export interface Log {
  id: string
  level: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
}

export interface Email {
  id: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  attachments?: Attachment[]
  parsed?: ParsedData
  status: 'unprocessed' | 'processing' | 'processed' | 'error'
  classification?: 'inbox' | 'whitelist' | 'blacklist' | 'pending'
  senderEmail?: string // Extracted email address for whitelist/blacklist
}

export interface Attachment {
  filename: string
  contentType: string
  size: number
  data: Buffer | string
}

export interface ParsedData {
  type: 'order' | 'estimate' | 'other'
  data: any
  confidence: number
}

export interface Rule {
  id: string
  type: 'whitelist' | 'blacklist'
  pattern: string
  description?: string
  active: boolean
}

export interface Settings {
  imapServer: string
  port: number
  useSSL: boolean
  username: string
  password: string
  pollingInterval: number
  startDate?: Date
  endDate?: Date
  maxAttachmentSize: number
  useGoogleDrive: boolean
  storagePath: string
  googleDriveFolderId?: string
  parsingSchema?: string
  useAiProcessing: boolean
  aiProvider: 'google' | 'ollama'
  googleApiKey?: string
  // Google Drive OAuth credentials
  googleClientId?: string
  googleClientSecret?: string
  googleRedirectUri?: string
  // Google Drive OAuth fields
  googleDriveTokens?: any
  googleDriveConnected?: boolean
  googleDriveUserEmail?: string
  // AI Classification settings
  orderKeywords?: string
  estimateKeywords?: string
  classificationInstructions?: string
  // Archive cleanup settings
  autoCleanupEnabled?: boolean
  cleanupFrequency?: 'daily' | 'weekly' | 'monthly'
  cleanupRetentionDays?: number
}

export interface ProcessEmailsResult {
  processedCount: number
  errors: string[]
}