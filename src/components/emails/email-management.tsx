"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Email } from '@/lib/types'
import { Mail, Clock, CheckCircle, AlertCircle, Eye, UserCheck, UserX, Trash2, Archive, Filter, ShoppingCart, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface EmailManagementProps {
  type?: 'all' | 'inbox' | 'whitelist' | 'blacklist' | 'pending'
  title: string
  description: string
  showBulkActions?: boolean
  showClassificationActions?: boolean
}

export function EmailManagement({ type = 'all', title, description, showBulkActions = true, showClassificationActions = false }: EmailManagementProps): React.JSX.Element {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // Percentage
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const loadEmails = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (type !== 'all') params.append('classification', type)
      
      const response = await fetch(`/api/emails?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        const newEmails = data.emails || []
        // Only update state if emails actually changed to prevent unnecessary re-renders
        setEmails(prevEmails => {
          if (JSON.stringify(prevEmails) !== JSON.stringify(newEmails)) {
            console.log(`Loaded ${newEmails.length} emails for type: ${type}`)
            return newEmails
          }
          return prevEmails
        })
      } else {
        console.error('Failed to load emails:', data.error)
        setEmails([])
      }
    } catch (error) {
      console.error('Failed to load emails:', error)
      setEmails([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()
    // Removed automatic refresh to prevent scroll jumping
    // Users can manually refresh if needed
  }, [type])

  // Resize handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 20), 80)
      setLeftPanelWidth(constrainedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails)
    if (checked) {
      newSelected.add(emailId)
    } else {
      newSelected.delete(emailId)
    }
    setSelectedEmails(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(filteredEmails.map(email => email.id)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const handleBulkAction = async (action: 'whitelist' | 'blacklist' | 'delete' | 'archive' | 'order' | 'estimate') => {
    if (selectedEmails.size === 0) {
      toast({
        variant: "destructive",
        title: "No emails selected",
        description: "Please select emails to perform bulk actions.",
      })
      return
    }

    try {
      // For whitelist/blacklist actions, we need to create rules AND update email classifications
      if (action === 'whitelist' || action === 'blacklist') {
        // Get the selected emails to extract sender addresses
        const selectedEmailObjects = emails.filter(email => selectedEmails.has(email.id))
        const senderEmails = selectedEmailObjects.map(email => email.senderEmail || email.from)

        // Create rules for each sender
        const rulePromises = senderEmails.map(async (senderEmail) => {
          const cleanEmail = senderEmail.includes('<')
            ? senderEmail.match(/<([^>]+)>/)?.[1] || senderEmail
            : senderEmail

          const response = await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: action,
              pattern: cleanEmail.toLowerCase(),
              description: `Auto-created rule for ${cleanEmail}`
            })
          })

          if (!response.ok) {
            const error = await response.json()
            console.error(`Failed to create rule for ${cleanEmail}:`, error)
          }
        })

        await Promise.all(rulePromises)
      }

      // Update email classifications
      const updates = Array.from(selectedEmails).map(id => {
        if (action === 'order' || action === 'estimate') {
          // For order/estimate classification, update the parsed type
          return {
            id,
            parsed: { type: action, data: null, confidence: 1.0 }
          }
        } else if (action === 'whitelist') {
          // Whitelist means move to inbox
          return {
            id,
            classification: 'inbox'
          }
        } else if (action === 'blacklist') {
          // Blacklist means classify as blacklist (will be hidden from inbox)
          return {
            id,
            classification: 'blacklist'
          }
        } else {
          // For other actions, update classification
          return {
            id,
            classification: action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : action
          }
        }
      })

      const response = await fetch('/api/emails', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bulk: true,
          updates: updates
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Bulk Action Applied",
          description: `${action} applied to ${result.updated || selectedEmails.size} emails.`,
        })

        setSelectedEmails(new Set())
        await loadEmails()
      } else {
        throw new Error(result.error || 'Failed to apply bulk action')
      }
    } catch (error) {
      console.error('Bulk action error:', error)
      toast({
        variant: "destructive",
        title: "Bulk Action Failed",
        description: error instanceof Error ? error.message : "Failed to apply bulk action. Please try again.",
      })
    }
  }

  const extractEmailAddress = (fromField: string): string => {
    const match = fromField.match(/<([^>]+)>/)
    return match ? match[1] : fromField.split(' ')[0]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Mail className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      processed: 'default',
      processing: 'secondary',
      error: 'destructive',
      unprocessed: 'outline'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Filter emails based on current filter
  const filteredEmails = emails.filter(email => {
    if (filter === 'all') return true
    if (filter === 'unread') return email.status === 'unprocessed'
    if (filter === 'processed') return email.status === 'processed'
    return true
  })

  const allSelected = filteredEmails.length > 0 && selectedEmails.size === filteredEmails.length
  const someSelected = selectedEmails.size > 0 && selectedEmails.size < filteredEmails.length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col w-full full-width-layout container-override" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadEmails} disabled={isLoading}>
            {isLoading ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {showBulkActions && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                />
                <span className="text-sm font-medium">
                  {selectedEmails.size > 0 ? `${selectedEmails.size} selected` : 'Select all'}
                </span>
              </div>
              {selectedEmails.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {showClassificationActions && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction('order')}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Mark as Order
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction('estimate')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Mark as Estimate
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('whitelist')}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Whitelist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('blacklist')}>
                    <UserX className="mr-2 h-4 w-4" />
                    Blacklist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="flex-1 flex min-h-0 relative">
        {/* Email List Panel */}
        <div
          className="flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {filteredEmails.length} {filteredEmails.length === 1 ? 'Email' : 'Emails'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading emails...
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No emails found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                        selectedEmail?.id === email.id && "bg-muted"
                      )}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start gap-3">
                        {showBulkActions && (
                          <Checkbox
                            checked={selectedEmails.has(email.id)}
                            onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(email.status)}
                            <span className="font-medium text-sm truncate">
                              {email.from}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(email.date)}
                            </span>
                          </div>
                          <h3 className="font-medium text-sm truncate mb-1">
                            {email.subject}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {email.body.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(email.status)}
                          {email.classification && (
                            <Badge variant="outline" className="text-xs">
                              {email.classification}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </div>

        {/* Resizer */}
        <div
          className={cn(
            "w-1 bg-border hover:bg-primary/20 cursor-col-resize flex-shrink-0 transition-colors",
            isResizing && "bg-primary/40"
          )}
          onMouseDown={handleMouseDown}
        />

        {/* Email Detail Panel */}
        <div
          className="flex flex-col flex-1 pr-4 sm:pr-6 lg:pr-8"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {selectedEmail ? (
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{selectedEmail.subject}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From:</span>
                        <span>{selectedEmail.from}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To:</span>
                        <span>{selectedEmail.to}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{new Date(selectedEmail.date).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(selectedEmail.status)}
                      </div>
                      {selectedEmail.classification && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Classification:</span>
                          <Badge variant="outline">{selectedEmail.classification}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {showClassificationActions && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedEmails(new Set([selectedEmail.id]))
                            handleBulkAction('order')
                          }}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Mark as Order
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedEmails(new Set([selectedEmail.id]))
                            handleBulkAction('estimate')
                          }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Mark as Estimate
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedEmails(new Set([selectedEmail.id]))
                        handleBulkAction('whitelist')
                      }}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Add to Whitelist
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedEmails(new Set([selectedEmail.id]))
                        handleBulkAction('blacklist')
                      }}>
                        <UserX className="mr-2 h-4 w-4" />
                        Add to Blacklist
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Content</h4>
                    <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                      {selectedEmail.body}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an email to view details
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
