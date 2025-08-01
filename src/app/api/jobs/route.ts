import { NextRequest, NextResponse } from 'next/server'
import { createJob, processJob, getAllJobs, getCurrentJob, cleanupJobs } from '@/lib/job-queue'
import { Settings } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')
    
    if (current === 'true') {
      const currentJob = getCurrentJob()
      return NextResponse.json({ job: currentJob })
    }
    
    const jobs = getAllJobs()
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Get jobs error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, settings } = await request.json()
    
    if (type !== 'email-processing' && type !== 'email-processing-optimized') {
      return NextResponse.json(
        { error: 'Invalid job type' },
        { status: 400 }
      )
    }
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required for email processing job' },
        { status: 400 }
      )
    }
    
    // Check if there's already a running job
    const currentJob = getCurrentJob()
    if (currentJob && currentJob.status === 'running') {
      return NextResponse.json(
        { error: 'Another email processing job is already running', currentJob },
        { status: 409 }
      )
    }
    
    // Create and start the job
    const job = createJob(type as 'email-processing' | 'email-processing-optimized', settings as Settings)
    
    // Start processing in the background (don't await)
    processJob(job).catch(error => {
      console.error('Background job processing error:', error)
    })
    
    // Clean up old jobs
    cleanupJobs()
    
    return NextResponse.json({ job })
  } catch (error) {
    console.error('Create job error:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}
