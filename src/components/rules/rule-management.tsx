"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Rule } from '@/lib/types'
import { UserCheck, UserX, Plus, Trash2, Edit, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RuleManagementProps {
  type?: 'whitelist' | 'blacklist' | 'all'
  title: string
  description: string
}

export function RuleManagement({ type = 'all', title, description }: RuleManagementProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [newRule, setNewRule] = useState({
    type: 'whitelist' as 'whitelist' | 'blacklist',
    pattern: '',
    description: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()

  const loadRules = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (type !== 'all') params.append('type', type)
      
      const response = await fetch(`/api/rules?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setRules(data.rules || [])
      } else {
        console.error('Failed to load rules:', data.error)
        setRules([])
      }
    } catch (error) {
      console.error('Failed to load rules:', error)
      setRules([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [type])

  const handleAddRule = async () => {
    if (!newRule.pattern.trim()) {
      toast({
        variant: "destructive",
        title: "Pattern Required",
        description: "Please enter an email pattern.",
      })
      return
    }

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRule)
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Rule Added",
          description: `${newRule.type} rule added successfully.`,
        })
        
        setNewRule({ type: 'whitelist', pattern: '', description: '' })
        setShowAddForm(false)
        await loadRules()
      } else {
        throw new Error(result.error || 'Failed to add rule')
      }
    } catch (error) {
      console.error('Add rule error:', error)
      toast({
        variant: "destructive",
        title: "Add Rule Failed",
        description: error instanceof Error ? error.message : "Failed to add rule. Please try again.",
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules?id=${ruleId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Rule Deleted",
          description: "Rule deleted successfully.",
        })
        
        await loadRules()
      } else {
        throw new Error(result.error || 'Failed to delete rule')
      }
    } catch (error) {
      console.error('Delete rule error:', error)
      toast({
        variant: "destructive",
        title: "Delete Rule Failed",
        description: error instanceof Error ? error.message : "Failed to delete rule. Please try again.",
      })
    }
  }

  const getRuleIcon = (ruleType: string) => {
    return ruleType === 'whitelist' ? 
      <UserCheck className="h-4 w-4 text-green-500" /> : 
      <UserX className="h-4 w-4 text-red-500" />
  }

  const getRuleBadge = (ruleType: string) => {
    return (
      <Badge variant={ruleType === 'whitelist' ? 'default' : 'destructive'}>
        {ruleType}
      </Badge>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Rule</CardTitle>
            <CardDescription>
              Create a new whitelist or blacklist rule for email addresses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-type">Type</Label>
                <Select value={newRule.type} onValueChange={(value: 'whitelist' | 'blacklist') => setNewRule({...newRule, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whitelist">Whitelist</SelectItem>
                    <SelectItem value="blacklist">Blacklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-pattern">Email Pattern</Label>
                <Input
                  id="rule-pattern"
                  placeholder="user@domain.com or @domain.com"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({...newRule, pattern: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-description">Description (Optional)</Label>
              <Textarea
                id="rule-description"
                placeholder="Description of this rule..."
                value={newRule.description}
                onChange={(e) => setNewRule({...newRule, description: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAddRule}>
                <Save className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {rules.length} {rules.length === 1 ? 'Rule' : 'Rules'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No rules found. Add a rule to get started.
              </div>
            ) : (
              <div className="space-y-1">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border-b hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getRuleIcon(rule.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {rule.pattern}
                            </span>
                            {getRuleBadge(rule.type)}
                            {!rule.active && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingRule(rule.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
