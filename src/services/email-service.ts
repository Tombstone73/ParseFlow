
'use server';
/**
 * @fileOverview A service for fetching and processing emails.
 *
 * - processEmails - A flow that fetches emails and processes them with AI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ImapFlow } from 'imapflow';
import { extractOrderDetails, type ExtractOrderDetailsOutput } from '@/ai/flows/detect-order-quote';
import { addEmail, addLog } from '@/lib/data-store';
import type { Email } from '@/lib/types';
import { simpleParser } from 'mailparser';

const ProcessEmailsOutputSchema = z.object({
  processedCount: z.number(),
  results: z.array(z.any()),
});
type ProcessEmailsOutput = z.infer<typeof ProcessEmailsOutputSchema>;


export async function processEmails(input: any): Promise<ProcessEmailsOutput> {
    return processEmailsFlow(input);
}

function getAttachmentType(filename: string): Email['attachments'][0]['type'] {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'pdf';
        case 'ai': return 'ai';
        case 'zip': return 'zip';
        case 'jpg':
        case 'jpeg': return 'jpg';
        case 'png': return 'png';
        default: return 'unknown';
    }
}

const processEmailsFlow = ai.defineFlow(
  {
    name: 'processEmailsFlow',
    inputSchema: z.any(),
    outputSchema: ProcessEmailsOutputSchema,
  },
  async (settings) => {
    await addLog('info', 'Starting email processing flow...');
    const client = new ImapFlow({
      host: settings.imapServer,
      port: settings.port,
      secure: true, // Assuming TLS, common for port 993
      auth: {
        user: settings.username,
        pass: settings.password,
      },
      logger: false, // Set to true for verbose logging
    });

    const results: any[] = [];
    let processedCount = 0;

    try {
      await client.connect();
      await addLog('info', `IMAP connection to ${settings.imapServer} successful.`);

      const lock = await client.getMailboxLock('INBOX');
      try {
        // Fetch emails that have not been seen yet
        const messages = client.fetch({ seen: false }, { envelope: true, source: true, uid: true });
        let emailCount = 0;
        
        const model = settings.aiProvider === 'ollama' ? 'gemma' : 'gemini-1.5-flash-latest';

        for await (const msg of messages) {
            emailCount++;
            await addLog('info', `Processing email UID ${msg.uid}: "${msg.envelope.subject}"`);
            
            const parsedEmail = await simpleParser(msg.source);
            const emailBody = parsedEmail.text || '';
            
            let analysisResult: ExtractOrderDetailsOutput;

            if (settings.useAiProcessing) {
                await addLog('info', `Analyzing email UID ${msg.uid} with AI.`);
                analysisResult = await extractOrderDetails({
                    emailSubject: msg.envelope.subject,
                    emailBody: emailBody,
                    parsingSchema: settings.parsingSchema,
                    model: model,
                });
                await addLog('info', `AI analysis for UID ${msg.uid} complete. Category: ${analysisResult.category}.`);
            } else {
                await addLog('info', `Skipping AI analysis for UID ${msg.uid} as per settings.`);
                analysisResult = {
                    isOrderQuote: false,
                    category: 'none',
                    extractedData: null,
                    reason: 'AI processing disabled in settings.',
                };
            }

            const newEmail: Email = {
                id: msg.uid,
                from: {
                    name: msg.envelope.from[0].name || msg.envelope.from[0].address || 'Unknown Sender',
                    email: msg.envelope.from[0].address || 'unknown@example.com',
                },
                subject: msg.envelope.subject,
                body: emailBody,
                date: msg.envelope.date?.toISOString() || new Date().toISOString(),
                isRead: false,
                isArchived: false,
                isBlacklisted: false,
                isWhitelisted: false,
                attachments: parsedEmail.attachments.map(att => ({
                    name: att.filename || 'attachment',
                    type: getAttachmentType(att.filename || ''),
                    size: Math.round(att.size / 1024), // to KB
                })),
                category: analysisResult.category,
                extractedData: analysisResult.extractedData,
            };

            await addEmail(newEmail);
            
            results.push({
                subject: msg.envelope.subject,
                analysis: analysisResult,
            });
            processedCount++;
        }
        await addLog('info', `Fetched and processed ${emailCount} new email(s).`);
      } finally {
        lock.release();
      }
    } catch (err: any) {
      console.error('IMAP Error:', err);
      await addLog('error', `Email fetch failed: ${err.message}`);
      throw new Error(`Failed to connect to IMAP server or process emails. ${err.message}`);
    } finally {
      if (!client.destroyed) {
        await client.logout();
      }
      await addLog('info', 'IMAP connection closed.');
    }
    
    return {
        processedCount,
        results
    };
  }
);
