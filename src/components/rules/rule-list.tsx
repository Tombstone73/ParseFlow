
"use client"

import type { Rule } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { useEffect, useState } from "react"
import { getRules } from "@/lib/data-store"

interface RuleListProps {
  title: string
  description: string
  type: 'whitelist' | 'blacklist'
}

export function RuleList({ title, description, type }: RuleListProps) {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    const loadRules = async () => {
        const fetchedRules = await getRules();
        setRules(fetchedRules.filter(r => r.type === type));
    }
    loadRules();
  }, [type]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
            <Input placeholder={`Add new ${type} rule...`} />
            <Button variant="outline" size="icon">
                <PlusCircle className="h-4 w-4" />
            </Button>
        </div>
        <div className="space-y-2 rounded-md border">
            {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded-md">{rule.value}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            {rules.length === 0 && (
                <p className="p-4 text-sm text-center text-muted-foreground">No rules defined.</p>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
