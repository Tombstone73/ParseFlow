"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { UserCheck, UserX, Mail, ArrowRight, ArrowLeft, Plus, Search, Download, X, RefreshCw, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { logInfo, logError } from '@/lib/client-logger'

interface EmailAddress {
  email: string
  status: 'whitelist' | 'blacklist' | 'unsorted'
  emailCount: number
  lastSeen: string
}

interface FetchedEmailAddress {
  email: string
  name: string
  count: number
  lastSeen: string
  firstSeen: string
  emails: Array<{
    subject: string
    date: Date
    name: string
  }>
}

export function EmailAddressManager() {
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('email-addresses')
      console.log('Loading email addresses from localStorage:', saved ? 'found' : 'not found')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          console.log('Parsed email addresses:', parsed.length, 'addresses')
          return parsed
        } catch (e) {
          console.warn('Failed to parse saved email addresses:', e)
        }
      }
    }
    console.log('No saved email addresses found, starting with empty array')
    return []
  })
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false)
  const [fetchedAddresses, setFetchedAddresses] = useState<FetchedEmailAddress[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fetched-addresses')
      console.log('Loading fetched addresses from localStorage:', saved ? 'found' : 'not found')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          console.log('Parsed fetched addresses:', parsed.length, 'addresses')
          return parsed
        } catch (e) {
          console.warn('Failed to parse saved fetched addresses:', e)
        }
      }
    }
    console.log('No saved fetched addresses found, starting with empty array')
    return []
  })
  const [showFetchedAddresses, setShowFetchedAddresses] = useState(false)

  // Panel sizing state with localStorage persistence
  const [panelSizes, setPanelSizes] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('email-panel-sizes')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.warn('Failed to parse saved panel sizes:', e)
        }
      }
    }
    return {
      whitelistWidth: 50, // percentage
      blacklistWidth: 50, // percentage
      unsortedHeight: 400, // pixels
      whitelistHeight: 320, // pixels
      blacklistHeight: 320, // pixels
    }
  })

  // Scroll position preservation
  const scrollRefs = useRef<{[key: string]: HTMLDivElement | null}>({})
  const scrollPositions = useRef<{[key: string]: number}>({})

  const preserveScrollPosition = (key: string) => {
    if (scrollRefs.current[key]) {
      scrollPositions.current[key] = scrollRefs.current[key]!.scrollTop
    }
  }

  const restoreScrollPosition = (key: string) => {
    if (scrollRefs.current[key] && scrollPositions.current[key] !== undefined) {
      setTimeout(() => {
        scrollRefs.current[key]!.scrollTop = scrollPositions.current[key]
      }, 0)
    }
  }

  // Save panel sizes to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('email-panel-sizes', JSON.stringify(panelSizes))
    }
  }, [panelSizes])

  // Save email addresses to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('email-addresses', JSON.stringify(emailAddresses))
      console.log('Saved email addresses to localStorage:', emailAddresses.length)
    }
  }, [emailAddresses])

  // Save fetched addresses to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fetched-addresses', JSON.stringify(fetchedAddresses))
      console.log('Saved fetched addresses to localStorage:', fetchedAddresses.length)
    }
  }, [fetchedAddresses])

  const { toast } = useToast()

  // Auto-save helper function to ensure all email changes are persisted
  const autoSaveEmailChanges = async (emailAddresses: string[], action: 'whitelist' | 'blacklist' | 'unsorted') => {
    try {
      // Get all emails from the database
      const emailsResponse = await fetch('/api/emails')
      const emailsData = await emailsResponse.json()

      if (emailsResponse.ok && emailsData.emails) {
        const emailsToUpdate = emailsData.emails.filter((email: any) => {
          const senderEmail = email.senderEmail || extractEmailFromString(email.from)
          return emailAddresses.some(addr =>
            addr.toLowerCase() === senderEmail?.toLowerCase()
          )
        })

        if (emailsToUpdate.length > 0) {
          let updates: any[] = []

          if (action === 'whitelist') {
            // Move to inbox for whitelisted emails
            updates = emailsToUpdate.map((email: any) => ({
              id: email.id,
              classification: 'inbox'
            }))
          } else if (action === 'blacklist') {
            // Delete blacklisted emails
            const emailIds = emailsToUpdate.map((email: any) => email.id)
            const deleteResponse = await fetch('/api/emails', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bulk: true, ids: emailIds })
            })
            if (!deleteResponse.ok) {
              console.error('Failed to delete blacklisted emails')
            }
            return // No need to update if we're deleting
          } else if (action === 'unsorted') {
            // Move to unsorted classification
            updates = emailsToUpdate.map((email: any) => ({
              id: email.id,
              classification: 'unsorted'
            }))
          }

          if (updates.length > 0) {
            const updateResponse = await fetch('/api/emails', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bulk: true, updates })
            })

            if (!updateResponse.ok) {
              console.error(`Failed to auto-save email classifications for ${action}`)
            } else {
              // Log the successful update
              await logInfo(`✅ Updated ${updates.length} email classifications to ${action}`)
            }
          }
        }
      }

      // Note: No forced reload to prevent page flashing

    } catch (error) {
      console.error('Auto-save email changes error:', error)
      await logError(`Failed to auto-save email changes: ${error}`)
    }
  }

  // Function to reload data from localStorage
  const reloadFromLocalStorage = () => {
    console.log('Reloading data from localStorage...')

    // Reload email addresses
    const savedAddresses = localStorage.getItem('email-addresses')
    if (savedAddresses) {
      try {
        const parsed = JSON.parse(savedAddresses)
        console.log('Reloaded email addresses:', parsed.length)
        setEmailAddresses(parsed)
      } catch (e) {
        console.warn('Failed to reload email addresses:', e)
      }
    }

    // Reload fetched addresses
    const savedFetched = localStorage.getItem('fetched-addresses')
    if (savedFetched) {
      try {
        const parsed = JSON.parse(savedFetched)
        console.log('Reloaded fetched addresses:', parsed.length)
        setFetchedAddresses(parsed)
        setShowFetchedAddresses(parsed.length > 0)
      } catch (e) {
        console.warn('Failed to reload fetched addresses:', e)
      }
    }
  }

  // Load data on component mount
  useEffect(() => {
    console.log('EmailAddressManager mounted, loading data...')
    reloadFromLocalStorage()
    loadEmailAddresses()
    // Log when the email management page loads
    logInfo('Email Address Manager page loaded')
  }, [])

  console.log('EmailAddressManager rendering with', emailAddresses.length, 'addresses')

  const loadEmailAddresses = async () => {
    setIsLoading(true)
    try {
      console.log('Loading email addresses...')

      // Get emails first
      const emailsResponse = await fetch('/api/emails')
      let emailsData: any = { emails: [] }

      if (emailsResponse.ok) {
        try {
          emailsData = await emailsResponse.json()
        } catch (parseError) {
          console.error('Failed to parse emails response:', parseError)
          emailsData = { emails: [] }
        }
      }

      // Get rules
      const rulesResponse = await fetch('/api/rules')
      let rulesData: any = { rules: [] }

      if (rulesResponse.ok) {
        try {
          rulesData = await rulesResponse.json()
        } catch (parseError) {
          console.error('Failed to parse rules response:', parseError)
          rulesData = { rules: [] }
        }
      }

      console.log('Loaded', emailsData.emails?.length || 0, 'emails and', rulesData.rules?.length || 0, 'rules')

      const emailMap = new Map<string, EmailAddress>()
      const rules = rulesData.rules || []

      // Create a map of email patterns to rule types for quick lookup
      const ruleMap = new Map<string, 'whitelist' | 'blacklist'>()
      rules.forEach((rule: any) => {
        if (rule.type === 'whitelist' || rule.type === 'blacklist') {
          ruleMap.set(rule.pattern.toLowerCase(), rule.type)
        }
      })

      const emails = emailsData.emails || []
      emails.forEach((email: any) => {
        const senderEmail = email.senderEmail || extractEmailFromString(email.from)
        if (senderEmail) {
          const normalizedEmail = senderEmail.toLowerCase()
          const existing = emailMap.get(normalizedEmail)

          if (existing) {
            existing.emailCount++
            if (new Date(email.date) > new Date(existing.lastSeen)) {
              existing.lastSeen = email.date
            }
          } else {
            // Determine status based on rules first, then email classification
            let status: 'whitelist' | 'blacklist' | 'unsorted' = 'unsorted'

            // Check exact match first
            if (ruleMap.has(normalizedEmail)) {
              status = ruleMap.get(normalizedEmail)!
            } else {
              // Check pattern matches (simple contains check for now)
              for (const [pattern, type] of ruleMap.entries()) {
                if (normalizedEmail.includes(pattern) || pattern.includes(normalizedEmail)) {
                  status = type
                  break
                }
              }
            }

            // If no rule found, check email classification
            if (status === 'unsorted') {
              if (email.classification === 'inbox') {
                status = 'whitelist' // Emails with inbox classification are whitelisted
              } else if (email.classification === 'unsorted') {
                status = 'unsorted' // Emails with unsorted classification remain unsorted
              }
              // Blacklisted emails should not appear in the list at all (they're skipped during fetch)
            }

            emailMap.set(normalizedEmail, {
              email: senderEmail, // Keep original case
              status,
              emailCount: 1,
              lastSeen: email.date
            })
          }
        }
      })

      const addresses = Array.from(emailMap.values()).sort((a, b) =>
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      )

      console.log('Processed', addresses.length, 'unique email addresses')
      setEmailAddresses(addresses)

    } catch (error) {
      console.error('Failed to load email addresses:', error)
      setEmailAddresses([])
    } finally {
      setIsLoading(false)
    }
  }

  // Remove duplicate useEffect - already handled in the mount effect above

  const reclassifyAllEmails = async () => {
    try {
      toast({
        title: "Re-classifying Emails",
        description: "Applying current rules to all emails...",
      })

      const response = await fetch('/api/emails/reclassify', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Re-classification Complete",
          description: `Updated ${result.updated} emails, deleted ${result.deleted} blacklisted emails`,
        })

        // Reload the email addresses to reflect changes
        await loadEmailAddresses()
      } else {
        const error = await response.json()
        toast({
          title: "Re-classification Failed",
          description: error.error || 'Unknown error',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Re-classification error:', error)
      toast({
        title: "Re-classification Error",
        description: 'Failed to re-classify emails',
        variant: "destructive"
      })
    }
  }

  const fetchEmailAddresses = async () => {
    setIsFetchingAddresses(true)

    // Log the start of email fetching
    await logInfo('User initiated email address fetch from IMAP server')

    try {
      toast({
        title: "Processing Emails",
        description: "Fetching and processing emails from IMAP server...",
      })

      // Get current settings
      const settingsResponse = await fetch('/api/settings')
      if (!settingsResponse.ok) {
        throw new Error('Failed to load settings')
      }
      const settingsData = await settingsResponse.json()

      // Extract settings from the response (API returns { settings: ... })
      const settings = settingsData.settings || settingsData

      console.log('Fetched settings for address fetch:', {
        imapServer: settings?.imapServer,
        username: settings?.username ? '[SET]' : '[MISSING]',
        password: settings?.password ? '[SET]' : '[MISSING]',
        port: settings?.port,
        useSSL: settings?.useSSL
      })

      // Validate that we have the required settings
      if (!settings || !settings.imapServer || !settings.username || !settings.password) {
        throw new Error('Missing required IMAP settings. Please configure your email settings first.')
      }

      // Fetch and process full emails (not just addresses)
      const response = await fetch('/api/email/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const result = await response.json()

      if (response.ok && result.processedCount !== undefined) {
        console.log('Email processing result:', result)

        // Hide the fetched addresses panel since we're now using full processing
        setShowFetchedAddresses(false)
        setFetchedAddresses([])

        // Reload the email addresses to show the newly processed emails
        await loadEmailAddresses()

        toast({
          title: "Email Processing Complete!",
          description: `Processed ${result.processedCount} emails. Check the categorized sections below.`,
        })
      } else {
        throw new Error(result.error || 'Failed to process emails')
      }
    } catch (error) {
      toast({
        title: "Email Processing Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing emails.",
        variant: "destructive"
      })
    } finally {
      setIsFetchingAddresses(false)
    }
  }

  const addAddressesToRules = async (addresses: string[], ruleType: 'whitelist' | 'blacklist') => {
    try {
      // Log rule creation activity
      await logInfo(`User creating ${ruleType} rules for ${addresses.length} addresses: ${addresses.join(', ')}`)

      toast({
        title: `Adding to ${ruleType}`,
        description: `Adding ${addresses.length} addresses to ${ruleType}...`,
      })

      // Create rules for each address with better error handling
      const rulePromises = addresses.map(async (email) => {
        try {
          const response = await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: ruleType,
              pattern: email.toLowerCase(),
              description: `Auto-created from address fetch for ${email}`
            })
          })
          
          if (!response.ok) {
            const error = await response.json()
            console.error(`Failed to create rule for ${email}:`, error)
            throw new Error(`Failed to create rule for ${email}: ${error.error}`)
          }
          
          const result = await response.json()
          console.log(`Successfully created ${ruleType} rule for ${email}:`, result)
          return result
        } catch (error) {
          console.error(`Error creating rule for ${email}:`, error)
          throw error
        }
      })

      const ruleResults = await Promise.all(rulePromises)
      console.log(`Created ${ruleResults.length} ${ruleType} rules successfully`)

      // Re-classify all emails to apply the new rules
      console.log('Starting email reclassification...')
      const reclassifyResponse = await fetch('/api/emails/reclassify', {
        method: 'POST'
      })

      if (reclassifyResponse.ok) {
        const result = await reclassifyResponse.json()
        console.log('Reclassification result:', result)
        await logInfo(`Re-classification complete: ${result.updated} emails updated, ${result.deleted} emails deleted`)
      } else {
        const error = await reclassifyResponse.json()
        console.error('Reclassification failed:', error)
        await logInfo(`Re-classification failed: ${error.error || 'Unknown error'}`)
      }

      // Verify rules were persisted by fetching them
      console.log('Verifying rules were persisted...')
      const verifyResponse = await fetch(`/api/rules?type=${ruleType}`)
      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json()
        const persistedRules = verifyResult.rules || []
        const persistedPatterns = persistedRules.map((rule: any) => rule.pattern)
        const expectedPatterns = addresses.map(addr => addr.toLowerCase())
        
        const allPersisted = expectedPatterns.every(pattern => persistedPatterns.includes(pattern))
        console.log('Rule persistence verification:', {
          expected: expectedPatterns,
          persisted: persistedPatterns,
          allPersisted
        })
        
        if (!allPersisted) {
          console.warn('Some rules may not have been persisted correctly')
        }
      }

      toast({
        title: "Success!",
        description: `Added ${addresses.length} addresses to ${ruleType} and re-classified all emails.`,
      })

      // Update the email addresses state to reflect the new status
      setEmailAddresses(prev => {
        const updatedAddresses = prev.map(addr => {
          if (addresses.includes(addr.email)) {
            return { ...addr, status: ruleType }
          }
          return addr
        })

        // Add any new addresses that weren't in the list yet
        const existingEmails = new Set(prev.map(addr => addr.email))
        const newAddresses = addresses
          .filter(email => !existingEmails.has(email))
          .map(email => ({
            email,
            status: ruleType as 'whitelist' | 'blacklist' | 'unsorted',
            emailCount: 1,
            lastSeen: new Date().toISOString()
          }))

        return [...updatedAddresses, ...newAddresses]
      })

      // Refresh the email addresses to reflect the new classifications
      // Remove setTimeout to prevent unnecessary delays and potential race conditions
      await loadEmailAddresses()

    } catch (error) {
      console.error('Error adding addresses to rules:', error)
      toast({
        title: "Failed to Create Rules",
        description: error instanceof Error ? error.message : "An error occurred while creating rules.",
        variant: "destructive"
      })
      throw error // Re-throw so calling code knows it failed
    }
  }

  const extractEmailFromString = (fromString: string): string => {
    const match = fromString.match(/<([^>]+)>/)
    if (match) return match[1].toLowerCase()
    const emailMatch = fromString.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
    return emailMatch ? emailMatch[0].toLowerCase() : fromString.toLowerCase()
  }

  const cleanupInboxForBlacklistedSenders = async (blacklistedEmails: string[]) => {
    try {
      // Get all emails from blacklisted senders
      const response = await fetch('/api/emails')
      const data = await response.json()

      if (response.ok) {
        const emailsToUpdate = data.emails.filter((email: any) => {
          const senderEmail = email.senderEmail || extractEmailFromString(email.from)
          return blacklistedEmails.includes(senderEmail) && email.classification === 'inbox'
        })

        if (emailsToUpdate.length > 0) {
          // Update these emails to blacklist classification
          const updates = emailsToUpdate.map((email: any) => ({
            id: email.id,
            classification: 'blacklist'
          }))

          const updateResponse = await fetch('/api/emails', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bulk: true, updates })
          })

          if (updateResponse.ok) {
            toast({
              title: "Inbox Cleaned",
              description: `Removed ${emailsToUpdate.length} emails from blacklisted senders from inbox.`,
            })
          }
        }
      }
    } catch (error) {
      console.error('Inbox cleanup error:', error)
      toast({
        variant: "destructive",
        title: "Inbox Cleanup Failed",
        description: "Failed to remove blacklisted emails from inbox.",
      })
    }
  }

  const handleSelectEmail = (email: string, checked: boolean) => {
    // Preserve scroll positions before state change
    preserveScrollPosition('whitelist')
    preserveScrollPosition('blacklist')
    preserveScrollPosition('unsorted')

    const newSelected = new Set(selectedEmails)
    if (checked) {
      newSelected.add(email)
    } else {
      newSelected.delete(email)
    }
    setSelectedEmails(newSelected)

    // Restore scroll positions after state change
    setTimeout(() => {
      restoreScrollPosition('whitelist')
      restoreScrollPosition('blacklist')
      restoreScrollPosition('unsorted')
    }, 0)
  }

  const handleSelectAll = (status: 'whitelist' | 'blacklist' | 'unsorted', checked: boolean) => {
    const filteredEmails = getFilteredEmails(status)
    const newSelected = new Set(selectedEmails)
    
    if (checked) {
      filteredEmails.forEach(addr => newSelected.add(addr.email))
    } else {
      filteredEmails.forEach(addr => newSelected.delete(addr.email))
    }
    setSelectedEmails(newSelected)
  }

  const moveSelectedEmails = async (toStatus: 'whitelist' | 'blacklist' | 'unsorted') => {
    if (selectedEmails.size === 0) {
      toast({
        variant: "destructive",
        title: "No emails selected",
        description: "Please select email addresses to move.",
      })
      return
    }

    try {
      const selectedEmailsArray = Array.from(selectedEmails)

      if (toStatus === 'whitelist' || toStatus === 'blacklist') {
        // Create rules for the selected email addresses
        const rulePromises = selectedEmailsArray.map(async (email) => {
          const response = await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: toStatus,
              pattern: email.toLowerCase(),
              description: `Auto-created rule for ${email}`
            })
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to create rule for ${email}: ${error.error}`)
          }
          return response.json()
        })

        await Promise.all(rulePromises)

        // Update email classifications in the database
        const emailsResponse = await fetch('/api/emails')
        const emailsData = await emailsResponse.json()

        if (emailsResponse.ok && emailsData.emails) {
          const emailsToUpdate = emailsData.emails.filter((email: any) => {
            const senderEmail = email.senderEmail || extractEmailFromString(email.from)
            return selectedEmailsArray.some(selected =>
              selected.toLowerCase() === senderEmail?.toLowerCase()
            )
          })

          if (emailsToUpdate.length > 0) {
            if (toStatus === 'whitelist') {
              // Update emails to inbox classification for whitelist
              const updates = emailsToUpdate.map((email: any) => ({
                id: email.id,
                classification: 'inbox'
              }))

              const updateResponse = await fetch('/api/emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulk: true, updates })
              })

              if (!updateResponse.ok) {
                console.error('Failed to update email classifications')
              }
            } else if (toStatus === 'blacklist') {
              // Delete emails when moving to blacklist
              const emailIds = emailsToUpdate.map((email: any) => email.id)

              const deleteResponse = await fetch('/api/emails', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulk: true, ids: emailIds })
              })

              if (!deleteResponse.ok) {
                console.error('Failed to delete blacklisted emails')
              }
            }
          }
        }
      } else if (toStatus === 'unsorted') {
        // Remove existing rules for these email addresses
        const rulesResponse = await fetch('/api/rules')
        const rulesData = await rulesResponse.json()

        if (rulesResponse.ok && rulesData.rules) {
          const rulesToDelete = rulesData.rules.filter((rule: any) =>
            selectedEmailsArray.some(email =>
              rule.pattern.toLowerCase() === email.toLowerCase()
            )
          )

          const deletePromises = rulesToDelete.map(async (rule: any) => {
            const response = await fetch(`/api/rules/${rule.id}`, {
              method: 'DELETE'
            })
            if (!response.ok) {
              console.error(`Failed to delete rule ${rule.id}`)
            }
          })

          await Promise.all(deletePromises)
        }

        // Update emails from these senders to 'unsorted' classification
        const emailsResponse = await fetch('/api/emails')
        const emailsData = await emailsResponse.json()

        if (emailsResponse.ok && emailsData.emails) {
          const emailsToUpdate = emailsData.emails.filter((email: any) => {
            const senderEmail = email.senderEmail || extractEmailFromString(email.from)
            return selectedEmailsArray.some(selected =>
              selected.toLowerCase() === senderEmail?.toLowerCase()
            )
          })

          if (emailsToUpdate.length > 0) {
            const updates = emailsToUpdate.map((email: any) => ({
              id: email.id,
              classification: 'unsorted'
            }))

            const updateResponse = await fetch('/api/emails', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bulk: true, updates })
            })

            if (!updateResponse.ok) {
              console.error('Failed to update email classifications to unsorted')
            }
          }
        }
      }

      // Update local state immediately for UI responsiveness
      setEmailAddresses(prev => prev.map(addr =>
        selectedEmails.has(addr.email)
          ? { ...addr, status: toStatus }
          : addr
      ))

      // Save the email addresses to localStorage for persistence
      const updatedAddresses = emailAddresses.map(addr =>
        selectedEmails.has(addr.email)
          ? { ...addr, status: toStatus }
          : addr
      )
      localStorage.setItem('emailAddresses', JSON.stringify(updatedAddresses))

      // Log the successful update
      await logInfo(`✅ Moved ${selectedEmails.size} email addresses to ${toStatus}`)

      toast({
        title: "Email Addresses Updated",
        description: `${selectedEmails.size} email addresses moved to ${toStatus} and auto-saved.`,
      })

      setSelectedEmails(new Set())

      // If moving to blacklist, trigger inbox cleanup
      if (toStatus === 'blacklist') {
        await cleanupInboxForBlacklistedSenders(selectedEmailsArray)
      }

    } catch (error) {
      console.error('Move emails error:', error)
      toast({
        variant: "destructive",
        title: "Move Failed",
        description: error instanceof Error ? error.message : "Failed to move emails.",
      })
    }
  }

  const getFilteredEmails = (status: 'whitelist' | 'blacklist' | 'unsorted') => {
    return emailAddresses
      .filter(addr => addr.status === status)
      .filter(addr => 
        searchTerm === '' || 
        addr.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Component for displaying fetched email addresses with enhanced info
  const FetchedEmailItem = ({ addr, isSelected, onSelect }: {
    addr: FetchedEmailAddress,
    isSelected: boolean,
    onSelect: (checked: boolean) => void
  }) => {
    const latestEmail = addr.emails[0] // Most recent email
    const hasMultipleEmails = addr.emails.length > 1

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                isSelected && "bg-blue-50 border-blue-200"
              )}
              onClick={() => onSelect(!isSelected)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm">{addr.name}</div>
                  {hasMultipleEmails && (
                    <Badge variant="secondary" className="text-xs">
                      {addr.count} emails
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{addr.email}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  <span className="font-medium">Latest:</span> {latestEmail.subject}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last: {formatDate(addr.lastSeen)}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    addAddressesToRules([addr.email], 'whitelist')
                    setFetchedAddresses(prev => prev.filter(a => a.email !== addr.email))
                  }}
                  title="Add to Whitelist"
                >
                  <UserCheck className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    addAddressesToRules([addr.email], 'blacklist')
                    setFetchedAddresses(prev => prev.filter(a => a.email !== addr.email))
                  }}
                  title="Add to Blacklist"
                >
                  <UserX className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </div>
          </TooltipTrigger>
          {hasMultipleEmails && (
            <TooltipContent side="right" className="max-w-md">
              <div className="space-y-2">
                <div className="font-semibold text-sm">All emails from {addr.name}:</div>
                {addr.emails.slice(0, 5).map((email, index) => (
                  <div key={`${email.subject}-${email.date}-${index}`} className="text-xs border-l-2 border-gray-200 pl-2">
                    <div className="font-medium">{email.subject}</div>
                    <div className="text-muted-foreground">
                      {formatDate(email.date.toString())} • {email.name}
                    </div>
                  </div>
                ))}
                {addr.emails.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ... and {addr.emails.length - 5} more emails
                  </div>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Resizable Panel Component
  const ResizablePanel = ({
    children,
    height,
    onHeightChange,
    minHeight = 200,
    className = "",
    style = {}
  }: {
    children: React.ReactNode
    height: number
    onHeightChange: (height: number) => void
    minHeight?: number
    className?: string
    style?: React.CSSProperties
  }) => {
    const [isDragging, setIsDragging] = useState(false)
    const [startY, setStartY] = useState(0)
    const [startHeight, setStartHeight] = useState(0)

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true)
      setStartY(e.clientY)
      setStartHeight(height)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const deltaY = e.clientY - startY
      const newHeight = Math.max(minHeight, startHeight + deltaY)
      onHeightChange(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, startY, startHeight, height, onHeightChange, minHeight])

    return (
      <div className={`relative ${className}`} style={{ height: `${height}px`, ...style }}>
        {children}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-blue-500/40 bg-blue-500/20 transition-colors flex items-center justify-center group border-t-2 border-blue-500/30 hover:border-blue-500/60"
          onMouseDown={handleMouseDown}
          title="Drag to resize vertically"
        >
          <GripVertical className="h-4 w-4 text-blue-500/70 group-hover:text-blue-500 rotate-90" />
        </div>
      </div>
    )
  }

  const EmailList = ({
    title,
    status,
    icon,
    height
  }: {
    title: string
    status: 'whitelist' | 'blacklist' | 'unsorted'
    icon: React.ReactNode
    height?: number
  }) => {
    const filteredEmails = getFilteredEmails(status)
    const selectedCount = filteredEmails.filter(addr => selectedEmails.has(addr.email)).length
    const allSelected = filteredEmails.length > 0 && selectedCount === filteredEmails.length
    const someSelected = selectedCount > 0 && selectedCount < filteredEmails.length

    return (
      <Card className="flex flex-col" style={{ height: height ? `${height}px` : '320px' }}>
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <CardTitle className="text-sm">{title}</CardTitle>
                <CardDescription>{filteredEmails.length} addresses</CardDescription>
              </div>
            </div>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(status, checked as boolean)}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea
            className="h-full px-4"
            ref={(el) => {
              if (el) {
                const viewport = el.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
                if (viewport) {
                  scrollRefs.current[status] = viewport
                }
              }
            }}
          >
            {filteredEmails.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No email addresses
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {filteredEmails.map((addr) => (
                  <div
                    key={addr.email}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b"
                  >
                    <Checkbox
                      checked={selectedEmails.has(addr.email)}
                      onCheckedChange={(checked) => handleSelectEmail(addr.email, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {addr.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {addr.emailCount} emails • Last: {formatDate(addr.lastSeen)}
                      </div>
                    </div>
                    {/* Action buttons for unsorted emails */}
                    {status === 'unsorted' && (
                      <div className="flex gap-2 ml-2">
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white shadow-md"
                          onClick={async (e) => {
                            e.stopPropagation()
                            preserveScrollPosition('unsorted')
                            await addAddressesToRules([addr.email], 'whitelist')
                            restoreScrollPosition('unsorted')
                          }}
                          title="Add to Whitelist"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white shadow-md"
                          onClick={async (e) => {
                            e.stopPropagation()
                            preserveScrollPosition('unsorted')
                            await addAddressesToRules([addr.email], 'blacklist')
                            restoreScrollPosition('unsorted')
                          }}
                          title="Add to Blacklist"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // Horizontal Resizable Divider Component
  const HorizontalResizer = ({
    leftWidth,
    onWidthChange,
    minWidth = 20,
    maxWidth = 80
  }: {
    leftWidth: number
    onWidthChange: (width: number) => void
    minWidth?: number
    maxWidth?: number
  }) => {
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [startWidth, setStartWidth] = useState(0)

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true)
      setStartX(e.clientX)
      setStartWidth(leftWidth)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()

      // Get the container element more reliably
      const container = document.querySelector('.resizable-container')
      if (!container) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const deltaX = e.clientX - startX
      const containerWidth = containerRect.width
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaPercent))
      onWidthChange(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, startX, startWidth, leftWidth, onWidthChange, minWidth, maxWidth])

    return (
      <div
        className="w-4 cursor-ew-resize hover:bg-blue-500/40 bg-blue-500/20 transition-colors flex items-center justify-center group relative border-l-2 border-r-2 border-blue-500/30 hover:border-blue-500/60"
        onMouseDown={handleMouseDown}
        title="Drag to resize horizontally"
      >
        <GripVertical className="h-5 w-5 text-blue-500/70 group-hover:text-blue-500" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p>Loading email addresses...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-none full-width-layout container-override">
      {/* Debug info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Found {emailAddresses.length} email addresses</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            console.log('=== DEBUG INFO ===')
            console.log('Current emailAddresses state:', emailAddresses.length)
            console.log('Current fetchedAddresses state:', fetchedAddresses.length)
            console.log('localStorage email-addresses:', localStorage.getItem('email-addresses'))
            console.log('localStorage fetched-addresses:', localStorage.getItem('fetched-addresses'))
            reloadFromLocalStorage()
          }}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Debug Reload
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email addresses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={loadEmailAddresses} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button variant="outline" onClick={fetchEmailAddresses} disabled={isFetchingAddresses}>
          <Download className="mr-2 h-4 w-4" />
          {isFetchingAddresses ? 'Processing...' : 'Process Emails'}
        </Button>
        <Button variant="outline" onClick={reclassifyAllEmails}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Re-classify All
        </Button>
      </div>

      {/* Fetched Addresses Modal */}
      {showFetchedAddresses && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">Fetched Email Addresses</CardTitle>
                  <CardDescription className="text-blue-700">
                    Found {fetchedAddresses.length} unique addresses. Select addresses to add to whitelist or blacklist.
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFetchedAddresses(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search and Sort Controls */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search email addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <select
                  className="px-3 py-2 border rounded-md"
                  onChange={(e) => {
                    const sortBy = e.target.value
                    const sorted = [...fetchedAddresses].sort((a, b) => {
                      if (sortBy === 'email') return a.email.localeCompare(b.email)
                      if (sortBy === 'count') return b.count - a.count
                      if (sortBy === 'date') return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
                      return 0
                    })
                    setFetchedAddresses(sorted)
                  }}
                >
                  <option value="count">Sort by Email Count</option>
                  <option value="email">Sort by Email Address</option>
                  <option value="date">Sort by Last Seen</option>
                </select>
              </div>

              {/* Selection Controls */}
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const filteredAddresses = fetchedAddresses.filter(addr =>
                        !searchTerm ||
                        addr.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        addr.name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      const allEmails = new Set(filteredAddresses.map(addr => addr.email))
                      setSelectedEmails(allEmails)
                    }}
                  >
                    Select All Visible
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEmails(new Set())}
                    disabled={selectedEmails.size === 0}
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>{selectedEmails.size}</strong> selected of <strong>{fetchedAddresses.filter(addr =>
                    !searchTerm ||
                    addr.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    addr.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length}</strong> visible
                </div>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 h-12 shadow-lg"
                  onClick={async () => {
                    const selectedAddresses = Array.from(selectedEmails)
                    if (selectedAddresses.length === 0) {
                      toast({ title: "No Selection", description: "Please select email addresses first." })
                      return
                    }

                    // Preserve scroll positions
                    preserveScrollPosition('fetched')

                    await addAddressesToRules(selectedAddresses, 'whitelist')

                    // Remove the addresses from the fetched list
                    setFetchedAddresses(prev => prev.filter(addr => !selectedAddresses.includes(addr.email)))
                    setSelectedEmails(new Set())

                    // Restore scroll position
                    setTimeout(() => restoreScrollPosition('fetched'), 0)
                  }}
                  disabled={selectedEmails.size === 0}
                >
                  <UserCheck className="mr-3 h-5 w-5" />
                  Add Selected to Whitelist ({selectedEmails.size})
                </Button>
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 h-12 shadow-lg"
                  onClick={async () => {
                    const selectedAddresses = Array.from(selectedEmails)
                    if (selectedAddresses.length === 0) {
                      toast({ title: "No Selection", description: "Please select email addresses first." })
                      return
                    }

                    // Preserve scroll positions
                    preserveScrollPosition('fetched')

                    await addAddressesToRules(selectedAddresses, 'blacklist')

                    // Remove the addresses from the fetched list
                    setFetchedAddresses(prev => prev.filter(addr => !selectedAddresses.includes(addr.email)))
                    setSelectedEmails(new Set())

                    // Restore scroll position
                    setTimeout(() => restoreScrollPosition('fetched'), 0)
                  }}
                  disabled={selectedEmails.size === 0}
                >
                  <UserX className="mr-3 h-5 w-5" />
                  Add Selected to Blacklist ({selectedEmails.size})
                </Button>
              </div>

              <ScrollArea
                className="h-80"
                ref={(el) => {
                  if (el) {
                    const viewport = el.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
                    if (viewport) {
                      scrollRefs.current['fetched'] = viewport
                    }
                  }
                }}
              >
                <div className="space-y-1">
                  {fetchedAddresses.length > 0 ? (
                    fetchedAddresses
                      .filter(addr =>
                        !searchTerm ||
                        addr.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        addr.name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((addr, index) => {
                        const isSelected = selectedEmails.has(addr.email)
                        return (
                          <FetchedEmailItem
                            key={`${addr.email || 'unknown'}-${index}-${addr.count || 0}`}
                            addr={addr}
                            isSelected={isSelected}
                            onSelect={(checked) => {
                              const newSelected = new Set(selectedEmails)
                              if (checked) {
                                newSelected.add(addr.email)
                              } else {
                                newSelected.delete(addr.email)
                              }
                              setSelectedEmails(newSelected)
                            }}
                          />
                        )
                      })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      {searchTerm ? `No addresses found matching "${searchTerm}"` : "No addresses found"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {selectedEmails.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedEmails.size} email addresses selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => moveSelectedEmails('whitelist')}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Move to Whitelist
                </Button>
                <Button size="sm" variant="outline" onClick={() => moveSelectedEmails('blacklist')}>
                  <UserX className="mr-2 h-4 w-4" />
                  Move to Blacklist
                </Button>
                <Button size="sm" variant="outline" onClick={() => moveSelectedEmails('unsorted')}>
                  <Mail className="mr-2 h-4 w-4" />
                  Move to Unsorted
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resizable Email Lists Layout */}
      <div className="space-y-4 w-full full-width-layout">
        {/* Whitelist and Blacklist - Horizontally Resizable */}
        <div className="resizable-container flex gap-2 min-h-[320px] w-full full-width-layout">
          <ResizablePanel
            height={panelSizes.whitelistHeight}
            onHeightChange={(height) => setPanelSizes(prev => ({ ...prev, whitelistHeight: height }))}
            className="flex-shrink-0"
            style={{ width: `${panelSizes.whitelistWidth}%` }}
          >
            <EmailList
              title="Whitelist"
              status="whitelist"
              icon={<UserCheck className="h-4 w-4 text-green-500" />}
              height={panelSizes.whitelistHeight}
            />
          </ResizablePanel>

          <HorizontalResizer
            leftWidth={panelSizes.whitelistWidth}
            onWidthChange={(width) => setPanelSizes(prev => ({
              ...prev,
              whitelistWidth: width,
              blacklistWidth: 100 - width
            }))}
          />

          <ResizablePanel
            height={panelSizes.blacklistHeight}
            onHeightChange={(height) => setPanelSizes(prev => ({ ...prev, blacklistHeight: height }))}
            className="flex-1"
          >
            <EmailList
              title="Blacklist"
              status="blacklist"
              icon={<UserX className="h-4 w-4 text-red-500" />}
              height={panelSizes.blacklistHeight}
            />
          </ResizablePanel>
        </div>

        {/* Unsorted Emails - Vertically Resizable */}
        <ResizablePanel
          height={panelSizes.unsortedHeight}
          onHeightChange={(height) => setPanelSizes(prev => ({ ...prev, unsortedHeight: height }))}
          minHeight={300}
        >
          <EmailList
            title="Unsorted Email Addresses"
            status="unsorted"
            icon={<Mail className="h-4 w-4 text-blue-500" />}
            height={panelSizes.unsortedHeight}
          />
        </ResizablePanel>
      </div>
    </div>
  )
}
