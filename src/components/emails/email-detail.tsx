
"use client"

import React from 'react'
import type { Email, Attachment } from '@/lib/types'
import {
  Archive,
  Ban,
  CornerDownLeft,
  FileArchive,
  File as FileIcon,
  Image as ImageIcon,
  MoreVertical,
  ShieldCheck,
  Trash2,
  FileText,
  ShoppingCart
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { QuoteDetection } from './quote-detection'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { getCustomers } from '@/lib/data-store'
import type { Customer } from '@/lib/types'

interface EmailDetailProps {
  email: Email | null
  onUpdateEmail: (email: Email) => void | Promise<void>
  onDeleteEmail: (emailId: string) => void | Promise<void>;
}

const getAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
        case 'pdf': return <FileIcon className="h-5 w-5 text-red-500" />;
        case 'ai': return <FileIcon className="h-5 w-5 text-orange-500" />;
        case 'jpg':
        case 'png': return <ImageIcon className="h-5 w-5 text-blue-500" />;
        case 'zip': return <FileArchive className="h-5 w-5 text-yellow-500" />;
        default: return <FileIcon className="h-5 w-5" />;
    }
}

export function EmailDetail({ email, onUpdateEmail, onDeleteEmail }: EmailDetailProps) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);

  React.useEffect(() => {
    const loadCustomers = async () => {
      const fetchedCustomers = await getCustomers();
      setCustomers(fetchedCustomers);
    }
    loadCustomers();
  }, []);
    
  if (!email) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <p>Select an email to read</p>
      </div>
    )
  }

  const handleArchive = () => {
    onUpdateEmail({ ...email, isArchived: !email.isArchived });
  }

  const handleBlacklist = () => {
    onUpdateEmail({ ...email, isBlacklisted: !email.isBlacklisted, isWhitelisted: false });
  }
  
  const handleWhitelist = () => {
    onUpdateEmail({ ...email, isWhitelisted: !email.isWhitelisted, isBlacklisted: false });
  }

  const handleDelete = () => {
      onDeleteEmail(email.id);
  }

  const handleSetCategory = (category: 'order' | 'estimate' | 'none') => {
    onUpdateEmail({ ...email, category });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] h-full">
        <div className="flex flex-col">
            <div className="flex items-center p-4 border-b">
                <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage alt={email.from.name} src={`https://placehold.co/40x40.png?text=${email.from.name.charAt(0)}`} />
                    <AvatarFallback>{email.from.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                    <p className="font-semibold">{email.from.name}</p>
                    <p className="text-xs text-muted-foreground">{email.from.email}</p>
                </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" disabled>
                    <CornerDownLeft className="h-4 w-4" />
                    <span className="sr-only">Reply</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <span>Move to...</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleSetCategory('order')}>
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Orders
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSetCategory('estimate')}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Estimates
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleSetCategory('none')}>
                                        <FileIcon className="mr-2 h-4 w-4" />
                                        None
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleArchive}>
                            <Archive className="mr-2 h-4 w-4" />
                            {email.isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleWhitelist}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            {email.isWhitelisted ? 'Remove from Whitelist' : 'Add to Whitelist'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleBlacklist} className="text-destructive focus:text-destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            {email.isBlacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            </div>
            <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <h2 className="text-2xl font-bold font-headline">{email.subject}</h2>
                <Separator />
                <div className="whitespace-pre-wrap text-sm">
                    {email.body}
                </div>
                {email.attachments.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <h3 className="text-sm font-medium mb-2">Attachments ({email.attachments.length})</h3>
                            <div className="space-y-2">
                            {email.attachments.map((att, index) => (
                                <div key={index} className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent cursor-pointer">
                                    {getAttachmentIcon(att.type)}
                                    <span className="font-medium truncate">{att.name}</span>
                                    <span className="ml-auto text-muted-foreground text-xs">{(att.size / 1024).toFixed(2)} MB</span>
                                </div>
                            ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
            </ScrollArea>
      </div>

      <div className="hidden xl:flex flex-col border-l bg-background/50 p-4 space-y-4">
        <ScrollArea>
            <div className="space-y-6">
                <QuoteDetection email={email} />
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-base">Customer Matching</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select defaultValue={email.customerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a customer..." />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map(customer => (
                                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
      </div>
    </div>
  )
}
