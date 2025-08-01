import { NextRequest, NextResponse } from 'next/server'
import { getRules, getEmails, resetLoadedFlags } from '@/lib/data-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'reset') {
      // Reset loaded flags to force reload from files
      resetLoadedFlags()
      return NextResponse.json({ message: 'Storage flags reset' })
    }
    
    // Get current data
    const rules = await getRules()
    const emails = await getEmails()
    
    return NextResponse.json({
      rules: {
        count: rules.length,
        whitelist: rules.filter(r => r.type === 'whitelist').length,
        blacklist: rules.filter(r => r.type === 'blacklist').length,
        items: rules.map(r => ({ id: r.id, type: r.type, pattern: r.pattern, active: r.active }))
      },
      emails: {
        count: emails.length,
        classifications: {
          inbox: emails.filter(e => e.classification === 'inbox').length,
          whitelist: emails.filter(e => e.classification === 'whitelist').length,
          blacklist: emails.filter(e => e.classification === 'blacklist').length,
          pending: emails.filter(e => e.classification === 'pending').length
        }
      }
    })
  } catch (error) {
    console.error('Debug storage error:', error)
    return NextResponse.json(
      { error: 'Failed to get storage debug info' },
      { status: 500 }
    )
  }
}