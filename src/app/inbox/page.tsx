"use client"

import { useState, useMemo, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import { EmailList } from '@/components/emails/email-list'
import { EmailDetail } from '@/components/emails/email-detail'
import type { Email } from '@/lib/types'
import { getEmails, updateEmail, deleteEmail as deleteEmailFromStore } from '@/lib/data-store'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Archive, Ban, ShieldCheck } from 'lucide-react'

export default function InboxPage({ isParsing, setIsParsing }: { isParsing?: boolean, setIsParsing?: (isParsing: boolean) => void }) {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());

  const loadEmails = useCallback(async () => {
    setIsLoading(true);
    const fetchedEmails = await getEmails();
    setEmails(fetchedEmails.filter(e => !e.isArchived));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails])

  const handleUpdateEmail = async (updatedEmail: Email) => {
    await updateEmail(updatedEmail);
    const newEmails = emails.map(e => e.id === updatedEmail.id ? updatedEmail : e);
    setEmails(newEmails);
    
    if (selectedEmail?.id === updatedEmail.id) {
      setSelectedEmail(updatedEmail);
    }
  }

  const handleDeleteEmail = async (emailId: string) => {
    await deleteEmailFromStore(emailId);
    setEmails(currentEmails => currentEmails.filter(e => e.id !== emailId));
    setSelectedEmailIds(currentIds => {
      const newIds = new Set(currentIds);
      newIds.delete(emailId);
      return newIds;
    });
    if(selectedEmail?.id === emailId) {
        setSelectedEmail(null);
    }
  }

  const handleBulkAction = async (action: 'whitelist' | 'blacklist' | 'archive') => {
    const updates: Promise<void>[] = [];
    const updatedEmails = emails.map(email => {
      if (selectedEmailIds.has(email.id)) {
        let updatedEmail = { ...email };
        if (action === 'whitelist') {
          updatedEmail.isWhitelisted = true;
          updatedEmail.isBlacklisted = false;
        } else if (action === 'blacklist') {
          updatedEmail.isBlacklisted = true;
          updatedEmail.isWhitelisted = false;
        } else if (action === 'archive') {
          updatedEmail.isArchived = true;
        }
        updates.push(updateEmail(updatedEmail));
        return updatedEmail;
      }
      return email;
    });

    await Promise.all(updates);
    setEmails(updatedEmails.filter(e => !e.isArchived));
    setSelectedEmailIds(new Set());
    if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
      setSelectedEmail(null);
    }
  };

  const filteredEmails = useMemo(() => {
    return emails.filter(email => email.category === 'none' && !email.isArchived);
  }, [emails]);

  useEffect(() => {
    if (selectedEmail && !filteredEmails.find(e => e.id === selectedEmail.id)) {
      setSelectedEmail(null);
    }
    if (!selectedEmail && filteredEmails.length > 0) {
      const firstUnselected = filteredEmails.find(e => !selectedEmailIds.has(e.id));
      if (firstUnselected) {
        setSelectedEmail(firstUnselected);
      }
    }
  }, [filteredEmails, selectedEmail, selectedEmailIds]);


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
            <div className="p-4 border-b space-y-2">
                <h3 className="font-headline text-lg">Inbox</h3>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={selectedEmailIds.size === 0} onClick={() => handleBulkAction('whitelist')}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Whitelist ({selectedEmailIds.size})
                    </Button>
                     <Button variant="outline" size="sm" disabled={selectedEmailIds.size === 0} onClick={() => handleBulkAction('blacklist')}>
                        <Ban className="mr-2 h-4 w-4" />
                        Blacklist ({selectedEmailIds.size})
                    </Button>
                    <Button variant="outline" size="sm" disabled={selectedEmailIds.size === 0} onClick={() => handleBulkAction('archive')}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive ({selectedEmailIds.size})
                    </Button>
                </div>
            </div>
          <EmailList
            emails={filteredEmails}
            selectedEmail={selectedEmail}
            onSelectEmail={setSelectedEmail}
            selectedEmailIds={selectedEmailIds}
            onSetSelectedEmailIds={setSelectedEmailIds}
          />
        </div>
        <div className="flex flex-col bg-muted/20">
          <EmailDetail email={selectedEmail} onUpdateEmail={handleUpdateEmail} onDeleteEmail={handleDeleteEmail} />
        </div>
      </div>
    </AppShell>
  )
}
