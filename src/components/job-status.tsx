"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Job {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime?: string
  endTime?: string
  result?: any
  error?: string
  currentOperation?: string
  totalEmails?: number
  processedEmails?: number
}

interface JobStatusProps {
  onParsingStateChange?: (isParsing: boolean) => void
}

export function JobStatus({ onParsingStateChange }: JobStatusProps) {
  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const checkCurrentJob = async () => {
    try {
      const response = await fetch('/api/jobs?current=true')
      const data = await response.json()

      if (response.ok) {
        const newJob = data.job
        setCurrentJob(newJob)

        // Notify parent about parsing state change
        if (onParsingStateChange) {
          const isParsing = newJob?.status === 'running'
          onParsingStateChange(isParsing)
        }
      } else {
        console.error('Failed to get current job:', data.error)
      }
    } catch (error) {
      console.error('Error checking current job:', error)
    }
  }

  useEffect(() => {
    checkCurrentJob()
    
    // Poll for updates every 2 seconds if there's a running job
    const interval = setInterval(() => {
      if (currentJob?.status === 'running') {
        checkCurrentJob()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentJob?.status])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'Not started'
    
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  if (!currentJob) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Background Jobs</CardTitle>
              <CardDescription>No active email processing jobs</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={checkCurrentJob} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              {getStatusIcon(currentJob.status)}
              Email Processing Job
            </CardTitle>
            <CardDescription>
              {currentJob.status === 'running' && 'Processing emails in background...'}
              {currentJob.status === 'completed' && 'Email processing completed successfully'}
              {currentJob.status === 'failed' && 'Email processing failed'}
              {currentJob.status === 'pending' && 'Email processing queued'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(currentJob.status)}
            <Button size="sm" variant="outline" onClick={checkCurrentJob} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentJob.status === 'running' && (
          <div className="space-y-3">
            {currentJob.currentOperation && (
              <div className="text-sm text-muted-foreground">
                {currentJob.currentOperation}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {currentJob.progress}%
                  {currentJob.totalEmails && currentJob.processedEmails !== undefined && (
                    <span className="ml-2 text-muted-foreground">
                      ({currentJob.processedEmails}/{currentJob.totalEmails} emails)
                    </span>
                  )}
                </span>
              </div>
              <Progress value={currentJob.progress} className="h-2" />
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <div className="font-medium">
              {formatDuration(currentJob.startTime, currentJob.endTime)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Job ID:</span>
            <div className="font-mono text-xs">
              {currentJob.id.split('-').pop()}
            </div>
          </div>
        </div>

        {currentJob.status === 'completed' && currentJob.result && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm font-medium text-green-800">
              ✅ Processed {currentJob.result.processedCount} emails
            </div>
            {currentJob.result.errors?.length > 0 && (
              <div className="text-sm text-green-700 mt-1">
                ⚠️ {currentJob.result.errors.length} errors occurred
              </div>
            )}
          </div>
        )}

        {currentJob.status === 'failed' && currentJob.error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-sm font-medium text-red-800">
              ❌ Job Failed
            </div>
            <div className="text-sm text-red-700 mt-1">
              {currentJob.error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
