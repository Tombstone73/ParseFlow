"use client"

import type { Email } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShieldCheck } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'

interface EmailListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email | null) => void
  selectedEmailIds?: Set<string>
  onSetSelectedEmailIds?: (ids: Set<string>) => void
}

export function EmailList({ 
  emails, 
  selectedEmail, 
  onSelectEmail,
  selectedEmailIds,
  onSetSelectedEmailIds
}: EmailListProps) {

  const handleCheckboxChange = (emailId: string, checked: boolean) => {
    if (onSetSelectedEmailIds) {
      const newSelectedIds = new Set(selectedEmailIds);
      if (checked) {
        newSelectedIds.add(emailId);
      } else {
        newSelectedIds.delete(emailId);
      }
      onSetSelectedEmailIds(newSelectedIds);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4">
        {emails.length === 0 && (
          <div className="text-center text-muted-foreground p-8">
            No emails to display.
          </div>
        )}
        {emails.map((email) => (
          <div
            key={email.id}
            className={cn(
              'flex items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent',
              selectedEmail?.id === email.id && 'bg-accent'
            )}
          >
            {onSetSelectedEmailIds && selectedEmailIds && (
              <Checkbox
                id={`select-${email.id}`}
                className='mt-1'
                checked={selectedEmailIds.has(email.id)}
                onCheckedChange={(checked) => handleCheckboxChange(email.id, !!checked)}
              />
            )}
            <button
              className='flex flex-col items-start gap-2 text-left w-full'
              onClick={() => onSelectEmail(email)}
            >
              <div className="flex w-full flex-col gap-1">
                <div className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{email.from.name}</div>
                    {!email.isRead && (
                      <span className="flex h-2 w-2 rounded-full bg-primary" />
                    )}
                    {email.isWhitelisted && (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'ml-auto text-xs',
                      selectedEmail?.id === email.id
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="text-xs font-medium">{email.subject}</div>
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {email.body.substring(0, 100)}
              </div>
              {email.attachments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{email.attachments.length} attachment(s)</Badge>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
