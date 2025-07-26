
"use client"

import { useState, useMemo, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'
import { EmailDetail } from '@/components/emails/email-detail'
import type { Email } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getEmails, updateEmail, deleteEmail as deleteEmailFromStore } from '@/lib/data-store'
import { Skeleton } from '@/components/ui/skeleton'

export default function EstimatesPage({ isParsing, setIsParsing }: { isParsing?: boolean, setIsParsing?: (isParsing: boolean) => void }) {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [hideBlacklisted, setHideBlacklisted] = useState(true)

  useEffect(() => {
    const loadEmails = async () => {
        setIsLoading(true);
        const fetchedEmails = await getEmails();
        setEmails(fetchedEmails.filter(e => !e.isArchived));
        setIsLoading(false);
    }
    loadEmails();
  }, [])


  const handleUpdateEmail = async (updatedEmail: Email) => {
    await updateEmail(updatedEmail);
    // In a real app, this would update the source of truth
    // For this demo, we'll just update local state
    const newEmails = emails.map(e => e.id === updatedEmail.id ? updatedEmail : e)
    setEmails(newEmails)
    
    if (selectedEmail?.id === updatedEmail.id) {
      setSelectedEmail(updatedEmail)
    }
  }
  
  const handleDeleteEmail = async (emailId: string) => {
    await deleteEmailFromStore(emailId);
    setEmails(currentEmails => currentEmails.filter(e => e.id !== emailId))
    if(selectedEmail?.id === emailId) {
        setSelectedEmail(null)
    }
  }

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
        if (email.category !== 'estimate') return false;
        if (hideBlacklisted && email.isBlacklisted) {
            return false
        }
        return true
    })
  }, [emails, hideBlacklisted])

  useEffect(() => {
    if (filteredEmails.length > 0 && !selectedEmail) {
      setSelectedEmail(filteredEmails[0]);
    }
    if (filteredEmails.length === 0) {
      setSelectedEmail(null);
    }
  }, [filteredEmails, selectedEmail]);

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
                <h3 className="font-headline text-lg">Estimates</h3>
                <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="hide-blacklisted" checked={hideBlacklisted} onCheckedChange={(checked) => setHideBlacklisted(!!checked)} />
                    <Label htmlFor="hide-blacklisted" className="text-sm font-normal">Hide Blacklisted</Label>
                </div>
            </div>
          <EmailList
            emails={filteredEmails}
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
