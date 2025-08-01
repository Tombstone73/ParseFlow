"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, Bot, FileText, Settings, ShoppingCart, SlidersHorizontal, Wifi, WifiOff, Mail, List, Maximize2, Minimize2, TestTube, Clock, Zap, Terminal, ChevronUp, ChevronDown, Square, X } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from '@/hooks/use-toast';

const navItems = [
  { href: '/emails', label: 'All Emails', icon: List },
  { href: '/inbox', label: 'Inbox', icon: Mail },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/estimates', label: 'Estimates', icon: FileText },
  { href: '/logs', label: 'Logs', icon: Archive },
];

const settingsItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/ai-test', label: 'AI Test', icon: TestTube },
];

interface AppShellProps {
  children: React.ReactNode;
  isParsing?: boolean;
}

export function AppShell({ children, isParsing = false }: AppShellProps) {
  const pathname = usePathname();
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentStatus, setCurrentStatus] = useState({
    status: 'idle' as 'idle' | 'fetching' | 'processing' | 'parsing' | 'classifying',
    message: 'Ready'
  });
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(200); // Default height in pixels
  const [consoleLogs, setConsoleLogs] = useState<Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>>([]);
  const [isStoppingProcess, setIsStoppingProcess] = useState(false);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const toggleConsole = () => {
    setConsoleOpen(!consoleOpen);
  };

  const stopCurrentProcess = async () => {
    setIsStoppingProcess(true);
    try {
      const response = await fetch('/api/jobs/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast({
          title: "Process Stopped",
          description: "Current processing has been stopped."
        });
      } else {
        toast({
          title: "Stop Failed",
          description: "Could not stop the current process.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Stop Failed",
        description: "Error stopping process.",
        variant: "destructive"
      });
    } finally {
      setIsStoppingProcess(false);
    }
  };

  const addConsoleLog = (level: 'info' | 'warning' | 'error', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev.slice(-99), { timestamp, level, message }]);
  };

  // Poll status and logs from API
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const status = await response.json();
          setCurrentStatus(status);

          // Add status changes to console
          if (status.message && status.message !== 'Ready') {
            addConsoleLog('info', status.message);
          }
        }
      } catch (error) {
        // Silently fail - status polling is not critical
      }
    };

    const pollLogs = async () => {
      try {
        const response = await fetch('/api/logs?recent=10');
        if (response.ok) {
          const logs = await response.json();
          if (logs.logs && Array.isArray(logs.logs)) {
            setConsoleLogs(logs.logs.map((log: any) => ({
              timestamp: new Date(log.timestamp).toLocaleTimeString(),
              level: log.level,
              message: log.message
            })));
          }
        }
      } catch (error) {
        // Silently fail - log polling is not critical
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(() => {
      pollStatus();
      if (consoleOpen) {
        pollLogs();
      }
    }, 2000);

    pollStatus(); // Initial poll
    if (consoleOpen) {
      pollLogs(); // Initial log fetch
    }

    return () => clearInterval(interval);
  }, [consoleOpen]);

  const getStatusIcon = () => {
    switch (currentStatus.status) {
      case 'fetching':
        return <Mail className="h-4 w-4 animate-pulse" />
      case 'processing':
        return <Clock className="h-4 w-4 animate-spin" />
      case 'parsing':
        return <Zap className="h-4 w-4 animate-bounce" />
      case 'classifying':
        return <Bot className="h-4 w-4 animate-pulse" />
      default:
        return <WifiOff className="h-4 w-4" />
    }
  };

  const getStatusVariant = () => {
    return currentStatus.status !== 'idle' ? "default" : "secondary";
  };

  const getStatusColor = () => {
    switch (currentStatus.status) {
      case 'fetching':
        return "bg-blue-600 hover:bg-blue-700"
      case 'processing':
        return "bg-yellow-600 hover:bg-yellow-700"
      case 'parsing':
        return "bg-purple-600 hover:bg-purple-700"
      case 'classifying':
        return "bg-green-600 hover:bg-green-700"
      default:
        return ""
    }
  };

  return (
    <SidebarProvider>
      <div className={`flex min-h-screen w-full ${isMaximized ? 'fixed inset-0 z-50 bg-background' : ''}`}>
        {!isMaximized && (
          <Sidebar collapsible="icon" className="border-r border-border/50 flex-shrink-0">
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
        )}
        <SidebarInset className={`flex-1 min-w-0 h-screen overflow-hidden ${isMaximized ? 'w-full' : ''}`}>
          <header className="flex items-center justify-between p-2 border-b h-14 flex-shrink-0">
            <div className="flex items-center gap-2">
              {!isMaximized && <SidebarTrigger />}
              <h2 className="text-lg font-semibold font-headline">
                {navItems.find(item => item.href === pathname)?.label || settingsItems.find(item => item.href === pathname)?.label || 'Inbox'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant={getStatusVariant()}
                className={`gap-1.5 transition-all ${getStatusColor()}`}
                title={currentStatus.message}
              >
                {getStatusIcon()}
                {currentStatus.status.charAt(0).toUpperCase() + currentStatus.status.slice(1)}
              </Badge>

              {/* Stop button - only show when processing */}
              {currentStatus.status !== 'idle' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCurrentProcess}
                  disabled={isStoppingProcess}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Stop current process"
                >
                  {isStoppingProcess ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={toggleConsole} title="Toggle Console">
                <Terminal className="mr-2 h-4 w-4" />
                Console
              </Button>
              <Button variant="outline" size="sm" onClick={toggleMaximize} title={isMaximized ? "Exit Fullscreen" : "Maximize"}>
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto w-full">
              {children}
            </main>

            {/* Console Panel */}
            {consoleOpen && (
              <div className="border-t bg-background relative">
                {/* Resize Handle */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-border hover:bg-border/80 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startHeight = consoleHeight;

                    const handleMouseMove = (e: MouseEvent) => {
                      const deltaY = startY - e.clientY;
                      const newHeight = Math.max(100, Math.min(600, startHeight + deltaY));
                      setConsoleHeight(newHeight);
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
                <Card className="rounded-none border-0 border-t" style={{ height: consoleHeight }}>
                  <CardHeader className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        System Console
                        <Badge variant="secondary" className="text-xs">
                          {consoleLogs.length} logs
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConsoleLogs([])}
                          className="text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleConsole}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <ScrollArea style={{ height: consoleHeight - 60 }}>
                      <div className="p-4 space-y-1 font-mono text-xs">
                        {consoleLogs.length === 0 ? (
                          <div className="text-muted-foreground italic">
                            No logs yet. Console will show real-time processing information.
                          </div>
                        ) : (
                          consoleLogs.map((log, index) => (
                            <div
                              key={index}
                              className={`flex gap-2 ${
                                log.level === 'error' ? 'text-red-600' :
                                log.level === 'warning' ? 'text-yellow-600' :
                                'text-foreground'
                              }`}
                            >
                              <span className="text-muted-foreground shrink-0">
                                [{log.timestamp}]
                              </span>
                              <span className="shrink-0 uppercase font-semibold">
                                {log.level}:
                              </span>
                              <span className="break-all">
                                {log.message}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
