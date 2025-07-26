"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { extractOrderDetails, type ExtractOrderDetailsOutput } from '@/ai/flows/detect-order-quote'
import type { Email } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Textarea } from '../ui/textarea'

// This would typically come from your settings store
const defaultParsingSchema = JSON.stringify(
  {
    orderId: "string",
    customer: {
      name: "string",
      email: "string",
    },
    items: [
      {
        sku: "string",
        quantity: "number",
        price: "number",
      },
    ],
  },
  null,
  2
);

const FormSchema = z.object({
  parsingSchema: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Invalid JSON format." }),
});

export function QuoteDetection({ email }: { email: Email }) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ExtractOrderDetailsOutput | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      parsingSchema: defaultParsingSchema,
    },
  })

  // When the email changes, update the result to show its pre-existing extracted data
  useEffect(() => {
    if (email.extractedData) {
        setResult({
            isOrderQuote: email.category !== 'none',
            category: email.category,
            extractedData: email.extractedData,
            reason: "Previously extracted by the system.",
        });
    } else {
        setResult(null);
    }
  }, [email]);


  const handleDetection = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true)
    setResult(null)
    try {
      const response = await extractOrderDetails({
        emailBody: email.body,
        emailSubject: email.subject,
        parsingSchema: data.parsingSchema,
      })
      setResult(response)
      toast({
        title: "Analysis Complete",
        description: "The AI has finished analyzing the email.",
      })
    } catch (e) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the email. Please check the logs.",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const extractedDataString = useMemo(() => {
    if (result?.extractedData) {
      return JSON.stringify(result.extractedData, null, 2);
    }
    return "No data extracted.";
  }, [result]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-headline">
          <Bot className="h-5 w-5" />
          AI Quote Detection & Extraction
        </CardTitle>
        <CardDescription>
          Use AI to check for quotes/orders and extract structured data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleDetection)} className="space-y-4">
             <FormField
                control={form.control}
                name="parsingSchema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extraction Schema</FormLabel>
                    <FormControl>
                      <Textarea
                        className="font-code text-xs h-32"
                        placeholder="Enter a JSON schema for data extraction..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Analyze & Extract'
              )}
            </Button>
          </form>
        </Form>
        {result && (
          <div className="space-y-4 rounded-lg border bg-background/50 p-4">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Analysis Result</h3>
                    <Badge variant={result.isOrderQuote ? 'default' : 'secondary'} className={result.isOrderQuote ? "bg-green-600 hover:bg-green-700" : ""}>
                        {result.isOrderQuote ? <ThumbsUp className="mr-1 h-4 w-4" /> : <ThumbsDown className="mr-1 h-4 w-4" />}
                        {result.isOrderQuote ? 'Quote Detected' : 'Not a Quote'}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Category:</span> {result.category}
                </p>
                <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Reason:</span> {result.reason}
                </p>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Extracted Data</h3>
                 <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                    <code>
                        {extractedDataString}
                    </code>
                </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
