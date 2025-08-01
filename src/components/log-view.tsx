
"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Download, Info, Loader2, TriangleAlert, XCircle, Archive } from "lucide-react"
import type { Log } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";


const levelConfig = {
    info: {
        icon: <Info className="h-4 w-4" />,
        className: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
    },
    warning: {
        icon: <TriangleAlert className="h-4 w-4" />,
        className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
    },
    error: {
        icon: <XCircle className="h-4 w-4" />,
        className: 'bg-red-500/20 text-red-500 border-red-500/50',
    },
}

export function LogView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error('Failed to fetch logs');
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000); // Refresh logs every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: "No logs to export",
        description: "There are no logs to export.",
      });
      return;
    }
    const logData = logs.map(log => `${log.timestamp} [${log.level.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logData], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `parseflow_logs_${new Date().toISOString()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const handleArchive = async () => {
    if (logs.length === 0) {
      toast({
        title: "No logs to archive",
        description: "The log view is already empty.",
      });
      return;
    }

    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadLogs();
        toast({
          title: "Logs Archived",
          description: "All logs have been successfully archived.",
        });
      } else {
        toast({
          title: "Archive Failed",
          description: "Failed to archive logs. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error archiving logs:', error);
      toast({
        title: "Archive Failed",
        description: "An error occurred while archiving logs.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-2xl">System Logs</h1>
                <p className="text-muted-foreground">View and export application events. Logs refresh automatically.</p>
            </div>
             <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive All
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Logs
                </Button>
             </div>
        </div>
        <div className="border rounded-lg flex-1 flex flex-col min-h-0">
          <ScrollArea className="h-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
                <TableRow>
                    <TableHead className="w-[120px]">Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[200px] text-right">Timestamp</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && logs.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            Loading logs...
                        </TableCell>
                    </TableRow>
                ) : logs.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No logs found.
                        </TableCell>
                    </TableRow>
                ) : (
                    logs.map((log) => (
                        <TableRow key={log.id}>
                        <TableCell>
                            <Badge variant="outline" className={cn("gap-1.5 font-mono text-xs", levelConfig[log.level].className)}>
                                {levelConfig[log.level].icon}
                                {log.level}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.message}</TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
           </ScrollArea>
        </div>
    </div>
  )
}
