
"use client"

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'
import { EmailDetail } from '@/components/emails/email-detail'
import type { Email } from '@/lib/types'
import { getEmails, updateEmail } from '@/lib/data-store'
import { Skeleton } from '@/components/ui/skeleton'

export default function ArchivePage({ isParsing, setIsParsing }: { isParsing?: boolean, setIsParsing?: (isParsing: boolean) => void }) {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  useEffect(() => {
    const loadEmails = async () => {
        setIsLoading(true);
        const fetchedEmails = await getEmails();
        setEmails(fetchedEmails.filter(e => e.isArchived));
        setIsLoading(false);
    }
    loadEmails();
  }, [])

  const handleUpdateEmail = async (updatedEmail: Email) => {
    await updateEmail(updatedEmail);
    // In a real app, this would update the source of truth
    // For this demo, we'll just update local state
    const newEmails = emails.map(e => e.id === updatedEmail.id ? updatedEmail : e).filter(e => e.isArchived);
    setEmails(newEmails)
    
    if (selectedEmail?.id === updatedEmail.id) {
      setSelectedEmail(updatedEmail.isArchived ? updatedEmail : null)
    }
  }

  const handleDeleteEmail = async (emailId: string) => {
    // This is a placeholder. In a real app, you'd call a delete function from your data store.
    console.log("Deleting email:", emailId);
    const newEmails = emails.filter(e => e.id !== emailId);
    setEmails(newEmails);
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
  }

  if (isLoading) {
      return (
          <AppShell>
               <div className="grid grid-cols-1 md:grid-cols-[clamp(300px,25%,400px)_1fr] h-[calc(100vh-3.5rem)]">
                   <div className="border-r flex flex-col p-4 gap-2">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                   </div>
                   <div className="flex items-center justify-center">
                       <p>Loading emails...</p>
                   </div>
               </div>
          </AppShell>
      )
  }

  return (
    <AppShell>
      <div className="grid grid-cols-1 md:grid-cols-[clamp(300px,25%,400px)_1fr] h-[calc(100vh-3.5rem)]">
        <div className="border-r flex flex-col">
          <div className="p-4 border-b">
              <h3 className="font-headline text-lg">Archived Emails</h3>
              <p className="text-sm text-muted-foreground">{emails.length} items</p>
          </div>
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={setSelectedEmail}
          />
        </div>
        <div className="flex flex-col bg-muted/20">
          <EmailDetail email={selectedEmail} onUpdateEmail={handleUpdateEmail} onDeleteEmail={handleDeleteEmail} />
        </div>
      </div>
    </AppShell>
  )
}
