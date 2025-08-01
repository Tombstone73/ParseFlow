"use client"

import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'

export default function EmailsPage() {
  return (
    <AppShell>
      <EmailList
        classification="unsorted"
        title="All Emails"
        description="Unclassified emails that haven't been moved to Orders, Estimates, or Archive. These emails are waiting for classification or manual sorting."
      />
    </AppShell>
  )
}
