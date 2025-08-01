"use client"

import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'

export default function InboxPage() {
  return (
    <AppShell>
      <EmailList
        classification="inbox"
        title="Inbox"
        description="Whitelisted emails ready for processing. These emails have been approved by your whitelist rules and are ready for classification or manual review."
      />
    </AppShell>
  )
}