"use client"

import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'

export default function EstimatesPage() {
  return (
    <AppShell>
      <EmailList
        type="estimate"
        title="Estimates"
        description="AI-classified estimate emails. These emails have been identified as containing estimate or quote requests through keyword analysis and AI processing."
      />
    </AppShell>
  )
}