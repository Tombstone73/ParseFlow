"use client"

import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LogsPage() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>
            Logs are temporarily disabled to prevent server restart issues.
            Check the server console for detailed logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The logs feature will be restored once the server stability issues are resolved.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  )
}