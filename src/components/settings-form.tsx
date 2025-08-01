
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, MailCheck, Plug, ExternalLink, Info } from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "./ui/switch"
import { Slider } from "./ui/slider"
import { Separator } from "./ui/separator"
import { RuleManagement } from "./rules/rule-management"
import { RuleList } from "./rules/rule-list"
import { JobStatus } from "./job-status"
import { EmailAddressManager } from "./email-address-manager"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Alert, AlertDescription } from "./ui/alert"


const settingsFormSchema = z.object({
  imapServer: z.string().min(1, "IMAP server is required."),
  port: z.number().min(1).max(65535),
  useSSL: z.boolean(),
  username: z.string().email("Please enter a valid email."),
  password: z.string().min(1, "App password is required."),
  pollingInterval: z.number().min(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  maxAttachmentSize: z.number().min(1),
  useGoogleDrive: z.boolean(),
  storagePath: z.string().min(1, "Storage path is required."),
  googleDriveFolderId: z.string().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  googleRedirectUri: z.string().optional(),
  parsingSchema: z.string().optional(),
  useAiProcessing: z.boolean(),
  aiProvider: z.enum(["google", "ollama"]),
  googleApiKey: z.string().optional(),
  orderKeywords: z.string().optional(),
  estimateKeywords: z.string().optional(),
  classificationInstructions: z.string().optional(),
  autoCleanupEnabled: z.boolean().optional(),
  cleanupFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  cleanupRetentionDays: z.number().min(1).max(365).optional(),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

const defaultValues: Partial<SettingsFormValues> = {
    imapServer: "imap.gmail.com",
    port: 993,
    useSSL: true,
    username: "",
    password: "",
    pollingInterval: 5,
    maxAttachmentSize: 25,
    useGoogleDrive: true,
    startDate: undefined,
    endDate: undefined,
    storagePath: "/usr/app/storage",
    googleDriveFolderId: "",
    googleClientId: "",
    googleClientSecret: "",
    googleRedirectUri: "http://localhost:3000/api/google-drive/callback",
    parsingSchema: JSON.stringify(
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
    ),
    useAiProcessing: true,
    aiProvider: "google",
    googleApiKey: "",
    orderKeywords: "order, purchase, buy, invoice, payment, total, quantity, price",
    estimateKeywords: "estimate, quote, proposal, bid, cost, pricing, budget",
    classificationInstructions: "Look for keywords in subject and body. Orders typically contain purchase confirmations, invoices, or payment information. Estimates contain quotes, proposals, or pricing information.",
    autoCleanupEnabled: false,
    cleanupFrequency: "weekly",
    cleanupRetentionDays: 30,
}

interface SettingsFormProps {
    isParsing?: boolean;
    setIsParsing?: (isParsing: boolean) => void;
}

export function SettingsForm({ isParsing, setIsParsing }: SettingsFormProps) {
  const searchParams = useSearchParams()
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
    mode: "onChange",
  })



  // AI Status state
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [checkingAiStatus, setCheckingAiStatus] = useState(false)

  // Load settings on component mount
  useEffect(() => {
    async function loadSettings() {
      console.log('SettingsForm: Loading settings...')
      try {
        const response = await fetch('/api/settings')
        console.log('SettingsForm: Load response status:', response.status)
        const data = await response.json()
        console.log('SettingsForm: Load response data:', { ...data, settings: data.settings ? { ...data.settings, password: '[HIDDEN]' } : null })

        if (data.settings && Object.keys(data.settings).length > 0) {
          // Convert date strings back to Date objects and ensure cleanup fields have defaults
          const settings = {
            ...defaultValues, // Start with defaults
            ...data.settings, // Override with loaded settings
            startDate: data.settings.startDate ? new Date(data.settings.startDate) : undefined,
            endDate: data.settings.endDate ? new Date(data.settings.endDate) : undefined,
            // Ensure cleanup fields have defaults if not present
            autoCleanupEnabled: data.settings.autoCleanupEnabled ?? false,
            cleanupFrequency: data.settings.cleanupFrequency ?? "weekly",
            cleanupRetentionDays: data.settings.cleanupRetentionDays ?? 30,
          }
          console.log('SettingsForm: Resetting form with loaded settings:', { ...settings, password: '[HIDDEN]' })
          // Reset with keepDefaultValues to maintain the loaded state
          form.reset(settings, { keepDefaultValues: true })
        } else {
          console.log('SettingsForm: No settings found or empty settings, using defaults')
          form.reset(defaultValues, { keepDefaultValues: true })
        }
      } catch (error) {
        console.error('SettingsForm: Failed to load settings:', error)
        // On error, still reset to defaults
        form.reset(defaultValues, { keepDefaultValues: true })
      }
    }

    console.log('SettingsForm: Component mounted, loading settings...')
    loadSettings()
  }, [form])

  // Handle OAuth callback results
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'google_drive_connected') {
      toast({
        title: "Google Drive Connected!",
        description: "Your Google Drive has been successfully connected.",
      })
    } else if (error) {
      let errorMessage = "An error occurred"
      switch (error) {
        case 'oauth_denied':
          errorMessage = "Google Drive authentication was denied. Please try again."
          break
        case 'oauth_failed':
          errorMessage = "Google Drive authentication failed. Please check your credentials."
          break
        case 'oauth_not_configured':
          errorMessage = "Google OAuth credentials are not configured. Please set up your Client ID and Secret."
          break
        case 'no_code':
          errorMessage = "No authorization code received from Google."
          break
        default:
          errorMessage = `Authentication error: ${error}`
      }

      toast({
        variant: "destructive",
        title: "Google Drive Connection Failed",
        description: errorMessage,
      })
    }
  }, [searchParams, toast])

  async function onSubmit(data: SettingsFormValues) {
    console.log('onSubmit called with data:', data)
    console.log('Form errors:', form.formState.errors)
    console.log('Form is valid:', form.formState.isValid)

    // Validate the form before submitting
    const isValid = await form.trigger()
    if (!isValid) {
      console.log('Form validation failed')
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Please fix the form errors before saving.",
      })
      return
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response result:', result)

      if (result.success) {
        // Update the form's default values to the saved values
        // This ensures the form doesn't reset when navigating
        form.reset(data, { keepDefaultValues: true })

        toast({
          title: "Settings Saved!",
          description: "Your settings have been saved successfully.",
        })
      } else {
        throw new Error(result.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save settings.",
      })
    }
  }
  
  async function onFetchEmails() {
    console.log('onFetchEmails called')

    // Validate only essential fields for email fetching
    const essentialFields = ['imapServer', 'port', 'username', 'password', 'storagePath']
    const isValid = await form.trigger(essentialFields)
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Settings",
        description: "Please fix the form errors before fetching emails.",
      });
      return;
    }

    const settings = form.getValues();

    // Additional validation for required fields
    if (!settings.username || !settings.password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter your email username and password before fetching emails.",
      });
      return;
    }

    try {
      // Start background job
      console.log('Starting background email processing job')
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'email-processing',
          settings
        }),
      });

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            variant: "destructive",
            title: "Job Already Running",
            description: "An email processing job is already running. Please wait for it to complete.",
          });
        } else {
          throw new Error(result.error || 'Failed to start email processing job');
        }
        return;
      }

      toast({
        title: "Email Processing Started!",
        description: "Background job started. You can navigate away - processing will continue. Check logs for progress.",
      });

      console.log('Background job started:', result.job)

    } catch(e: any) {
      console.error('Email fetch error:', e)
      toast({
        variant: "destructive",
        title: "Failed to Start Email Processing",
        description: e.message || "An unknown error occurred. Check logs for details.",
      });
    }
  }

  async function onFetchEmailsOptimized() {
    console.log('onFetchEmailsOptimized called')

    // Validate only essential fields for email fetching
    const essentialFields = ['imapServer', 'port', 'username', 'password', 'storagePath']
    const isValid = await form.trigger(essentialFields)
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Settings",
        description: "Please fix the form errors before fetching emails.",
      });
      return;
    }

    const settings = form.getValues();

    // Additional validation for required fields
    if (!settings.username || !settings.password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter your email username and password before fetching emails.",
      });
      return;
    }

    try {
      // Start optimized background job
      console.log('Starting optimized background email processing job')
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'email-processing-optimized',
          settings
        }),
      });

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            variant: "destructive",
            title: "Job Already Running",
            description: "An email processing job is already running. Please wait for it to complete.",
          });
        } else {
          throw new Error(result.error || 'Failed to start optimized email processing job');
        }
        return;
      }

      toast({
        title: "Optimized Email Processing Started!",
        description: "Fast processing using whitelist/blacklist rules. Check logs for progress.",
      });

      console.log('Optimized background job started:', result.job)

    } catch(e: any) {
      console.error('Optimized email fetch error:', e)
      toast({
        variant: "destructive",
        title: "Optimized Fetch Failed",
        description: e.message || "An error occurred while starting optimized email processing.",
      });
    }
  }

  async function onTestConnection() {
    const formData = form.getValues()
    
    try {
      toast({
        title: "Testing Connection...",
        description: "Please wait while we test your IMAP settings.",
      })
      
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Successful!",
          description: "Successfully connected to the IMAP server.",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Could not connect to the IMAP server. Please check your settings and try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      })
    }
  }

  async function onTestAIConnection() {
    const formData = form.getValues()

    try {
      toast({
        title: "Testing AI Connection...",
        description: "Please wait while we test your AI settings with sample emails.",
      })

      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.connected) {
        const successCount = result.tests.filter((t: any) => t.success).length
        const totalCount = result.tests.length

        toast({
          title: "AI Connection Successful!",
          description: `AI is working properly. ${successCount}/${totalCount} classification tests passed. Check logs for details.`,
        })
      } else {
        toast({
          title: "AI Connection Failed",
          description: result.error || "Could not connect to the AI service. Please check your settings and try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "AI Test Failed",
        description: "An error occurred while testing the AI connection. Please try again.",
        variant: "destructive"
      })
    }
  }

  async function checkAIStatus() {
    const formData = form.getValues()

    if (!formData.useAiProcessing) {
      setAiStatus(null)
      return
    }

    setCheckingAiStatus(true)

    try {
      const response = await fetch('/api/ai/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      setAiStatus(result)

    } catch (error) {
      setAiStatus({
        provider: formData.aiProvider,
        available: false,
        error: "Failed to check AI status",
        details: {}
      })
    } finally {
      setCheckingAiStatus(false)
    }
  }

  // Check AI status when AI settings change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'useAiProcessing' || name === 'aiProvider' || name === 'googleApiKey') {
        checkAIStatus()
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  async function onConnectGoogleDrive() {
    try {
      // Check if credentials are configured before attempting connection
      const currentValues = form.getValues()
      if (!currentValues.googleClientId || !currentValues.googleClientSecret) {
        toast({
          variant: "destructive",
          title: "Configuration Required",
          description: "Please configure your Google Client ID and Client Secret first, then save your settings.",
        })
        return
      }

      toast({
        title: "Connecting to Google Drive...",
        description: "Getting authentication URL...",
      })

      const response = await fetch('/api/google-drive/auth')
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.authUrl) {
        // Open the Google OAuth URL in a new window
        window.open(data.authUrl, 'google-auth', 'width=500,height=600')

        toast({
          title: "Authentication Window Opened",
          description: "Please complete the authentication in the popup window.",
        })
      }
    } catch (error) {
      console.error('Google Drive connection error:', error)
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Google Drive",
      })
    }
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 w-full full-width-layout">
      <h1 className="font-headline text-2xl">Settings</h1>
      <p className="text-muted-foreground">Manage your application and connection settings.</p>

      <Tabs defaultValue="connection" className="w-full full-width-layout">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="ai">AI & Parsing</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <TabsContent value="connection">
              <Card>
                <CardHeader>
                  <CardTitle>IMAP Connection</CardTitle>
                  <CardDescription>
                    Enter the credentials for your email account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="imapServer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IMAP Server</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="your.email@gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Use an app-specific password for security.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="port"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Port</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={event => field.onChange(+event.target.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pollingInterval"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Polling Interval (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={event => field.onChange(+event.target.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="useSSL"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Use SSL/TLS</FormLabel>
                          <FormDescription>
                            Enable secure connection to the IMAP server (recommended for port 993).
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>Date Range</FormLabel>
                    <div className="flex items-center justify-between">
                      <FormDescription>
                        Only parse emails within this date range. Leave blank to parse all emails.
                      </FormDescription>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          form.setValue("startDate", undefined)
                          form.setValue("endDate", undefined)
                          toast({
                            title: "Date Filters Cleared",
                            description: "All emails will now be processed regardless of date.",
                          })
                        }}
                      >
                        Clear Dates
                      </Button>
                    </div>
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Start date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>End date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {(form.watch("startDate") || form.watch("endDate")) && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Date Filtering Active:</strong> Only emails within the specified date range will be processed.
                          If no emails are found, try clearing the date filters or adjusting the date range.
                          {form.watch("startDate") && form.watch("endDate") &&
                           new Date(form.watch("startDate")!) >= new Date(form.watch("endDate")!) && (
                            <span className="text-red-600 block mt-1">
                              ⚠️ Warning: Start date should be before end date.
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={onTestConnection}>
                        <Plug className="mr-2 h-4 w-4" />
                        Test Connection
                      </Button>
                      <Button type="button" variant="secondary" onClick={onFetchEmails}>
                        <MailCheck className="mr-2 h-4 w-4" />
                        Full Parse Emails
                      </Button>
                      <Button type="button" variant="outline" onClick={onFetchEmailsOptimized}>
                        <MailCheck className="mr-2 h-4 w-4" />
                        Smart Parse (Fast)
                      </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/email/status')
                          const result = await response.json()
                          console.log('Processing status:', result)
                          toast({
                            title: "Processing Status",
                            description: result.isProcessing ? "Email processing is currently running" : "No email processing currently running",
                          })
                        } catch (error) {
                          console.error('Status check error:', error)
                          toast({
                            variant: "destructive",
                            title: "Status Check Failed",
                            description: "Could not check processing status",
                          })
                        }
                      }}
                    >
                      Check Status
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={async () => {
                        console.log('Testing API health...')
                        try {
                          const response = await fetch('/api/email/process')
                          const result = await response.json()
                          console.log('API health check result:', result)
                          toast({
                            title: "API Health Check",
                            description: result.message || 'API is working',
                          })
                        } catch (error) {
                          console.error('API health check failed:', error)
                          toast({
                            variant: "destructive",
                            title: "API Health Check Failed",
                            description: error instanceof Error ? error.message : 'Unknown error',
                          })
                        }
                      }}
                    >
                      Test API
                    </Button>
                    </div>

                    <JobStatus onParsingStateChange={setIsParsing} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="max-w-none full-width-layout">
                <div className="space-y-6 w-full full-width-layout">
                    <div className="w-full full-width-layout">
                        <EmailAddressManager />
                    </div>

                    <div className="border-t pt-6">
                        <RuleManagement
                            type="all"
                            title="Advanced Rule Management"
                            description="Comprehensive rule management with pattern matching and detailed configuration."
                        />
                    </div>
                </div>
            </TabsContent>
            
            <TabsContent value="attachments">
              <Card>
                <CardHeader>
                  <CardTitle>Attachment Handling</CardTitle>
                  <CardDescription>
                    Configure how attachments are processed and stored.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <FormField
                        control={form.control}
                        name="storagePath"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Local Storage Path</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormDescription>
                                The local directory where attachments will be saved.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Separator />
                    <FormField
                        control={form.control}
                        name="maxAttachmentSize"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Attachment Size: {field.value} MB</FormLabel>
                                <FormControl>
                                    <Slider
                                        min={1}
                                        max={100}
                                        step={1}
                                        defaultValue={[field.value]}
                                        onValueChange={(vals) => field.onChange(vals[0])}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Attachments larger than this size will not be stored locally.
                                </FormDescription>
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="useGoogleDrive"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Google Drive Fallback</FormLabel>
                                <FormDescription>
                                    Upload oversized attachments to a Google Drive folder.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                        )}
                    />

                    {form.watch("useGoogleDrive") && (
                      <div className="space-y-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p><strong>Google Drive Setup Instructions:</strong></p>
                              <ol className="list-decimal list-inside space-y-1 text-sm">
                                <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Google Cloud Console</a></li>
                                <li>Create a new project or select an existing one</li>
                                <li>Enable the Google Drive API in the API Library</li>
                                <li>Create OAuth 2.0 Client ID credentials</li>
                                <li>Add the redirect URI below to your OAuth2 credentials</li>
                                <li>Copy the Client ID and Client Secret to the fields below</li>
                                <li>Save settings and click "Connect Drive"</li>
                              </ol>
                            </div>
                          </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="googleClientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Google Client ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your Google Client ID..." {...field} />
                                </FormControl>
                                <FormDescription>
                                  From Google Cloud Console OAuth2 credentials
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="googleClientSecret"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Google Client Secret</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter your Google Client Secret..." {...field} />
                                </FormControl>
                                <FormDescription>
                                  From Google Cloud Console OAuth2 credentials
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="googleRedirectUri"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Redirect URI</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="http://localhost:3000/api/google-drive/callback"
                                  {...field}
                                  value={field.value || "http://localhost:3000/api/google-drive/callback"}
                                />
                              </FormControl>
                              <FormDescription>
                                Add this exact URL to your Google OAuth2 credentials as an authorized redirect URI
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="googleDriveFolderId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Google Drive Folder ID</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input placeholder="Enter your Google Drive folder ID..." {...field} />
                                </FormControl>
                                <Button variant="outline" type="button" onClick={onConnectGoogleDrive}>
                                  Connect Drive
                                </Button>
                              </div>
                              <FormDescription>
                                Enter just the folder ID from your Google Drive folder URL (e.g., "1dWuJDy7XohKfmLn4-ROUbdhfRkTEOS10"), not the full URL.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card>
                  <CardHeader>
                      <CardTitle>AI & Parsing</CardTitle>
                      <CardDescription>
                          Configure the AI model for quote detection and data extraction.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="useAiProcessing"
                      render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                              <FormLabel>Enable AI Processing</FormLabel>
                              <FormDescription>
                                  Analyze emails with AI to detect quotes and extract data.
                              </FormDescription>
                          </div>
                          <FormControl>
                              <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                              />
                          </FormControl>
                      </FormItem>
                      )}
                    />
                    <Separator />
                    <FormField
                        control={form.control}
                        name="aiProvider"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>AI Provider</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an AI provider" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="google">Google AI</SelectItem>
                                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Select whether to use Google AI or a local Ollama instance.
                            </FormDescription>
                            {aiStatus && (
                              <div className={`text-sm p-2 rounded flex items-center gap-2 ${
                                aiStatus.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                  checkingAiStatus ? 'bg-yellow-500 animate-pulse' :
                                  aiStatus.available ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                {checkingAiStatus ? 'Checking...' :
                                 aiStatus.available ? aiStatus.details.message : aiStatus.error}
                              </div>
                            )}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="googleApiKey"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Google AI API Key</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter your Google AI API Key..." {...field} />
                            </FormControl>
                            <FormDescription>
                                Required if you select the Google AI provider.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <Separator />

                     <div className="space-y-4">
                       <h4 className="text-sm font-medium">Email Classification</h4>
                       <FormField
                         control={form.control}
                         name="orderKeywords"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Order Keywords</FormLabel>
                             <FormControl>
                               <Input
                                 placeholder="order, purchase, buy, invoice..."
                                 {...field}
                               />
                             </FormControl>
                             <FormDescription>
                               Comma-separated keywords that indicate an email contains an order.
                             </FormDescription>
                             <FormMessage />
                           </FormItem>
                         )}
                       />

                       <FormField
                         control={form.control}
                         name="estimateKeywords"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Estimate Keywords</FormLabel>
                             <FormControl>
                               <Input
                                 placeholder="estimate, quote, proposal, bid..."
                                 {...field}
                               />
                             </FormControl>
                             <FormDescription>
                               Comma-separated keywords that indicate an email contains an estimate or quote.
                             </FormDescription>
                             <FormMessage />
                           </FormItem>
                         )}
                       />

                       <FormField
                         control={form.control}
                         name="classificationInstructions"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Classification Instructions</FormLabel>
                             <FormControl>
                               <Textarea
                                 className="h-24"
                                 placeholder="Instructions for AI to classify emails..."
                                 {...field}
                               />
                             </FormControl>
                             <FormDescription>
                               Additional instructions to help the AI classify emails as orders vs estimates.
                             </FormDescription>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                     <div className="flex gap-2">
                       <Button
                         type="button"
                         variant="outline"
                         onClick={onTestAIConnection}
                         disabled={!form.watch('useAiProcessing')}
                       >
                         Test AI Connection
                       </Button>
                       <div className="text-sm text-muted-foreground flex items-center">
                         Tests AI classification with sample emails
                       </div>
                     </div>

                     <Separator />
                      <FormField
                        control={form.control}
                        name="parsingSchema"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Extraction Schema</FormLabel>
                            <FormControl>
                              <Textarea
                                className="font-code h-64"
                                placeholder="Enter a JSON schema for data extraction..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Define the JSON structure the AI should use to extract data for your order entry system.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cleanup">
              <Card>
                <CardHeader>
                  <CardTitle>Archive Cleanup</CardTitle>
                  <CardDescription>
                    Configure automatic cleanup of archived emails to manage storage space.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="autoCleanupEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Automatic Cleanup
                          </FormLabel>
                          <FormDescription>
                            Automatically delete old archived emails based on the schedule below.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cleanupFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cleanup Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "weekly"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How often to run automatic cleanup.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cleanupRetentionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retention Period (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              {...field}
                              value={field.value || 30}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                            />
                          </FormControl>
                          <FormDescription>
                            Delete archived emails older than this many days.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Only emails in the Archive section will be automatically deleted. 
                      Active emails in Orders, Estimates, and Inbox are never affected by cleanup.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/cleanup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'run' })
                          })
                          const result = await response.json()
                          
                          if (result.success) {
                            toast({
                              title: "Cleanup Complete",
                              description: `Deleted ${result.deletedCount} old emails.`
                            })
                          } else {
                            toast({
                              title: "Cleanup Failed",
                              description: result.error,
                              variant: "destructive"
                            })
                          }
                        } catch (error) {
                          toast({
                            title: "Cleanup Error",
                            description: "Failed to run cleanup",
                            variant: "destructive"
                          })
                        }
                      }}
                    >
                      Run Cleanup Now
                    </Button>
                    <div className="text-sm text-muted-foreground flex items-center">
                      Manually trigger cleanup of old archived emails
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  )
}
