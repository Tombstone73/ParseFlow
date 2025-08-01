'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TestResult {
  type: 'order' | 'estimate' | 'other'
  confidence: number
  reasoning: string
}

export default function AITestPage() {
  const [testEmail, setTestEmail] = useState({
    subject: 'Order Confirmation #12345',
    from: 'orders@example.com',
    body: 'Thank you for your order! Your order #12345 has been confirmed. Total: $299.99. Items: 2x Widget A, 1x Widget B. We will process your payment and ship your items within 2-3 business days.'
  })
  
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const { toast } = useToast()

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const testAIClassification = async () => {
    if (!settings) {
      await loadSettings()
    }

    setIsLoading(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          settings: settings
        })
      })

      if (response.ok) {
        const result = await response.json()
        setTestResult(result)
        toast({
          title: "AI Test Complete",
          description: `Classified as: ${result.type} (${Math.round(result.confidence * 100)}% confidence)`
        })
      } else {
        const error = await response.json()
        toast({
          title: "AI Test Failed",
          description: error.error || 'Unknown error',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('AI test error:', error)
      toast({
        title: "AI Test Error",
        description: 'Failed to test AI classification',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSampleEmails = (type: 'order' | 'estimate' | 'other') => {
    const samples = {
      order: {
        subject: 'Order Confirmation #12345',
        from: 'orders@example.com',
        body: 'Thank you for your order! Your order #12345 has been confirmed. Total: $299.99. Items: 2x Widget A, 1x Widget B. We will process your payment and ship your items within 2-3 business days.'
      },
      estimate: {
        subject: 'Quote Request - Project ABC',
        from: 'sales@contractor.com',
        body: 'Here is your requested quote for Project ABC. Labor: $1,500. Materials: $800. Total estimate: $2,300. This quote is valid for 30 days. Please let us know if you have any questions.'
      },
      other: {
        subject: 'Newsletter - Weekly Updates',
        from: 'newsletter@company.com',
        body: 'Welcome to our weekly newsletter! This week we have updates on our latest products, upcoming events, and industry news. Don\'t forget to follow us on social media for daily updates.'
      }
    }
    
    setTestEmail(samples[type])
    setTestResult(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <TestTube className="h-6 w-6" />
        <h1 className="text-3xl font-bold">AI Classification Test</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email Input</CardTitle>
            <CardDescription>
              Enter email details to test AI classification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={testEmail.subject}
                onChange={(e) => setTestEmail(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject line"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                value={testEmail.from}
                onChange={(e) => setTestEmail(prev => ({ ...prev, from: e.target.value }))}
                placeholder="sender@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={testEmail.body}
                onChange={(e) => setTestEmail(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Email content..."
                rows={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Sample Emails</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => loadSampleEmails('order')}>
                  Order Sample
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadSampleEmails('estimate')}>
                  Estimate Sample
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadSampleEmails('other')}>
                  Other Sample
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={testAIClassification} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing AI Classification...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Test AI Classification
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Classification Results</CardTitle>
            <CardDescription>
              AI classification results and reasoning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Classification Complete</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Type:</span>
                    <Badge variant={testResult.type === 'order' ? 'default' : testResult.type === 'estimate' ? 'secondary' : 'outline'}>
                      {testResult.type.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Confidence:</span>
                    <Badge variant={testResult.confidence > 0.8 ? 'default' : testResult.confidence > 0.5 ? 'secondary' : 'destructive'}>
                      {Math.round(testResult.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="font-medium">Reasoning:</span>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {testResult.reasoning}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run a test to see AI classification results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
