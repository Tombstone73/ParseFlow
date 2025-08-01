"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRules, addRule, deleteRule, updateRule } from '@/lib/data-store'
import { Rule } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

interface RuleListProps {
  title: string
  description: string
  type: 'whitelist' | 'blacklist'
}

export function RuleList({ title, description, type }: RuleListProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [newRule, setNewRule] = useState('')
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const { toast } = useToast()

  const loadRules = async () => {
    const allRules = await getRules(type)
    setRules(allRules)
  }

  useEffect(() => {
    loadRules()
  }, [type])

  const handleAddRule = async () => {
    if (!newRule.trim()) return

    try {
      await addRule({
        type,
        pattern: newRule.trim(),
        description: `${type} rule`,
        active: true
      })
      setNewRule('')
      await loadRules()
      toast({
        title: 'Rule Added',
        description: `Added new ${type} rule: ${newRule}`
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add rule'
      })
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule(id)
      await loadRules()
      toast({
        title: 'Rule Deleted',
        description: 'Rule has been removed'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete rule'
      })
    }
  }

  const handleEditRule = async (id: string) => {
    if (!editValue.trim()) return

    try {
      await updateRule(id, { pattern: editValue.trim() })
      setEditingRule(null)
      setEditValue('')
      await loadRules()
      toast({
        title: 'Rule Updated',
        description: 'Rule has been updated'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update rule'
      })
    }
  }

  const startEdit = (rule: Rule) => {
    setEditingRule(rule.id)
    setEditValue(rule.pattern)
  }

  const cancelEdit = () => {
    setEditingRule(null)
    setEditValue('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Add ${type} pattern...`}
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
          />
          <Button onClick={handleAddRule} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No {type} rules configured
            </p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2 p-2 border rounded">
                {editingRule === rule.id ? (
                  <>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleEditRule(rule.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleEditRule(rule.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">
                      {rule.pattern}
                    </code>
                    <Badge variant={rule.active ? 'default' : 'secondary'}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}