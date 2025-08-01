import { NextRequest, NextResponse } from 'next/server'
import { getEmails, getEmailsByType, updateEmail, deleteEmail, bulkUpdateEmails, bulkDeleteEmails, addLog } from '@/lib/data-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'order' | 'estimate' | 'other' | null
    const status = searchParams.get('status')
    const classification = searchParams.get('classification') as 'inbox' | 'whitelist' | 'blacklist' | 'pending' | 'unsorted' | null

    let emails = type ? await getEmailsByType(type) : await getEmails()

    // Filter by status if provided
    if (status) {
      emails = emails.filter(email => email.status === status)
    }

    // Filter by classification if provided
    if (classification) {
      emails = emails.filter(email => email.classification === classification)
    }

    console.log(`Retrieved ${emails.length} emails with filters:`, { type, status, classification })

    return NextResponse.json({ emails })
  } catch (error) {
    console.error('Get emails error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve emails' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle bulk updates
    if (body.bulk && Array.isArray(body.updates)) {
      const updatedCount = await bulkUpdateEmails(body.updates)
      
      // Check if any emails were moved to orders/estimates and trigger auto-parsing
      for (const update of body.updates) {
        if (update.parsed?.type && ['order', 'estimate'].includes(update.parsed.type)) {
          try {
            // Trigger auto-parsing in the background
            fetch(`${request.nextUrl.origin}/api/emails/auto-parse`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                emailId: update.id,
                type: update.parsed.type
              })
            }).catch(error => {
              console.error('Auto-parse trigger failed:', error)
            })
          } catch (error) {
            console.error('Failed to trigger auto-parse:', error)
          }
        }
      }
      
      return NextResponse.json({ updated: updatedCount })
    }

    // Handle single update
    const { id, updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
    }

    const updatedEmail = await updateEmail(id, updates)

    if (!updatedEmail) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    // Check if email was moved to order/estimate and trigger auto-parsing
    if (updates.parsed?.type && ['order', 'estimate'].includes(updates.parsed.type)) {
      try {
        // Trigger auto-parsing in the background
        fetch(`${request.nextUrl.origin}/api/emails/auto-parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId: id,
            type: updates.parsed.type
          })
        }).catch(error => {
          console.error('Auto-parse trigger failed:', error)
        })
      } catch (error) {
        console.error('Failed to trigger auto-parse:', error)
      }
    }

    return NextResponse.json({ email: updatedEmail })
  } catch (error) {
    console.error('Update email error:', error)
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle bulk deletes
    if (body.bulk && Array.isArray(body.ids)) {
      const deletedCount = await bulkDeleteEmails(body.ids)
      return NextResponse.json({ deleted: deletedCount })
    }

    // Handle single delete
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
    }

    const success = await deleteEmail(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete email error:', error)
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    )
  }
}
