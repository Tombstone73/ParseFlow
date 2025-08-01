"use client"

import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'

export default function ArchivePage() {
  return (
    <AppShell>
      <EmailList 
        classification="pending"
        title="Archive" 
        description="Archived emails. These emails have been moved out of active folders and can be permanently deleted. Use this as a trash bin before final deletion."
      />
    </AppShell>
  )
}