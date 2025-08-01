"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
// Removed direct data store imports - now using API
import { Email } from '@/lib/types'
import { Mail, Clock, CheckCircle, AlertCircle, Eye, Zap, Archive, Trash2, FolderOpen, FileText, Download, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailListProps {
  type?: 'order' | 'estimate' | 'other'
  classification?: 'inbox' | 'whitelist' | 'blacklist' | 'pending' | 'unsorted'
  title: string
  description: string
}

export function EmailList({ type, classification, title, description }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [emailFiles, setEmailFiles] = useState<any>(null)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [viewMode, setViewMode] = useState<'live' | 'saved'>('live')
  const { toast } = useToast()

  const loadEmails = async () => {
    setIsLoading(true)
    try {
      // Use API endpoint instead of direct data store access
      const params = new URLSearchParams()
      if (type) params.append('type', type)
      if (classification) params.append('classification', classification)

      const response = await fetch(`/api/emails?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setEmails(data.emails || [])
        console.log(`Loaded ${data.emails?.length || 0} emails for type: ${type || 'all'}, classification: ${classification || 'all'}`)
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
    // Only refresh every 30 seconds instead of 10 to reduce flashing
    const interval = setInterval(loadEmails, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [type, classification])

  useEffect(() => {
    if (selectedEmail) {
      loadEmailFiles(selectedEmail.id)
    } else {
      setEmailFiles(null)
      setViewMode('live')
    }
  }, [selectedEmail])

  const loadEmailFiles = async (emailId: string) => {
    setIsLoadingFiles(true)
    try {
      const response = await fetch(`/api/emails/files?emailId=${emailId}&type=list`)
      if (response.ok) {
        const data = await response.json()
        setEmailFiles(data)
        // If files exist, default to saved view for parsed emails
        if (data.files && data.files.length > 0 && selectedEmail?.parsed) {
          setViewMode('saved')
        }
      } else {
        setEmailFiles(null)
        setViewMode('live')
      }
    } catch (error) {
      console.error('Failed to load email files:', error)
      setEmailFiles(null)
      setViewMode('live')
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const downloadEmailFile = async (emailId: string, fileType: string, filename?: string) => {
    try {
      const params = new URLSearchParams({
        emailId,
        type: fileType
      })
      if (filename) {
        params.append('filename', filename)
      }

      const response = await fetch(`/api/emails/files?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || `email_${fileType}.${fileType === 'html' ? 'html' : 'json'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: "Download Started",
          description: `Downloading ${filename || fileType} file...`
        })
      } else {
        toast({
          title: "Download Failed",
          description: "Could not download the file",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Download Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    }
  }

  const openEmailInNewTab = async (emailId: string, fileType: string) => {
    try {
      const params = new URLSearchParams({
        emailId,
        type: fileType
      })
      
      const url = `/api/emails/files?${params.toString()}`
      window.open(url, '_blank')
    } catch (error) {
      toast({
        title: "Open Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    }
  }

  const handleEmailSelection = (emailId: string, checked: boolean) => {
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
      setSelectedEmails(new Set(emails.map(e => e.id)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const forceParseSelected = async () => {
    if (selectedEmails.size === 0) {
      toast({
        title: "No emails selected",
        description: "Please select emails to parse",
        variant: "destructive"
      })
      return
    }

    if (!type || !['order', 'estimate'].includes(type)) {
      toast({
        title: "Invalid type",
        description: "Force parse is only available for Orders and Estimates",
        variant: "destructive"
      })
      return
    }

    setIsParsing(true)
    try {
      toast({
        title: "Starting AI Parsing",
        description: `Parsing ${selectedEmails.size} emails with AI...`
      })

      const response = await fetch('/api/emails/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
          type: type
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Parsing Complete",
          description: `Successfully parsed ${result.parsed} emails. ${result.failed} failed.`
        })

        // Refresh emails to show updated data
        await loadEmails()
        setSelectedEmails(new Set())
      } else {
        toast({
          title: "Parsing Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Parsing Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsParsing(false)
    }
  }

  const moveToArchive = async () => {
    if (selectedEmails.size === 0) {
      toast({
        title: "No emails selected",
        description: "Please select emails to archive",
        variant: "destructive"
      })
      return
    }

    setIsMoving(true)
    try {
      const updates = Array.from(selectedEmails).map(id => ({
        id,
        classification: 'pending' as const // Use 'pending' as archive status
      }))

      const response = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, updates })
      })

      if (response.ok) {
        toast({
          title: "Emails Archived",
          description: `Moved ${selectedEmails.size} emails to archive`
        })

        // Refresh emails and clear selection
        await loadEmails()
        setSelectedEmails(new Set())
      } else {
        const error = await response.json()
        toast({
          title: "Archive Failed",
          description: error.error || "Unknown error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Archive Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsMoving(false)
    }
  }

  const deleteSelected = async () => {
    if (selectedEmails.size === 0) {
      toast({
        title: "No emails selected",
        description: "Please select emails to delete",
        variant: "destructive"
      })
      return
    }

    if (!confirm(`Are you sure you want to permanently delete ${selectedEmails.size} emails? This action cannot be undone.`)) {
      return
    }

    setIsMoving(true)
    try {
      const response = await fetch('/api/emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, ids: Array.from(selectedEmails) })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Emails Deleted",
          description: `Permanently deleted ${result.deleted} emails`
        })

        // Refresh emails and clear selection
        await loadEmails()
        setSelectedEmails(new Set())
      } else {
        const error = await response.json()
        toast({
          title: "Delete Failed",
          description: error.error || "Unknown error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsMoving(false)
    }
  }

  const runCleanup = async () => {
    if (!confirm('This will permanently delete all archived emails older than the configured retention period. Continue?')) {
      return
    }

    setIsMoving(true)
    try {
      toast({
        title: "Starting Cleanup",
        description: "Running automatic cleanup of old archived emails..."
      })

      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Cleanup Complete",
          description: `Deleted ${result.deletedCount} old emails. Checked ${result.totalChecked} total emails.`
        })

        // Refresh emails
        await loadEmails()
      } else {
        toast({
          title: "Cleanup Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Cleanup Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsMoving(false)
    }
  }

  const getStatusIcon = (status: Email['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: Email['status']) => {
    const variants = {
      processed: 'default',
      processing: 'secondary',
      error: 'destructive',
      unprocessed: 'outline'
    } as const

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col w-full full-width-layout container-override">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEmails.size > 0 && (
            <>
              {(type === 'order' || type === 'estimate') && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={forceParseSelected} 
                  disabled={isParsing}
                >
                  {isParsing ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Force Parse ({selectedEmails.size})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={moveToArchive} 
                disabled={isMoving}
              >
                {isMoving ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                Archive ({selectedEmails.size})
              </Button>
              {title === 'Archive' && (
                <>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={deleteSelected} 
                    disabled={isMoving}
                  >
                    {isMoving ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete ({selectedEmails.size})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={runCleanup} 
                    disabled={isMoving}
                  >
                    {isMoving ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                    Auto Cleanup
                  </Button>
                </>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={loadEmails} disabled={isLoading}>
            {isLoading ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Email List */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{emails.length} {emails.length === 1 ? 'Email' : 'Emails'}</span>
              {emails.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedEmails.size === emails.length && emails.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading emails...
                </div>
              ) : emails.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No emails found
                </div>
              ) : (
                <div className="space-y-1">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className={cn(
                        "p-4 hover:bg-muted/50 transition-colors border-b",
                        selectedEmail?.id === email.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={(checked) => handleEmailSelection(email.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start justify-between gap-2">
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
                            {email.body}
                          </p>
                        </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(email.status)}
                              {email.parsed && (
                                <Badge variant="outline" className="text-xs">
                                  {email.parsed.type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Email Detail */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Email Details
              </div>
              {selectedEmail && emailFiles && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'live' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('live')}
                  >
                    Live
                  </Button>
                  <Button
                    variant={viewMode === 'saved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('saved')}
                  >
                    Saved
                  </Button>
                </div>
              )}
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
                      {emailFiles && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Files:</span>
                          <span className="text-green-600">✓ Saved</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* File Management Section */}
                  {emailFiles && viewMode === 'saved' && (
                    <>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          Saved Files
                        </h4>
                        <div className="space-y-2">
                          {emailFiles.files.map((file: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>{file.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (file.type === 'attachment') {
                                      downloadEmailFile(selectedEmail.id, 'attachment', file.name)
                                    } else if (file.name.endsWith('.html')) {
                                      openEmailInNewTab(selectedEmail.id, 'html')
                                    } else if (file.name.endsWith('.json')) {
                                      downloadEmailFile(selectedEmail.id, 'json')
                                    }
                                  }}
                                >
                                  {file.name.endsWith('.html') ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Message</h4>
                      {emailFiles && viewMode === 'saved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEmailInNewTab(selectedEmail.id, 'html')}
                        >
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Open Full View
                        </Button>
                      )}
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap">
                      {selectedEmail.body}
                    </div>
                  </div>

                  {selectedEmail.parsed && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Parsed Data</h4>
                          {emailFiles && viewMode === 'saved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadEmailFile(selectedEmail.id, 'parsed')}
                            >
                              <Download className="mr-2 h-3 w-3" />
                              Download JSON
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Type:</span>
                            <Badge variant="outline">{selectedEmail.parsed.type}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Confidence:</span>
                            <span>{(selectedEmail.parsed.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Data:</span>
                            <pre className="bg-muted/50 p-3 rounded text-xs mt-1 overflow-auto">
                              {JSON.stringify(selectedEmail.parsed.data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Attachments</h4>
                        <div className="space-y-2">
                          {selectedEmail.attachments.map((attachment, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                              <span>{attachment.filename}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </span>
                                {emailFiles && viewMode === 'saved' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadEmailFile(selectedEmail.id, 'attachment', attachment.filename)}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {isLoadingFiles && (
                    <div className="flex items-center justify-center p-4">
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                      Loading saved files...
                    </div>
                  )}
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
  )
}