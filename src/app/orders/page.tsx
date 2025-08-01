"use client"

import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'

export default function OrdersPage() {
  return (
    <AppShell>
      <EmailList
        type="order"
        title="Orders"
        description="AI-classified order emails. These emails have been identified as containing order information through keyword analysis and AI processing."
      />
    </AppShell>
  )
}