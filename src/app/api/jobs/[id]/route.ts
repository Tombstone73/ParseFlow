import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/job-queue'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = getJob(params.id)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ job })
  } catch (error) {
    console.error('Get job error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve job' },
      { status: 500 }
    )
  }
}
