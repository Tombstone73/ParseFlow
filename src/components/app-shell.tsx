"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Archive, Bot, FileText, ScrollText, Settings, ShoppingCart, SlidersHorizontal, Wifi, WifiOff, Mail } from 'lucide-react'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'

const navItems = [
  { href: '/inbox', label: 'Inbox', icon: Mail },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/estimates', label: 'Estimates', icon: FileText },
  { href: '/archive', label: 'Archive', icon: Archive },
]

const settingsItems = [
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/logs', label: 'Logs', icon: ScrollText },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isParsing, setIsParsing] = React.useState(false);

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
        // @ts-ignore
      return React.cloneElement(child, { isParsing, setIsParsing });
    }
    return child;
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r border-border/50">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
                <Button variant="ghost" size="icon" className="shrink-0" asChild>
                    <Link href="/orders">
                        <Bot className="text-primary" />
                    </Link>
                </Button>
                <h1 className="font-headline text-lg font-semibold truncate group-data-[collapsible=icon]:hidden">ParseFlow</h1>
            </div>
          </SidebarHeader>
          <Separator />
          <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Mail</SidebarGroupLabel>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={{ children: item.label }}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel>System</SidebarGroupLabel>
                 <SidebarMenu>
                  {settingsItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={{ children: item.label }}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <ThemeToggle />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="max-h-screen overflow-hidden">
            <header className="flex items-center justify-between p-2 border-b h-14">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <h2 className="text-lg font-semibold font-headline">
                        {navItems.find(item => item.href === pathname)?.label || settingsItems.find(item => item.href === pathname)?.label || 'Inbox'}
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant={isParsing ? "default" : "secondary"} className={`gap-1.5 transition-all ${isParsing ? "bg-green-600 hover:bg-green-700" : ""}`}>
                        {isParsing ? <Wifi className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                        {isParsing ? "Parsing" : "Idle"}
                    </Badge>
                    <Button variant="outline" size="sm">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        View
                    </Button>
                </div>
            </header>
            <main className="h-[calc(100vh-3.5rem)] overflow-auto">
                {childrenWithProps}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
