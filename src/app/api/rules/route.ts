import { NextRequest, NextResponse } from 'next/server'
import { getRules, addRule, updateRule, deleteRule, addLog } from '@/lib/data-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'whitelist' | 'blacklist' | null
    
    const rules = await getRules(type || undefined)
    
    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Get rules error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, pattern, description } = await request.json()
    
    if (!type || !pattern) {
      return NextResponse.json(
        { error: 'Type and pattern are required' },
        { status: 400 }
      )
    }
    
    if (!['whitelist', 'blacklist'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be whitelist or blacklist' },
        { status: 400 }
      )
    }
    
    const rule = await addRule({
      type,
      pattern: pattern.toLowerCase(), // Store email addresses in lowercase
      description: description || '',
      active: true
    })

    // Log the rule creation
    await addLog('info', `Created ${type} rule for pattern: ${pattern} ${description ? `(${description})` : ''}`)

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Create rule error:', error)
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, updates } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    const updatedRule = await updateRule(id, updates)
    
    if (!updatedRule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ rule: updatedRule })
  } catch (error) {
    console.error('Update rule error:', error)
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    const success = await deleteRule(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete rule error:', error)
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    )
  }
}
