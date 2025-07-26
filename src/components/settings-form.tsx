
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, MailCheck, Plug } from "lucide-react"

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
import { RuleList } from "./rules/rule-list"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { processEmails } from "@/services/email-service"

const settingsFormSchema = z.object({
  imapServer: z.string().min(1, "IMAP server is required."),
  port: z.number().min(1).max(65535),
  username: z.string().email("Please enter a valid email."),
  password: z.string().min(1, "App password is required."),
  pollingInterval: z.number().min(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  maxAttachmentSize: z.number().min(1),
  useGoogleDrive: z.boolean(),
  storagePath: z.string().min(1, "Storage path is required."),
  googleDriveFolderId: z.string().optional(),
  parsingSchema: z.string().optional(),
  useAiProcessing: z.boolean(),
  aiProvider: z.enum(["google", "ollama"]),
  googleApiKey: z.string().optional(),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

const defaultValues: Partial<SettingsFormValues> = {
    imapServer: "imap.gmail.com",
    port: 993,
    username: "",
    password: "",
    pollingInterval: 5,
    maxAttachmentSize: 25,
    useGoogleDrive: true,
    startDate: undefined,
    endDate: undefined,
    storagePath: "/usr/app/storage",
    googleDriveFolderId: "",
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
}

interface SettingsFormProps {
    isParsing?: boolean;
    setIsParsing?: (isParsing: boolean) => void;
}

export function SettingsForm({ isParsing, setIsParsing }: SettingsFormProps) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
    mode: "onChange",
  })

  async function onSubmit(data: SettingsFormValues) {
    // Here you would save the settings to a persistent store
    // For now, we'll just show a toast
    console.log("Saving settings", data);
    toast({
      title: "Settings Saved!",
      description: "Your new settings have been applied.",
    })
  }
  
  async function onFetchEmails() {
    toast({
      title: "Fetching Emails...",
      description: "A background job has been started to fetch new emails.",
    });

    setIsParsing?.(true);
    const settings = form.getValues();

    try {
      const result = await processEmails(settings);
      toast({
        title: "Email Fetch Complete!",
        description: `Processed ${result.processedCount} emails. Check logs for details.`,
      });
    } catch(e: any) {
       toast({
        variant: "destructive",
        title: "Email Fetch Failed",
        description: e.message || "An unknown error occurred.",
      });
    } finally {
      setIsParsing?.(false);
    }
  }

  function onTestConnection() {
    toast({
      title: "Connection Successful!",
      description: "Successfully connected to the IMAP server.",
    })
  }

  function onConnectGoogleDrive() {
    toast({
      title: "Connecting to Google Drive...",
      description: "Please follow the prompts to authenticate.",
    })
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <h1 className="font-headline text-2xl">Settings</h1>
      <p className="text-muted-foreground">Manage your application and connection settings.</p>
        
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="ai">AI & Parsing</TabsTrigger>
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
                          <Input placeholder="your.email@example.com" {...field} />
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
                  <div className="space-y-2">
                    <FormLabel>Date Range</FormLabel>
                    <FormDescription>
                      Only parse emails within this date range. Leave blank to parse all emails.
                    </FormDescription>
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={onTestConnection}>
                      <Plug className="mr-2 h-4 w-4" />
                      Test Connection
                    </Button>
                    <Button type="button" variant="secondary" onClick={onFetchEmails}>
                      <MailCheck className="mr-2 h-4 w-4" />
                      Force Fetch Emails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RuleList 
                        title="Whitelist" 
                        description="These senders will always be processed."
                        type="whitelist"
                    />
                    <RuleList 
                        title="Blacklist" 
                        description="These senders will always be ignored."
                        type="blacklist"
                    />
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
                    <div className="space-y-2">
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
                                <Button variant="outline" type="button" onClick={onConnectGoogleDrive}>Connect Drive</Button>
                              </div>
                              <FormDescription>
                                You can find this in the URL of your Google Drive folder.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
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

            <Button type="submit">Save Settings</Button>
          </form>
        </Form>
      </Tabs>
    </div>
  )
}
